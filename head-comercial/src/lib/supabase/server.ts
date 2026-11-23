import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente do Supabase com a sessão do usuário logado.
 * Todas as consultas passam pelas regras de RLS do banco.
 * Criar um novo a cada requisição; nunca compartilhar entre usuários.
 */
export async function createClient() {
  // Ler os cookies primeiro marca a página como dependente do usuário,
  // então ela não é pré-gerada no build.
  const cookieStore = await cookies();
  // A sessão verifica a validade do token com o relógio (Date.now). connection()
  // avisa o Next.js que isso só pode acontecer na hora da visita, nunca em pré-carregamento.
  await connection();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Componentes de servidor não podem gravar cookies.
            // O proxy (src/proxy.ts) renova a sessão nesses casos.
          }
        },
      },
    },
  );
}
