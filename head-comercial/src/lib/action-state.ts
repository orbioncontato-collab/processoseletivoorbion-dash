import type { z } from "zod";

/** Resposta padrão das ações de formulário. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
} | null;

export function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, message: "Confira os campos destacados.", fieldErrors };
}

/** Mensagem genérica para o usuário; o detalhe vai para o log e para a tela de erros da administração. */
export function unexpected(context: string, detail: unknown): ActionState {
  console.error(`[${context}]`, detail);
  void import("@/lib/errors").then(({ logServerError }) =>
    logServerError({
      source: `action:${context}`,
      message: detail instanceof Error ? detail.message : typeof detail === "string" ? detail : JSON.stringify(detail) ?? "sem detalhe",
      stack: detail instanceof Error ? detail.stack : undefined,
    }),
  );
  return { ok: false, message: "Algo deu errado. Tente de novo em instantes." };
}
