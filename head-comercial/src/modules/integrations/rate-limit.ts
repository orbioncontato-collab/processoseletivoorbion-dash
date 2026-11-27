import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Eventos aceitos por fonte em 1 minuto. Protege o sistema de um CRM ou automação em laço. */
export const EVENTS_PER_MINUTE = Number(process.env.WEBHOOK_EVENTS_PER_MINUTE ?? 600);

/** true se a fonte já passou do limite no último minuto (contando o lote que está chegando). */
export async function overRateLimit(sourceId: string, incoming = 1): Promise<boolean> {
  const db = createServiceClient({ type: "system" });
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await db
    .from("raw_events")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .gte("received_at", since);
  if (error) return false;
  return (count ?? 0) + incoming > EVENTS_PER_MINUTE;
}
