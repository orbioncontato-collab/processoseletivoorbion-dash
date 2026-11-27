/** Saúde do funil a partir das oportunidades (funções puras, testadas em funnel-metrics.test.ts). */

export interface FunnelOpp {
  stage_id: string;
  owner_id: string;
  status: "open" | "won" | "lost";
  value_cents: number;
  created_at: string;
  closed_at: string | null;
  last_activity_at: string;
  next_step_at: string | null;
  lost_reason: string | null;
}

export interface FunnelStage {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
  position: number;
}

const DAY = 86_400_000;

export function funnelMetrics(opps: FunnelOpp[], stages: FunnelStage[], opts: { periodDays: number; staleDays: number; now?: Date }) {
  const now = (opts.now ?? new Date()).getTime();
  const since = now - opts.periodDays * DAY;
  const open = opps.filter((o) => o.status === "open");
  const closedInPeriod = opps.filter((o) => o.status !== "open" && o.closed_at && Date.parse(o.closed_at) >= since);
  const won = closedInPeriod.filter((o) => o.status === "won");
  const lost = closedInPeriod.filter((o) => o.status === "lost");
  const cycles = won.map((o) => (Date.parse(o.closed_at!) - Date.parse(o.created_at)) / DAY);

  const byStage = stages
    .filter((s) => s.kind === "open")
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const here = open.filter((o) => o.stage_id === s.id);
      return { etapa: s.name, negociacoes: here.length, valor_cents: here.reduce((sum, o) => sum + o.value_cents, 0) };
    });

  const reasons = new Map<string, number>();
  for (const o of lost) reasons.set(o.lost_reason ?? "Sem motivo", (reasons.get(o.lost_reason ?? "Sem motivo") ?? 0) + 1);

  return {
    periodo_dias: opts.periodDays,
    em_aberto: open.length,
    valor_em_aberto_cents: open.reduce((s, o) => s + o.value_cents, 0),
    por_etapa: byStage,
    criadas_no_periodo: opps.filter((o) => Date.parse(o.created_at) >= since).length,
    ganhas_no_periodo: won.length,
    perdidas_no_periodo: lost.length,
    valor_ganho_cents: won.reduce((s, o) => s + o.value_cents, 0),
    taxa_de_ganho_pct: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
    ticket_medio_ganho_cents: won.length ? Math.round(won.reduce((s, o) => s + o.value_cents, 0) / won.length) : null,
    ciclo_medio_dias: cycles.length ? Math.round(cycles.reduce((s, n) => s + n, 0) / cycles.length) : null,
    paradas: open.filter((o) => now - Date.parse(o.last_activity_at) >= opts.staleDays * DAY).length,
    sem_proximo_passo: open.filter((o) => !o.next_step_at).length,
    proximo_passo_vencido: open.filter((o) => o.next_step_at && Date.parse(o.next_step_at) < now).length,
    motivos_de_perda: [...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([motivo, quantidade]) => ({ motivo, quantidade })),
  };
}
