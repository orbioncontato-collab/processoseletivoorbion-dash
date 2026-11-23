import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

export type ActorType = Database["public"]["Enums"]["actor_type"];

export interface Actor {
  type: ActorType;
  id?: string | null;
}

/**
 * Cliente com a chave secreta. IGNORA o RLS.
 * Use somente no servidor, depois de checar a permissão no código.
 *
 * O autor da ação vai nos cabeçalhos x-actor-type e x-actor-id, que o gatilho
 * de auditoria do banco usa para registrar quem fez cada alteração.
 */
export function createServiceClient(actor: Actor) {
  const env = serverEnv();
  const headers: Record<string, string> = { "x-actor-type": actor.type };
  if (actor.id) headers["x-actor-id"] = actor.id;

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers },
  });
}
