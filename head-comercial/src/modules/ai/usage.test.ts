import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { monthStart, summarize } = await import("./usage");

describe("consumo da IA", () => {
  it("soma por empresa e por uso, com a empresa mais cara primeiro", () => {
    const row = (company_id: string, purpose: string, cost: number, status = "ok") => ({
      company_id, status, purpose, input_tokens: 100, output_tokens: 10, cache_read_tokens: 50, cost_micros: cost,
    });
    const out = summarize([row("a", "chat", 100), row("b", "analysis", 900), row("a", "analysis", 300), row("a", "chat", 0, "error")]);
    expect(out.map((s) => s.companyId)).toEqual(["b", "a"]);
    expect(out[1]).toMatchObject({ runs: 3, errors: 1, inputTokens: 300, costMicros: 400 });
    expect(out[1].byPurpose).toEqual({ chat: { runs: 2, costMicros: 100 }, analysis: { runs: 1, costMicros: 300 } });
  });

  it("início do mês no fuso da empresa", () => {
    expect(monthStart("America/Sao_Paulo", new Date("2026-11-27T12:00:00Z"))).toBe("2026-11-01T03:00:00.000Z");
    // Dia 1 às 01h em São Paulo ainda é 31/10 em UTC; o mês local é novembro.
    expect(monthStart("America/Sao_Paulo", new Date("2026-11-01T04:00:00Z"))).toBe("2026-11-01T03:00:00.000Z");
    expect(monthStart("UTC", new Date("2026-02-15T00:00:00Z"))).toBe("2026-02-01T00:00:00.000Z");
  });
});
