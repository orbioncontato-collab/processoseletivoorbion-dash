import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
let doc: string;
let draftOnly: string;

const version = (company: string, document: string, content: string, author = "user") =>
  run<{ version: number }>(asService(),
    "insert into public.document_versions (company_id, document_id, content, author_type) values ($1, $2, $3, $4) returning version",
    [company, document, content, author], { commit: true });

beforeAll(async () => {
  f = await buildFixture();
  [{ id: doc }] = await run<{ id: string }>(asService("user", f.leaderA),
    "insert into public.commercial_documents (company_id, title, kind) values ($1, 'Roteiro de abordagem', 'script') returning id", [f.companyA], { commit: true });
  [{ id: draftOnly }] = await run<{ id: string }>(asService("user", f.leaderA),
    "insert into public.commercial_documents (company_id, title, kind) values ($1, 'Política de preço', 'pricing') returning id", [f.companyA], { commit: true });
  await version(f.companyA, doc, "Versão 1 do roteiro");
  await version(f.companyA, doc, "Versão 2 do roteiro (proposta do agente)", "agent");
  await version(f.companyA, draftOnly, "Rascunho da política");
  await run(asService(), "update public.commercial_documents set published_version = 1 where id = $1", [doc], { commit: true });

  await run(asService("user", f.leaderA),
    "insert into public.action_items (company_id, title, owner_id, due_date, priority) values ($1, 'Revisar roteiro', $2, current_date + 3, 'high')",
    [f.companyA, f.sellerA1], { commit: true });
  await run(asService("user", f.leaderA),
    "insert into public.action_items (company_id, title, owner_id) values ($1, 'Ligar para clientes parados', $2)",
    [f.companyA, f.sellerA2], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("documentos com versões", () => {
  it("cada nova versão recebe o próximo número", async () => {
    const [{ version: v }] = await version(f.companyA, doc, "Versão 3");
    expect(v).toBe(3);
    const [d] = await run<{ latest_version: number }>(asService(), "select latest_version from public.commercial_documents where id = $1", [doc]);
    expect(d.latest_version).toBe(3);
  });

  it("vendedor vê só documentos publicados e só a versão publicada; líder vê tudo", async () => {
    const docs = await run<{ title: string }>(asUser(f.sellerA1), "select title from public.commercial_documents");
    expect(docs.map((d) => d.title)).toEqual(["Roteiro de abordagem"]);
    const versions = await run<{ version: number }>(asUser(f.sellerA1), "select version from public.document_versions");
    expect(versions.map((v) => v.version)).toEqual([1]);
    expect(await run(asUser(f.leaderA), "select id from public.document_versions")).toHaveLength(4);
    expect(await run(asUser(f.leaderB), "select id from public.commercial_documents")).toHaveLength(0);
  });

  it("versão gravada não muda; não publica versão que não existe", async () => {
    await expect(run(asService(), "update public.document_versions set content = 'x' where document_id = $1", [doc])).rejects.toThrow(/não podem ser alteradas/);
    await expect(run(asService(), "update public.commercial_documents set published_version = 99 where id = $1", [doc])).rejects.toThrow(/Versão inexistente/);
    await expect(
      run(asUser(f.leaderA), "insert into public.document_versions (company_id, document_id, content) values ($1, $2, 'x')", [f.companyA, doc]),
    ).rejects.toThrow(/permission denied/);
  });

  it("versão não aponta para documento de outra empresa", async () => {
    await expect(version(f.companyB, doc, "invasão")).rejects.toThrow();
  });
});

describe("planos de ação", () => {
  it("cada vendedor vê só as próprias ações; líder vê as do time", async () => {
    const mine = await run<{ title: string }>(asUser(f.sellerA1), "select title from public.action_items");
    expect(mine.map((a) => a.title)).toEqual(["Revisar roteiro"]);
    expect(await run(asUser(f.leaderA), "select id from public.action_items")).toHaveLength(2);
    expect(await run(asUser(f.leaderB), "select id from public.action_items")).toHaveLength(0);
  });

  it("responsável precisa ser da equipe; concluir marca a data", async () => {
    await expect(
      run(asService(), "insert into public.action_items (company_id, title, owner_id) values ($1, 'x', $2)", [f.companyA, f.leaderB]),
    ).rejects.toThrow(/não faz parte/);
    const [done] = await run<{ completed_at: string | null }>(asService(),
      "update public.action_items set status = 'done' where owner_id = $1 returning completed_at", [f.sellerA1]);
    expect(done.completed_at).toBeTruthy();
  });
});
