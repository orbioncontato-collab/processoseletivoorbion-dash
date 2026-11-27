import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;

beforeAll(async () => {
  f = await buildFixture();
  await run(asService(),
    "insert into public.maturity_assessments (company_id, period, overall, dimensions) values ($1, '2026-11-01', 55, '[]')",
    [f.companyA], { commit: true });
  await run(asService(), "insert into public.app_errors (source, message) values ('render:/x', 'Falha de teste')", [], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("preparação para clientes", () => {
  it("maturidade: só o líder da empresa e a administração veem", async () => {
    expect(await run(asUser(f.leaderA), "select overall from public.maturity_assessments")).toHaveLength(1);
    expect(await run(asUser(f.sellerA1), "select overall from public.maturity_assessments")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select overall from public.maturity_assessments")).toHaveLength(0);
  });

  it("erros do sistema: só a administração lê; ninguém grava direto", async () => {
    expect((await run(asUser(f.admin), "select id from public.app_errors")).length).toBeGreaterThan(0);
    expect(await run(asUser(f.leaderA), "select id from public.app_errors")).toHaveLength(0);
    await expect(run(asUser(f.leaderA), "insert into public.app_errors (source, message) values ('x', 'y')")).rejects.toThrow(/permission denied/);
  });

  it("a pessoa não marca o aceite dos termos nem muda o limite de IA direto no banco", async () => {
    await expect(run(asUser(f.sellerA1), "update public.profiles set terms_version = 'x' where id = $1", [f.sellerA1])).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.leaderA), "update public.companies set ai_monthly_limit_micros = null where id = $1", [f.companyA]),
    ).rejects.toThrow(/permission denied/);
  });
});
