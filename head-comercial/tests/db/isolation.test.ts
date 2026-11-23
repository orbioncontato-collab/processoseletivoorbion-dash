import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asService,
  asSuperuser,
  asUser,
  buildFixture,
  pool,
  run,
  type Fixture,
} from "./helpers";

let f: Fixture;

beforeAll(async () => {
  f = await buildFixture();
});

afterAll(async () => {
  await pool.end();
});

const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

describe("empresas", () => {
  it("vendedor enxerga só a própria empresa", async () => {
    const rows = await run<{ id: string }>(asUser(f.sellerA1), "select id from public.companies");
    expect(ids(rows)).toEqual([f.companyA]);
  });

  it("líder de outra empresa não enxerga a empresa A", async () => {
    const rows = await run(asUser(f.leaderB), "select id from public.companies where id = $1", [
      f.companyA,
    ]);
    expect(rows).toHaveLength(0);
  });

  it("administrador da plataforma enxerga as duas", async () => {
    const rows = await run<{ id: string }>(
      asUser(f.admin),
      "select id from public.companies where id = any($1)",
      [[f.companyA, f.companyB]],
    );
    expect(ids(rows)).toEqual([f.companyA, f.companyB].sort());
  });

  it("usuário logado não consegue criar, alterar nem apagar empresa", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.companies (name, slug) values ('X', 'x-hack')"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.leaderA), "update public.companies set name = 'Hack' where id = $1", [
        f.companyA,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.leaderA), "delete from public.companies where id = $1", [f.companyA]),
    ).rejects.toThrow(/permission denied/);
  });

  it("visitante sem login não lê nada", async () => {
    await expect(run(asAnon, "select id from public.companies")).rejects.toThrow(
      /permission denied/,
    );
    await expect(run(asAnon, "select id from public.profiles")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("empresa suspensa deixa de ser visível para os membros", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("update public.companies set status = 'suspended' where id = $1", [
        f.companyA,
      ]);
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: f.sellerA1, role: "authenticated" }),
      ]);
      await client.query("set local role authenticated");
      const res = await client.query("select id from public.companies");
      expect(res.rows).toHaveLength(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});

describe("equipe e perfis", () => {
  it("membro vê a equipe da própria empresa e não vê a de outra", async () => {
    const rows = await run<{ user_id: string }>(
      asUser(f.sellerA1),
      "select user_id from public.memberships",
    );
    const users = rows.map((r) => r.user_id).sort();
    expect(users).toEqual([f.leaderA, f.sellerA1, f.sellerA2].sort());
  });

  it("perfis de outra empresa ficam invisíveis", async () => {
    const rows = await run(asUser(f.sellerA1), "select id from public.profiles where id = any($1)", [
      [f.leaderB, f.sellerB1],
    ]);
    expect(rows).toHaveLength(0);
  });

  it("usuário altera o próprio nome", async () => {
    const rows = await run<{ full_name: string }>(
      asUser(f.sellerA1),
      "update public.profiles set full_name = 'Novo Nome' where id = $1 returning full_name",
      [f.sellerA1],
    );
    expect(rows[0]?.full_name).toBe("Novo Nome");
  });

  it("usuário não altera o nome de um colega", async () => {
    const rows = await run(
      asUser(f.sellerA1),
      "update public.profiles set full_name = 'Hack' where id = $1 returning id",
      [f.sellerA2],
    );
    expect(rows).toHaveLength(0);
  });

  it("usuário não altera o próprio e-mail pelo banco", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.profiles set email = 'x@x.com' where id = $1", [
        f.sellerA1,
      ]),
    ).rejects.toThrow(/permission denied/);
  });

  it("líder não consegue se promover nem criar vínculo pelo banco", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.memberships set role = 'leader' where user_id = $1", [
        f.sellerA1,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(
        asUser(f.leaderA),
        "insert into public.memberships (company_id, user_id, role) values ($1, $2, 'seller')",
        [f.companyB, f.leaderA],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("vínculo desativado corta o acesso", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "update public.memberships set status = 'disabled' where user_id = $1 and company_id = $2",
        [f.sellerA2, f.companyA],
      );
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: f.sellerA2, role: "authenticated" }),
      ]);
      await client.query("set local role authenticated");
      const companies = await client.query("select id from public.companies");
      const team = await client.query("select id from public.memberships");
      expect(companies.rows).toHaveLength(0);
      expect(team.rows).toHaveLength(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("só o próprio usuário e admins enxergam a lista de admins", async () => {
    const asSeller = await run(asUser(f.sellerA1), "select user_id from public.platform_admins");
    expect(asSeller).toHaveLength(0);
    const asAdmin = await run(asUser(f.admin), "select user_id from public.platform_admins");
    expect(asAdmin.length).toBeGreaterThanOrEqual(1);
  });
});

describe("convites", () => {
  beforeAll(async () => {
    await run(
      asService("user", f.leaderA),
      "insert into public.invitations (company_id, email, role, invited_by) values ($1, 'novo@a.test', 'seller', $2)",
      [f.companyA, f.leaderA],
      { commit: true },
    );
  });

  it("líder vê os convites da própria empresa", async () => {
    const rows = await run(asUser(f.leaderA), "select email from public.invitations");
    expect(rows).toEqual([{ email: "novo@a.test" }]);
  });

  it("vendedor não vê convites", async () => {
    const rows = await run(asUser(f.sellerA1), "select email from public.invitations");
    expect(rows).toHaveLength(0);
  });

  it("líder de outra empresa não vê os convites da empresa A", async () => {
    const rows = await run(asUser(f.leaderB), "select email from public.invitations");
    expect(rows).toHaveLength(0);
  });

  it("não aceita dois convites pendentes para o mesmo e-mail na mesma empresa", async () => {
    await expect(
      run(
        asService(),
        "insert into public.invitations (company_id, email, role) values ($1, 'NOVO@a.test', 'seller')",
        [f.companyA],
      ),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe("histórico central", () => {
  it("registra o autor informado pelo servidor ao criar vínculos", async () => {
    const rows = await run<{ actor_type: string; actor_id: string; action: string }>(
      asSuperuser,
      `select actor_type, actor_id, action from public.activities
        where entity_type = 'memberships' and company_id = $1`,
      [f.companyA],
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r).toMatchObject({ actor_type: "user", actor_id: f.admin, action: "insert" });
    }
  });

  it("em alterações guarda só o que mudou, com antes e depois e o autor", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('request.headers', $1, true)", [
        JSON.stringify({ "x-actor-type": "automation" }),
      ]);
      await client.query("set local role service_role");
      await client.query("update public.companies set name = 'Empresa A Ltda' where id = $1", [
        f.companyA,
      ]);
      // Atualização sem mudança real não deve gerar registro.
      await client.query("update public.companies set name = 'Empresa A Ltda' where id = $1", [
        f.companyA,
      ]);
      const res = await client.query(
        `select actor_type, actor_id, changes from public.activities
          where entity_id = $1 and action = 'update'`,
        [f.companyA],
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toEqual({
        actor_type: "automation",
        actor_id: null,
        changes: { name: { de: "Empresa A", para: "Empresa A Ltda" } },
      });
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("cabeçalho de autor é ignorado quando a chamada vem de um usuário logado", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('request.headers', $1, true)", [
        JSON.stringify({ "x-actor-type": "agent", "x-actor-id": f.admin }),
      ]);
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: f.sellerA1, role: "authenticated" }),
      ]);
      await client.query("set local role authenticated");
      const res = await client.query("select * from app.current_actor()");
      expect(res.rows[0]).toEqual({ actor_type: "user", actor_id: f.sellerA1 });
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("líder vê o histórico da própria empresa e não vê o da outra", async () => {
    const rows = await run<{ company_id: string }>(
      asUser(f.leaderA),
      "select distinct company_id from public.activities",
    );
    expect(rows.map((r) => r.company_id)).toEqual([f.companyA]);
  });

  it("vendedor vê só o que ele mesmo fez", async () => {
    const rows = await run(asUser(f.sellerA1), "select id from public.activities");
    expect(rows).toHaveLength(0);
  });

  it("ninguém altera nem apaga o histórico, nem com a chave de serviço", async () => {
    await expect(
      run(asService(), "update public.activities set action = 'x' where company_id = $1", [
        f.companyA,
      ]),
    ).rejects.toThrow(/não pode ser alterado/);
    await expect(
      run(asService(), "delete from public.activities where company_id = $1", [f.companyA]),
    ).rejects.toThrow(/não pode ser alterado/);
    await expect(
      run(asUser(f.leaderA), "insert into public.activities (actor_type, action, entity_type) values ('user','x','x')"),
    ).rejects.toThrow(/permission denied/);
  });

  it("apagar a empresa inteira apaga junto o histórico dela (exclusão LGPD)", async () => {
    const rows = await run<{ n: string }>(
      asService(),
      `with del as (delete from public.companies where id = $1 returning id)
       select (select count(*) from del) as n`,
      [f.companyB],
    );
    expect(rows[0]?.n).toBe("1");
  });
});
