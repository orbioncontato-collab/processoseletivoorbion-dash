import { describe, expect, it } from "vitest";
import { CSV_TEMPLATE, csvToEvents, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("lê separador ponto e vírgula com aspas e BOM", () => {
    const rows = parseCsv('﻿nome;obs\n"Silva; Ana";"disse ""ok""\nem duas linhas"\n');
    expect(rows).toEqual([
      ["nome", "obs"],
      ["Silva; Ana", 'disse "ok"\nem duas linhas'],
    ]);
  });
  it("lê separador vírgula e quebra de linha do Windows", () => {
    expect(parseCsv("nome,telefone\r\nAna,11999990000\r\n")).toEqual([
      ["nome", "telefone"],
      ["Ana", "11999990000"],
    ]);
  });
  it("ignora linhas vazias", () => {
    expect(parseCsv("nome\n\nAna\n;\n")).toEqual([["nome"], ["Ana"]]);
  });
});

describe("csvToEvents", () => {
  const tz = "America/Sao_Paulo";

  it("o modelo vira uma oportunidade completa", () => {
    const { events, errors } = csvToEvents(parseCsv(CSV_TEMPLATE), tz);
    expect(errors).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "opportunity.upsert",
      data: {
        external_id: "+5511912345678:consultoria comercial",
        title: "Consultoria comercial",
        value: "12.000,00",
        stage: "Proposta",
        status: "open",
        next_step: "Enviar proposta revisada",
        next_step_at: "2026-11-28T13:00:00.000Z",
        expected_close_date: "2026-12-15",
        contact: { external_id: "+5511912345678", name: "Maria Souza", organization: "Cliente SA" },
      },
    });
  });

  it("linha sem título vira só contato; cabeçalho com acento e espaço é aceito", () => {
    const { events } = csvToEvents(parseCsv("Nome;E-mail\nBruno;Bruno@X.com\n"), tz);
    expect(events).toEqual([
      { type: "contact.upsert", data: { external_id: "bruno@x.com", name: "Bruno", email: "bruno@x.com" } },
    ]);
  });

  it("aponta erros por linha sem parar a importação", () => {
    const csv = "nome;titulo;situacao;data_proximo_passo\n;X;;\nAna;Y;cancelada;\nBia;Z;;31/02/2026\nCaio;W;ganha;\n";
    const { events, errors } = csvToEvents(parseCsv(csv), tz);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(events).toHaveLength(1);
    expect(events[0].data).toMatchObject({ title: "W", status: "won" });
  });

  it("aceita sinônimos comuns de coluna", () => {
    const { events } = csvToEvents(parseCsv("Nome;WhatsApp;Valor (R$);Negócio\nAna;11 98765-4321;100;Plano\n"), tz);
    expect(events[0].data).toMatchObject({ title: "Plano", value: "100", contact: { phone: "11 98765-4321" } });
  });

  it("exige a coluna nome e limita o tamanho", () => {
    expect(csvToEvents(parseCsv("telefone\n119\n"), tz).errors[0].message).toContain('"nome"');
    const big = "nome\n" + Array.from({ length: 501 }, (_, i) => `P${i}`).join("\n");
    expect(csvToEvents(parseCsv(big), tz).errors[0].message).toContain("500");
  });
});
