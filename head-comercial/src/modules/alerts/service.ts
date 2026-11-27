import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Recalcula os alertas da empresa se o último cálculo tiver mais de `maxAgeMinutes`. */
export async function ensureFreshAlerts(companyId: string, maxAgeMinutes = 5): Promise<void> {
  const db = createServiceClient({ type: "automation" });
  const { data } = await db.from("company_settings").select("alerts_refreshed_at").eq("company_id", companyId).maybeSingle();
  const last = data?.alerts_refreshed_at ? Date.parse(data.alerts_refreshed_at) : 0;
  if (Date.now() - last < maxAgeMinutes * 60_000) return;
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
