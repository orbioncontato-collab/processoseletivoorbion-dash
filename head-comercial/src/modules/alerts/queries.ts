import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ensureFreshAlerts } from "./service";
import type { AlertLike, AlertType, Severity } from "./rules";

export interface AlertRow extends AlertLike {
  title: string;
  status: string;
  detail: Record<string, unknown>;
}

/** Alertas em aberto (o RLS limita: vendedor vê os dele, líder vê todos). Atualiza antes se estiver velho. */
export async function listOpenAlerts(
  companyId: string,
  opts: { userId?: string; type?: AlertType; includeDismissed?: boolean; limit?: number } = {},
): Promise<AlertRow[]> {
  await ensureFreshAlerts(companyId);
  const supabase = await createClient();
  let q = supabase
    .from("alerts")
    .select("id, type, severity, user_id, entity_type, entity_id, reference_date, first_seen_at, title, status, detail")
    .eq("company_id", companyId)
    .in("status", opts.includeDismissed ? ["open", "dismissed"] : ["open"]);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.type) q = q.eq("type", opts.type);
  const { data, error } = await q.order("first_seen_at").limit(opts.limit ?? 500);
  if (error) throw new Error(`Falha ao carregar alertas: ${error.message}`);
  return (data ?? []).map((r) => ({
    ...r,
    type: r.type as AlertType,
    severity: r.severity as Severity,
    detail: (r.detail ?? {}) as Record<string, unknown>,
  }));
}
