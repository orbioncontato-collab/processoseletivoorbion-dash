import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asSuperuser, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
let sourceA: string;
let sourceB: string;
const HASH = "a".repeat(64);

beforeAll(async () => {
  f = await buildFixture();
  [{ id: sourceA }] = await run<{ id: string }>(
    asService("user", f.leaderA),
    `insert into public.integration_sources (company_id, kind, name, secret_hash, secret_hint)
     values ($1, 'webhook', 'Make', $2, 'x9Fz') returning id`,
    [f.companyA, HASH],
    { commit: true },
  );
  [{ id: sourceB }] = await run<{ id: string }>(
    asService("user", f.leaderB),
    `insert into public.integration_sources (company_id, kind, name) values ($1, 'crm', 'CRM B') returning id`,
    [f.companyB],
    { commit: true },
  );
  await run(
    asService("integration", sourceA),
    `insert into public.raw_events (company_id, source_id, event_type, idempotency_key, payload)
     values ($1, $2, 'contact.upsert', 'entrega-1', '{"x":1}')`,
    [f.companyA, sourceA],
    { commit: true },
  );
});

afterAll(async () => {
  await pool.end();
});

describe("fontes de integração", () => {
  it("líder vê as fontes da empresa; vendedor e outra empresa não", async () => {
    const leader = await run<{ id: string }>(asUser(f.leaderA), "select id from public.integration_sources");
    expect(leader.map((r) => r.id)).toEqual([sourceA]);
    expect(await run(asUser(f.sellerA1), "select id from public.integration_sources")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select id from public.integration_sources where id = $1", [sourceA])).toHaveLength(0);
  });

  it("ninguém lê a impressão digital da chave pelo app", async () => {
    await expect(
      run(asUser(f.leaderA), "select secret_hash from public.integration_sources where id = $1", [sourceA]),
    ).rejects.toThrow(/permission denied/);
  });

  it("usuário logado não cria nem altera fontes direto no banco", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.integration_sources (company_id, kind, name) values ($1, 'webhook', 'X')", [
        f.companyA,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.leaderA), "update public.integration_sources set name = 'X' where id = $1", [sourceA]),
    ).rejects.toThrow(/permission denied/);
  });

  it("histórico da fonte não guarda a impressão digital e registra a troca de chave", async () => {
    await run(asService("user", f.leaderA), "update public.integration_sources set secret_hash = $2 where id = $1", [
      sourceA,
      "b".repeat(64),
    ], { commit: true });
    const rows = await run<{ changes: Record<string, unknown> }>(
      asSuperuser,
      "select changes from public.activities where entity_id = $1 order by id",
      [sourceA],
    );
    expect(JSON.stringify(rows)).not.toContain("a".repeat(64));
    expect(JSON.stringify(rows)).not.toContain("b".repeat(64));
    expect(rows[rows.length - 1].changes).toEqual({ chave: "trocada" });
  });
});

describe("eventos brutos", () => {
  it("a mesma entrega não entra duas vezes", async () => {
    await expect(
      run(
        asService("integration", sourceA),
        `insert into public.raw_events (company_id, source_id, event_type, idempotency_key, payload)
         values ($1, $2, 'contact.upsert', 'entrega-1', '{}')`,
        [f.companyA, sourceA],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("evento não pode apontar para fonte de outra empresa", async () => {
    await expect(
      run(
        asService(),
        `insert into public.raw_events (company_id, source_id, event_type, payload) values ($1, $2, 'x', '{}')`,
        [f.companyA, sourceB],
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("líder vê os eventos da empresa; vendedor não", async () => {
    expect(await run(asUser(f.leaderA), "select id from public.raw_events")).toHaveLength(1);
    expect(await run(asUser(f.sellerA1), "select id from public.raw_events")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select id from public.raw_events")).toHaveLength(0);
  });
});

describe("autor integração", () => {
  it("registro criado pelo processador aparece no histórico como integração", async () => {
    const [contact] = await run<{ id: string }>(
      asService("integration", sourceA),
      "insert into public.contacts (company_id, owner_id, name) values ($1, $2, 'Vindo do CRM') returning id",
      [f.companyA, f.sellerA1],
      { commit: true },
    );
    const [act] = await run<{ actor_type: string; actor_id: string }>(
      asSuperuser,
      "select actor_type, actor_id from public.activities where entity_id = $1 and action = 'insert'",
      [contact.id],
    );
    expect(act).toEqual({ actor_type: "integration", actor_id: sourceA });
  });
});
