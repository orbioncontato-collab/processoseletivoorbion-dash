import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, getAnthropic } from "@/lib/ai/client";
import { createServiceClient } from "@/lib/supabase/service";
import { addUsage, costMicros, emptyUsage } from "./pricing";
import { runTool, TOOL_DEFINITIONS, type AgentContext } from "./tools";

/**
 * Laço do agente (D005): a API pede ferramentas, o servidor executa com as
 * permissões da pessoa e devolve o resultado, até a resposta final.
 * Cada execução fica registrada em ai_runs com tokens e custo.
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AgentRunInput {
  ctx: AgentContext;
  agent: string;
  purpose: "chat" | "analysis" | "daily_summary" | "other";
  /** Parte fixa das instruções (vai para o cache). */
  system: string;
  /** Parte que muda a cada chamada (data, pessoa). Fica depois do ponto de cache. */
  systemContext: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  effort?: Effort;
  threadId?: string;
  maxSteps?: number;
  /** Chamados durante a resposta, para mostrar o texto aos poucos e as consultas. */
  onText?: (delta: string) => void;
  onTool?: (name: string) => void;
}

export interface AgentRunResult {
  status: "ok" | "refused" | "error" | "limit";
  text: string;
  /** Mensagens novas deste turno (respostas do modelo e resultados de ferramentas), para continuar a conversa. */
  turn: Anthropic.Beta.BetaMessageParam[];
  toolsUsed: string[];
  runId: string | null;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("A IA ainda não está configurada.");
  }
}

const textOf = (content: Anthropic.Beta.BetaContentBlock[]) =>
  content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const client = await getAnthropic();
  if (!client) throw new AiNotConfiguredError();

  const started = Date.now();
  const messages = [...input.messages];
  const turn: Anthropic.Beta.BetaMessageParam[] = [];
  const toolsUsed = new Set<string>();
  let usage = emptyUsage();
  let requests = 0;
  let toolCalls = 0;
  let servedModel: string = AI_MODEL;
  let status: AgentRunResult["status"] = "ok";
  let stopReason: string | null = null;
  let text = "";
  let errorDetail: string | null = null;
  let jsonRetries = 0;

  try {
    for (let step = 0; ; step++) {
      if (step >= (input.maxSteps ?? 8)) {
        status = "limit";
        break;
      }
      const stream = client.beta.messages.stream({
        model: AI_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: input.effort ?? "medium" },
        cache_control: { type: "ephemeral" },
        system: [
          { type: "text", text: input.system, cache_control: { type: "ephemeral" } },
          { type: "text", text: input.systemContext },
        ],
        tools: TOOL_DEFINITIONS,
        messages,
      });
      if (input.onText) stream.on("text", input.onText);
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        // Entrada de ferramenta ilegível ou conexão caída no meio: repete a volta (até 2 vezes).
        if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
        continue;
      }
      requests++;
      usage = addUsage(usage, response.usage);
      servedModel = response.model;
      stopReason = response.stop_reason;

      const assistant: Anthropic.Beta.BetaMessageParam = { role: "assistant", content: response.content };
      messages.push(assistant);
      turn.push(assistant);

      if (response.stop_reason === "refusal") {
        status = "refused";
        text = "Não consigo ajudar com esse pedido. Tente perguntar de outro jeito.";
        break;
      }
      if (response.stop_reason === "pause_turn") continue;

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        text = textOf(response.content);
        if (response.stop_reason === "max_tokens") text += "\n\n(Resposta cortada por tamanho.)";
        break;
      }

      // Ferramentas da mesma resposta rodam juntas e voltam numa única mensagem.
      const results = await Promise.all(
        toolUses.map(async (t) => {
          toolsUsed.add(t.name);
          input.onTool?.(t.name);
          const r = await runTool(t.name, t.input, input.ctx);
          return { type: "tool_result" as const, tool_use_id: t.id, content: r.content, is_error: r.isError || undefined };
        }),
      );
      toolCalls += toolUses.length;
      const toolMessage: Anthropic.Beta.BetaMessageParam = { role: "user", content: results };
      messages.push(toolMessage);
      turn.push(toolMessage);
    }
    if (status === "limit") {
      text = "Precisei consultar dados demais para esta pergunta. Tente algo mais específico.";
    } else if (!text) {
      text = "Não consegui montar uma resposta agora.";
    }
  } catch (err) {
    status = "error";
    errorDetail = err instanceof Anthropic.APIError ? `${err.status ?? ""} ${err.message}`.slice(0, 2000) : String(err).slice(0, 2000);
    console.error("[runAgent]", errorDetail);
  }

  const runId = await recordRun({
    ctx: input.ctx,
    agent: input.agent,
    purpose: input.purpose,
    threadId: input.threadId,
    servedModel,
    status,
    stopReason,
    error: errorDetail,
    requests,
    toolCalls,
    usage,
    durationMs: Date.now() - started,
  });

  if (status === "error") {
    return { status, text: "A IA não respondeu agora. Tente de novo em instantes.", turn: [], toolsUsed: [], runId };
  }
  return { status, text, turn, toolsUsed: [...toolsUsed], runId };
}

export async function recordRun(r: {
  ctx: AgentContext;
  agent: string;
  purpose: string;
  threadId?: string;
  servedModel: string;
  status: string;
  stopReason: string | null;
  error: string | null;
  requests: number;
  toolCalls: number;
  usage: ReturnType<typeof emptyUsage>;
  durationMs: number;
}): Promise<string | null> {
  const db = createServiceClient({ type: "agent", id: r.ctx.userId });
  const { data, error } = await db
    .from("ai_runs")
    .insert({
      company_id: r.ctx.companyId,
      user_id: r.ctx.userId,
      agent: r.agent,
      purpose: r.purpose,
      model: AI_MODEL,
      served_model: r.servedModel,
      thread_id: r.threadId ?? null,
      status: r.status,
      stop_reason: r.stopReason,
      error: r.error,
      requests: r.requests,
      tool_calls: r.toolCalls,
      input_tokens: r.usage.input,
      output_tokens: r.usage.output,
      cache_read_tokens: r.usage.cacheRead,
      cache_write_tokens: r.usage.cacheWrite,
      cost_micros: costMicros(r.servedModel, r.usage),
      duration_ms: r.durationMs,
    })
    .select("id")
    .single();
  if (error) console.error("[recordRun]", error.message);
  return data?.id ?? null;
}
