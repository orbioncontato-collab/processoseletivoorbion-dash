import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Confere o cabeçalho Authorization: Bearer CRON_SECRET. Devolve a resposta de erro, ou null se estiver certo. */
export function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }
  return null;
}
