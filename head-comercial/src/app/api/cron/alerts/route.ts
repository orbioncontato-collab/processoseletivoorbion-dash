import { NextResponse, type NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron";
import { refreshAllCompanies } from "@/modules/alerts/service";

/**
 * Recalcula os alertas de todas as empresas. Chamado pelo agendador da Vercel
 * (vercel.json) com o cabeçalho Authorization: Bearer CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  const result = await refreshAllCompanies();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
