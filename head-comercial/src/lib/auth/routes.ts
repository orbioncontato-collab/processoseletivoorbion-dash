/** Rotas que não exigem login. */
export const PUBLIC_PATHS = ["/entrar", "/recuperar-senha", "/auth/confirm", "/termos", "/privacidade"] as const;

/** Rotas acessíveis logado mas sem empresa definida (ex.: logo após o convite). */
export const HOME_PATH = "/inicio";
export const LOGIN_PATH = "/entrar";

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Aceita apenas caminhos internos para o redirecionamento após o login.
 * Evita que um link malicioso mande o usuário para outro site (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback: string = HOME_PATH): string {
  if (!next) return fallback;
  // Navegadores ignoram tabulação e quebra de linha no endereço ("/\t/site.com" vira "//site.com")
  // e tratam "\" como "/". Qualquer um desses caracteres invalida o destino.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  // Conferência final: resolvido contra um endereço local, precisa continuar no mesmo site.
  try {
    if (new URL(next, "https://head.invalid").origin !== "https://head.invalid") return fallback;
  } catch {
    return fallback;
  }
  return next;
}
