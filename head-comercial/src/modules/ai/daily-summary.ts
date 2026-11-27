import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, getAnthropic } from "@/lib/ai/client";
import { createServiceClient } from "@/lib/supabase/service";
import { formatMoney } from "@/lib/format";
import { todayRange } from "@/modules/commercial/filters";
import { ALERT_LABELS, type AlertType } from "@/modules/alerts/rules";
import { recordRun } from "./agent";
import { addUsage, emptyUsage } from "./pricing";
import { aiBudget } from "./budget";

/**
 * Resumo do dia para os líderes. Os números são juntados pelo servidor (o líder
 * vê toda a empresa, então a leitura é da empresa inteira) e a IA escreve o
 * texto. O resumo vira uma conversa no chat de cada líder, que pode continuar
 * perguntando a partir dele.
 */

export const SUMMARY_SYSTEM = `Você é o Head Comercial Digital e escreve o resumo do dia para os líderes comerciais de uma empresa.

Você recebe os números de ontem e a situação de agora em <dados>. Escreva um resumo curto que o líder leia em um minuto:
- Primeiro, como foi ontem em uma ou duas frases (conversas, mensagens, ganhos, relatórios).
- Depois, o que pede atenção hoje: os pontos mais graves, com o nome da pessoa ou da negociação.
- Termine com até três ações para o líder hoje, cada uma com quem ou o quê.

Regras:
- Use só os números recebidos. Não invente nada.
- Se um número estiver zerado ou faltar, diga isso de forma simples, sem dramatizar.
- Divergência entre relatório e captura é possível atividade fora dos canais conectados. Nunca acuse ninguém.
- Português do Brasil, linguagem simples, frases curtas, sem travessão. Listas simples com hífen. Sem tabelas nem títulos.`;

type Db = ReturnType<typeof createServiceClient>;

export interface Snapshot {
  empresa: string;
  data_de_hoje: string;
  ontem: {
    por_vendedor: { vendedor: string; conversas: number; mensagens_enviadas: number; mensagens_recebidas: number; tempo_medio_primeira_resposta_min: number | null }[];
    negociacoes_ganhas: { titulo: string; valor: string; vendedor: string }[];
    negociacoes_perdidas: { titulo: string; motivo: string | null; vendedor: string }[];
    relatorios_enviados: number;
    vendedores_ativos: number;
  };
  agora: {
    negociacoes_abertas: number;
    valor_em_aberto: string;
    alertas_abertos: number;
    alertas_por_tipo: Record<string, number>;
    alertas_por_pessoa: { pessoa: string; alertas: number; graves: number }[];
    maiores_negociacoes_abertas: { titulo: string; valor: string; vendedor: string; proximo_passo: string | null; proximo_passo_vencido: boolean }[];
    divergencias_em_aberto: number;
  };
}

/** Ontem no fuso da empresa (24 horas antes do dia de hoje). */
export function yesterdayRange(timeZone: string, now = new Date()) {
  const { start } = todayRange(timeZone, now);
  const end = new Date(start);
  return { start: new Date(end.getTime() - 86_400_000).toISOString(), end: end.toISOString() };
}

export function localDate(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

export function localHour(timeZone: string, now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
}

/** Hora de gerar? Depois do horário escolhido e só uma vez por dia. */
export function isDue(s: { daily_summary_hour: number; daily_summary_last_date: string | null }, timeZone: string, now = new Date()) {
  const today = localDate(timeZone, now);
  return localHour(timeZone, now) >= s.daily_summary_hour && (!s.daily_summary_last_date || s.daily_summary_last_date < today);
}

export async function gatherSnapshot(db: Db, company: { id: string; name: string; timezone: string }, now = new Date()): Promise<Snapshot> {
  await db.rpc("refresh_alerts", { target_company: company.id });
  const y = yesterdayRange(company.timezone, now);
  const yDate = localDate(company.timezone, new Date(Date.parse(y.start) + 3_600_000));

  const { data: members } = await db.from("memberships").select("user_id, role").eq("company_id", company.id).eq("status", "active");
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const name = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  const who = (id: string) => name.get(id) ?? "Ex-membro";

  const [metrics, won, lost, reports, open, alerts, divergences] = await Promise.all([
    db.rpc("seller_daily_metrics", { target_company: company.id, period_start: y.start, period_end: y.end }),
    db.from("opportunities").select("title, value_cents, owner_id").eq("company_id", company.id).eq("status", "won").gte("closed_at", y.start).lt("closed_at", y.end),
    db.from("opportunities").select("title, lost_reason, owner_id").eq("company_id", company.id).eq("status", "lost").gte("closed_at", y.start).lt("closed_at", y.end),
    db.from("report_submissions").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("reference_date", yDate),
    db.from("opportunities").select("title, value_cents, owner_id, next_step, next_step_at").eq("company_id", company.id).eq("status", "open").order("value_cents", { ascending: false }).limit(1000),
    db.from("alerts").select("type, severity, user_id").eq("company_id", company.id).eq("status", "open").limit(2000),
    db.from("divergences").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "open"),
  ]);

  const openRows = open.data ?? [];
  const alertRows = alerts.data ?? [];
  const byType: Record<string, number> = {};
  const byPerson = new Map<string, { alertas: number; graves: number }>();
  for (const a of alertRows) {
    const label = ALERT_LABELS[a.type as AlertType]?.many ?? a.type;
    byType[label] = (byType[label] ?? 0) + 1;
    const p = byPerson.get(a.user_id) ?? { alertas: 0, graves: 0 };
    p.alertas++;
    if (a.severity === "high") p.graves++;
    byPerson.set(a.user_id, p);
  }
  const nowIso = now.toISOString();

  return {
    empresa: company.name,
    data_de_hoje: new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: company.timezone }).format(now),
    ontem: {
      por_vendedor: (metrics.data ?? []).map((m) => ({
        vendedor: who(m.owner_id),
        conversas: m.conversations_active,
        mensagens_enviadas: m.messages_outbound,
        mensagens_recebidas: m.messages_inbound,
        tempo_medio_primeira_resposta_min: m.avg_first_response_seconds == null ? null : Math.round(m.avg_first_response_seconds / 60),
      })),
      negociacoes_ganhas: (won.data ?? []).map((o) => ({ titulo: o.title, valor: formatMoney(o.value_cents), vendedor: who(o.owner_id) })),
      negociacoes_perdidas: (lost.data ?? []).map((o) => ({ titulo: o.title, motivo: o.lost_reason, vendedor: who(o.owner_id) })),
      relatorios_enviados: reports.count ?? 0,
      vendedores_ativos: (members ?? []).filter((m) => m.role === "seller").length,
    },
    agora: {
      negociacoes_abertas: openRows.length,
      valor_em_aberto: formatMoney(openRows.reduce((s, o) => s + o.value_cents, 0)),
      alertas_abertos: alertRows.length,
      alertas_por_tipo: byType,
      alertas_por_pessoa: [...byPerson.entries()]
        .map(([id, v]) => ({ pessoa: who(id), ...v }))
        .sort((a, b) => b.graves - a.graves || b.alertas - a.alertas)
        .slice(0, 8),
      maiores_negociacoes_abertas: openRows.slice(0, 5).map((o) => ({
        titulo: o.title,
        valor: formatMoney(o.value_cents),
        vendedor: who(o.owner_id),
        proximo_passo: o.next_step,
        proximo_passo_vencido: Boolean(o.next_step_at && o.next_step_at < nowIso),
      })),
      divergencias_em_aberto: divergences.count ?? 0,
    },
  };
}

export function summaryTitle(timeZone: string, now = new Date()): string {
  return `Resumo do dia ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone }).format(now)}`;
}

/** Gera e entrega o resumo de uma empresa. Devolve quantos líderes receberam. */
export async function generateDailySummary(companyId: string, now = new Date()): Promise<{ delivered: number; status: string }> {
  const client = await getAnthropic();
  if (!client) return { delivered: 0, status: "ai_not_configured" };
  const db = createServiceClient({ type: "agent" });

  const { data: company } = await db.from("companies").select("id, name, timezone").eq("id", companyId).maybeSingle();
  if (!company) return { delivered: 0, status: "company_not_found" };
  const { data: leaders } = await db.from("memberships").select("user_id").eq("company_id", companyId).eq("role", "leader").eq("status", "active");
  if (!leaders?.length) return { delivered: 0, status: "no_leaders" };
  if ((await aiBudget(companyId)).exceeded) return { delivered: 0, status: "budget_exceeded" };

  const snapshot = await gatherSnapshot(db, company, now);
  const started = Date.now();
  let usage = emptyUsage();
  let servedModel: string = AI_MODEL;
  let stopReason: string | null = null;
  let status = "ok";
  let errorDetail: string | null = null;
  let text = "";
  try {
    const response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: [{ type: "text", text: SUMMARY_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `<dados>\n${JSON.stringify(snapshot, null, 1)}\n</dados>\n\nEscreva o resumo do dia.` }],
    });
    usage = addUsage(usage, response.usage);
    servedModel = response.model;
    stopReason = response.stop_reason;
    if (response.stop_reason === "refusal") status = "refused";
    text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();
    if (!text && status === "ok") status = "error";
  } catch (err) {
    status = "error";
    errorDetail = err instanceof Anthropic.APIError ? `${err.status ?? ""} ${err.message}`.slice(0, 2000) : String(err).slice(0, 2000);
  }

  const runId = await recordRun({
    ctx: { companyId, companyName: company.name, userId: leaders[0].user_id, userName: "", role: "leader", timezone: company.timezone },
    agent: "head",
    purpose: "daily_summary",
    servedModel,
    status,
    stopReason,
    error: errorDetail,
    requests: 1,
    toolCalls: 0,
    usage,
    durationMs: Date.now() - started,
  });
  if (status !== "ok") {
    console.error("[dailySummary]", companyId, status, errorDetail);
    return { delivered: 0, status };
  }

  const title = summaryTitle(company.timezone, now);
  let delivered = 0;
  for (const l of leaders) {
    const { data: thread } = await db
      .from("agent_threads")
      .insert({ company_id: companyId, user_id: l.user_id, agent: "head", kind: "daily_summary", title })
      .select("id")
      .single();
    if (!thread) continue;
    const { error } = await db
      .from("agent_messages")
      .insert({ company_id: companyId, thread_id: thread.id, role: "assistant", agent: "head", content: text, run_id: runId });
    if (!error) delivered++;
  }
  await db.from("company_settings").update({ daily_summary_last_date: localDate(company.timezone, now) }).eq("company_id", companyId);
  return { delivered, status };
}

/** Agendador: gera para as empresas com o resumo ligado e no horário. */
export async function runDueSummaries(opts: { force?: boolean; companyId?: string } = {}, now = new Date()) {
  const db = createServiceClient({ type: "automation" });
  let q = db
    .from("company_settings")
    .select("company_id, daily_summary_hour, daily_summary_last_date, companies!inner(status, timezone)")
    .eq("daily_summary_enabled", true)
    .eq("companies.status", "active");
  if (opts.companyId) q = q.eq("company_id", opts.companyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const results: { companyId: string; delivered: number; status: string }[] = [];
  for (const s of data ?? []) {
    const tz = (s.companies as unknown as { timezone: string }).timezone;
    if (!opts.force && !isDue(s, tz, now)) continue;
    results.push({ companyId: s.company_id, ...(await generateDailySummary(s.company_id, now)) });
  }
  return results;
}
