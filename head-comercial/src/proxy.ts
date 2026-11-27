import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { HOME_PATH, LOGIN_PATH, isPublicPath } from "@/lib/auth/routes";

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (claims && pathname === LOGIN_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, imagens, webhooks, agendador (que têm autenticação própria) e a verificação de saúde.
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
