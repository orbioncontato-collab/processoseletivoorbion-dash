import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";
import { exactIlike } from "@/modules/team/service";
import {
  contactDataSchema,
  describeIssues,
  opportunityDataSchema,
  readLostReason,
  readPhone,
  readValueCents,
  resolveStage,
  type ContactData,
  type StageRef,
} from "./standard";

/**
 * Processador de eventos: lê o evento bruto, traduz para o formato do Head e
 * grava contatos e oportunidades. Roda com a chave secreta e registra o autor
 * como "integração" (id da fonte), então tudo aparece no histórico.
 *
 * Erros de dados (etapa sem mapeamento, contato inexistente, campo inválido)
 * deixam o evento como "falhou" com uma mensagem clara, para corrigir e reprocessar.
 */

type Db = ReturnType<typeof createServiceClient>;
type SourceRow = Pick<
  Database["public"]["Tables"]["integration_sources"]["Row"],
  "id" | "company_id" | "kind" | "status" | "owner_user_id" | "config"
>;
type RecordSource = "crm" | "import" | "api" | "whatsapp";

class DataError extends Error {}

export interface ProcessOutcome {
  status: "processed" | "failed" | "ignored";
  error?: string;
  result?: Record<string, unknown>;
}

const SOURCE_BY_KIND: Record<string, RecordSource> = {
  crm: "crm",
  import: "import",
  webhook: "api",
  whatsapp_device: "whatsapp",
  whatsapp_cloud: "whatsapp",
};

interface Ctx {
  db: Db;
  source: SourceRow;
  warnings: string[];
  ownerCache: Map<string, string | null>;
  stages?: (StageRef & { pipeline_id: string })[];
}

function stageMapOf(source: SourceRow): Record<string, string> {
  const cfg = (source.config ?? {}) as Record<string, unknown>;
  const map = cfg.stage_map;
  return map && typeof map === "object" && !Array.isArray(map) ? (map as Record<string, string>) : {};
}

async function loadStages(ctx: Ctx) {
  if (ctx.stages) return ctx.stages;
  const { data, error } = await ctx.db
    .from("pipeline_stages")
    .select("id, name, kind, pipeline_id, pipelines!inner(is_default)")
    .eq("company_id", ctx.source.company_id)
    .eq("pipelines.is_default", true)
    .is("archived_at", null)
    .order("position");
  if (error) throw error;
  ctx.stages = (data ?? []).map(({ id, name, kind, pipeline_id }) => ({ id, name, kind, pipeline_id }));
  return ctx.stages;
}

/** Responsável: e-mail informado (se for membro ativo) > dono da fonte > primeiro líder. */
async function resolveOwner(ctx: Ctx, email?: string): Promise<string> {
  const key = email?.toLowerCase() ?? "";
  if (ctx.ownerCache.has(key)) {
    const cached = ctx.ownerCache.get(key);
    if (cached) return cached;
  }
  const { data: members, error } = await ctx.db
    .from("memberships")
    .select("user_id, role")
    .eq("company_id", ctx.source.company_id)
    .eq("status", "active");
  if (error) throw error;
  const active = new Set((members ?? []).map((m) => m.user_id));

  let owner: string | null = null;
  if (email) {
    const { data: profile } = await ctx.db.from("profiles").select("id").ilike("email", exactIlike(email)).maybeSingle();
    if (profile && active.has(profile.id)) owner = profile.id;
    else ctx.warnings.push(`Responsável "${email}" não é membro ativo; usado o responsável padrão.`);
  }
  if (!owner && ctx.source.owner_user_id && active.has(ctx.source.owner_user_id)) owner = ctx.source.owner_user_id;
  if (!owner) owner = (members ?? []).find((m) => m.role === "leader")?.user_id ?? null;
  if (!owner) throw new DataError("A empresa não tem nenhum líder ativo para receber os registros.");
  ctx.ownerCache.set(key, owner);
  return owner;
}

async function findRef(ctx: Ctx, entityType: "contact" | "opportunity", externalId: string) {
  const { data, error } = await ctx.db
    .from("external_refs")
    .select("entity_id")
    .eq("source_id", ctx.source.id)
    .eq("entity_type", entityType)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw error;
  return data?.entity_id ?? null;
}

async function saveRef(ctx: Ctx, entityType: "contact" | "opportunity", externalId: string, entityId: string) {
  const { error } = await ctx.db
    .from("external_refs")
    .upsert(
      { company_id: ctx.source.company_id, source_id: ctx.source.id, entity_type: entityType, entity_id: entityId, external_id: externalId },
      { onConflict: "source_id,entity_type,external_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

async function upsertContact(ctx: Ctx, data: Partial<ContactData> & { name: string }): Promise<{ id: string; created: boolean }> {
  const { phone, warning } = readPhone(data.phone);
  if (warning) ctx.warnings.push(warning);
  const company = ctx.source.company_id;

  let id = data.external_id ? await findRef(ctx, "contact", data.external_id) : null;
  if (!id && phone) {
    const { data: byPhone } = await ctx.db
      .from("contacts")
      .select("id")
      .eq("company_id", company)
      .eq("phone_e164", phone)
      .is("archived_at", null)
      .maybeSingle();
    id = byPhone?.id ?? null;
  }

  if (id) {
    const changes: Database["public"]["Tables"]["contacts"]["Update"] = { name: data.name };
    if (phone) changes.phone_e164 = phone;
    if (data.email) changes.email = data.email.toLowerCase();
    if (data.organization) changes.organization = data.organization;
    if (data.owner_email) changes.owner_id = await resolveOwner(ctx, data.owner_email);
    const { error } = await ctx.db.from("contacts").update(changes).eq("id", id).eq("company_id", company);
    if (error?.code === "23505") {
      // O telefone novo já pertence a outro contato: mantém o resto e avisa.
      delete changes.phone_e164;
      ctx.warnings.push(`Telefone ${phone} já pertence a outro contato; não foi alterado.`);
      const retry = await ctx.db.from("contacts").update(changes).eq("id", id).eq("company_id", company);
      if (retry.error) throw retry.error;
    } else if (error) throw error;
    if (data.external_id) await saveRef(ctx, "contact", data.external_id, id);
    return { id, created: false };
  }

  const { data: created, error } = await ctx.db
    .from("contacts")
    .insert({
      company_id: company,
      owner_id: await resolveOwner(ctx, data.owner_email),
      name: data.name,
      phone_e164: phone,
      email: data.email?.toLowerCase() ?? null,
      organization: data.organization ?? null,
      notes: data.notes ?? null,
      source: SOURCE_BY_KIND[ctx.source.kind] ?? "api",
    })
    .select("id")
    .single();
  if (error) throw error;
  if (data.external_id) await saveRef(ctx, "contact", data.external_id, created.id);
  return { id: created.id, created: true };
}

async function handleContact(ctx: Ctx, payload: Record<string, unknown>) {
  const parsed = contactDataSchema.safeParse(payload);
  if (!parsed.success) throw new DataError(describeIssues(parsed.error));
  const r = await upsertContact(ctx, parsed.data);
  return { contact_id: r.id, created: r.created };
}

async function handleOpportunity(ctx: Ctx, payload: Record<string, unknown>) {
  const parsed = opportunityDataSchema.safeParse(payload);
  if (!parsed.success) throw new DataError(describeIssues(parsed.error));
  const d = parsed.data;

  // Contato: pela referência externa ou criado/atualizado a partir dos dados enviados.
  let contactId: string | null = null;
  if (d.contact_external_id) contactId = await findRef(ctx, "contact", d.contact_external_id);
  if (!contactId && d.contact?.name) {
    contactId = (await upsertContact(ctx, { ...d.contact, name: d.contact.name, external_id: d.contact.external_id ?? d.contact_external_id })).id;
  }
  if (!contactId) {
    throw new DataError(`Contato "${d.contact_external_id ?? ""}" não encontrado. Envie o contato antes ou junto (campo contact).`);
  }

  const value = readValueCents(d.value);
  if (value === null) throw new DataError(`Valor "${String(d.value)}" inválido.`);

  const stages = await loadStages(ctx);
  const existingId = await findRef(ctx, "opportunity", d.external_id);
  const stage = resolveStage({ stage: d.stage, status: d.status }, stageMapOf(ctx.source), stages, !existingId);
  if ("error" in stage) throw new DataError(stage.error);
  const stageRow = "stageId" in stage ? stages.find((s) => s.id === stage.stageId)! : null;
  const lost = stageRow?.kind === "lost" ? readLostReason(d.lost_reason) : null;

  // Só entram os campos que vieram no evento. O que a fonte não envia pertence
  // ao Head (ex.: próximo passo cadastrado pelo vendedor) e não é apagado (D009).
  const fields: Database["public"]["Tables"]["opportunities"]["Update"] = { title: d.title };
  if (d.product !== undefined) fields.product = d.product;
  if (d.value !== undefined) fields.value_cents = value;
  if (d.next_step !== undefined) {
    fields.next_step = d.next_step;
    fields.next_step_at = d.next_step_at ? new Date(d.next_step_at).toISOString() : null;
  }
  if (d.expected_close_date !== undefined) fields.expected_close_date = d.expected_close_date;
  if (stageRow) fields.stage_id = stageRow.id;
  if (lost) {
    fields.lost_reason = lost.reason;
    fields.lost_reason_detail = lost.detail;
  }

  if (existingId) {
    const update: Database["public"]["Tables"]["opportunities"]["Update"] = { ...fields, contact_id: contactId };
    if (d.owner_email) update.owner_id = await resolveOwner(ctx, d.owner_email);
    const { error } = await ctx.db
      .from("opportunities")
      .update(update)
      .eq("id", existingId)
      .eq("company_id", ctx.source.company_id);
    if (error) throw error;
    return { opportunity_id: existingId, created: false };
  }

  const { data: created, error } = await ctx.db
    .from("opportunities")
    .insert({
      ...fields,
      title: d.title,
      company_id: ctx.source.company_id,
      contact_id: contactId,
      owner_id: await resolveOwner(ctx, d.owner_email),
      pipeline_id: stageRow!.pipeline_id,
      stage_id: stageRow!.id,
      source: SOURCE_BY_KIND[ctx.source.kind] ?? "api",
    })
    .select("id")
    .single();
  if (error) throw error;
  await saveRef(ctx, "opportunity", d.external_id, created.id);
  return { opportunity_id: created.id, created: true };
}

/** Processa um evento já gravado em raw_events. Nunca lança erro: devolve o resultado. */
export async function processRawEvent(eventId: number): Promise<ProcessOutcome> {
  const system = createServiceClient({ type: "system" });
  const { data: event, error: loadError } = await system
    .from("raw_events")
    .select("id, company_id, source_id, event_type, payload, attempts, status")
    .eq("id", eventId)
    .maybeSingle();
  if (loadError || !event) return { status: "failed", error: "Evento não encontrado." };
  if (event.status === "processed") return { status: "processed" };

  const { data: source } = await system
    .from("integration_sources")
    .select("id, company_id, kind, status, owner_user_id, config")
    .eq("id", event.source_id)
    .maybeSingle();

  const ctx: Ctx = {
    db: createServiceClient({ type: "integration", id: event.source_id }),
    source: source!,
    warnings: [],
    ownerCache: new Map(),
  };

  let outcome: ProcessOutcome;
  try {
    if (!source) throw new DataError("Fonte não encontrada.");
    const data = (event.payload as { data?: Record<string, unknown> })?.data ?? {};
    let result: Record<string, unknown>;
    switch (event.event_type) {
      case "contact.upsert":
        result = await handleContact(ctx, data);
        break;
      case "opportunity.upsert":
        result = await handleOpportunity(ctx, data);
        break;
      default:
        // Mensagens entram na etapa de conversas (F2C); por enquanto ficam guardadas.
        outcome = { status: "ignored", error: "Tipo de evento ainda não processado." };
        await finish(system, event.id, event.attempts, outcome);
        return outcome;
    }
    outcome = { status: "processed", result: ctx.warnings.length ? { ...result, avisos: ctx.warnings } : result };
  } catch (err) {
    if (err instanceof DataError) {
      outcome = { status: "failed", error: err.message };
    } else {
      console.error("[integrations] falha ao processar evento", event.id, err);
      const code = (err as { code?: string })?.code;
      outcome = {
        status: "failed",
        error:
          code === "23505"
            ? "Registro duplicado (ex.: telefone já usado por outro contato)."
            : "Erro inesperado ao gravar. O evento pode ser reprocessado.",
      };
    }
  }

  await finish(system, event.id, event.attempts, outcome);
  return outcome;
}

async function finish(db: Db, id: number, attempts: number, outcome: ProcessOutcome) {
  await db
    .from("raw_events")
    .update({
      status: outcome.status,
      error: outcome.error?.slice(0, 1000) ?? null,
      result: (outcome.result ?? null) as Database["public"]["Tables"]["raw_events"]["Update"]["result"],
      attempts: attempts + 1,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);
}
