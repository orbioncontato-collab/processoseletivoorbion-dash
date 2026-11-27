import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { platformSecret } from "@/lib/platform-config";

/**
 * Cliente da API da Anthropic. A chave vem da tela de integrações da
 * administração ou da variável ANTHROPIC_API_KEY. Sem chave, a IA fica
 * desligada e as telas avisam. A chave nunca vai para o navegador.
 */

export const AI_MODEL = "claude-opus-5-5";

let cached: { key: string; client: Anthropic } | null = null;

export async function isAiConfigured(): Promise<boolean> {
  return Boolean(await platformSecret("anthropic_api_key"));
}

export async function getAnthropic(): Promise<Anthropic | null> {
  const key = await platformSecret("anthropic_api_key");
  if (!key) return null;
  if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key, maxRetries: 2, timeout: 120_000 }) };
  return cached.client;
}
