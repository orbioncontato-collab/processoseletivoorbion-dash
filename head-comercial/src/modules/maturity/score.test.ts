import { describe, expect, it } from "vitest";
import { computeMaturity, maturityLevel } from "./score";

const now = new Date("2026-11-27T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

describe("maturidade comercial", () => {
  it("calcula cada dimensão com os dados e a média só das medidas", () => {
    const m = computeMaturity({
      now,
      staleDays: 7,
      openOpps: [
        { next_step_at: daysAgo(-2), last_activity_at: daysAgo(1) },
        { next_step_at: daysAgo(3), last_activity_at: daysAgo(2) },
        { next_step_at: null, last_activity_at: daysAgo(10) },
        { next_step_at: daysAgo(-1), last_activity_at: daysAgo(20) },
      ],
      reports: { sent: 18, expected: 20 },
      analysisScores: [6, 7],
      trainings: [{ status: "completed" }, { status: "recommended" }, { status: "dismissed" }],
      actions: [
        { status: "done", due_date: "2026-11-20", completed_at: "2026-11-19T10:00:00Z" },
        { status: "done", due_date: "2026-11-20", completed_at: "2026-11-22T10:00:00Z" },
        { status: "open", due_date: "2026-11-25", completed_at: null },
        { status: "canceled", due_date: "2026-11-25", completed_at: null },
      ],
    });
    const score = Object.fromEntries(m.dimensions.map((d) => [d.key, d.score]));
    expect(score).toEqual({ processo: 50, dados: 50, rotina: 90, conversas: 65, desenvolvimento: 50, gestao: 33 });
    expect(m.overall).toBe(56);
    expect(m.level).toBe("Em estruturação");
    expect(m.dimensions.find((d) => d.key === "conversas")!.detail).toBe("Nota média 6,5/10 em 2 análise(s).");
  });

  it("sem dados, a dimensão fica não medida e fora da média", () => {
    const m = computeMaturity({ now, staleDays: 7, openOpps: [], reports: null, analysisScores: [9], trainings: [], actions: [] });
    expect(m.dimensions.filter((d) => d.score !== null).map((d) => d.key)).toEqual(["conversas"]);
    expect(m.overall).toBe(90);
    expect(m.level).toBe("Avançada");
  });

  it("faixas de nível", () => {
    expect([10, 45, 70, 85].map(maturityLevel)).toEqual(["Inicial", "Em estruturação", "Consistente", "Avançada"]);
  });
});
