import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Ações com o login da pessoa: vendedor vê as dele; líder vê as do time. */
export async function listActions(companyId: string, opts: { ownerId?: string; includeClosed?: boolean; limit?: number } = {}) {
  const supabase = await createClient();
  let q = supabase
    .from("action_items")
    .select("id, title, description, owner_id, due_date, priority, status, source, created_at, completed_at")
    .eq("company_id", companyId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 300);
  if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);
  if (!opts.includeClosed) q = q.in("status", ["open", "doing"]);
  const { data } = await q;
  return data ?? [];
}
