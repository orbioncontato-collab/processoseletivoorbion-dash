import { describe, expect, it } from "vitest";
import { phoneFromJid, readTimestamp, translateEvolution } from "./evolution";

const msg = (over: Record<string, unknown> = {}, key: Record<string, unknown> = {}) => ({
  event: "messages.upsert",
  instance: "hc-abc",
  data: {
    key: { remoteJid: "5511966667777@s.whatsapp.net", fromMe: false, id: "3EB0AAA", ...key },
    pushName: "Paula",
    message: { conversation: "Oi, tudo bem?" },
    messageTimestamp: 1795000000,
    ...over,
  },
});

describe("phoneFromJid", () => {
  it("extrai o telefone de contas comuns", () => {
    expect(phoneFromJid("5511966667777@s.whatsapp.net")).toBe("5511966667777");
    expect(phoneFromJid("5511966667777:12@s.whatsapp.net")).toBe("5511966667777");
  });
  it("ignora grupos, status e identificadores sem telefone", () => {
    expect(phoneFromJid("120363012345678901@g.us")).toBeNull();
    expect(phoneFromJid("status@broadcast")).toBeNull();
    expect(phoneFromJid("123456789012345@lid")).toBeNull();
    expect(phoneFromJid(undefined)).toBeNull();
  });
});

describe("readTimestamp", () => {
  it("aceita segundos, texto e objeto Long", () => {
    expect(readTimestamp(1795000000)).toBe("2026-11-18T11:06:40.000Z");
    expect(readTimestamp("1795000000")).toBe("2026-11-18T11:06:40.000Z");
    expect(readTimestamp({ low: 1795000000, high: 0 })).toBe("2026-11-18T11:06:40.000Z");
    expect(readTimestamp(undefined)).toBeNull();
  });
});

describe("translateEvolution", () => {
  it("mensagem recebida vira evento padrão com nome do cliente", () => {
    const r = translateEvolution(msg());
    expect(r).toEqual({
      kind: "messages",
      skipped: [],
      envelopes: [
        {
          type: "message",
          idempotency_key: "wa:3EB0AAA",
          data: {
            external_id: "3EB0AAA",
            conversation_external_id: "5511966667777@s.whatsapp.net",
            direction: "inbound",
            sent_at: "2026-11-18T11:06:40.000Z",
            contact: { phone: "5511966667777", name: "Paula" },
            body: "Oi, tudo bem?",
            type: "text",
          },
        },
      ],
    });
  });

  it("mensagem enviada pelo vendedor não usa o nome dele como nome do cliente", () => {
    const r = translateEvolution(msg({ pushName: "Sara Vendas" }, { fromMe: true }));
    expect(r.kind === "messages" && r.envelopes[0].data).toMatchObject({ direction: "outbound", contact: { phone: "5511966667777" } });
    expect(r.kind === "messages" && (r.envelopes[0].data.contact as Record<string, unknown>).name).toBeUndefined();
  });

  it("lê texto estendido, legenda de imagem e marca áudio", () => {
    const t = (message: unknown) => {
      const r = translateEvolution(msg({ message }));
      return r.kind === "messages" ? r.envelopes[0].data : null;
    };
    expect(t({ extendedTextMessage: { text: "link https://x" } })).toMatchObject({ body: "link https://x", type: "text" });
    expect(t({ imageMessage: { caption: "foto do produto" } })).toMatchObject({ body: "foto do produto", type: "image" });
    expect(t({ audioMessage: { seconds: 12 } })).toMatchObject({ type: "audio" });
    expect(t({ reactionMessage: { text: "👍" } })).toMatchObject({ type: "other" });
  });

  it("ignora grupo e aceita lote", () => {
    const r = translateEvolution({
      event: "MESSAGES_UPSERT",
      data: [msg().data, msg({}, { remoteJid: "120363012345678901@g.us", id: "G1" }).data],
    });
    expect(r.kind === "messages" && r.envelopes).toHaveLength(1);
    expect(r.kind === "messages" && r.skipped).toEqual(["Mensagem de grupo ignorada."]);
  });

  it("usa o telefone alternativo quando a conta vem com identificador de privacidade", () => {
    const r = translateEvolution(msg({}, { remoteJid: "999@lid", remoteJidAlt: "5511955554444@s.whatsapp.net" }));
    expect(r.kind === "messages" && r.envelopes[0].data.contact).toMatchObject({ phone: "5511955554444" });
  });

  it("conexão e eventos desconhecidos", () => {
    expect(translateEvolution({ event: "connection.update", data: { state: "open" } })).toEqual({ kind: "connection", state: "open", reason: undefined });
    expect(translateEvolution({ event: "CONNECTION_UPDATE", data: { state: "close", statusReason: 401 } })).toEqual({
      kind: "connection",
      state: "close",
      reason: "401",
    });
    expect(translateEvolution({ event: "presence.update", data: {} }).kind).toBe("ignored");
    expect(translateEvolution("x").kind).toBe("ignored");
  });
});
