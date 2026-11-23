import "server-only";
import { cookies } from "next/headers";
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
