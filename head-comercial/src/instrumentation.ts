import type { Instrumentation } from "next";

/** Erros do servidor (páginas, rotas e ações) vão para a tela "Erros" da administração. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logServerError } = await import("@/lib/errors");
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  await logServerError({
    source: `${context.routeType}:${context.routePath}`,
    message: e.message,
    path: request.path,
    method: request.method,
    digest,
    stack: e.stack,
  });
};
