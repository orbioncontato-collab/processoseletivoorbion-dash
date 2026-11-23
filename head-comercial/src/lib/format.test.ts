import { describe, expect, it } from "vitest";
import {
  centsToInput,
  formatDuration,
  dueState,
  formatMoney,
  formatPhone,
  normalizePhone,
  parseMoneyToCents,
  utcToZonedInput,
  zonedLocalToUtc,
} from "./format";

describe("normalizePhone", () => {
  it.each([
    ["(11) 98765-4321", "+5511987654321"],
    ["11987654321", "+5511987654321"],
    ["+55 11 98765-4321", "+5511987654321"],
    ["55 11 98765 4321", "+5511987654321"],
    ["0 11 98765-4321", "+5511987654321"],
    ["0055 11 98765-4321", "+5511987654321"],
    ["11 8765-4321", "+5511987654321"],
    ["+55 11 8765-4321", "+5511987654321"],
    ["(11) 3456-7890", "+551134567890"],
    ["+1 415 555 2671", "+14155552671"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "   ", "123", "abc", "(00) 98765-4321", "11 88765-4321", "11 1234-5678", "+0123456789"])(
    "recusa %j",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );

  it("formata para exibição", () => {
    expect(formatPhone("+5511987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("+551134567890")).toBe("(11) 3456-7890");
    expect(formatPhone("+14155552671")).toBe("+14155552671");
    expect(formatPhone(null)).toBe("");
  });
});

describe("dinheiro", () => {
  it.each([
    ["R$ 1.500,50", 150050],
    ["1500", 150000],
    ["1.500", 150000],
    ["1.500.000", 150000000],
    ["1500.5", 150050],
    ["1500,5", 150050],
    ["0,99", 99],
    ["", 0],
  ])("%j -> %d centavos", (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it.each(["abc", "-10", "1,2,3", "10,999"])("recusa %j", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });

  it("formata e volta para o campo", () => {
    expect(formatMoney(150050).replace(/\s/g, " ")).toBe("R$ 1.500,50");
    expect(centsToInput(150050)).toBe("1500,50");
    expect(centsToInput(0)).toBe("");
  });
});

describe("datas no fuso da empresa", () => {
  it("10h em São Paulo é 13h UTC", () => {
    expect(zonedLocalToUtc("2026-11-24T10:00", "America/Sao_Paulo")?.toISOString()).toBe("2026-11-24T13:00:00.000Z");
  });
  it("10h em Manaus é 14h UTC", () => {
    expect(zonedLocalToUtc("2026-11-24T10:00", "America/Manaus")?.toISOString()).toBe("2026-11-24T14:00:00.000Z");
  });
  it("recusa data inválida", () => {
    expect(zonedLocalToUtc("2026-02-30T10:00", "America/Sao_Paulo")).toBeNull();
    expect(zonedLocalToUtc("amanhã", "America/Sao_Paulo")).toBeNull();
  });
  it("ida e volta mantém o horário de parede", () => {
    expect(utcToZonedInput("2026-11-24T13:00:00.000Z", "America/Sao_Paulo")).toBe("2026-11-24T10:00");
  });
  it("classifica o próximo passo", () => {
    const now = new Date("2026-11-24T15:00:00Z"); // 12h em São Paulo
    const tz = "America/Sao_Paulo";
    expect(dueState(null, tz, now)).toBe("none");
    expect(dueState("2026-11-24T14:00:00Z", tz, now)).toBe("overdue");
    expect(dueState("2026-11-24T20:00:00Z", tz, now)).toBe("today");
    // 23h de hoje em São Paulo já é amanhã em UTC, mas continua sendo "hoje".
    expect(dueState("2026-11-25T02:00:00Z", tz, now)).toBe("today");
    expect(dueState("2026-11-25T12:00:00Z", tz, now)).toBe("future");
  });
});


describe("formatDuration", () => {
  it.each([
    [null, "-"],
    [45, "menos de 1 min"],
    [1050, "18 min"],
    [3600, "1 h"],
    [5400, "1 h 30 min"],
    [200000, "2 dias"],
  ])("%s -> %s", (s, out) => {
    expect(formatDuration(s)).toBe(out);
  });
});
