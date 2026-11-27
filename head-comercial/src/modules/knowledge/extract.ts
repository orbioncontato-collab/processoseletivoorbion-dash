import "server-only";

/** Lê o texto de um arquivo enviado (.txt, .md, .pdf, .docx). */

export const ACCEPTED = [".txt", ".md", ".pdf", ".docx"] as const;
export const MAX_FILE_BYTES = 4_000_000;

export class ExtractError extends Error {}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.size > MAX_FILE_BYTES) throw new ExtractError("Arquivo grande demais (máximo de 4 MB).");
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  if (name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    try {
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      if (!text.trim()) throw new ExtractError("Não encontrei texto neste PDF (pode ser uma imagem escaneada).");
      return text;
    } catch (err) {
      if (err instanceof ExtractError) throw err;
      throw new ExtractError("Não foi possível ler este PDF.");
    }
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    try {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return value;
    } catch {
      throw new ExtractError("Não foi possível ler este arquivo do Word.");
    }
  }
  throw new ExtractError(`Formato não aceito. Use ${ACCEPTED.join(", ")}.`);
}
