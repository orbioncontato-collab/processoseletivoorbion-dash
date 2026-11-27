import { describe, expect, it } from "vitest";
import { forecastMonth, type ForecastOpp } from "./forecast";

const range = { monthStart: "2026-11-01T03:00:00.000Z", nextMonthStart: "2026-12-01T03:00:00.000Z", since90: "2026-08-29T00:00:00.000Z" };
const o = (x: Partial<ForecastOpp>): ForecastOpp => ({ owner_id: "u", status: "open", value_cents: 100_000, expected_close_date: null, closed_at: null, ...x });

describe("previsão do mês", () => {
  it("soma o ganho e pondera o previsto pela taxa de ganho recente", () => {
    const f = forecastMonth(
      [
        o({ status: "won", value_cents: 500_000, closed_at: "2026-11-10T12:00:00Z" }),
        o({ status: "won", value_cents: 200_000, closed_at: "2026-10-10T12:00:00Z" }),
        o({ status: "lost", closed_at: "2026-11-05T12:00:00Z" }),
        o({ status: "lost", closed_at: "2026-10-20T12:00:00Z" }),
        o({ expected_close_date: "2026-11-28", value_cents: 1_000_000 }),
        o({ expected_close_date: "2026-12-15", value_cents: 9_000_000 }),
        o({}),
      ],
      { ...range, target: 2_000_000 },
    );
    expect(f).toMatchObject({
      ganho_no_mes_cents: 500_000,
      ganhas_no_mes: 1,
      previstas_para_o_mes: 1,
      valor_previsto_cents: 1_000_000,
      taxa_usada_pct: 50,
      taxa_com_historico: true,
      projecao_cents: 1_000_000,
      melhor_caso_cents: 1_500_000,
      sem_previsao_de_fechamento: 1,
      atingimento_projetado_pct: 50,
    });
  });

  it("sem histórico suficiente usa a referência de 30%", () => {
    const f = forecastMonth([o({ expected_close_date: "2026-11-20", value_cents: 1_000_000 })], range);
    expect(f.taxa_usada_pct).toBe(30);
    expect(f.taxa_com_historico).toBe(false);
    expect(f.projecao_cents).toBe(300_000);
    expect(f.atingimento_projetado_pct).toBeNull();
  });
});
