import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asSuperuser, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

let f: Fixture;
type Stage = { id: string; name: string; kind: "open" | "won" | "lost"; pipeline_id: string };
let stagesA: Stage[];
let stagesB: Stage[];
const stage = (list: Stage[], name: string) => list.find((s) => s.name === name)!;

let contactA1: string; // contato do vendedor A1
let contactA2: string; // contato do vendedor A2
let contactB1: string; // contato da empresa B
let oppA1: string; // oportunidade do vendedor A1
let oppA2: string; // oportunidade do vendedor A2

async function stagesOf(companyId: string): Promise<Stage[]> {
  return run<Stage>(
    asSuperuser,
    "select id, name, kind, pipeline_id from public.pipeline_stages where company_id = $1 order by position",
    [companyId],
  );
}

async function createContact(userId: string, companyId: string, ownerId: string, name: string, phone?: string) {
  const [row] = await run<{ id: string }>(
    asUser(userId),
    `insert into public.contacts (company_id, owner_id, name, phone_e164)
     values ($1, $2, $3, $4) returning id`,
    [companyId, ownerId, name, phone ?? null],
    { commit: true },
  );
  return row.id;
}

async function createOpp(userId: string, companyId: string, contactId: string, ownerId: string, st: Stage, title: string) {
  const [row] = await run<{ id: string }>(
    asUser(userId),
    `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title, value_cents, next_step, next_step_at)
     values ($1, $2, $3, $4, $5, $6, 150000, 'Enviar proposta', now() + interval '1 day') returning id`,
    [companyId, contactId, ownerId, st.pipeline_id, st.id, title],
    { commit: true },
  );
  return row.id;
}

beforeAll(async () => {
  f = await buildFixture();
  stagesA = await stagesOf(f.companyA);
  stagesB = await stagesOf(f.companyB);
  contactA1 = await createContact(f.sellerA1, f.companyA, f.sellerA1, "Cliente do A1", "+5511987654321");
  contactA2 = await createContact(f.leaderA, f.companyA, f.sellerA2, "Cliente do A2");
  contactB1 = await createContact(f.sellerB1, f.companyB, f.sellerB1, "Cliente da B", "+5511987654321");
  oppA1 = await createOpp(f.sellerA1, f.companyA, contactA1, f.sellerA1, stage(stagesA, "Novo contato"), "Negócio A1");
  oppA2 = await createOpp(f.leaderA, f.companyA, contactA2, f.sellerA2, stage(stagesA, "Proposta"), "Negócio A2");
});

afterAll(async () => {
  await pool.end();
});

describe("funil", () => {
  it("toda empresa nasce com o funil padrão de 7 etapas", () => {
    expect(stagesA.map((s) => s.name)).toEqual([
      "Novo contato", "Qualificação", "Diagnóstico", "Proposta", "Negociação", "Ganho", "Perdido",
    ]);
    expect(stagesA.filter((s) => s.kind === "won")).toHaveLength(1);
    expect(stagesA.filter((s) => s.kind === "lost")).toHaveLength(1);
  });

  it("vendedor não cria nem altera etapas; líder pode", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.pipeline_stages set name = 'X' where id = $1 returning id", [
        stagesA[0].id,
      ]),
    ).resolves.toHaveLength(0);
    const rows = await run(asUser(f.leaderA), "update public.pipeline_stages set name = 'Entrada' where id = $1 returning id", [
      stagesA[0].id,
    ]);
    expect(rows).toHaveLength(1);
  });

  it("líder não mexe no funil de outra empresa", async () => {
    const rows = await run(asUser(f.leaderA), "update public.pipeline_stages set name = 'X' where id = $1 returning id", [
      stagesB[0].id,
    ]);
    expect(rows).toHaveLength(0);
  });

  it("não arquiva etapa com oportunidades abertas", async () => {
    await expect(
      run(asUser(f.leaderA), "update public.pipeline_stages set archived_at = now() where id = $1", [
        stage(stagesA, "Proposta").id,
      ]),
    ).rejects.toThrow(/Mova as oportunidades abertas/);
  });

  it("não deixa o funil sem etapa de perda", async () => {
    await expect(
      run(
        asUser(f.leaderA),
        `set constraints all immediate;
         update public.pipeline_stages set archived_at = now() where id = '${stage(stagesA, "Perdido").id}';`,
      ),
    ).rejects.toThrow(/pelo menos uma etapa aberta, uma de ganho e uma de perda/);
  });
});

describe("contatos", () => {
  it("vendedor vê só os próprios contatos; líder vê todos da empresa", async () => {
    const seller = await run<{ id: string }>(asUser(f.sellerA1), "select id from public.contacts");
    expect(seller.map((r) => r.id)).toEqual([contactA1]);
    const leader = await run<{ id: string }>(asUser(f.leaderA), "select id from public.contacts");
    expect(leader.map((r) => r.id).sort()).toEqual([contactA1, contactA2].sort());
    const other = await run(asUser(f.leaderB), "select id from public.contacts where company_id = $1", [f.companyA]);
    expect(other).toHaveLength(0);
  });

  it("vendedor não cria contato em nome de outro vendedor", async () => {
    await expect(
      run(asUser(f.sellerA1), "insert into public.contacts (company_id, owner_id, name) values ($1, $2, 'X')", [
        f.companyA,
        f.sellerA2,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("responsável precisa ser membro ativo da empresa", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.contacts (company_id, owner_id, name) values ($1, $2, 'X')", [
        f.companyA,
        f.leaderB,
      ]),
    ).rejects.toThrow(/membro ativo/);
  });

  it("telefone não se repete na mesma empresa, mas pode existir em outra", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.contacts (company_id, owner_id, name, phone_e164) values ($1, $2, 'Dup', '+5511987654321')", [
        f.companyA,
        f.leaderA,
      ]),
    ).rejects.toThrow(/duplicate key/);
    // contactB1 usa o mesmo número na empresa B (criado no beforeAll).
    expect(contactB1).toBeTruthy();
  });

  it("telefone fora do padrão internacional é recusado", async () => {
    await expect(
      run(asUser(f.sellerA1), "insert into public.contacts (company_id, owner_id, name, phone_e164) values ($1, $2, 'X', '11 98765-4321')", [
        f.companyA,
        f.sellerA1,
      ]),
    ).rejects.toThrow(/check constraint/);
  });

  it("vendedor não muda a origem do contato (campo do sistema)", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.contacts set source = 'whatsapp' where id = $1", [contactA1]),
    ).rejects.toThrow(/permission denied/);
  });

  it("vendedor não apaga contato (só arquiva)", async () => {
    await expect(run(asUser(f.sellerA1), "delete from public.contacts where id = $1", [contactA1])).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("oportunidades: acesso", () => {
  it("vendedor vê só as dele; líder vê todas; outra empresa não vê nada", async () => {
    const seller = await run<{ id: string }>(asUser(f.sellerA1), "select id from public.opportunities");
    expect(seller.map((r) => r.id)).toEqual([oppA1]);
    const leader = await run<{ id: string }>(asUser(f.leaderA), "select id from public.opportunities");
    expect(leader.map((r) => r.id).sort()).toEqual([oppA1, oppA2].sort());
    const other = await run(asUser(f.sellerB1), "select id from public.opportunities");
    expect(other).toHaveLength(0);
  });

  it("vendedor não cria oportunidade com contato de outro vendedor", async () => {
    await expect(
      run(
        asUser(f.sellerA1),
        `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title)
         values ($1, $2, $3, $4, $5, 'X')`,
        [f.companyA, contactA2, f.sellerA1, stagesA[0].pipeline_id, stagesA[0].id],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("não aceita contato nem etapa de outra empresa", async () => {
    await expect(
      run(
        asUser(f.leaderA),
        `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title)
         values ($1, $2, $3, $4, $5, 'X')`,
        [f.companyA, contactB1, f.leaderA, stagesA[0].pipeline_id, stagesA[0].id],
      ),
    ).rejects.toThrow(/foreign key|row-level security/);
    await expect(
      run(
        asUser(f.leaderA),
        `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title)
         values ($1, $2, $3, $4, $5, 'X')`,
        [f.companyA, contactA1, f.leaderA, stagesA[0].pipeline_id, stagesB[0].id],
      ),
    ).rejects.toThrow(/Etapa inválida/);
  });

  it("vendedor não transfere a oportunidade; líder transfere", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.opportunities set owner_id = $2 where id = $1", [oppA1, f.sellerA2]),
    ).rejects.toThrow(/row-level security/);
    const rows = await run(asUser(f.leaderA), "update public.opportunities set owner_id = $2 where id = $1 returning id", [
      oppA1,
      f.sellerA2,
    ]);
    expect(rows).toHaveLength(1);
  });

  it("vendedor não troca o contato por um que não é dele", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.opportunities set contact_id = $2 where id = $1", [oppA1, contactA2]),
    ).rejects.toThrow(/row-level security/);
  });

  it("situação e datas do sistema não são editáveis diretamente", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.opportunities set status = 'won' where id = $1", [oppA1]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      run(asUser(f.sellerA1), "update public.opportunities set closed_at = now() where id = $1", [oppA1]),
    ).rejects.toThrow(/permission denied/);
  });

  it("a empresa de uma oportunidade nunca muda, nem pelo servidor", async () => {
    await expect(
      run(asService(), "update public.opportunities set company_id = $2 where id = $1", [oppA1, f.companyB]),
    ).rejects.toThrow(/não pode ser alterada|foreign key/);
  });
});

describe("oportunidades: regras", () => {
  type Opp = { status: string; closed_at: string | null; next_step: string | null; lost_reason: string | null };

  it("mover para Ganho encerra como ganha e limpa o próximo passo", async () => {
    const [row] = await run<Opp>(
      asUser(f.sellerA1),
      "update public.opportunities set stage_id = $2 where id = $1 returning status, closed_at, next_step, lost_reason",
      [oppA1, stage(stagesA, "Ganho").id],
    );
    expect(row.status).toBe("won");
    expect(row.closed_at).not.toBeNull();
    expect(row.next_step).toBeNull();
  });

  it("perder sem motivo é recusado; com motivo, encerra como perdida", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.opportunities set stage_id = $2 where id = $1", [
        oppA1,
        stage(stagesA, "Perdido").id,
      ]),
    ).rejects.toThrow(/lost_needs_reason/);
    const [row] = await run<Opp>(
      asUser(f.sellerA1),
      "update public.opportunities set stage_id = $2, lost_reason = 'preco' where id = $1 returning status, closed_at, next_step, lost_reason",
      [oppA1, stage(stagesA, "Perdido").id],
    );
    expect(row).toMatchObject({ status: "lost", lost_reason: "preco", next_step: null });
  });

  it("reabrir limpa o motivo de perda e a data de encerramento", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: f.sellerA1, role: "authenticated" }),
      ]);
      await client.query("set local role authenticated");
      await client.query("update public.opportunities set stage_id = $2, lost_reason = 'preco' where id = $1", [
        oppA1,
        stage(stagesA, "Perdido").id,
      ]);
      const res = await client.query(
        "update public.opportunities set stage_id = $2 where id = $1 returning status, closed_at, lost_reason",
        [oppA1, stage(stagesA, "Negociação").id],
      );
      expect(res.rows[0]).toEqual({ status: "open", closed_at: null, lost_reason: null });
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("última movimentação muda com alteração real e não muda sem alteração", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("update public.opportunities set last_activity_at = now() - interval '10 days' where id = $1", [oppA1]);
      const before = (await client.query("select last_activity_at from public.opportunities where id = $1", [oppA1])).rows[0]
        .last_activity_at as Date;
      await client.query("update public.opportunities set title = title where id = $1", [oppA1]);
      const same = (await client.query("select last_activity_at from public.opportunities where id = $1", [oppA1])).rows[0]
        .last_activity_at as Date;
      expect(same.getTime()).toBe(before.getTime());
      await client.query("update public.opportunities set value_cents = value_cents + 1 where id = $1", [oppA1]);
      const after = (await client.query("select last_activity_at from public.opportunities where id = $1", [oppA1])).rows[0]
        .last_activity_at as Date;
      expect(after.getTime()).toBeGreaterThan(before.getTime());
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("próximo passo com data exige descrição", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.opportunities set next_step = null, next_step_at = now() where id = $1", [oppA1]),
    ).rejects.toThrow(/next_step_date_needs_text/);
  });
});

describe("objeções e histórico", () => {
  let objection: string;

  beforeAll(async () => {
    const [row] = await run<{ id: string }>(
      asUser(f.sellerA1),
      `insert into public.opportunity_objections (company_id, opportunity_id, description, category)
       values ($1, $2, 'Achou caro', 'preco') returning id`,
      [f.companyA, oppA1],
      { commit: true },
    );
    objection = row.id;
    // O líder muda a etapa da oportunidade do vendedor.
    await run(asUser(f.leaderA), "update public.opportunities set stage_id = $2 where id = $1", [
      oppA1,
      stage(stagesA, "Diagnóstico").id,
    ], { commit: true });
    await run(asUser(f.leaderA), "update public.opportunity_objections set status = 'handled' where id = $1", [objection], {
      commit: true,
    });
  });

  it("vendedor não registra objeção em oportunidade de outro vendedor", async () => {
    await expect(
      run(
        asUser(f.sellerA1),
        `insert into public.opportunity_objections (company_id, opportunity_id, description) values ($1, $2, 'X')`,
        [f.companyA, oppA2],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("outra empresa não vê as objeções", async () => {
    const rows = await run(asUser(f.leaderB), "select id from public.opportunity_objections");
    expect(rows).toHaveLength(0);
  });

  it("vendedor vê no histórico o que o líder fez na oportunidade dele", async () => {
    const rows = await run<{ actor_id: string; entity_type: string; action: string }>(
      asUser(f.sellerA1),
      `select actor_id, entity_type, action from public.activities
        where entity_id = $1 or metadata ->> 'opportunity_id' = $1::text
        order by id`,
      [oppA1],
    );
    expect(rows.some((r) => r.entity_type === "opportunities" && r.actor_id === f.leaderA)).toBe(true);
    expect(rows.some((r) => r.entity_type === "opportunity_objections" && r.action === "update")).toBe(true);
  });

  it("vendedor não vê o histórico da oportunidade de outro vendedor", async () => {
    const rows = await run(asUser(f.sellerA1), "select id from public.activities where entity_id = $1", [oppA2]);
    expect(rows).toHaveLength(0);
  });
});
