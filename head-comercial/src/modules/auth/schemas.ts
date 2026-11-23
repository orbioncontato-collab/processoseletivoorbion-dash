import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  password: z.string().min(1, "Informe a senha."),
  next: z.string().optional(),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
});

/** Mesma regra configurada no Supabase: 8+ caracteres com letras e números. */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(72, "Use no máximo 72 caracteres.")
      .regex(/[A-Za-z]/, "Inclua pelo menos uma letra.")
      .regex(/[0-9]/, "Inclua pelo menos um número."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não são iguais.",
    path: ["confirm"],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
});
