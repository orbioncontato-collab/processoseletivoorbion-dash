/** Previsão de receita do mês (funções puras, testadas em forecast.test.ts). */

export interface ForecastOpp {
  owner_id: string;
  status: "open" | "won" | "lost";
  value_cents: number;
  expected_close_date: string | null;
  closed_at: string | null;
}

/**
 * Ganho no mês + negociações em aberto com previsão para o mês, ponderadas pela
 * taxa de ganho dos últimos 90 dias. Sem histórico, usa 30% (referência neutra).
 */
export function forecastMonth(opps: ForecastOpp[], opts: { monthStart: string; nextMonthStart: string; since90: string; target?: number | null }) {
  const { monthStart, nextMonthStart, since90 } = opts;
  const inMonth = (d: string | null) => Boolean(d && d >= monthStart.slice(0, 10) && d < nextMonthStart.slice(0, 10));
  const closedRecently = opps.filter((o) => o.status !== "open" && o.closed_at && o.closed_at >= since90);
  const wonRecently = closedRecently.filter((o) => o.status === "won").length;
  const rate = closedRecently.length >= 3 ? wonRecently / closedRecently.length : 0.3;

  const wonMonth = opps.filter((o) => o.status === "won" && o.closed_at && o.closed_at >= monthStart && o.closed_at < nextMonthStart);
  const expected = opps.filter((o) => o.status === "open" && inMonth(o.expected_close_date));
  const noDate = opps.filter((o) => o.status === "open" && !o.expected_close_date);
  const sum = (list: ForecastOpp[]) => list.reduce((s, o) => s + o.value_cents, 0);

  const projected = sum(wonMonth) + Math.round(sum(expected) * rate);
  return {
    ganho_no_mes_cents: sum(wonMonth),
    ganhas_no_mes: wonMonth.length,
    previstas_para_o_mes: expected.length,
    valor_previsto_cents: sum(expected),
    taxa_usada_pct: Math.round(rate * 100),
    taxa_com_historico: closedRecently.length >= 3,
    projecao_cents: projected,
    melhor_caso_cents: sum(wonMonth) + sum(expected),
    sem_previsao_de_fechamento: noDate.length,
    meta_cents: opts.target ?? null,
    atingimento_projetado_pct: opts.target ? Math.round((projected / opts.target) * 100) : null,
  };
}
