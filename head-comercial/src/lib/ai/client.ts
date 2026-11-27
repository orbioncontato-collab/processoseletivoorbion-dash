import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente da API da Anthropic. Sem chave configurada, a IA fica desligada e as
 * telas avisam. A chave nunca vai para o navegador.
 */

export const AI_MODEL = "claude-opus-5-5";

let cached: Anthropic | null | undefined;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropic(): Anthropic | null {
  if (cached !== undefined) return cached;
  cached = isAiConfigured() ? new Anthropic({ maxRetries: 2, timeout: 120_000 }) : null;
  return cached;
}
