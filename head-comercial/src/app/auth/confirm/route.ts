import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/routes";

const OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "email", "signup", "magiclink", "email_change"];

/**
 * Recebe os links dos e-mails de convite e de recuperação de senha.
 * Aceita os dois formatos do Supabase: token_hash (recomendado) e code (PKCE).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/definir-senha");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("[auth/confirm] verifyOtp", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("[auth/confirm] exchangeCode", error.message);
  }

  // Redirecionamento relativo: o navegador completa com o endereço que já está
  // usando. Montar o endereço completo no servidor pode trazer o nome interno
  // (ex.: localhost) e aí o cookie de login gravado agora não acompanharia a pessoa.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: ok ? next : "/entrar?erro=link" },
  });
}
