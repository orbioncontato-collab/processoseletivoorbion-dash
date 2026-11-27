import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isDue, localDate, localHour, summaryTitle, yesterdayRange } = await import("./daily-summary");

const TZ = "America/Sao_Paulo";
// 27/11/2026 às 08h30 em São Paulo.
const at830 = new Date("2026-11-27T11:30:00Z");

describe("resumo do dia", () => {
  it("ontem vai da meia-noite à meia-noite no fuso da empresa", () => {
    expect(yesterdayRange(TZ, at830)).toEqual({ start: "2026-11-26T03:00:00.000Z", end: "2026-11-27T03:00:00.000Z" });
  });

  it("data e hora locais", () => {
    expect(localDate(TZ, at830)).toBe("2026-11-27");
    expect(localHour(TZ, at830)).toBe(8);
    expect(localHour(TZ, new Date("2026-11-27T02:30:00Z"))).toBe(23);
    expect(summaryTitle(TZ, at830)).toBe("Resumo do dia 27/11");
  });

  it("gera depois do horário escolhido e só uma vez por dia", () => {
    expect(isDue({ daily_summary_hour: 8, daily_summary_last_date: null }, TZ, at830)).toBe(true);
    expect(isDue({ daily_summary_hour: 9, daily_summary_last_date: null }, TZ, at830)).toBe(false);
    expect(isDue({ daily_summary_hour: 8, daily_summary_last_date: "2026-11-27" }, TZ, at830)).toBe(false);
    expect(isDue({ daily_summary_hour: 8, daily_summary_last_date: "2026-11-26" }, TZ, at830)).toBe(true);
  });
});
