import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import { keyMatches, readKeyFromHeaders } from "@/modules/integrations/keys";
import { describeIssues, requestSchema } from "@/modules/integrations/standard";
import { processRawEvent, type ProcessOutcome } from "@/modules/integrations/processor";

/**
 * Entrada de dados externos no formato padrão do Head Comercial.
 *   POST /api/webhooks/ingest/{id-da-fonte}
 *   Authorization: Bearer {chave da fonte}
 *   Corpo: um evento { type, idempotency_key?, data } ou um lote { events: [...] } (até 100).
 */

const MAX_BODY_BYTES = 1_000_000;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: RouteContext<"/api/webhooks/ingest/[sourceId]">) {
  const { sourceId } = await params;
  const unauthorized = () => json(401, { error: "Chave de acesso inválida ou fonte inexistente." });
  if (!z.uuid().safeParse(sourceId).success) return unauthorized();

  const key = readKeyFromHeaders(request.headers);
  if (!key) return unauthorized();

  const system = createServiceClient({ type: "system" });
  const { data: source } = await system
    .from("integration_sources")
    .select("id, company_id, status, secret_hash, archived_at")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source || !keyMatches(key, source.secret_hash)) return unauthorized();
  if (source.archived_at || source.status === "paused") {
    return json(403, { error: "Esta fonte está pausada ou arquivada." });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json(413, { error: "Corpo grande demais (máximo de 1 MB)." });

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Corpo grande demais (máximo de 1 MB)." });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "O corpo precisa ser um JSON válido." });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: describeIssues(parsed.error) });

  const db = createServiceClient({ type: "integration", id: source.id });
  const results: (ProcessOutcome & { index: number; duplicate?: boolean })[] = [];

  for (const [index, envelope] of parsed.data.entries()) {
    const { data: inserted, error } = await db
      .from("raw_events")
      .insert({
        company_id: source.company_id,
        source_id: source.id,
        event_type: envelope.type,
        idempotency_key: envelope.idempotency_key ?? null,
        // Veio de JSON.parse, então já é JSON válido.
        payload: envelope as unknown as NonNullable<Json>,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        results.push({ index, status: "ignored", duplicate: true, error: "Entrega repetida (idempotency_key já recebida)." });
        continue;
      }
      console.error("[webhook] falha ao gravar evento", error.message);
      results.push({ index, status: "failed", error: "Não foi possível gravar o evento." });
      continue;
    }
    results.push({ index, ...(await processRawEvent(inserted.id)) });
  }

  const count = (s: string) => results.filter((r) => r.status === s && !r.duplicate).length;
  const failed = results.filter((r) => r.status === "failed");
  await db
    .from("integration_sources")
    .update({
      last_event_at: new Date().toISOString(),
      last_error: failed.length ? failed[failed.length - 1].error?.slice(0, 1000) ?? null : null,
    })
    .eq("id", source.id);

  return json(200, {
    received: results.length,
    processed: count("processed"),
    failed: failed.length,
    ignored: count("ignored"),
    duplicates: results.filter((r) => r.duplicate).length,
    results,
  });
}
