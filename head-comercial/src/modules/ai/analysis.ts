import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AI_MODEL, getAnthropic } from "@/lib/ai/client";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDateTime } from "@/lib/format";
import { getConversation } from "@/modules/conversations/queries";
import { AiNotConfiguredError, recordRun } from "./agent";
import { addUsage, emptyUsage } from "./pricing";
import type { AgentContext } from "./tools";

/**
 * Analista de Conversas (D006: só quando alguém pede). Lê a conversa do
 * WhatsApp com o login de quem pediu, junta a metodologia e os casos de
 * calibragem e devolve uma avaliação estruturada, gravada no banco.
 */

export const CRITERIA = [
  "Abertura e conexão",
  "Diagnóstico da necessidade",
  "Apresentação de valor",
  "Tratamento de objeções",
  "Condução para o próximo passo",
  "Agilidade e cadência",
] as const;

const SYSTEM = `Você é o Analista de Conversas do Head Comercial Digital. Você avalia conversas de venda pelo WhatsApp entre um vendedor e um cliente e devolve uma análise útil para o vendedor melhorar e para o líder acompanhar.

Regras:
- Avalie só o que está na conversa. Se faltar informação para um critério, dê a nota com cautela e diga o que faltou.
- Use a metodologia e os exemplos de calibragem recebidos como referência do que é uma boa venda nesta operação. Os exemplos mostram o nível de exigência esperado.
- Notas de 0 a 10. 5 é uma condução razoável, 8 ou mais é exemplar.
- Seja específico: cite o momento da conversa (o que foi dito) ao apontar acertos e falhas.
- Tom de desenvolvimento, nunca de acusação.
- Português do Brasil, frases curtas, sem travessão.
- Critérios, nesta ordem: ${CRITERIA.join("; ")}.`;

/** Formato pedido à API (sem limites numéricos, que o formato estruturado não aceita; a validação vem depois). */
const API_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "nota_geral", "etapa_alcancada", "criterios", "pontos_fortes", "falhas", "objecoes", "recomendacoes", "proximo_passo"],
  properties: {
    resumo: { type: "string", description: "Duas ou três frases sobre a conversa e onde ela parou." },
    nota_geral: { type: "integer", description: "0 a 10" },
    etapa_alcancada: { type: "string", description: "Ex.: primeiro contato, diagnóstico, proposta enviada, negociação, fechado, perdido." },
    criterios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "nota", "comentario"],
        properties: { nome: { type: "string" }, nota: { type: "integer", description: "0 a 10" }, comentario: { type: "string" } },
      },
    },
    pontos_fortes: { type: "array", items: { type: "string" } },
    falhas: { type: "array", items: { type: "string" } },
    objecoes: { type: "array", items: { type: "string" }, description: "Objeções que o cliente levantou." },
    recomendacoes: { type: "array", items: { type: "string" }, description: "O que o vendedor pode fazer diferente, de forma prática." },
    proximo_passo: { type: "string", description: "A próxima ação recomendada com este cliente." },
  },
} as const;

const clampScore = z.number().transform((n) => Math.max(0, Math.min(10, Math.round(n))));
const text = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
const list = z.array(text(600)).transform((a) => a.filter(Boolean).slice(0, 10));

export const analysisSchema = z.object({
  resumo: text(4000),
  nota_geral: clampScore,
  etapa_alcancada: text(200),
  criterios: z.array(z.object({ nome: text(100), nota: clampScore, comentario: text(800) })).max(12),
  pontos_fortes: list,
  falhas: list,
  objecoes: list,
  recomendacoes: list,
  proximo_passo: text(1000),
});

export type AnalysisOutput = z.output<typeof analysisSchema>;

export function parseAnalysis(raw: string): AnalysisOutput | null {
  try {
    const parsed = analysisSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

interface Msg {
  direction: string;
  sent_at: string;
  message_type: string;
  body: string | null;
}

/** Conversa em texto, com data e quem falou. Mantém as mensagens mais recentes se passar do limite. */
export function transcript(messages: Msg[], timeZone: string, maxChars = 60_000): string {
  const lines = messages.map(
    (m) => `[${formatDateTime(m.sent_at, timeZone)}] ${m.direction === "inbound" ? "Cliente" : "Vendedor"}: ${m.body ?? `(${m.message_type})`}`,
  );
  const out: string[] = [];
  let size = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    size += lines[i].length + 1;
    if (size > maxChars) {
      out.unshift("(mensagens mais antigas omitidas)");
      break;
    }
    out.unshift(lines[i]);
  }
  return out.join("\n");
}

export class AnalysisError extends Error {}

export async function analyzeConversation(ctx: AgentContext, conversationId: string): Promise<string> {
  const client = await getAnthropic();
  if (!client) throw new AiNotConfiguredError();

  // Com o login de quem pediu: só analisa o que a pessoa pode ver.
  const found = await getConversation(ctx.companyId, conversationId);
  if (!found) throw new AnalysisError("Conversa não encontrada.");
  const textMessages = found.messages.filter((m) => m.body);
  if (textMessages.length < 2) throw new AnalysisError("A conversa ainda tem poucas mensagens para analisar.");

  const db = createServiceClient({ type: "agent", id: ctx.userId });
  const [methodology, cases] = await Promise.all([
    db.rpc("search_knowledge", {
      target_company: ctx.companyId,
      q: "diagnóstico objeção proposta fechamento follow-up valor",
      include_global: true,
      max_results: 5,
    }),
    db
      .from("calibration_cases")
      .select("title, outcome, conversation, expected_assessment, scope")
      .or(`company_id.eq.${ctx.companyId},scope.eq.global`)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  // Casos da empresa primeiro, depois os globais; no máximo três.
  const examples = (cases.data ?? []).sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "company" ? -1 : 1)).slice(0, 3);

  const reference = [
    methodology.data?.length
      ? `<metodologia>\n${methodology.data.map((h) => `## ${h.title}${h.heading ? ` · ${h.heading}` : ""}\n${h.content}`).join("\n\n")}\n</metodologia>`
      : "",
    examples.length
      ? `<exemplos_de_calibragem>\n${examples
          .map((c) => `## ${c.title} (resultado: ${c.outcome})\nConversa:\n${c.conversation.slice(0, 6000)}\nAvaliação esperada:\n${c.expected_assessment.slice(0, 3000)}`)
          .join("\n\n")}\n</exemplos_de_calibragem>`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userContent = `${reference ? `${reference}\n\n` : ""}<conversa cliente="${found.contact?.name ?? "Cliente"}">\n${transcript(found.messages, ctx.timezone)}\n</conversa>\n\nAnalise esta conversa.`;

  const started = Date.now();
  let usage = emptyUsage();
  let servedModel: string = AI_MODEL;
  let stopReason: string | null = null;
  let status = "ok";
  let errorDetail: string | null = null;
  let output: AnalysisOutput | null = null;

  try {
    const response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: API_SCHEMA as unknown as Record<string, unknown> } },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
    usage = addUsage(usage, response.usage);
    servedModel = response.model;
    stopReason = response.stop_reason;
    if (response.stop_reason === "refusal") {
      status = "refused";
    } else {
      const raw = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      output = parseAnalysis(raw);
      if (!output) {
        status = "error";
        errorDetail = `Resposta fora do formato: ${raw.slice(0, 500)}`;
      }
    }
  } catch (err) {
    status = "error";
    errorDetail = err instanceof Anthropic.APIError ? `${err.status ?? ""} ${err.message}`.slice(0, 2000) : String(err).slice(0, 2000);
  }

  const runId = await recordRun({
    ctx,
    agent: "analyst",
    purpose: "analysis",
    servedModel,
    status,
    stopReason,
    error: errorDetail,
    requests: 1,
    toolCalls: 0,
    usage,
    durationMs: Date.now() - started,
  });

  if (!output) {
    if (errorDetail) console.error("[analyzeConversation]", errorDetail);
    throw new AnalysisError(status === "refused" ? "A IA não conseguiu analisar esta conversa." : "A análise falhou. Tente de novo em instantes.");
  }

  const { data, error } = await db
    .from("conversation_analyses")
    .insert({
      company_id: ctx.companyId,
      conversation_id: conversationId,
      seller_id: found.conversation.owner_id,
      requested_by: ctx.userId,
      summary: output.resumo,
      score: output.nota_geral,
      stage_reached: output.etapa_alcancada || null,
      criteria: output.criterios,
      strengths: output.pontos_fortes,
      failures: output.falhas,
      objections: output.objecoes,
      recommendations: output.recomendacoes,
      next_step: output.proximo_passo || null,
      messages_count: found.messages.length,
      model: servedModel,
      run_id: runId,
    })
    .select("id")
    .single();
  if (error || !data) throw new AnalysisError("Não foi possível salvar a análise.");
  return data.id;
}
