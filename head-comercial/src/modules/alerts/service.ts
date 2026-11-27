import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Recalcula os alertas da empresa quando:
 *   - nunca foram calculados ou o último cálculo tem mais de `maxAgeMinutes`
 *     (alertas por tempo, como "vencido" e "parado", mudam sozinhos com o relógio); ou
 *   - algo mudou desde o último cálculo (qualquer registro no histórico central
 *     ou mensagem nova numa conversa).
 */
export async function ensureFreshAlerts(companyId: string, maxAgeMinutes = 5): Promise<void> {
  const db = createServiceClient({ type: "automation" });
  const { data } = await db.from("company_settings").select("alerts_refreshed_at").eq("company_id", companyId).maybeSingle();
  const last = data?.alerts_refreshed_at ?? null;

  let stale = !last || Date.now() - Date.parse(last) >= maxAgeMinutes * 60_000;
  if (!stale && last) {
    const [activity, conversation] = await Promise.all([
      db.from("activities").select("id").eq("company_id", companyId).gt("occurred_at", last).limit(1),
      db.from("conversations").select("id").eq("company_id", companyId).gt("updated_at", last).limit(1),
    ]);
    stale = Boolean(activity.data?.length || conversation.data?.length);
  }
  if (!stale) return;

  const { error } = await db.rpc("refresh_alerts", { target_company: companyId });
  if (error) console.error("[alerts] refresh", companyId, error.message);
}

/** Recalcula os alertas de todas as empresas ativas (usado pelo agendador). */
export async function refreshAllCompanies(): Promise<{ companies: number; failed: number }> {
  const db = createServiceClient({ type: "automation" });
  const { data: companies, error } = await db.from("companies").select("id").eq("status", "active");
  if (error) throw new Error(error.message);
  let failed = 0;
  for (const c of companies ?? []) {
    const r = await db.rpc("refresh_alerts", { target_company: c.id });
    if (r.error) {
      failed++;
      console.error("[alerts] refresh", c.id, r.error.message);
    }
  }
  return { companies: companies?.length ?? 0, failed };
}
