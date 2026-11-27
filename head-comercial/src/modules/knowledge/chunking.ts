/**
 * Divisão de documentos em trechos para a busca. Funções puras, testadas em chunking.test.ts.
 */

export interface Chunk {
  heading: string | null;
  content: string;
}

/** Limpa o texto: quebras de linha padronizadas, espaços repetidos e linhas vazias em excesso. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Linha que parece título: Markdown (#), numerada curta ("1. Diagnóstico") ou curta toda em maiúsculas. */
export function headingOf(line: string): string | null {
  const t = line.trim();
  const md = t.match(/^#{1,6}\s+(.+)$/);
  if (md) return md[1].trim();
  if (t.length >= 3 && t.length <= 80 && !/[.!?]$/.test(t)) {
    if (/^\d+(\.\d+)*[.)]?\s+\S/.test(t) && t.split(" ").length <= 8) return t;
    const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length >= 3 && letters === letters.toUpperCase()) return t;
  }
  return null;
}

/** Quebra um parágrafo grande demais por frases, sem cortar palavras. */
function splitLong(paragraph: string, max: number): string[] {
  if (paragraph.length <= max) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [paragraph];
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length > max) {
      if (current) out.push(current.trim());
      current = "";
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max).trim());
      continue;
    }
    if ((current + s).length > max && current) {
      out.push(current.trim());
      current = "";
    }
    current += s;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Divide em trechos de ~`target` caracteres (no máximo `max`), por parágrafos,
 * guardando o título da seção. Cada trecho começa com o final do anterior
 * (`overlap`) para não perder o sentido entre um trecho e outro.
 */
export function splitIntoChunks(
  raw: string,
  opts: { target?: number; max?: number; overlap?: number } = {},
): Chunk[] {
  const target = opts.target ?? 1200;
  const max = opts.max ?? 2000;
  const overlap = opts.overlap ?? 150;
  const text = normalizeText(raw);
  if (!text) return [];

  const chunks: Chunk[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];
  let tail = "";

  const flush = () => {
    const body = buffer.join("\n\n").trim();
    if (!body) return;
    const content = (tail ? `${tail} ${body}` : body).slice(0, 8000);
    chunks.push({ heading, content });
    tail = overlap > 0 ? body.slice(-overlap).replace(/^\S*\s/, "").trim() : "";
    buffer = [];
  };

  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const h = headingOf(lines[0]);
    if (h) {
      flush();
      tail = "";
      heading = h.slice(0, 300);
      const rest = lines.slice(1).join("\n").trim();
      if (!rest) continue;
      for (const piece of splitLong(rest, max)) {
        if (buffer.join("\n\n").length + piece.length > target && buffer.length) flush();
        buffer.push(piece);
      }
      continue;
    }
    for (const piece of splitLong(block.trim(), max)) {
      if (buffer.join("\n\n").length + piece.length > target && buffer.length) flush();
      buffer.push(piece);
    }
  }
  flush();
  return chunks;
}
