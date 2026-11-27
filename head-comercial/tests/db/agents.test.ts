import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
let threadA1: string;
let conversationA1: string;

beforeAll(async () => {
  f = await buildFixture();
  const [t] = await run<{ id: string }>(asService("user", f.sellerA1),
    "insert into public.agent_threads (company_id, user_id, title) values ($1, $2, 'Minhas prioridades') returning id",
    [f.companyA, f.sellerA1], { commit: true });
  threadA1 = t.id;
  await run(asService(), "insert into public.agent_messages (company_id, thread_id, role, content) values ($1, $2, 'user', 'O que faço hoje?')",
    [f.companyA, threadA1], { commit: true });
  await run(asService(), "insert into public.agent_messages (company_id, thread_id, role, agent, content) values ($1, $2, 'assistant', 'head', 'Ligue para a Bruna.')",
    [f.companyA, threadA1], { commit: true });

  await run(asService(), "insert into public.ai_runs (company_id, user_id, agent, purpose, model, cost_micros) values ($1, $2, 'head', 'chat', 'claude-opus-5-5', 1200)",
    [f.companyA, f.sellerA1], { commit: true });
  await run(asService(), "insert into public.ai_runs (company_id, user_id, agent, purpose, model, cost_micros) values ($1, $2, 'head', 'chat', 'claude-opus-5-5', 900)",
    [f.companyB, f.leaderB], { commit: true });

  // Conversa do WhatsApp do vendedor A1, para a análise.
  const [src] = await run<{ id: string }>(asService(),
    "insert into public.integration_sources (company_id, kind, name, owner_user_id) values ($1, 'whatsapp_device', 'WA', $2) returning id",
    [f.companyA, f.sellerA1], { commit: true });
  const [contact] = await run<{ id: string }>(asService(),
    "insert into public.contacts (company_id, owner_id, name, phone_e164) values ($1, $2, 'Cliente IA', '+5511900001111') returning id",
    [f.companyA, f.sellerA1], { commit: true });
  const [conv] = await run<{ id: string }>(asService(),
    "insert into public.conversations (company_id, source_id, contact_id, owner_id, external_id, started_at, last_message_at) values ($1, $2, $3, $4, 'ext-ia', now(), now()) returning id",
    [f.companyA, src.id, contact.id, f.sellerA1], { commit: true });
  conversationA1 = conv.id;
  await run(asService("user", f.leaderA),
    "insert into public.conversation_analyses (company_id, conversation_id, seller_id, requested_by, summary, score) values ($1, $2, $3, $4, 'Bom diagnóstico.', 7)",
    [f.companyA, conversationA1, f.sellerA1, f.leaderA], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("conversas com os agentes", () => {
  it("cada pessoa vê só o próprio chat, nem o líder lê o dos outros", async () => {
    expect(await run(asUser(f.sellerA1), "select id from public.agent_messages")).toHaveLength(2);
    expect(await run(asUser(f.sellerA2), "select id from public.agent_threads")).toHaveLength(0);
    expect(await run(asUser(f.leaderA), "select id from public.agent_messages")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select id from public.agent_threads")).toHaveLength(0);
  });

  it("usuário não escreve direto; mensagem gravada não muda", async () => {
    await expect(
      run(asUser(f.sellerA1), "insert into public.agent_messages (company_id, thread_id, role, content) values ($1, $2, 'user', 'x')", [f.companyA, threadA1]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(asService(), "update public.agent_messages set content = 'mudado' where thread_id = $1", [threadA1]),
    ).rejects.toThrow(/não podem ser alteradas/);
  });
});

describe("custo da IA", () => {
  it("líder vê o custo da própria empresa; vendedor não vê; admin vê tudo", async () => {
    const leader = await run<{ cost_micros: string }>(asUser(f.leaderA), "select cost_micros from public.ai_runs");
    expect(leader.map((r) => Number(r.cost_micros))).toEqual([1200]);
    expect(await run(asUser(f.sellerA1), "select id from public.ai_runs")).toHaveLength(0);
    expect(await run(asUser(f.admin), "select id from public.ai_runs")).toHaveLength(2);
  });
});

describe("análise de conversas", () => {
  it("líder e o vendedor dono veem; colega e outra empresa não", async () => {
    expect(await run(asUser(f.leaderA), "select id from public.conversation_analyses")).toHaveLength(1);
    expect(await run(asUser(f.sellerA1), "select id from public.conversation_analyses")).toHaveLength(1);
    expect(await run(asUser(f.sellerA2), "select id from public.conversation_analyses")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select id from public.conversation_analyses")).toHaveLength(0);
  });

  it("análise não aponta para conversa de outra empresa e entra no histórico", async () => {
    await expect(
      run(asService(), "insert into public.conversation_analyses (company_id, conversation_id, seller_id) values ($1, $2, $3)", [f.companyB, conversationA1, f.sellerA1]),
    ).rejects.toThrow(/foreign key/);
    const [act] = await run<{ n: string }>(asService(),
      "select count(*) as n from public.activities where entity_type = 'conversation_analyses' and company_id = $1", [f.companyA]);
    expect(Number(act.n)).toBe(1);
  });
});

describe("chaves da plataforma", () => {
  it("nenhum usuário lê nem grava as chaves cifradas, nem a administração", async () => {
    await run(asService(), "insert into public.platform_secrets (name, ciphertext, hint) values ('evolution_api_key', 'v1.x.y.z', 'abcd') on conflict (name) do nothing", [], { commit: true });
    await expect(run(asUser(f.admin), "select ciphertext from public.platform_secrets")).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.admin), "insert into public.platform_secrets (name, ciphertext) values ('anthropic_api_key', 'x')"),
    ).rejects.toThrow(/permission denied/);
    const rows = await run<{ name: string }>(asService(), "select name from public.platform_secrets");
    expect(rows.map((r) => r.name)).toContain("evolution_api_key");
  });
});
