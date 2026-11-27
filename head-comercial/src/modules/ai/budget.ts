import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { monthStart } from "./usage";

/** Teto mensal de gasto com IA por empresa (definido pela administração). Sem teto, nunca bloqueia. */
export async function aiBudget(companyId: string): Promise<{ limitMicros: number | null; usedMicros: number; exceeded: boolean }> {
  const db = createServiceClient({ type: "system" });
  const { data: company } = await db.from("companies").select("timezone, ai_monthly_limit_micros").eq("id", companyId).maybeSingle();
  const limit = company?.ai_monthly_limit_micros == null ? null : Number(company.ai_monthly_limit_micros);
  if (limit === null) return { limitMicros: null, usedMicros: 0, exceeded: false };
  const { data } = await db
    .from("ai_runs")
    .select("cost_micros")
    .eq("company_id", companyId)
    .gte("created_at", monthStart(company?.timezone ?? "America/Sao_Paulo"))
    .limit(50000);
  const used = (data ?? []).reduce((s, r) => s + Number(r.cost_micros), 0);
  return { limitMicros: limit, usedMicros: used, exceeded: used >= limit };
}

export const BUDGET_MESSAGE = "O limite mensal de uso da IA desta empresa foi atingido. Fale com a administração da Orbion.";
