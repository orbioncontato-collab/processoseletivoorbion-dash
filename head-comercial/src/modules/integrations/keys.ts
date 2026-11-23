import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Chaves de acesso das fontes. O banco guarda só a impressão digital (SHA-256);
 * a chave aparece uma única vez, na criação.
 */

export function generateSourceKey(): { key: string; hash: string; hint: string } {
  const key = `hc_${randomBytes(32).toString("base64url")}`;
  return { key, hash: hashSourceKey(key), hint: key.slice(-4) };
}

export function hashSourceKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** Compara a chave recebida com a impressão digital guardada, em tempo constante. */
export function keyMatches(received: string, storedHash: string | null): boolean {
  if (!storedHash || !received) return false;
  const a = Buffer.from(hashSourceKey(received), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lê a chave do cabeçalho Authorization: Bearer ... ou x-api-key. */
export function readKeyFromHeaders(headers: Headers): string {
  const auth = headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || headers.get("x-api-key")?.trim() || "";
}
