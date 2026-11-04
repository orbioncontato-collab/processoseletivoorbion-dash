import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SISTEMA } from "./prompts";

export const MODELO = "claude-opus-5-5";

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface ImagemAnexo {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * Chama o Claude e devolve o texto da resposta.
 * Só funciona com ANTHROPIC_API_KEY no .env.local. Sem chave, a plataforma
 * mostra o prompt para você copiar e colar no claude.ai.
 *
 * "fallbacks: default" faz a própria API tentar outro modelo se esse
 * recusar o pedido, então você raramente fica sem resposta.
 */
export async function gerarTexto(
  prompt: string,
  opcoes: { esforco?: "low" | "medium" | "high"; imagens?: ImagemAnexo[] } = {},
): Promise<string> {
  const client = new Anthropic();

  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(opcoes.imagens ?? []).map(
      (img): Anthropic.Beta.BetaContentBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      }),
    ),
    { type: "text", text: prompt },
  ];

  try {
    const stream = client.beta.messages.stream({
      model: MODELO,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: opcoes.esforco ?? "high" },
      system: SISTEMA,
      messages: [{ role: "user", content: conteudo }],
    });
    const resposta = await stream.finalMessage();

    if (resposta.stop_reason === "refusal") {
      throw new Error("A IA recusou esse pedido. Tente reformular o tema.");
    }
    const texto = resposta.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!texto) throw new Error("A IA não devolveu texto. Tente de novo.");
    return texto;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("Chave da API inválida. Confira o ANTHROPIC_API_KEY no .env.local.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("Limite de uso da API atingido. Espere um pouco e tente de novo.");
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Sem conexão com a API do Claude.");
    if (e instanceof Anthropic.APIError) throw new Error(`Erro da API do Claude (${e.status}): ${e.message}`);
    throw e;
  }
}
