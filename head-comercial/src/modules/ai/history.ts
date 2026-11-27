import type Anthropic from "@anthropic-ai/sdk";

/**
 * Monta o histórico enviado à API a partir das mensagens gravadas. As respostas
 * do agente são repassadas com os blocos originais (pensamento e ferramentas),
 * sem mudar nada, para a conversa continuar de onde parou.
 */

export interface StoredMessage {
  role: string;
  content: string;
  blocks: unknown;
}

export function buildHistory(rows: StoredMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const r of rows) {
    if (r.role === "user") {
      out.push({ role: "user", content: r.content });
    } else if (Array.isArray(r.blocks) && r.blocks.length) {
      out.push(...(r.blocks as Anthropic.Beta.BetaMessageParam[]));
    } else {
      out.push({ role: "assistant", content: r.content });
    }
  }
  return out;
}

/** Título da conversa a partir da primeira pergunta. */
export function threadTitle(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57).trimEnd()}...` : clean || "Nova conversa";
}
