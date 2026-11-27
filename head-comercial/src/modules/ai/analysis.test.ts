import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseAnalysis, transcript } = await import("./analysis");

const valid = {
  resumo: " Cliente pediu orçamento. ",
  nota_geral: 12,
  etapa_alcancada: "proposta enviada",
  criterios: [{ nome: "Diagnóstico da necessidade", nota: -2, comentario: "Não perguntou a dor." }],
  pontos_fortes: ["Respondeu rápido", ""],
  falhas: ["Mandou preço sem diagnóstico"],
  objecoes: ["Preço"],
  recomendacoes: ["Pergunte o que motivou a busca"],
  proximo_passo: "Ligar amanhã",
};

describe("resposta do Analista", () => {
  it("aceita o formato, limita as notas entre 0 e 10 e limpa textos vazios", () => {
    const out = parseAnalysis(JSON.stringify(valid))!;
    expect(out.resumo).toBe("Cliente pediu orçamento.");
    expect(out.nota_geral).toBe(10);
    expect(out.criterios[0].nota).toBe(0);
    expect(out.pontos_fortes).toEqual(["Respondeu rápido"]);
  });

  it("recusa JSON quebrado ou incompleto", () => {
    expect(parseAnalysis("{ não é json")).toBeNull();
    expect(parseAnalysis(JSON.stringify({ resumo: "x" }))).toBeNull();
  });
});

describe("transcrição da conversa", () => {
  const msgs = [
    { direction: "inbound", sent_at: "2026-11-20T13:00:00Z", message_type: "text", body: "Oi, quanto custa?" },
    { direction: "outbound", sent_at: "2026-11-20T13:05:00Z", message_type: "text", body: "Olá! Posso entender sua necessidade?" },
    { direction: "inbound", sent_at: "2026-11-20T13:06:00Z", message_type: "audio", body: null },
  ];

  it("mostra quem falou, quando, e marca mídia sem texto", () => {
    const t = transcript(msgs, "America/Sao_Paulo");
    expect(t.split("\n")).toEqual([
      "[20/11/2026, 10:00] Cliente: Oi, quanto custa?",
      "[20/11/2026, 10:05] Vendedor: Olá! Posso entender sua necessidade?",
      "[20/11/2026, 10:06] Cliente: (audio)",
    ]);
  });

  it("conversa longa mantém as mensagens mais recentes", () => {
    const t = transcript(msgs, "America/Sao_Paulo", 90);
    expect(t.startsWith("(mensagens mais antigas omitidas)")).toBe(true);
    expect(t).toContain("(audio)");
    expect(t).not.toContain("quanto custa");
  });
});
