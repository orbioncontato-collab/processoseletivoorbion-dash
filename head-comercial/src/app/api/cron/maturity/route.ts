import { NextResponse, type NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron";
import { createServiceClient } from "@/lib/supabase/service";
import { refreshMaturity } from "@/modules/maturity/service";

/** Atualiza a maturidade do mês de todas as empresas ativas (uma vez por dia). */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  const db = createServiceClient({ type: "automation" });
  const { data: companies } = await db.from("companies").select("id").eq("status", "active");
  let failed = 0;
  for (const c of companies ?? []) {
    try {
      await refreshMaturity(c.id, null);
    } catch (err) {
      failed++;
      console.error("[cron/maturity]", c.id, err);
    }
  }
  return NextResponse.json({ ok: true, companies: companies?.length ?? 0, failed }, { headers: { "Cache-Control": "no-store" } });
}
