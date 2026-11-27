import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkCronAuth } from "@/lib/cron";
import { runDueSummaries } from "@/modules/ai/daily-summary";

/**
 * Resumo do dia dos líderes. O agendador chama a cada hora; cada empresa recebe
 * no horário que escolheu, uma vez por dia. `force=1` ignora o horário (testes
 * e reenvio manual), e `company` limita a uma empresa.
 */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  const params = request.nextUrl.searchParams;
  const company = params.get("company");
  if (company && !z.uuid().safeParse(company).success) return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
  const results = await runDueSummaries({ force: params.get("force") === "1", companyId: company ?? undefined });
  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
}
