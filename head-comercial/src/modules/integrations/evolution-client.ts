import "server-only";

/**
 * Cliente da Evolution API (servidor que mantém a conexão do WhatsApp por QR Code).
 * Configuração por variáveis de ambiente do servidor: EVOLUTION_API_URL e EVOLUTION_API_KEY.
 * Sem elas, a conexão por QR Code aparece como "não configurada" na tela.
 */

export class EvolutionError extends Error {}

export function evolutionConfig(): { url: string; key: string } | null {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  return url && key ? { url, key } : null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = evolutionConfig();
  if (!cfg) throw new EvolutionError("Servidor do WhatsApp não configurado.");
  let res: Response;
  try {
    res = await fetch(`${cfg.url}${path}`, {
      ...init,
      headers: { apikey: cfg.key, "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new EvolutionError("Não foi possível falar com o servidor do WhatsApp.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[evolution]", path, res.status, detail.slice(0, 300));
    throw new EvolutionError(`O servidor do WhatsApp recusou o pedido (${res.status}).`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

export const instanceNameFor = (sourceId: string) => `hc-${sourceId}`;

export async function createInstance(sourceId: string, webhookUrl: string) {
  return call<{ qrcode?: { base64?: string } }>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: instanceNameFor(sourceId),
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      // Só leitura: o Head nunca envia mensagens por esta conexão no MVP (D008).
      readMessages: false,
      groupsIgnore: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    }),
  });
}

/** Pede um QR Code novo (ele expira em poucos segundos no celular). */
export async function getQrCode(sourceId: string): Promise<string | null> {
  const r = await call<{ base64?: string; qrcode?: { base64?: string } }>(
    `/instance/connect/${instanceNameFor(sourceId)}`,
  );
  const b64 = r.base64 ?? r.qrcode?.base64 ?? null;
  if (!b64) return null;
  return b64.startsWith("data:image") ? b64 : `data:image/png;base64,${b64}`;
}

export async function getConnectionState(sourceId: string): Promise<"open" | "close" | "connecting" | "unknown"> {
  const r = await call<{ instance?: { state?: string }; state?: string }>(
    `/instance/connectionState/${instanceNameFor(sourceId)}`,
  );
  const s = r.instance?.state ?? r.state;
  return s === "open" || s === "close" || s === "connecting" ? s : "unknown";
}

export async function logoutInstance(sourceId: string) {
  await call(`/instance/logout/${instanceNameFor(sourceId)}`, { method: "DELETE" });
}
