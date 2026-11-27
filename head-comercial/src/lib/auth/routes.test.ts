import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("aceita caminho interno", () => {
    expect(safeNextPath("/equipe")).toBe("/equipe");
    expect(safeNextPath("/definir-senha?x=1")).toBe("/definir-senha?x=1");
  });
  it("recusa endereços externos e truques comuns", () => {
    expect(safeNextPath("https://malicioso.com")).toBe("/inicio");
    expect(safeNextPath("//malicioso.com")).toBe("/inicio");
    expect(safeNextPath("/\\malicioso.com")).toBe("/inicio");
    expect(safeNextPath("/redir?u=https://x.com")).toBe("/inicio");
    expect(safeNextPath("equipe")).toBe("/inicio");
  });
  it("recusa caracteres que o navegador descarta ou troca por barra", () => {
    expect(safeNextPath("/\t/malicioso.com")).toBe("/inicio");
    expect(safeNextPath("/\n/malicioso.com")).toBe("/inicio");
    expect(safeNextPath("/\r//malicioso.com")).toBe("/inicio");
    expect(safeNextPath("/x\\y")).toBe("/inicio");
    expect(safeNextPath("/oportunidades?due=overdue")).toBe("/oportunidades?due=overdue");
  });
  it("usa o padrão quando vazio", () => {
    expect(safeNextPath(null)).toBe("/inicio");
    expect(safeNextPath(undefined, "/x")).toBe("/x");
  });
});

describe("isPublicPath", () => {
  it("identifica rotas públicas", () => {
    expect(isPublicPath("/entrar")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/inicio")).toBe(false);
    expect(isPublicPath("/entrarx")).toBe(false);
  });
});
