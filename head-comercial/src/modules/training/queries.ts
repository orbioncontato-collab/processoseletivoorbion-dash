import "server-only";
import { createClient } from "@/lib/supabase/server";
import { evolutionText, skillAverage, type Skill } from "./skills";

/** Leituras com o login da pessoa (RLS): vendedor vê o dele, líder vê o time. */

export async function listLibrary(scope?: "global" | "company", companyId?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("trainings")
    .select("id, scope, title, summary, skill, format, duration_minutes, url, created_at")
    .is("archived_at", null)
    .order("skill")
    .order("title")
    .limit(500);
  if (scope) q = q.eq("scope", scope);
  if (scope === "company" && companyId) q = q.eq("company_id", companyId);
  const { data } = await q;
  return data ?? [];
}

export async function getTraining(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trainings")
    .select("id, scope, company_id, title, summary, skill, format, content, url, duration_minutes, archived_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export interface AssignmentView {
  id: string;
  user_id: string;
  training_id: string;
  trainingTitle: string;
  status: string;
  source: string;
  reason: string;
  skill: string;
  baseline_score: number | null;
  created_at: string;
  completed_at: string | null;
  evolution: string | null;
}

export async function listAssignments(companyId: string, opts: { userId?: string; includeClosed?: boolean } = {}): Promise<AssignmentView[]> {
  const supabase = await createClient();
  let q = supabase
    .from("training_assignments")
    .select("id, user_id, training_id, status, source, reason, skill, baseline_score, created_at, completed_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (!opts.includeClosed) q = q.neq("status", "dismissed");
  const { data } = await q;
  const rows = data ?? [];
  if (!rows.length) return [];

  const trainingIds = [...new Set(rows.map((r) => r.training_id))];
  const { data: trainings } = await supabase.from("trainings").select("id, title").in("id", trainingIds);
  const title = new Map((trainings ?? []).map((t) => [t.id, t.title]));

  // Evolução: análises de cada pessoa depois da conclusão.
  const completed = rows.filter((r) => r.status === "completed" && r.completed_at);
  const analysesByUser = new Map<string, { criteria: unknown; created_at: string }[]>();
  if (completed.length) {
    const users = [...new Set(completed.map((r) => r.user_id))];
    const since = completed.map((r) => r.completed_at!).sort()[0];
    const { data: analyses } = await supabase
      .from("conversation_analyses")
      .select("seller_id, criteria, created_at")
      .eq("company_id", companyId)
      .in("seller_id", users)
      .gte("created_at", since)
      .limit(1000);
    for (const a of analyses ?? []) {
      const list = analysesByUser.get(a.seller_id) ?? [];
      list.push(a);
      analysesByUser.set(a.seller_id, list);
    }
  }

  return rows.map((r) => {
    let evolution: string | null = null;
    if (r.status === "completed" && r.completed_at) {
      const after = (analysesByUser.get(r.user_id) ?? []).filter((a) => a.created_at > r.completed_at!);
      evolution = evolutionText(r.baseline_score === null ? null : Number(r.baseline_score), skillAverage(after, r.skill as Skill));
    }
    return {
      ...r,
      baseline_score: r.baseline_score === null ? null : Number(r.baseline_score),
      trainingTitle: title.get(r.training_id) ?? "Treinamento",
      evolution,
    };
  });
}
