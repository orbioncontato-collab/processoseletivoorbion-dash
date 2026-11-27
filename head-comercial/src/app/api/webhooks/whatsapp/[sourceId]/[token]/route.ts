import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { overRateLimit } from "@/modules/integrations/rate-limit";
import type { Json } from "@/lib/supabase/database.types";
import { keyMatches } from "@/modules/integrations/keys";
import { translateEvolution } from "@/modules/integrations/evolution";
import { processRawEvent } from "@/modules/integrations/processor";

/**
 * Avisos da Evolution API para um número de WhatsApp conectado por QR Code.
 * A chave vai no próprio endereço (a Evolution não envia cabeçalho de autenticação),
 * e o banco guarda só a impressão digital dela.
 */

const ok = (body: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...body }, { headers: { "Cache-Control": "no-store" } });

const STATUS_BY_STATE = { open: "active", close: "disconnected", connecting: "pending" } as const;

export async function POST(request: NextRequest, { params }: RouteContext<"/api/webhooks/whatsapp/[sourceId]/[token]">) {
  const { sourceId, token } = await params;
  const denied = NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  if (!z.uuid().safeParse(sourceId).success) return denied;

  const system = createServiceClient({ type: "system" });
  const { data: source } = await system
    .from("integration_sources")
    .select("id, company_id, kind, status, secret_hash, archived_at, companies!inner(status)")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source || source.kind !== "whatsapp_device" || !keyMatches(token, source.secret_hash)) return denied;
  if (source.archived_at) return ok({ ignored: "fonte arquivada" });
  if ((source.companies as unknown as { status: string }).status !== "active") return ok({ ignored: "empresa suspensa" });

  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "Corpo grande demais." }, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const db = createServiceClient({ type: "integration", id: source.id });
  const result = translateEvolution(payload);

  if (result.kind === "connection") {
    await db
      .from("integration_sources")
      .update({
        status: STATUS_BY_STATE[result.state],
        last_error: result.state === "close" ? `Desconectado${result.reason ? ` (motivo ${result.reason})` : ""}.` : null,
      })
      .eq("id", source.id);
    return ok({ connection: result.state });
  }
  if (result.kind === "ignored") return ok({ ignored: result.reason });
  if (source.status === "paused") return ok({ ignored: "fonte pausada" });
  if (await overRateLimit(source.id, result.envelopes.length)) {
    return NextResponse.json({ error: "Limite de eventos por minuto atingido." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let processed = 0;
  for (const envelope of result.envelopes) {
    const { data: ev, error } = await db
      .from("raw_events")
      .insert({
        company_id: source.company_id,
        source_id: source.id,
        event_type: envelope.type,
        idempotency_key: envelope.idempotency_key ?? null,
        payload: envelope as unknown as NonNullable<Json>,
      })
      .select("id")
      .single();
    if (error) continue; // repetida (idempotência) ou falha de gravação já registrada no log
    const r = await processRawEvent(ev.id);
    if (r.status === "processed") processed++;
  }
  await db.from("integration_sources").update({ last_event_at: new Date().toISOString(), status: "active" }).eq("id", source.id);
  return ok({ processed, skipped: result.skipped.length });
}
