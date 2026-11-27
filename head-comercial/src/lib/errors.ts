import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Registro de erros do servidor na tabela app_errors (tela "Erros" da
 * administração). Nunca lança: se o registro falhar, fica só o log.
 */
export async function logServerError(e: { source: string; message: string; path?: string; method?: string; digest?: string; stack?: string }) {
  try {
    await createServiceClient({ type: "system" })
      .from("app_errors")
      .insert({
        source: e.source.slice(0, 200),
        message: (e.message || "Erro sem mensagem").slice(0, 2000),
        path: e.path?.slice(0, 500) ?? null,
        method: e.method?.slice(0, 10) ?? null,
        digest: e.digest?.slice(0, 100) ?? null,
        stack: e.stack?.slice(0, 8000) ?? null,
      });
  } catch (err) {
    console.error("[logServerError]", err);
  }
}
