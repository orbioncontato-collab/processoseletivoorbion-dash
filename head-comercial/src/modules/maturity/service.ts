import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { localDate } from "@/modules/ai/daily-summary";
import { computeMaturity } from "./score";

/** Dias úteis do relatório (1 = segunda ... 7 = domingo) nos últimos N dias, até ontem. */
export function expectedReportDays(weekdays: number[], days: number, now = new Date()): number {
  let count = 0;
  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (weekdays.includes(iso)) count++;
  }
  return count;
}

/** Calcula a maturidade da empresa com os dados reais e grava a foto do mês. */
export async function refreshMaturity(companyId: string, actorId: string | null, now = new Date()) {
  const db = createServiceClient(actorId ? { type: "user", id: actorId } : { type: "automation" });
  const d30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const d90 = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const { data: companyRow } = await db.from("companies").select("timezone").eq("id", companyId).single();
  const tz = companyRow?.timezone ?? "America/Sao_Paulo";
  const today = localDate(tz, now);

  const [settings, open, template, sellers, reports, analyses, trainings, actions] = await Promise.all([
    db.from("company_settings").select("stale_days").eq("company_id", companyId).maybeSingle(),
    db.from("opportunities").select("next_step_at, last_activity_at").eq("company_id", companyId).eq("status", "open").limit(5000),
    db.from("report_templates").select("weekdays").eq("company_id", companyId).eq("active", true).maybeSingle(),
    db.from("memberships").select("user_id", { count: "exact", head: true }).eq("company_id", companyId).eq("role", "seller").eq("status", "active"),
    db.from("report_submissions").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("reference_date", d30.slice(0, 10)),
    db.from("conversation_analyses").select("score").eq("company_id", companyId).gte("created_at", d90).not("score", "is", null).limit(2000),
    db.from("training_assignments").select("status").eq("company_id", companyId).gte("created_at", d90).limit(2000),
    db.from("action_items").select("status, due_date, completed_at").eq("company_id", companyId).gte("due_date", d30.slice(0, 10)).lt("due_date", today).limit(2000),
  ]);
  const weekdays = (template.data?.weekdays as number[] | undefined) ?? null;
  const expected = weekdays ? expectedReportDays(weekdays, 30, now) * (sellers.count ?? 0) : 0;

  const result = computeMaturity({
    now,
    staleDays: settings.data?.stale_days ?? 7,
    openOpps: open.data ?? [],
    reports: weekdays ? { sent: reports.count ?? 0, expected } : null,
    analysisScores: (analyses.data ?? []).map((a) => Number(a.score)),
    trainings: trainings.data ?? [],
    actions: (actions.data ?? []).filter((a): a is { status: string; due_date: string; completed_at: string | null } => Boolean(a.due_date)),
  });

  const period = `${today.slice(0, 7)}-01`;
  const { error } = await db.from("maturity_assessments").upsert(
    { company_id: companyId, period, overall: result.overall, dimensions: result.dimensions as unknown as never, computed_at: now.toISOString(), computed_by: actorId },
    { onConflict: "company_id,period" },
  );
  if (error) throw new Error(error.message);
  return result;
}
