"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { isAiConfigured } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionState } from "@/lib/action-state";
import { runAgent } from "./agent";
import { currentAgentContext } from "./context";
import { buildHistory, threadTitle } from "./history";
import { contextFor, HEAD_SYSTEM } from "./prompts";

const MAX_MESSAGES_PER_THREAD = 80;

const schema = z.object({
  threadId: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
  message: z.string().trim().min(1, "Escreva sua pergunta.").max(4000, "Pergunta longa demais."),
});

export async function sendChatMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAiConfigured()) return { ok: false, message: "A IA ainda não está configurada nesta instalação." };
  const parsed = schema.safeParse({ threadId: formData.get("threadId") ?? undefined, message: formData.get("message") });
  if (!parsed.success) return { ok: false, fieldErrors: { message: parsed.error.issues.map((i) => i.message) } };

  const ctx = await currentAgentContext();
  const supabase = await createClient();
  const db = createServiceClient({ type: "user", id: ctx.userId });

  let threadId = parsed.data.threadId;
  let history: { role: string; content: string; blocks: unknown }[] = [];
  if (threadId) {
    // Leitura com o login da pessoa: só abre a própria conversa.
    const { data: thread } = await supabase
      .from("agent_threads")
      .select("id")
      .eq("id", threadId)
      .eq("company_id", ctx.companyId)
      .maybeSingle();
    if (!thread) return { ok: false, message: "Conversa não encontrada." };
    const { data: rows } = await supabase
      .from("agent_messages")
      .select("role, content, blocks")
      .eq("thread_id", threadId)
      .order("created_at");
    history = rows ?? [];
    if (history.length >= MAX_MESSAGES_PER_THREAD) {
      return { ok: false, message: "Esta conversa ficou longa. Comece uma nova para continuar." };
    }
  } else {
    const { data: created, error } = await db
      .from("agent_threads")
      .insert({ company_id: ctx.companyId, user_id: ctx.userId, agent: "head", title: threadTitle(parsed.data.message) })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[sendChatMessage.thread]", error?.message);
      return { ok: false, message: "Não foi possível abrir a conversa." };
    }
    threadId = created.id;
  }

  await db.from("agent_messages").insert({ company_id: ctx.companyId, thread_id: threadId, role: "user", content: parsed.data.message });

  const result = await runAgent({
    ctx,
    agent: "head",
    purpose: "chat",
    system: HEAD_SYSTEM,
    systemContext: contextFor(ctx),
    messages: [...buildHistory(history), { role: "user", content: parsed.data.message }],
    threadId,
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

  if (!parsed.data.threadId) redirect(`/assistente/${threadId}`);
  refresh();
  return result.status === "error" ? { ok: false, message: result.text } : { ok: true };
}

export async function archiveThread(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const ctx = await currentAgentContext();
  const db = createServiceClient({ type: "user", id: ctx.userId });
  await db.from("agent_threads").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.userId);
  redirect("/assistente");
}
