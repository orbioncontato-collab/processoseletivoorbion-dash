"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { generateSourceKey } from "./keys";
import { processRawEvent } from "./processor";
import { csvToEvents, parseCsv } from "./csv";

/**
 * Ações de integração. Só o líder da empresa (ou admin) pode usar.
 * As fontes guardam a impressão digital de chaves, então a escrita é feita
 * pelo servidor com a chave secreta, depois da checagem de permissão.
 */

export type KeyState = (ActionState & { key?: string; sourceId?: string }) | null;

const PROVIDERS = ["generic", "ghl", "rdstation", "pipedrive", "hubspot", "kommo", "agendor", "make", "zapier", "n8n", "outro"] as const;

async function leaderDb() {
  const ctx = await requireCompany();
  if (ctx.company.role !== "leader" && !ctx.user.isPlatformAdmin) return null;
  return { ...ctx, db: createServiceClient({ type: "user", id: ctx.user.id }) };
}

async function ownSource(ctx: NonNullable<Awaited<ReturnType<typeof leaderDb>>>, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await ctx.db
    .from("integration_sources")
    .select("id, kind, config, status")
    .eq("id", id)
    .eq("company_id", ctx.company.companyId)
    .maybeSingle();
  return data;
}

const createSourceSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a conexão.").max(80, "Máximo de 80 caracteres."),
  kind: z.enum(["webhook", "crm"]),
  provider: z.enum(PROVIDERS).default("generic"),
});

export async function createSource(_prev: KeyState, formData: FormData): Promise<KeyState> {
  const ctx = await leaderDb();
  if (!ctx) return { ok: false, message: "Só o líder pode criar conexões." };
  const parsed = createSourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { key, hash, hint } = generateSourceKey();
  const { data, error } = await ctx.db
    .from("integration_sources")
    .insert({
      company_id: ctx.company.companyId,
      kind: parsed.data.kind,
      provider: parsed.data.provider,
      name: parsed.data.name,
      secret_hash: hash,
      secret_hint: hint,
      owner_user_id: ctx.user.id,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return unexpected("createSource", error.message);
  refresh();
  return { ok: true, message: "Conexão criada. Copie a chave agora: ela não será mostrada de novo.", key, sourceId: data.id };
}

export async function rotateSourceKey(_prev: KeyState, formData: FormData): Promise<KeyState> {
  const ctx = await leaderDb();
  if (!ctx) return { ok: false, message: "Só o líder pode trocar a chave." };
  const source = await ownSource(ctx, String(formData.get("id") ?? ""));
  if (!source || !["webhook", "crm"].includes(source.kind)) return { ok: false, message: "Conexão não encontrada." };

  const { key, hash, hint } = generateSourceKey();
  const { error } = await ctx.db
    .from("integration_sources")
    .update({ secret_hash: hash, secret_hint: hint })
    .eq("id", source.id);
  if (error) return unexpected("rotateSourceKey", error.message);
  refresh();
  return { ok: true, message: "Nova chave gerada. A anterior parou de funcionar.", key, sourceId: source.id };
}

export async function setSourceStatus(formData: FormData): Promise<void> {
  const ctx = await leaderDb();
  if (!ctx) return;
  const source = await ownSource(ctx, String(formData.get("id") ?? ""));
  const status = formData.get("status") === "paused" ? "paused" : "active";
  if (!source) return;
  await ctx.db.from("integration_sources").update({ status }).eq("id", source.id);
  refresh();
}

/** Salva o mapeamento "etapa no CRM" -> "etapa do Head". */
export async function saveStageMap(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leaderDb();
  if (!ctx) return { ok: false, message: "Só o líder pode alterar o mapeamento." };
  const source = await ownSource(ctx, String(formData.get("id") ?? ""));
  if (!source) return { ok: false, message: "Conexão não encontrada." };

  const externals = formData.getAll("external").map(String);
  const targets = formData.getAll("target").map(String);
  const { data: stages } = await ctx.db
    .from("pipeline_stages")
    .select("id")
    .eq("company_id", ctx.company.companyId)
    .is("archived_at", null);
  const valid = new Set((stages ?? []).map((s) => s.id));

  const map: Record<string, string> = {};
  externals.forEach((ext, i) => {
    const name = ext.trim().slice(0, 120);
    const target = targets[i];
    if (name && target && valid.has(target)) map[name] = target;
  });

  const config = { ...((source.config ?? {}) as Record<string, Json>), stage_map: map };
  const { error } = await ctx.db.from("integration_sources").update({ config }).eq("id", source.id);
  if (error) return unexpected("saveStageMap", error.message);
  refresh();
  return { ok: true, message: `Mapeamento salvo (${Object.keys(map).length} etapa(s)).` };
}

/** Reprocessa os eventos que falharam (até 100 por vez). */
export async function reprocessFailed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leaderDb();
  if (!ctx) return { ok: false, message: "Só o líder pode reprocessar." };
  const source = await ownSource(ctx, String(formData.get("id") ?? ""));
  if (!source) return { ok: false, message: "Conexão não encontrada." };

  const { data: failed } = await ctx.db
    .from("raw_events")
    .select("id")
    .eq("source_id", source.id)
    .eq("status", "failed")
    .order("id")
    .limit(100);
  let ok = 0;
  for (const e of failed ?? []) {
    const r = await processRawEvent(e.id);
    if (r.status === "processed") ok++;
  }
  refresh();
  const total = failed?.length ?? 0;
  return {
    ok: true,
    message: total ? `${ok} de ${total} evento(s) processado(s) com sucesso.` : "Nenhum evento com falha.",
  };
}

const MAX_FILE_BYTES = 2_000_000;

/** Importa contatos e oportunidades de uma planilha CSV pelo mesmo processador do webhook. */
export async function importCsv(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leaderDb();
  if (!ctx) return { ok: false, message: "Só o líder pode importar planilhas." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, fieldErrors: { file: ["Escolha um arquivo .csv."] } };
  if (file.size > MAX_FILE_BYTES) return { ok: false, fieldErrors: { file: ["Arquivo grande demais (máximo de 2 MB)."] } };
  if (!/\.csv$/i.test(file.name)) return { ok: false, fieldErrors: { file: ["Use um arquivo .csv (no Excel: Salvar como > CSV)."] } };

  const { events, errors } = csvToEvents(parseCsv(await file.text()), ctx.company.timezone);
  if (!events.length) {
    return { ok: false, message: errors.map((e) => `Linha ${e.line}: ${e.message}`).slice(0, 5).join(" · ") || "Nada para importar." };
  }

  // Uma fonte "Importação por planilha" por empresa.
  let { data: source } = await ctx.db
    .from("integration_sources")
    .select("id")
    .eq("company_id", ctx.company.companyId)
    .eq("kind", "import")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (!source) {
    const created = await ctx.db
      .from("integration_sources")
      .insert({
        company_id: ctx.company.companyId,
        kind: "import",
        provider: "generic",
        name: "Importação por planilha",
        owner_user_id: ctx.user.id,
        created_by: ctx.user.id,
      })
      .select("id")
      .single();
    if (created.error) return unexpected("importCsv.source", created.error.message);
    source = created.data;
  }

  const db = createServiceClient({ type: "integration", id: source.id });
  let processed = 0;
  let failed = 0;
  for (const envelope of events) {
    const { data: ev, error } = await db
      .from("raw_events")
      .insert({
        company_id: ctx.company.companyId,
        source_id: source.id,
        event_type: envelope.type,
        payload: envelope as unknown as NonNullable<Json>,
      })
      .select("id")
      .single();
    if (error) {
      failed++;
      continue;
    }
    const r = await processRawEvent(ev.id);
    if (r.status === "processed") processed++;
    else failed++;
  }
  await db.from("integration_sources").update({ last_event_at: new Date().toISOString() }).eq("id", source.id);
  refresh();

  const parts = [`${processed} linha(s) importada(s)`];
  if (failed) parts.push(`${failed} com falha (veja em Importação por planilha)`);
  if (errors.length) parts.push(`${errors.length} ignorada(s) por erro na planilha: ${errors.slice(0, 3).map((e) => `linha ${e.line}: ${e.message}`).join("; ")}`);
  return { ok: failed === 0 && errors.length === 0, message: parts.join(" · ") + "." };
}
