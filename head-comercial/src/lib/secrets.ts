import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifra de valores sensíveis guardados no banco (AES-256-GCM). A chave vem de
 * SECRETS_ENCRYPTION_KEY, que só existe no servidor. Formato: v1.iv.tag.dados (base64url).
 */

function key(): Buffer | null {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) return null;
  return createHash("sha256").update(raw).digest();
}

export function canEncrypt(): boolean {
  return key() !== null;
}

export function encryptSecret(plain: string): string {
  const k = key();
  if (!k) throw new Error("SECRETS_ENCRYPTION_KEY ausente ou curta demais.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

/** Devolve null se a chave mudou ou o valor foi adulterado. */
export function decryptSecret(stored: string): string | null {
  const k = key();
  const [version, iv, tag, data] = stored.split(".");
  if (!k || version !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Final do valor para mostrar na tela ("termina em 1a2b"), nunca o valor inteiro. */
export function hintOf(value: string): string {
  return value.length <= 8 ? "****" : value.slice(-4);
}
