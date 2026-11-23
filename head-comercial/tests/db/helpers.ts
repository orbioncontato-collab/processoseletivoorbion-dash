import { randomUUID } from "node:crypto";
import pg from "pg";

/**
 * Ferramentas para testar as regras de acesso direto no banco.
 * Cada chamada roda numa transação que é desfeita no fim (rollback),
 * a não ser que `commit: true` seja passado (usado para montar os dados base).
 */

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error(
    "DATABASE_URL_TEST não definida. Rode `npm run db:test:up` e use a URL impressa.",
  );
}

export const pool = new pg.Pool({ connectionString: url, max: 2 });

type Who =
  | { kind: "user"; id: string }
  | { kind: "anon" }
  | { kind: "service"; actorType?: string; actorId?: string }
  | { kind: "superuser" };

export const asUser = (id: string): Who => ({ kind: "user", id });
export const asAnon: Who = { kind: "anon" };
export const asService = (actorType?: string, actorId?: string): Who => ({
  kind: "service",
  actorType,
  actorId,
});
export const asSuperuser: Who = { kind: "superuser" };

export async function run<T = Record<string, unknown>>(
  who: Who,
  sql: string,
  params: unknown[] = [],
  opts: { commit?: boolean } = {},
): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (who.kind === "user") {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: who.id, role: "authenticated" }),
      ]);
      await client.query("set local role authenticated");
    } else if (who.kind === "anon") {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: "anon" }),
      ]);
      await client.query("set local role anon");
    } else if (who.kind === "service") {
      const headers: Record<string, string> = {};
      if (who.actorType) headers["x-actor-type"] = who.actorType;
      if (who.actorId) headers["x-actor-id"] = who.actorId;
      await client.query("select set_config('request.headers', $1, true)", [
        JSON.stringify(headers),
      ]);
      await client.query("set local role service_role");
    }
    const res = await client.query(sql, params);
    await client.query(opts.commit ? "commit" : "rollback");
    return res.rows as T[];
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Cria um usuário no "Auth" e devolve o id. O perfil nasce pelo gatilho. */
export async function createAuthUser(email: string, fullName = ""): Promise<string> {
  const id = randomUUID();
  await run(
    asSuperuser,
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, email, JSON.stringify({ full_name: fullName })],
    { commit: true },
  );
  return id;
}

export interface Fixture {
  companyA: string;
  companyB: string;
  admin: string;
  leaderA: string;
  sellerA1: string;
  sellerA2: string;
  leaderB: string;
  sellerB1: string;
}

/** Monta duas empresas com equipes, como o servidor faria (chave de serviço). */
export async function buildFixture(): Promise<Fixture> {
  const tag = randomUUID().slice(0, 8);
  const admin = await createAuthUser(`admin-${tag}@orbion.test`, "Admin Orbion");
  await run(asSuperuser, "insert into public.platform_admins (user_id) values ($1)", [admin], {
    commit: true,
  });

  const [{ id: companyA }] = await run<{ id: string }>(
    asService("user", admin),
    "insert into public.companies (name, slug) values ($1, $2) returning id",
    ["Empresa A", `empresa-a-${tag}`],
    { commit: true },
  );
  const [{ id: companyB }] = await run<{ id: string }>(
    asService("user", admin),
    "insert into public.companies (name, slug) values ($1, $2) returning id",
    ["Empresa B", `empresa-b-${tag}`],
    { commit: true },
  );

  const leaderA = await createAuthUser(`lider-a-${tag}@a.test`, "Líder A");
  const sellerA1 = await createAuthUser(`vend-a1-${tag}@a.test`, "Vendedor A1");
  const sellerA2 = await createAuthUser(`vend-a2-${tag}@a.test`, "Vendedor A2");
  const leaderB = await createAuthUser(`lider-b-${tag}@b.test`, "Líder B");
  const sellerB1 = await createAuthUser(`vend-b1-${tag}@b.test`, "Vendedor B1");

  const members: [string, string, string][] = [
    [companyA, leaderA, "leader"],
    [companyA, sellerA1, "seller"],
    [companyA, sellerA2, "seller"],
    [companyB, leaderB, "leader"],
    [companyB, sellerB1, "seller"],
  ];
  for (const [company, user, role] of members) {
    await run(
      asService("user", admin),
      "insert into public.memberships (company_id, user_id, role) values ($1, $2, $3)",
      [company, user, role],
      { commit: true },
    );
  }

  return { companyA, companyB, admin, leaderA, sellerA1, sellerA2, leaderB, sellerB1 };
}
