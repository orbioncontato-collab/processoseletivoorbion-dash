import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asSuperuser, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
let globalDoc: string;
let docA: string;

type Hit = { title: string; scope: string; content: string };
const search = (who: ReturnType<typeof asUser>, company: string, q: string, includeGlobal = true) =>
  run<Hit>(who, "select title, scope, content from public.search_knowledge($1, $2, $3, 10)", [company, q, includeGlobal]);

async function doc(scope: "global" | "company", company: string | null, title: string, chunks: string[]) {
  const [{ id }] = await run<{ id: string }>(asService("user", f.admin),
    "insert into public.knowledge_documents (scope, company_id, title, kind, chunk_count) values ($1, $2, $3, 'methodology', $4) returning id",
    [scope, company, title, chunks.length], { commit: true });
  for (const [i, c] of chunks.entries()) {
    await run(asService(), "insert into public.knowledge_chunks (document_id, position, content) values ($1, $2, $3)", [id, i, c], { commit: true });
  }
  return id;
}

beforeAll(async () => {
  f = await buildFixture();
  globalDoc = await doc("global", null, "Método Orbion de diagnóstico", [
    "Na etapa de diagnóstico, faça perguntas abertas sobre a dor do cliente antes de apresentar a proposta.",
    "Objeção de preço: devolva a conversa para o valor gerado, nunca dê desconto na primeira negociação.",
  ]);
  docA = await doc("company", f.companyA, "Playbook da Empresa A", [
    "Tratamento de objeções: quando o cliente achar caro, mostre o retorno em 90 dias.",
    "Envie as propostas sempre com prazo de validade de 7 dias.",
  ]);
  await doc("company", f.companyB, "Playbook da Empresa B", ["Segredo da B: objeções de preço resolvemos com parcelamento."]);

  const mem = (scope: string, subject: string | null, content: string) =>
    run(asService("user", f.leaderA),
      "insert into public.memory_items (company_id, scope, subject_user_id, category, content) values ($1, $2, $3, 'other', $4)",
      [f.companyA, scope, subject, content], { commit: true });
  await mem("company", null, "Ticket médio de R$ 12 mil, venda consultiva.");
  await mem("user", f.sellerA1, "Ótimo no diagnóstico, precisa melhorar o fechamento.");
  await mem("user", f.sellerA2, "Responde rápido, mas pula a qualificação.");

  await run(asService("user", f.admin),
    "insert into public.calibration_cases (scope, company_id, title, conversation, expected_assessment) values ('global', null, 'Caso global', 'conversa', 'avaliação')",
    [], { commit: true });
  await run(asService("user", f.leaderA),
    "insert into public.calibration_cases (scope, company_id, title, conversation, expected_assessment) values ('company', $1, 'Caso A', 'conversa', 'avaliação')",
    [f.companyA], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("busca no conhecimento", () => {
  it("encontra sem diferenciar acentos nem singular e plural", async () => {
    const noAccent = await search(asUser(f.sellerA1), f.companyA, "objecoes");
    expect(noAccent.map((h) => h.title)).toEqual(["Playbook da Empresa A"]);
    const plural = await search(asUser(f.sellerA1), f.companyA, "proposta validade");
    expect(plural[0]?.content).toContain("propostas sempre com prazo de validade");
  });

  it("vendedor não encontra a metodologia global nem documentos de outra empresa", async () => {
    const hits = await search(asUser(f.sellerA1), f.companyA, "preço");
    expect(hits.every((h) => h.scope === "company" && h.title === "Playbook da Empresa A")).toBe(true);
    const otherCompany = await search(asUser(f.sellerA1), f.companyB, "parcelamento");
    expect(otherCompany).toHaveLength(0);
  });

  it("o servidor (agentes) encontra a metodologia global junto com a da empresa", async () => {
    const hits = await run<Hit>(asService(), "select title, scope, content from public.search_knowledge($1, $2, true, 10)", [f.companyA, "objeção preço"]);
    const titles = hits.map((h) => h.title);
    expect(titles).toContain("Método Orbion de diagnóstico");
    expect(titles).toContain("Playbook da Empresa A");
    expect(titles).not.toContain("Playbook da Empresa B");
  });

  it("documento arquivado sai da busca", async () => {
    await run(asService(), "update public.knowledge_documents set archived_at = now() where id = $1", [docA], { commit: true });
    expect(await search(asUser(f.sellerA1), f.companyA, "objecoes")).toHaveLength(0);
    await run(asService(), "update public.knowledge_documents set archived_at = null where id = $1", [docA], { commit: true });
  });

  it("usuário não grava documentos nem trechos direto no banco; só admin lê o acervo global", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.knowledge_documents (scope, company_id, title) values ('company', $1, 'X')", [f.companyA]),
    ).rejects.toThrow(/permission denied/);
    expect(await run(asUser(f.leaderA), "select id from public.knowledge_documents where id = $1", [globalDoc])).toHaveLength(0);
    expect(await run(asUser(f.admin), "select id from public.knowledge_documents where id = $1", [globalDoc])).toHaveLength(1);
    expect(await run(asUser(f.leaderA), "select id from public.knowledge_chunks c where c.document_id = $1", [globalDoc])).toHaveLength(0);
  });
});

describe("memória", () => {
  it("empresa toda vê a memória da empresa; cada um vê só a própria memória pessoal", async () => {
    const seller = await run<{ content: string }>(asUser(f.sellerA1), "select content from public.memory_items order by content");
    expect(seller.map((m) => m.content)).toEqual([
      "Ticket médio de R$ 12 mil, venda consultiva.",
      "Ótimo no diagnóstico, precisa melhorar o fechamento.",
    ]);
    expect(await run(asUser(f.leaderA), "select id from public.memory_items")).toHaveLength(3);
    expect(await run(asUser(f.leaderB), "select id from public.memory_items")).toHaveLength(0);
  });

  it("memória pessoal exige a pessoa; registro entra no histórico", async () => {
    await expect(
      run(asService(), "insert into public.memory_items (company_id, scope, category, content) values ($1, 'user', 'other', 'x')", [f.companyA]),
    ).rejects.toThrow(/memory_scope_subject/);
    const [act] = await run<{ n: string }>(asSuperuser,
      "select count(*) as n from public.activities where entity_type = 'memory_items' and company_id = $1", [f.companyA]);
    expect(Number(act.n)).toBe(3);
  });
});

describe("calibragem", () => {
  it("só líder vê os casos da empresa; só admin vê os globais", async () => {
    expect(await run(asUser(f.sellerA1), "select id from public.calibration_cases")).toHaveLength(0);
    const leader = await run<{ title: string }>(asUser(f.leaderA), "select title from public.calibration_cases");
    expect(leader.map((c) => c.title)).toEqual(["Caso A"]);
    expect(await run(asUser(f.admin), "select id from public.calibration_cases where scope = 'global'")).toHaveLength(1);
  });
});
