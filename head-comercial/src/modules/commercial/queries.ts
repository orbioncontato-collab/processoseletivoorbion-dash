import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { STALE_DAYS, type OpportunityFilters } from "./schemas";
import { sanitizeSearch, todayRange } from "./filters";

/**
 * Consultas do núcleo comercial. Todas usam o cliente com a sessão do usuário,
 * então o RLS do banco decide o que cada pessoa enxerga (vendedor: só o dele).
 */

type Tables = Database["public"]["Tables"];
export type StageRow = Pick<Tables["pipeline_stages"]["Row"], "id" | "name" | "kind" | "position" | "pipeline_id">;
export type OpportunityRow = Tables["opportunities"]["Row"];
export type ContactRow = Tables["contacts"]["Row"];

export interface TeamMember {
  userId: string;
  name: string;
  role: "leader" | "seller";
}

export async function getStages(companyId: string): Promise<StageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id, name, kind, position, pipeline_id, pipelines!inner(is_default)")
    .eq("company_id", companyId)
    .eq("pipelines.is_default", true)
    .is("archived_at", null)
    .order("position");
  if (error) throw new Error(`Falha ao carregar o funil: ${error.message}`);
  return (data ?? []).map(({ id, name, kind, position, pipeline_id }) => ({ id, name, kind, position, pipeline_id }));
}

export async function getTeam(companyId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw new Error(`Falha ao carregar a equipe: ${error.message}`);
  const ids = (members ?? []).map((m) => m.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  return (members ?? [])
    .map((m) => ({ userId: m.user_id, role: m.role, name: byId.get(m.user_id) ?? "Sem nome" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface OpportunityListItem extends OpportunityRow {
  contactName: string;
  stageName: string;
  ownerName: string;
}

export async function listOpportunities(
  companyId: string,
  filters: Pick<OpportunityFilters, "status"> & Partial<OpportunityFilters>,
  timeZone: string,
  limit = 200,
): Promise<OpportunityListItem[]> {
  const supabase = await createClient();
  let query = supabase.from("opportunities").select("*").eq("company_id", companyId);

  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.stage) query = query.eq("stage_id", filters.stage);
  if (filters.owner) query = query.eq("owner_id", filters.owner);

  const nowIso = new Date().toISOString();
  if (filters.due === "overdue") query = query.eq("status", "open").lt("next_step_at", nowIso);
  if (filters.due === "today") {
    const { start, end } = todayRange(timeZone);
    query = query.eq("status", "open").gte("next_step_at", start).lt("next_step_at", end);
  }
  if (filters.due === "none") query = query.eq("status", "open").is("next_step_at", null);
  if (filters.due === "stale") {
    const limitDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    query = query.eq("status", "open").lt("last_activity_at", limitDate);
  }

  if (filters.q) {
    const q = sanitizeSearch(filters.q);
    if (q) {
      const { data: matches } = await supabase
        .from("contacts")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", `%${q}%`)
        .limit(100);
      const ids = (matches ?? []).map((c) => c.id);
      query = ids.length
        ? query.or(`title.ilike.%${q}%,contact_id.in.(${ids.join(",")})`)
        : query.ilike("title", `%${q}%`);
    }
  }

  const { data, error } = await query
    .order("next_step_at", { ascending: true, nullsFirst: false })
    .order("last_activity_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Falha ao carregar oportunidades: ${error.message}`);
  const rows = data ?? [];
  return enrich(companyId, rows);
}

async function enrich(companyId: string, rows: OpportunityRow[]): Promise<OpportunityListItem[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const contactIds = [...new Set(rows.map((r) => r.contact_id))];
  const [contacts, stages, team] = await Promise.all([
    supabase.from("contacts").select("id, name").in("id", contactIds),
    supabase.from("pipeline_stages").select("id, name").eq("company_id", companyId),
    getTeam(companyId),
  ]);
  const contactName = new Map((contacts.data ?? []).map((c) => [c.id, c.name]));
  const stageName = new Map((stages.data ?? []).map((s) => [s.id, s.name]));
  const ownerName = new Map(team.map((t) => [t.userId, t.name]));
  return rows.map((r) => ({
    ...r,
    contactName: contactName.get(r.contact_id) ?? "Contato",
    stageName: stageName.get(r.stage_id) ?? "Etapa",
    ownerName: ownerName.get(r.owner_id) ?? "Ex-membro",
  }));
}

export interface PipelineSummary {
  stageId: string;
  name: string;
  count: number;
  valueCents: number;
}

/** Quantidade e valor das oportunidades em aberto por etapa. */
export async function getOpenSummary(companyId: string, stages: StageRow[]): Promise<PipelineSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("stage_id, value_cents")
    .eq("company_id", companyId)
    .eq("status", "open")
    .limit(5000);
  if (error) throw new Error(`Falha ao resumir o funil: ${error.message}`);
  return stages
    .filter((s) => s.kind === "open")
    .map((s) => {
      const inStage = (data ?? []).filter((o) => o.stage_id === s.id);
      return {
        stageId: s.id,
        name: s.name,
        count: inStage.length,
        valueCents: inStage.reduce((sum, o) => sum + Number(o.value_cents), 0),
      };
    });
}

export interface HomeCounters {
  open: number;
  openValueCents: number;
  overdue: number;
  today: number;
  withoutNextStep: number;
  stale: number;
}

/** Números do painel inicial. O RLS já limita ao que a pessoa pode ver. */
export async function getHomeCounters(companyId: string, timeZone: string): Promise<HomeCounters> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("value_cents, next_step_at, last_activity_at")
    .eq("company_id", companyId)
    .eq("status", "open")
    .limit(5000);
  if (error) throw new Error(`Falha ao carregar números: ${error.message}`);
  const now = Date.now();
  const { start, end } = todayRange(timeZone);
  const staleLimit = now - STALE_DAYS * 24 * 60 * 60 * 1000;
  const rows = data ?? [];
  return {
    open: rows.length,
    openValueCents: rows.reduce((s, r) => s + Number(r.value_cents), 0),
    overdue: rows.filter((r) => r.next_step_at && Date.parse(r.next_step_at) < now).length,
    today: rows.filter((r) => r.next_step_at && r.next_step_at >= start && r.next_step_at < end && Date.parse(r.next_step_at) >= now).length,
    withoutNextStep: rows.filter((r) => !r.next_step_at).length,
    stale: rows.filter((r) => Date.parse(r.last_activity_at) < staleLimit).length,
  };
}

export async function getOpportunity(companyId: string, id: string) {
  const supabase = await createClient();
  const { data: opp, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar a oportunidade: ${error.message}`);
  if (!opp) return null;

  const [contact, objections] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", opp.contact_id).maybeSingle(),
    supabase
      .from("opportunity_objections")
      .select("id, description, category, status, created_by, created_at")
      .eq("opportunity_id", id)
      .order("created_at"),
  ]);
  return { opp, contact: contact.data, objections: objections.data ?? [] };
}

export async function getOpportunityTimeline(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id, actor_type, actor_id, action, entity_type, entity_id, changes, occurred_at")
    .or(`entity_id.eq.${id},metadata->>opportunity_id.eq.${id}`)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Falha ao carregar o histórico: ${error.message}`);
  return data ?? [];
}

export async function listContacts(companyId: string, q?: string, includeArchived = false) {
  const supabase = await createClient();
  let query = supabase.from("contacts").select("*").eq("company_id", companyId);
  if (!includeArchived) query = query.is("archived_at", null);
  const term = q ? sanitizeSearch(q) : "";
  if (term) {
    const digits = term.replace(/\D/g, "");
    query = digits.length >= 4
      ? query.or(`name.ilike.%${term}%,phone_e164.ilike.%${digits}%`)
      : query.ilike("name", `%${term}%`);
  }
  const { data, error } = await query.order("name").limit(300);
  if (error) throw new Error(`Falha ao carregar contatos: ${error.message}`);
  return data ?? [];
}
