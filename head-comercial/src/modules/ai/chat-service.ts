import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runAgent } from "./agent";
import { buildHistory, threadTitle } from "./history";
import { contextFor, HEAD_SYSTEM } from "./prompts";
import type { AgentContext } from "./tools";

/** Uma pergunta ao Head: abre ou continua a conversa, roda o agente e grava tudo. */

export const MAX_MESSAGES_PER_THREAD = 80;

export class ChatError extends Error {}

export interface ChatEvents {
  onThread?: (id: string) => void;
  onText?: (delta: string) => void;
  onTool?: (name: string) => void;
}

export async function chatTurn(
  ctx: AgentContext,
  input: { threadId: string | null; message: string },
  events: ChatEvents = {},
): Promise<{ threadId: string; status: string; text: string }> {
  const supabase = await createClient();
  const db = createServiceClient({ type: "user", id: ctx.userId });

  let threadId = input.threadId;
  let history: { role: string; content: string; blocks: unknown }[] = [];
  if (threadId) {
    // Leitura com o login da pessoa: só abre a própria conversa.
    const { data: thread } = await supabase
      .from("agent_threads")
      .select("id")
      .eq("id", threadId)
      .eq("company_id", ctx.companyId)
      .maybeSingle();
    if (!thread) throw new ChatError("Conversa não encontrada.");
    const { data: rows } = await supabase.from("agent_messages").select("role, content, blocks").eq("thread_id", threadId).order("created_at");
    history = rows ?? [];
    if (history.length >= MAX_MESSAGES_PER_THREAD) throw new ChatError("Esta conversa ficou longa. Comece uma nova para continuar.");
  } else {
    const { data: created, error } = await db
      .from("agent_threads")
      .insert({ company_id: ctx.companyId, user_id: ctx.userId, agent: "head", title: threadTitle(input.message) })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[chatTurn.thread]", error?.message);
      throw new ChatError("Não foi possível abrir a conversa.");
    }
    threadId = created.id;
  }
  events.onThread?.(threadId);

  await db.from("agent_messages").insert({ company_id: ctx.companyId, thread_id: threadId, role: "user", content: input.message });

  const result = await runAgent({
    ctx,
    agent: "head",
    purpose: "chat",
    system: HEAD_SYSTEM,
    systemContext: contextFor(ctx),
    messages: [...buildHistory(history), { role: "user", content: input.message }],
    threadId,
    onText: events.onText,
    onTool: events.onTool,
  });

  if (result.status !== "error") {
    await db.from("agent_messages").insert({
      company_id: ctx.companyId,
      thread_id: threadId,
      role: "assistant",
      agent: "head",
      content: result.text,
      blocks: result.status === "ok" ? (result.turn as unknown as never) : null,
      tools_used: result.toolsUsed,
      run_id: result.runId,
    });
    await db.from("agent_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  }
  return { threadId, status: result.status, text: result.text };
}
