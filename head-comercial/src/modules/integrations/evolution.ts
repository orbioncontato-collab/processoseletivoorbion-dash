import type { Envelope } from "./standard";

/**
 * Tradução dos avisos da Evolution API (ponte do WhatsApp por QR Code) para o
 * formato padrão do Head. Funções puras, testadas em evolution.test.ts.
 *
 * ATENÇÃO: o formato foi escrito com base na Evolution API v2 (evento
 * "messages.upsert" e "connection.update"). Conferir com um servidor real na
 * instalação; o tradutor é tolerante e ignora o que não reconhece.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export function normalizeEventName(event: unknown): string {
  return String(event ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, ".");
}

/** Timestamp do WhatsApp (segundos, texto ou objeto Long) para ISO. */
export function readTimestamp(v: unknown): string | null {
  let seconds: number | null = null;
  if (typeof v === "number") seconds = v;
  else if (typeof v === "string" && /^\d+$/.test(v)) seconds = Number(v);
  else if (isObj(v) && typeof v.low === "number") seconds = (v.low >>> 0) + (typeof v.high === "number" ? v.high * 2 ** 32 : 0);
  if (!seconds) return null;
  const ms = seconds > 1e12 ? seconds : seconds * 1000;
  return new Date(ms).toISOString();
}

/** Extrai o telefone de um JID do WhatsApp. Grupos, listas e status não têm telefone de cliente. */
export function phoneFromJid(jid: string | undefined): string | null {
  if (!jid) return null;
  if (/@(g\.us|broadcast|newsletter)$/.test(jid) || jid.startsWith("status@")) return null;
  if (!/@(s\.whatsapp\.net|c\.us)$/.test(jid)) return null;
  const digits = jid.split("@")[0].split(":")[0];
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

const TYPE_MAP: Record<string, Envelope["data"]["type"] & string> = {
  conversation: "text",
  extendedTextMessage: "text",
  imageMessage: "image",
  videoMessage: "video",
  audioMessage: "audio",
  pttMessage: "audio",
  documentMessage: "document",
  documentWithCaptionMessage: "document",
  stickerMessage: "sticker",
  locationMessage: "location",
  liveLocationMessage: "location",
};

function readBody(message: Obj | undefined): { body?: string; type: string } {
  if (!message) return { type: "other" };
  const key = Object.keys(message).find((k) => k in TYPE_MAP);
  const type = key ? TYPE_MAP[key] : "other";
  const inner = key ? message[key] : undefined;
  if (typeof message.conversation === "string") return { body: message.conversation, type: "text" };
  if (isObj(inner)) {
    const body =
      str(inner.text) ?? str(inner.caption) ?? (isObj(inner.message) ? readBody(inner.message as Obj).body : undefined) ?? str(inner.fileName);
    return { body, type };
  }
  return { type };
}

export type EvolutionResult =
  | { kind: "messages"; envelopes: Envelope[]; skipped: string[] }
  | { kind: "connection"; state: "open" | "close" | "connecting"; reason?: string }
  | { kind: "ignored"; reason: string };

/** Traduz um aviso da Evolution. Mensagens viram eventos "message"; conexão vira mudança de situação. */
export function translateEvolution(payload: unknown): EvolutionResult {
  if (!isObj(payload)) return { kind: "ignored", reason: "Corpo inválido." };
  const event = normalizeEventName(payload.event);

  if (event === "connection.update") {
    const data = isObj(payload.data) ? payload.data : {};
    const state = str(data.state);
    if (state === "open" || state === "close" || state === "connecting") {
      return { kind: "connection", state, reason: data.statusReason != null ? String(data.statusReason) : undefined };
    }
    return { kind: "ignored", reason: "Estado de conexão desconhecido." };
  }

  if (event !== "messages.upsert") return { kind: "ignored", reason: `Evento ${event || "vazio"} não usado.` };

  const items = Array.isArray(payload.data) ? payload.data : [payload.data];
  const envelopes: Envelope[] = [];
  const skipped: string[] = [];
  for (const item of items) {
    if (!isObj(item) || !isObj(item.key)) {
      skipped.push("Mensagem sem identificação.");
      continue;
    }
    const key = item.key;
    const id = str(key.id);
    const remoteJid = str(key.remoteJid);
    // Contas com identificador de privacidade (@lid) podem trazer o telefone em campos alternativos.
    const phone = phoneFromJid(remoteJid) ?? phoneFromJid(str(key.remoteJidAlt)) ?? phoneFromJid(str(key.senderPn));
    if (!id || !phone) {
      skipped.push(remoteJid?.endsWith("@g.us") ? "Mensagem de grupo ignorada." : "Mensagem sem telefone de cliente.");
      continue;
    }
    const sentAt = readTimestamp(item.messageTimestamp) ?? new Date().toISOString();
    const fromMe = key.fromMe === true;
    const { body, type } = readBody(isObj(item.message) ? item.message : undefined);
    envelopes.push({
      type: "message",
      idempotency_key: `wa:${id}`,
      data: {
        external_id: id,
        conversation_external_id: remoteJid,
        direction: fromMe ? "outbound" : "inbound",
        sent_at: sentAt,
        contact: { phone, ...(fromMe ? {} : { name: str(item.pushName) }) },
        ...(body ? { body: body.slice(0, 10000) } : {}),
        type,
      },
    });
  }
  return { kind: "messages", envelopes, skipped };
}
