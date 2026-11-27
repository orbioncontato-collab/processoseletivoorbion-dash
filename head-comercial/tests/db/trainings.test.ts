import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
let globalT: string;
let companyA: string;
let companyB: string;

const training = async (scope: string, company: string | null, title: string, skill = "diagnostico") => {
  const [{ id }] = await run<{ id: string }>(asService(),
    "insert into public.trainings (scope, company_id, title, skill) values ($1, $2, $3, $4) returning id",
    [scope, company, title, skill], { commit: true });
  return id;
};

beforeAll(async () => {
  f = await buildFixture();
  globalT = await training("global", null, "Diagnóstico Orbion");
  companyA = await training("company", f.companyA, "Treinamento da A", "objecoes");
  companyB = await training("company", f.companyB, "Treinamento da B");
  await run(asService("user", f.leaderA),
    "insert into public.training_assignments (company_id, user_id, training_id, source, reason, skill) values ($1, $2, $3, 'leader', 'Melhorar o diagnóstico', 'diagnostico')",
    [f.companyA, f.sellerA1, globalT], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("biblioteca de treinamentos", () => {
  it("todas as empresas veem a biblioteca da Orbion; cada uma vê só os próprios", async () => {
    const a = await run<{ title: string }>(asUser(f.sellerA1), "select title from public.trainings order by title");
    expect(a.map((t) => t.title)).toEqual(["Diagnóstico Orbion", "Treinamento da A"]);
    const b = await run<{ title: string }>(asUser(f.leaderB), "select title from public.trainings order by title");
    expect(b.map((t) => t.title)).toEqual(["Diagnóstico Orbion", "Treinamento da B"]);
  });

  it("usuário não grava direto na biblioteca", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.trainings (scope, company_id, title, skill) values ('company', $1, 'X', 'outro')", [f.companyA]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("recomendações", () => {
  it("vendedor vê as dele; líder vê as do time; outra empresa não vê", async () => {
    expect(await run(asUser(f.sellerA1), "select id from public.training_assignments")).toHaveLength(1);
    expect(await run(asUser(f.sellerA2), "select id from public.training_assignments")).toHaveLength(0);
    expect(await run(asUser(f.leaderA), "select id from public.training_assignments")).toHaveLength(1);
    expect(await run(asUser(f.leaderB), "select id from public.training_assignments")).toHaveLength(0);
  });

  it("não recomenda treinamento de outra empresa nem para quem não é da equipe", async () => {
    await expect(
      run(asService(), "insert into public.training_assignments (company_id, user_id, training_id, source, reason, skill) values ($1, $2, $3, 'leader', 'x', 'outro')",
        [f.companyA, f.sellerA2, companyB]),
    ).rejects.toThrow(/outra empresa/);
    await expect(
      run(asService(), "insert into public.training_assignments (company_id, user_id, training_id, source, reason, skill) values ($1, $2, $3, 'leader', 'x', 'outro')",
        [f.companyA, f.leaderB, companyA]),
    ).rejects.toThrow(/não faz parte/);
  });

  it("não repete recomendação ativa; concluir marca as datas e libera nova", async () => {
    await expect(
      run(asService(), "insert into public.training_assignments (company_id, user_id, training_id, source, reason, skill) values ($1, $2, $3, 'analysis', 'de novo', 'diagnostico')",
        [f.companyA, f.sellerA1, globalT]),
    ).rejects.toThrow(/training_assignments_active_uq/);
    const [done] = await run<{ started_at: string; completed_at: string }>(asService(),
      "update public.training_assignments set status = 'completed' where user_id = $1 returning started_at, completed_at", [f.sellerA1], { commit: true });
    expect(done.started_at).toBeTruthy();
    expect(done.completed_at).toBeTruthy();
    await run(asService(), "insert into public.training_assignments (company_id, user_id, training_id, source, reason, skill) values ($1, $2, $3, 'analysis', 'de novo', 'diagnostico')",
      [f.companyA, f.sellerA1, globalT]);
  });
});
