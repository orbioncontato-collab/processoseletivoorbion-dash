import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptSecret } from "@/lib/secrets";

/**
 * Chaves das integrações da plataforma. Vale o que a administração salvou na
 * tela; sem isso, a variável de ambiente do servidor. Guardado em memória por
 * 30 segundos para não consultar o banco a cada pedido.
 */

export type SecretName = "anthropic_api_key" | "evolution_api_url" | "evolution_api_key";

export const ENV_FALLBACK: Record<SecretName, string> = {
  anthropic_api_key: "ANTHROPIC_API_KEY",
  evolution_api_url: "EVOLUTION_API_URL",
  evolution_api_key: "EVOLUTION_API_KEY",
};

const TTL_MS = 30_000;
let cache: { at: number; values: Partial<Record<SecretName, string>> } | null = null;

export function clearPlatformConfigCache() {
  cache = null;
}

async function stored(): Promise<Partial<Record<SecretName, string>>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;
  const values: Partial<Record<SecretName, string>> = {};
  try {
    const db = createServiceClient({ type: "system" });
    const { data, error } = await db.from("platform_secrets").select("name, ciphertext");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const plain = decryptSecret(row.ciphertext);
      if (plain) values[row.name as SecretName] = plain;
      else console.error(`[platform-config] não foi possível decifrar ${row.name} (SECRETS_ENCRYPTION_KEY mudou?)`);
    }
  } catch (err) {
    console.error("[platform-config]", err);
  }
  cache = { at: Date.now(), values };
  return values;
}

export async function platformSecret(name: SecretName): Promise<string | null> {
  const fromDb = (await stored())[name];
  if (fromDb) return fromDb;
  return process.env[ENV_FALLBACK[name]] || null;
}

export async function secretSource(name: SecretName): Promise<"screen" | "env" | null> {
  if ((await stored())[name]) return "screen";
  return process.env[ENV_FALLBACK[name]] ? "env" : null;
}
