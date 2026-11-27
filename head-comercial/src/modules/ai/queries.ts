import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Leituras dos agentes com o login da pessoa (RLS). */

export async function listThreads(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_threads")
    .select("id, title, updated_at, agent")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getThread(companyId: string, id: string) {
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("agent_threads")
    .select("id, title, archived_at, agent")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();
  if (!thread) return null;
  const { data: messages } = await supabase
    .from("agent_messages")
    .select("id, role, agent, content, tools_used, created_at")
    .eq("thread_id", id)
    .order("created_at");
  return { thread, messages: messages ?? [] };
}

export async function listAnalyses(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_analyses")
    .select("id, summary, score, stage_reached, criteria, strengths, failures, objections, recommendations, next_step, messages_count, created_at, requested_by")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

/** Resumo do dia mais recente da pessoa (últimas 36 horas). */
export async function latestDailySummary(companyId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const { data: thread } = await supabase
    .from("agent_threads")
    .select("id, title, created_at")
    .eq("company_id", companyId)
    .eq("kind", "daily_summary")
    .is("archived_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!thread) return null;
  const { data: first } = await supabase
    .from("agent_messages")
    .select("content")
    .eq("thread_id", thread.id)
    .eq("role", "assistant")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return first ? { ...thread, content: first.content } : null;
}
