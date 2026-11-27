import { connection } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Verificação de saúde para monitoramento externo (ex.: UptimeRobot).
 * Responde 200 quando o servidor e o banco estão funcionando, 503 quando não.
 * Não mostra nenhum dado.
 */
export async function GET() {
  await connection();
  const started = Date.now();
  let db = false;
  try {
    const { error } = await createServiceClient({ type: "system" }).from("companies").select("id", { head: true, count: "exact" }).limit(1);
    db = !error;
  } catch {
    db = false;
  }
  return Response.json(
    { ok: db, db, ms: Date.now() - started },
    { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
