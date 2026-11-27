import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Leituras do conhecimento e da memória. Usam o login do usuário: o RLS decide o que aparece. */

const NO_COMPANY = "00000000-0000-0000-0000-000000000000";

export async function listDocuments(scope: "global" | "company", companyId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("knowledge_documents")
    .select("id, title, kind, tags, source, file_name, content_chars, chunk_count, status, created_at")
    .eq("scope", scope)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(300);
  if (scope === "company" && companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  return data ?? [];
}

export async function searchKnowledge(companyId: string | null, q: string, includeGlobal: boolean) {
  if (!q.trim()) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_knowledge", {
    target_company: companyId ?? NO_COMPANY,
    q,
    include_global: includeGlobal,
    max_results: 10,
  });
  return data ?? [];
}

export async function listCalibrationCases(scope: "global" | "company", companyId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("calibration_cases")
    .select("id, title, outcome, conversation, expected_assessment, created_at")
    .eq("scope", scope)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (scope === "company" && companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  return data ?? [];
}

export async function listMemory(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memory_items")
    .select("id, scope, subject_user_id, category, content, source, created_by, created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((r) => [r.created_by, r.subject_user_id]).filter((v): v is string => !!v))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const name = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  return rows.map((r) => ({
    ...r,
    authorName: r.created_by ? (name.get(r.created_by) ?? "Sem nome") : "Sistema",
    subjectName: r.subject_user_id ? (name.get(r.subject_user_id) ?? "Sem nome") : null,
  }));
}
