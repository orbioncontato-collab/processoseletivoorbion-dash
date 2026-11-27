import { describe, expect, it } from "vitest";
import { funnelMetrics, type FunnelOpp, type FunnelStage } from "./funnel-metrics";

const now = new Date("2026-11-27T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const stages: FunnelStage[] = [
  { id: "s2", name: "Proposta", kind: "open", position: 2 },
  { id: "s1", name: "Diagnóstico", kind: "open", position: 1 },
  { id: "w", name: "Ganho", kind: "won", position: 3 },
  { id: "l", name: "Perdido", kind: "lost", position: 4 },
];
const opp = (o: Partial<FunnelOpp>): FunnelOpp => ({
  stage_id: "s1", owner_id: "u", status: "open", value_cents: 100_000, created_at: daysAgo(10), closed_at: null,
  last_activity_at: daysAgo(1), next_step_at: daysAgo(-1), lost_reason: null, ...o,
});

describe("saúde do funil", () => {
  it("conta etapas na ordem, taxa de ganho, ticket, ciclo, paradas e motivos de perda", () => {
    const m = funnelMetrics(
      [
        opp({}),
        opp({ stage_id: "s2", value_cents: 300_000, last_activity_at: daysAgo(10), next_step_at: null }),
        opp({ stage_id: "s2", next_step_at: daysAgo(2) }),
        opp({ status: "won", stage_id: "w", value_cents: 500_000, created_at: daysAgo(40), closed_at: daysAgo(10) }),
        opp({ status: "won", stage_id: "w", value_cents: 300_000, created_at: daysAgo(20), closed_at: daysAgo(0) }),
        opp({ status: "lost", stage_id: "l", closed_at: daysAgo(5), lost_reason: "Preço" }),
        opp({ status: "lost", stage_id: "l", closed_at: daysAgo(3), lost_reason: "Preço" }),
        opp({ status: "lost", stage_id: "l", closed_at: daysAgo(200), created_at: daysAgo(300), lost_reason: "Sumiu" }),
      ],
      stages,
      { periodDays: 90, staleDays: 7, now },
    );
    expect(m.por_etapa).toEqual([
      { etapa: "Diagnóstico", negociacoes: 1, valor_cents: 100_000 },
      { etapa: "Proposta", negociacoes: 2, valor_cents: 400_000 },
    ]);
    expect(m).toMatchObject({
      em_aberto: 3,
      ganhas_no_periodo: 2,
      perdidas_no_periodo: 2,
      taxa_de_ganho_pct: 50,
      ticket_medio_ganho_cents: 400_000,
      ciclo_medio_dias: 25,
      paradas: 1,
      sem_proximo_passo: 1,
      proximo_passo_vencido: 1,
      criadas_no_periodo: 7,
    });
    expect(m.motivos_de_perda).toEqual([{ motivo: "Preço", quantidade: 2 }]);
  });

  it("sem negociações encerradas, taxa e ciclo ficam vazios", () => {
    const m = funnelMetrics([opp({})], stages, { periodDays: 30, staleDays: 7, now });
    expect(m.taxa_de_ganho_pct).toBeNull();
    expect(m.ciclo_medio_dias).toBeNull();
  });
});
