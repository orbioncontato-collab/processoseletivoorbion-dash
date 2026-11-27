import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { extractTextFromFile, ExtractError } = await import("./extract");

const fixture = async (name: string, type = "application/octet-stream") =>
  new File([await readFile(path.resolve(import.meta.dirname, "../../../tests/fixtures", name))], name, { type });

describe("leitura de arquivos", () => {
  it("lê texto de .md, .docx e .pdf", async () => {
    const md = await extractTextFromFile(new File(["# Título\n\nConteúdo com acentuação."], "nota.md"));
    expect(md).toContain("Conteúdo com acentuação.");
    for (const name of ["playbook.docx", "playbook.pdf"]) {
      const text = await extractTextFromFile(await fixture(name));
      expect(text).toContain("Objeção de preço");
      expect(text).toContain("prazo de validade de 7 dias");
    }
  });

  it("recusa formato desconhecido, arquivo grande e PDF quebrado", async () => {
    await expect(extractTextFromFile(new File(["x"], "planilha.xlsx"))).rejects.toThrow(/Formato não aceito/);
    await expect(extractTextFromFile(new File([new Uint8Array(4_000_001)], "grande.txt"))).rejects.toThrow(/grande demais/);
    await expect(extractTextFromFile(new File(["isto não é pdf"], "falso.pdf"))).rejects.toBeInstanceOf(ExtractError);
  });
});
