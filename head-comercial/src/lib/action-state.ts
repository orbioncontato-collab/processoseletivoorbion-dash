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

/** Mensagem genérica para o usuário; o detalhe vai só para o log do servidor. */
export function unexpected(context: string, detail: unknown): ActionState {
  console.error(`[${context}]`, detail);
  return { ok: false, message: "Algo deu errado. Tente de novo em instantes." };
}
