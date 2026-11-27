import "server-only";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToUtc } from "@/lib/format";

/** Consumo da IA a partir de ai_runs (o RLS decide: líder vê a empresa, admin vê tudo). */

export interface UsageSummary {
  companyId: string | null;
  runs: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costMicros: number;
  byPurpose: Record<string, { runs: number; costMicros: number }>;
}

const empty = (companyId: string | null): UsageSummary => ({
  companyId,
  runs: 0,
  errors: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  costMicros: 0,
  byPurpose: {},
});

/** Primeiro dia do mês atual no fuso indicado, em UTC. */
export function monthStart(timeZone: string, now = new Date()): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).format(now).split("-");
  return zonedLocalToUtc(`${y}-${m}-01T00:00`, timeZone)!.toISOString();
}

export function summarize(
  rows: { company_id: string | null; status: string; purpose: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cost_micros: number }[],
): UsageSummary[] {
  const by = new Map<string | null, UsageSummary>();
  for (const r of rows) {
    const s = by.get(r.company_id) ?? empty(r.company_id);
    s.runs++;
    if (r.status === "error") s.errors++;
    s.inputTokens += r.input_tokens;
    s.outputTokens += r.output_tokens;
    s.cacheReadTokens += r.cache_read_tokens;
    s.costMicros += Number(r.cost_micros);
    const p = (s.byPurpose[r.purpose] ??= { runs: 0, costMicros: 0 });
    p.runs++;
    p.costMicros += Number(r.cost_micros);
    by.set(r.company_id, s);
  }
  return [...by.values()].sort((a, b) => b.costMicros - a.costMicros);
}

export async function usageSince(sinceIso: string, companyId?: string): Promise<UsageSummary[]> {
  const supabase = await createClient();
  let q = supabase
    .from("ai_runs")
    .select("company_id, status, purpose, input_tokens, output_tokens, cache_read_tokens, cost_micros")
    .gte("created_at", sinceIso)
    .limit(20000);
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw new Error(`Falha ao ler o consumo da IA: ${error.message}`);
  return summarize(data ?? []);
}

export const PURPOSE_LABELS: Record<string, string> = {
  chat: "Chat",
  analysis: "Análise de conversas",
  daily_summary: "Resumo do dia",
  other: "Outros",
};
