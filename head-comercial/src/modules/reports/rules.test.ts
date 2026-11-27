import { describe, expect, it } from "vitest";
import { checkDivergence, dayRange, dueReferenceDate, isoWeekday, parseAnswers, type QuestionDef } from "./rules";

const SP = "America/Sao_Paulo";
const WEEK = [1, 2, 3, 4, 5];
// 2026-11-23 é segunda-feira.

describe("isoWeekday e dayRange", () => {
  it("segunda = 1, domingo = 7", () => {
    expect(isoWeekday("2026-11-23")).toBe(1);
    expect(isoWeekday("2026-11-29")).toBe(7);
  });
  it("dia em São Paulo vai de 03h a 03h UTC", () => {
    expect(dayRange("2026-11-24", SP)).toEqual({ start: "2026-11-24T03:00:00.000Z", end: "2026-11-25T03:00:00.000Z" });
  });
});

describe("dueReferenceDate", () => {
  const at = (iso: string) => new Date(iso);
  it("relatório do dia abre no horário configurado", () => {
    // terça 17h em SP (20h UTC): ainda não abriu o de terça; pendente é o de segunda
    expect(dueReferenceDate(at("2026-11-24T20:00:00Z"), SP, "18:00", "same_day", WEEK)).toBe("2026-11-23");
    // terça 18h30 em SP
    expect(dueReferenceDate(at("2026-11-24T21:30:00Z"), SP, "18:00", "same_day", WEEK)).toBe("2026-11-24");
  });
  it("relatório do dia anterior abre na manhã seguinte e pula o fim de semana", () => {
    // segunda 10h em SP: pendente é o de sexta (sáb e dom fora dos dias de trabalho)
    expect(dueReferenceDate(at("2026-11-23T13:00:00Z"), SP, "09:00", "previous_day", WEEK)).toBe("2026-11-20");
    // terça 8h em SP: o de segunda ainda não abriu; continua o de sexta
    expect(dueReferenceDate(at("2026-11-24T11:00:00Z"), SP, "09:00", "previous_day", WEEK)).toBe("2026-11-20");
    // terça 9h05
    expect(dueReferenceDate(at("2026-11-24T12:05:00Z"), SP, "09:00", "previous_day", WEEK)).toBe("2026-11-23");
  });
  it("aceita horário com segundos e dias personalizados", () => {
    expect(dueReferenceDate(at("2026-11-29T22:00:00Z"), SP, "18:00:00", "same_day", [7])).toBe("2026-11-29");
  });
});

describe("parseAnswers", () => {
  const qs: QuestionDef[] = [
    { id: "n", label: "Contatos", kind: "number", options: [], required: true },
    { id: "c", label: "Vendido", kind: "currency", options: [], required: false },
    { id: "t", label: "Dificuldade", kind: "text", options: [], required: false },
    { id: "s", label: "Humor", kind: "single_choice", options: ["Bom", "Ruim"], required: true },
    { id: "m", label: "Canais", kind: "multi_choice", options: ["WhatsApp", "Telefone", "E-mail"], required: true },
    { id: "y", label: "Bateu a meta?", kind: "yes_no", options: [], required: true },
  ];
  const form = (values: Record<string, string | string[]>) => ({
    get: (k: string) => {
      const v = values[k];
      return Array.isArray(v) ? v[0] : (v ?? "");
    },
    getAll: (k: string) => {
      const v = values[k];
      return Array.isArray(v) ? v : v ? [v] : [];
    },
  });

  it("converte cada tipo", () => {
    const f = form({ q_n: "10", q_c: "1.500,00", q_t: "Cliente sumiu", q_s: "Bom", q_m: ["WhatsApp", "Telefone", "Pombo"], q_y: "sim" });
    const r = parseAnswers(qs, f.get, f.getAll);
    expect(r.errors).toEqual({});
    expect(r.answers.map((a) => [a.question_id, a.value_number ?? a.value_text ?? a.value_options])).toEqual([
      ["n", 10],
      ["c", 150000],
      ["t", "Cliente sumiu"],
      ["s", "Bom"],
      ["m", ["WhatsApp", "Telefone"]],
      ["y", "sim"],
    ]);
  });

  it("aponta obrigatórias, número negativo e opção inventada", () => {
    const f = form({ q_n: "-2", q_s: "Ótimo", q_y: "talvez" });
    const r = parseAnswers(qs, f.get, f.getAll);
    expect(Object.keys(r.errors).sort()).toEqual(["m", "n", "s", "y"]);
    expect(r.errors.m).toBe("Escolha pelo menos uma opção.");
  });

  it("opcional vazio vira resposta vazia", () => {
    const f = form({ q_n: "0", q_s: "Ruim", q_m: "E-mail", q_y: "nao" });
    const r = parseAnswers(qs, f.get, f.getAll);
    expect(r.errors).toEqual({});
    expect(r.answers.find((a) => a.question_id === "c")).toMatchObject({ value_number: null, value_text: null });
  });
});

describe("checkDivergence", () => {
  it("informou 10, capturado 6 com margem de 20% ou 1: divergência para cima", () => {
    expect(checkDivergence(10, 6, 20, 1)).toEqual({ direction: "above", difference: 4 });
  });
  it("dentro da margem não é divergência", () => {
    expect(checkDivergence(10, 9, 20, 1)).toBeNull();
    expect(checkDivergence(2, 1, 20, 1)).toBeNull();
    expect(checkDivergence(0, 0, 20, 1)).toBeNull();
  });
  it("informou menos do que o capturado também aparece", () => {
    expect(checkDivergence(1, 3, 20, 1)).toEqual({ direction: "below", difference: -2 });
  });
  it("valor em reais usa a tolerância absoluta em reais", () => {
    // 3.000 informado x 2.950 capturado, margem 0% ou R$ 100: dentro
    expect(checkDivergence(300000, 295000, 0, 100, "currency")).toBeNull();
    expect(checkDivergence(300000, 250000, 0, 100, "currency")).toEqual({ direction: "above", difference: 50000 });
  });
});
