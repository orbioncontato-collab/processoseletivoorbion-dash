import { describe, expect, it } from "vitest";
import { sanitizeSearch, todayRange } from "./filters";

describe("sanitizeSearch", () => {
  it("remove caracteres que quebrariam o filtro", () => {
    expect(sanitizeSearch("ana,(title.eq.x)*%_")).toBe("ana title.eq.x");
    expect(sanitizeSearch("  João   Silva ")).toBe("João Silva");
  });
});

describe("todayRange", () => {
  it("dia de hoje em São Paulo vai de 03h UTC até 03h UTC do dia seguinte", () => {
    expect(todayRange("America/Sao_Paulo", new Date("2026-11-24T15:00:00Z"))).toEqual({
      start: "2026-11-24T03:00:00.000Z",
      end: "2026-11-25T03:00:00.000Z",
    });
  });
  it("às 23h30 em São Paulo (já outro dia em UTC) ainda é o mesmo dia local", () => {
    expect(todayRange("America/Sao_Paulo", new Date("2026-11-25T02:30:00Z")).start).toBe("2026-11-24T03:00:00.000Z");
  });
});
