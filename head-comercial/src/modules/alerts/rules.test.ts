import { describe, expect, it } from "vitest";
import {
  alertHref,
  countByType,
  describeCounts,
  joinPt,
  rankPeople,
  sortAlerts,
  teamReading,
  type AlertLike,
} from "./rules";

let n = 0;
const a = (p: Partial<AlertLike>): AlertLike => ({
  id: `a${++n}`,
  type: "next_step_overdue",
  severity: "high",
  user_id: "sara",
  entity_type: null,
  entity_id: null,
  reference_date: null,
  first_seen_at: `2026-11-24T10:0${n % 10}:00Z`,
  ...p,
});
const names = { sara: "Sara", tiago: "Tiago" };

describe("joinPt e describeCounts", () => {
  it("junta em português", () => {
    expect(joinPt(["a"])).toBe("a");
    expect(joinPt(["a", "b"])).toBe("a e b");
    expect(joinPt(["a", "b", "c"])).toBe("a, b e c");
  });
  it("frase no singular e no plural, na ordem de urgência", () => {
    expect(describeCounts({ report_missing: 1, next_step_overdue: 3, awaiting_reply: 2 })).toBe(
      "2 clientes esperando resposta, 3 próximos passos vencidos e 1 relatório pendente",
    );
    expect(describeCounts({})).toBe("Nada pendente.");
  });
  it("limita a quantidade de tipos", () => {
    expect(describeCounts({ awaiting_reply: 1, next_step_overdue: 1, no_next_step: 1, report_missing: 1 }, 2)).toBe(
      "1 cliente esperando resposta, 1 próximo passo vencido e mais 2 tipo(s) de pendência",
    );
  });
});

describe("sortAlerts e alertHref", () => {
  it("grave primeiro; entre graves, cliente esperando antes de passo vencido", () => {
    const list = [a({ severity: "low", type: "no_next_step" }), a({ type: "next_step_overdue" }), a({ type: "awaiting_reply" })];
    expect(sortAlerts(list).map((x) => x.type)).toEqual(["awaiting_reply", "next_step_overdue", "no_next_step"]);
  });
  it("leva ao lugar certo", () => {
    expect(alertHref(a({ entity_type: "opportunities", entity_id: "o1" }), false)).toBe("/oportunidades/o1");
    expect(alertHref(a({ type: "awaiting_reply", entity_type: "conversations", entity_id: "c1" }), false)).toBe("/conversas/c1");
    expect(alertHref(a({ type: "report_missing", reference_date: "2026-11-23" }), false)).toBe("/relatorio?data=2026-11-23");
    expect(alertHref(a({ type: "divergence_open", reference_date: "2026-11-23" }), true)).toBe("/relatorios");
  });
});

describe("leitura para o líder", () => {
  const alerts = [
    a({ user_id: "sara", type: "stale_opportunity", severity: "medium" }),
    a({ user_id: "sara", type: "stale_opportunity", severity: "medium" }),
    a({ user_id: "sara", type: "stale_opportunity", severity: "medium" }),
    a({ user_id: "tiago", type: "stale_opportunity", severity: "medium" }),
    a({ user_id: "tiago", type: "report_missing", severity: "medium" }),
  ];
  it("ordena quem merece atenção", () => {
    const r = rankPeople(alerts, names);
    expect(r.map((p) => [p.name, p.score, p.sentence])).toEqual([
      ["Sara", 6, "3 negociações paradas"],
      ["Tiago", 4, "1 negociação parada e 1 relatório pendente"],
    ]);
  });
  it("aponta concentração e por onde começar", () => {
    expect(teamReading(alerts, names)).toBe(
      "O time tem 4 negociações paradas e 1 relatório pendente. A maior parte dos casos de negociações paradas está com Sara. Quem merece atenção primeiro: Sara.",
    );
    expect(teamReading([], names)).toBe("Nenhuma pendência no time agora.");
    expect(teamReading([a({})], names)).toBe("O time tem 1 próximo passo vencido. Comece por Sara.");
  });
  it("conta por tipo", () => {
    expect(countByType(alerts)).toEqual({ stale_opportunity: 4, report_missing: 1 });
  });
});
