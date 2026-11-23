import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asSuperuser, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
let source: string;
let contact: string;
let otherContact: string;
let conversation: string;
let opp: string;
let otherOpp: string;

const DAY = "2026-11-24";
const at = (hhmm: string) => `${DAY}T${hhmm}:00Z`;

beforeAll(async () => {
  f = await buildFixture();
  [{ id: source }] = await run<{ id: string }>(
    asService("user", f.leaderA),
    `insert into public.integration_sources (company_id, kind, name, owner_user_id)
     values ($1, 'whatsapp_device', 'WhatsApp A1', $2) returning id`,
    [f.companyA, f.sellerA1],
    { commit: true },
  );
  const svc = asService("integration", source);
  [{ id: contact }] = await run<{ id: string }>(svc,
    "insert into public.contacts (company_id, owner_id, name, phone_e164, source) values ($1, $2, 'Cliente Zap', '+5511955554444', 'whatsapp') returning id",
    [f.companyA, f.sellerA1], { commit: true });
  [{ id: otherContact }] = await run<{ id: string }>(svc,
    "insert into public.contacts (company_id, owner_id, name) values ($1, $2, 'Outro') returning id",
    [f.companyA, f.sellerA1], { commit: true });

  const [stage] = await run<{ id: string; pipeline_id: string }>(asSuperuser,
    "select id, pipeline_id from public.pipeline_stages where company_id = $1 and kind = 'open' order by position limit 1", [f.companyA]);
  [{ id: opp }] = await run<{ id: string }>(asUser(f.sellerA1),
    `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title)
     values ($1, $2, $3, $4, $5, 'Negócio Zap') returning id`,
    [f.companyA, contact, f.sellerA1, stage.pipeline_id, stage.id], { commit: true });
  [{ id: otherOpp }] = await run<{ id: string }>(asUser(f.sellerA1),
    `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title)
     values ($1, $2, $3, $4, $5, 'Outro negócio') returning id`,
    [f.companyA, otherContact, f.sellerA1, stage.pipeline_id, stage.id], { commit: true });
  await run(asSuperuser, "update public.opportunities set last_activity_at = '2026-01-01T00:00:00Z' where id = $1", [opp], { commit: true });

  [{ id: conversation }] = await run<{ id: string }>(svc,
    `insert into public.conversations (company_id, source_id, contact_id, owner_id, external_id, started_at, last_message_at)
     values ($1, $2, $3, $4, '5511955554444@s.whatsapp.net', $5, $5) returning id`,
    [f.companyA, source, contact, f.sellerA1, at("10:00")], { commit: true });

  const msgs: [string, "inbound" | "outbound", string][] = [
    ["m1", "inbound", "10:00"],
    ["m2", "inbound", "10:01"],
    ["m3", "outbound", "10:05"],
    ["m4", "inbound", "11:00"],
    ["m5", "outbound", "11:30"],
    ["m6", "inbound", "12:00"],
  ];
  for (const [ext, dir, hhmm] of msgs) {
    await run(svc,
      `insert into public.messages (company_id, conversation_id, source_id, direction, sent_at, body, external_id)
       values ($1, $2, $3, $4, $5, 'oi', $6)`,
      [f.companyA, conversation, source, dir, at(hhmm), ext], { commit: true });
  }
});

afterAll(async () => {
  await pool.end();
});

type Metrics = {
  owner_id: string;
  conversations_active: number;
  conversations_started: number;
  messages_inbound: number;
  messages_outbound: number;
  avg_first_response_seconds: number | null;
  awaiting_reply: number;
};
const metricsSql = "select * from public.seller_daily_metrics($1, $2, $3)";

describe("conversa", () => {
  it("contadores e cliente esperando resposta", async () => {
    const [c] = await run<{ inbound_count: number; outbound_count: number; awaiting_reply: boolean }>(
      asUser(f.sellerA1),
      "select inbound_count, outbound_count, awaiting_reply from public.conversations where id = $1",
      [conversation],
    );
    expect(c).toEqual({ inbound_count: 4, outbound_count: 2, awaiting_reply: true });
  });

  it("resposta do vendedor conta como movimentação da oportunidade aberta do contato", async () => {
    const [o] = await run<{ last_activity_at: Date }>(asSuperuser, "select last_activity_at from public.opportunities where id = $1", [opp]);
    expect(o.last_activity_at.toISOString()).toBe("2026-11-24T11:30:00.000Z");
  });

  it("a mesma mensagem não entra duas vezes e não pode ser alterada", async () => {
    await expect(
      run(asService("integration", source),
        `insert into public.messages (company_id, conversation_id, source_id, direction, sent_at, external_id)
         values ($1, $2, $3, 'inbound', now(), 'm1')`, [f.companyA, conversation, source]),
    ).rejects.toThrow(/duplicate key/);
    await expect(run(asService(), "update public.messages set body = 'x' where external_id = 'm1'")).rejects.toThrow(
      /não pode ser alterado/,
    );
  });
});

describe("números do dia", () => {
  it("calcula conversas, mensagens, tempo médio de resposta e espera", async () => {
    const rows = await run<Metrics>(asUser(f.sellerA1), metricsSql, [f.companyA, `${DAY}T00:00:00Z`, `${DAY}T23:59:59Z`]);
    expect(rows).toEqual([
      {
        owner_id: f.sellerA1,
        conversations_active: 1,
        conversations_started: 1,
        messages_inbound: 4,
        messages_outbound: 2,
        avg_first_response_seconds: 1050,
        awaiting_reply: 1,
      },
    ]);
  });

  it("líder vê os números do vendedor; outro vendedor e outra empresa não", async () => {
    const range = [`${DAY}T00:00:00Z`, `${DAY}T23:59:59Z`];
    expect(await run(asUser(f.leaderA), metricsSql, [f.companyA, ...range])).toHaveLength(1);
    expect(await run(asUser(f.sellerA2), metricsSql, [f.companyA, ...range])).toHaveLength(0);
    expect(await run(asUser(f.leaderB), metricsSql, [f.companyA, ...range])).toHaveLength(0);
  });
});

describe("acesso às conversas", () => {
  it("vendedor vê as dele; colega e outra empresa não", async () => {
    expect(await run(asUser(f.sellerA1), "select id from public.messages")).toHaveLength(6);
    expect(await run(asUser(f.sellerA2), "select id from public.conversations")).toHaveLength(0);
    expect(await run(asUser(f.sellerA2), "select id from public.messages")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select id from public.messages")).toHaveLength(0);
    expect(await run(asUser(f.leaderA), "select id from public.messages")).toHaveLength(6);
  });

  it("vendedor liga a conversa a uma oportunidade do mesmo contato, e só dele", async () => {
    const ok = await run(asUser(f.sellerA1), "update public.conversations set opportunity_id = $2 where id = $1 returning id", [
      conversation,
      opp,
    ]);
    expect(ok).toHaveLength(1);
    await expect(
      run(asUser(f.sellerA1), "update public.conversations set opportunity_id = $2 where id = $1", [conversation, otherOpp]),
    ).rejects.toThrow(/row-level security/);
    expect(
      await run(asUser(f.sellerA2), "update public.conversations set opportunity_id = $2 where id = $1 returning id", [
        conversation,
        opp,
      ]),
    ).toHaveLength(0);
  });

  it("usuário não grava mensagens nem muda o dono da conversa", async () => {
    await expect(
      run(asUser(f.sellerA1),
        `insert into public.messages (company_id, conversation_id, source_id, direction, sent_at, external_id)
         values ($1, $2, $3, 'outbound', now(), 'fake')`, [f.companyA, conversation, source]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.leaderA), "update public.conversations set owner_id = $2 where id = $1", [conversation, f.sellerA2]),
    ).rejects.toThrow(/permission denied/);
  });
});
