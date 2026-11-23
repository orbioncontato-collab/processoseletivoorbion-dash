import { z } from "zod";

/**
 * Variáveis de ambiente validadas.
 * As públicas (NEXT_PUBLIC_*) podem ir para o navegador.
 * A chave secreta do Supabase só existe no servidor (ver serverEnv).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
});

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Configuração ausente ou inválida: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}. Veja .env.example.`,
    );
  }
  return parsed.data;
}

export function serverEnv() {
  const parsed = serverSchema.safeParse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
  if (!parsed.success) {
    throw new Error("SUPABASE_SECRET_KEY ausente. Veja .env.example.");
  }
  return { ...publicEnv(), ...parsed.data };
}
