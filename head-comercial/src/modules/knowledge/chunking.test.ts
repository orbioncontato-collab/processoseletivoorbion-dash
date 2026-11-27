import { describe, expect, it } from "vitest";
import { headingOf, normalizeText, splitIntoChunks } from "./chunking";

describe("normalizeText", () => {
  it("padroniza quebras e espaços", () => {
    expect(normalizeText("﻿A  b\r\n\r\n\r\n\r\nc d  ")).toBe("A b\n\nc d");
  });
});

describe("headingOf", () => {
  it("reconhece títulos comuns", () => {
    expect(headingOf("## Objeções de preço")).toBe("Objeções de preço");
    expect(headingOf("1. Diagnóstico")).toBe("1. Diagnóstico");
    expect(headingOf("ETAPA DE FECHAMENTO")).toBe("ETAPA DE FECHAMENTO");
  });
  it("não confunde frase com título", () => {
    expect(headingOf("Faça perguntas abertas.")).toBeNull();
    expect(headingOf("O cliente disse que achou caro e pediu desconto no fechamento do contrato")).toBeNull();
    expect(headingOf("OK")).toBeNull();
  });
});

describe("splitIntoChunks", () => {
  it("guarda o título da seção em cada trecho", () => {
    const doc = "# Diagnóstico\n\nPergunte sobre a dor.\n\n# Fechamento\n\nProponha o próximo passo.";
    expect(splitIntoChunks(doc)).toEqual([
      { heading: "Diagnóstico", content: "Pergunte sobre a dor." },
      { heading: "Fechamento", content: "Proponha o próximo passo." },
    ]);
  });

  it("junta parágrafos até o tamanho alvo e repete o final do anterior", () => {
    const p = (n: number) => `Parágrafo ${n} ` + "palavra ".repeat(40);
    const chunks = splitIntoChunks([1, 2, 3, 4, 5, 6].map(p).join("\n\n"), { target: 700, max: 1000, overlap: 60 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.content.length <= 1100)).toBe(true);
    expect(chunks[1].content.startsWith("palavra")).toBe(true);
    const all = chunks.map((c) => c.content).join(" ");
    for (const n of [1, 2, 3, 4, 5, 6]) expect(all).toContain(`Parágrafo ${n}`);
  });

  it("parágrafo enorme é dividido por frases sem perder texto", () => {
    const big = Array.from({ length: 80 }, (_, i) => `Frase número ${i} sobre negociação.`).join(" ");
    const chunks = splitIntoChunks(big, { target: 500, max: 600, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.content.length <= 600)).toBe(true);
    expect(chunks.map((c) => c.content).join(" ")).toContain("Frase número 79 sobre negociação.");
  });

  it("documento vazio não gera trechos", () => {
    expect(splitIntoChunks("  \n\n ")).toEqual([]);
  });
});
