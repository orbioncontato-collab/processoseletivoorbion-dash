import { z } from "zod";

/** Gera o identificador da empresa a partir do nome: "Orbion Ltda." -> "orbion-ltda". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Rio_Branco",
  "America/Noronha",
] as const;

export const createCompanySchema = z
  .object({
    name: z.string().trim().min(2, "Mínimo de 2 caracteres.").max(120, "Máximo de 120 caracteres."),
    slug: z.string().trim().optional(),
    timezone: z.enum(TIMEZONES, { message: "Fuso horário inválido." }).default("America/Sao_Paulo"),
    maxUsers: z.coerce
      .number({ message: "Informe um número." })
      .int("Use um número inteiro.")
      .min(1, "Mínimo de 1 usuário.")
      .max(1000, "Máximo de 1000 usuários.")
      .default(6),
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.name) }))
  .refine((v) => v.slug.length >= 2, {
    message: "Não foi possível gerar um identificador. Use letras ou números no nome.",
    path: ["name"],
  });
