import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Leituras com o login da pessoa: a equipe vê o publicado; o líder vê rascunhos e histórico. */

export async function listDocuments(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("commercial_documents")
    .select("id, title, kind, published_version, latest_version, updated_at")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("title")
    .limit(300);
  return data ?? [];
}

export async function getDocument(companyId: string, id: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("commercial_documents")
    .select("id, title, kind, published_version, latest_version, archived_at, updated_at")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();
  if (!doc) return null;
  const { data: versions } = await supabase
    .from("document_versions")
    .select("id, version, content, change_note, author_type, created_by, created_at")
    .eq("document_id", id)
    .order("version", { ascending: false });
  return { doc, versions: versions ?? [] };
}
