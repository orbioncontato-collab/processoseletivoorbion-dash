import { describe, expect, it } from "vitest";
import { friendlyDbError } from "./db-errors";

describe("friendlyDbError", () => {
  it("mostra as mensagens dos nossos gatilhos", () => {
    expect(friendlyDbError({ code: "23514", message: "Mova as oportunidades abertas antes de arquivar esta etapa" })).toBe(
      "Mova as oportunidades abertas antes de arquivar esta etapa",
    );
  });
  it("traduz permissão, duplicidade e regras", () => {
    expect(friendlyDbError({ code: "42501", message: "new row violates row-level security policy" })).toBe(
      "Você não tem permissão para fazer isso.",
    );
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "contacts_unique_phone"' })).toBe(
      "Já existe um contato com esse telefone.",
    );
    expect(friendlyDbError({ code: "23514", message: 'violates check constraint "lost_needs_reason"' })).toBe(
      "Informe o motivo da perda.",
    );
  });
  it("não vaza detalhes internos em erros desconhecidos", () => {
    expect(friendlyDbError({ code: "XX000", message: "internal: relation x at line 3" })).toBe(
      "Não foi possível salvar. Tente de novo.",
    );
  });
});
