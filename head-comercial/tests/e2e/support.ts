import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { CURRENT_TERMS_VERSION } from "../../src/lib/auth/terms";

/** Utilidades do teste de ponta a ponta. Rodam contra o Supabase local (supabase start). */

// Usuários criados pelos testes já entram com os termos aceitos (o aceite é testado em onboarding.spec.ts).
const TERMS_VERSION = CURRENT_TERMS_VERSION;

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Variável ${name} ausente para o teste E2E.`);
  return v;
};

export async function createPlatformAdmin(email: string, password: string) {
  const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Admin Orbion" },
  });
  if (error || !data.user) throw new Error(`Falha ao criar admin: ${error?.message}`);

  const db = new pg.Client({ connectionString: required("DATABASE_URL_TEST") });
  await db.connect();
  try {
    await db.query("insert into public.platform_admins (user_id) values ($1)", [data.user.id]);
    await db.query("update public.profiles set terms_version = $2, terms_accepted_at = now() where id = $1", [data.user.id, TERMS_VERSION]);
  } finally {
    await db.end();
  }
  return data.user.id;
}

const MAIL_URL = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:54324";

/** Busca o link de confirmação mais recente enviado para o e-mail (Mailpit do Supabase local). */
export async function waitForConfirmLink(to: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    if (res.ok) {
      const body = (await res.json()) as { messages?: { ID: string }[] };
      const latest = body.messages?.[0];
      if (latest) {
        const msg = (await (await fetch(`${MAIL_URL}/api/v1/message/${latest.ID}`)).json()) as {
          HTML?: string;
          Text?: string;
        };
        const content = `${msg.HTML ?? ""} ${msg.Text ?? ""}`;
        const match = content.match(/href="([^"]*\/auth\/confirm[^"]*)"/) ?? content.match(/(https?:\/\/\S*\/auth\/confirm\S*)/);
        if (match) return match[1].replace(/&amp;/g, "&");
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Nenhum e-mail com link de confirmação chegou para ${to}.`);
}

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

/**
 * Cria uma empresa com líder e vendedores já com senha, direto pela API
 * (sem passar pelo convite, que já é testado em onboarding.spec.ts).
 */
export async function seedCompanyWithTeam(tag: string, sellers = 2) {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("SUPABASE_SECRET_KEY");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: company, error } = await admin
    .from("companies")
    .insert({ name: `Comercial ${tag}`, slug: `comercial-${tag}` })
    .select("id, name")
    .single();
  if (error || !company) throw new Error(`Falha ao criar empresa: ${error?.message}`);

  async function user(role: "leader" | "seller", name: string): Promise<SeededUser> {
    const email = `${role}-${name.split(" ")[0].toLowerCase()}-${tag}@empresa.test`;
    const password = "Teste12345";
    const { data, error: e } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (e || !data.user) throw new Error(`Falha ao criar ${email}: ${e?.message}`);
    await admin.from("profiles").update({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() }).eq("id", data.user.id);
    const { error: m } = await admin
      .from("memberships")
      .insert({ company_id: company!.id, user_id: data.user.id, role });
    if (m) throw new Error(`Falha ao vincular ${email}: ${m.message}`);
    return { id: data.user.id, email, password, name };
  }

  const leader = await user("leader", "Laura Líder");
  const team: SeededUser[] = [];
  for (let i = 0; i < sellers; i++) team.push(await user("seller", ["Sara Vendas", "Tiago Vendas"][i] ?? `Vendedor ${i}`));
  return { companyId: company.id, companyName: company.name, leader, sellers: team };
}

/** Cria uma fonte já com chave (ex.: WhatsApp de um vendedor) e devolve id e chave. */
export async function seedSource(companyId: string, kind: string, name: string, ownerUserId: string | null) {
  const { createHash, randomBytes } = await import("node:crypto");
  const key = `hc_${randomBytes(24).toString("base64url")}`;
  const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
  const { data, error } = await admin
    .from("integration_sources")
    .insert({
      company_id: companyId,
      kind,
      name,
      owner_user_id: ownerUserId,
      secret_hash: createHash("sha256").update(key).digest("hex"),
      secret_hint: key.slice(-4),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Falha ao criar fonte: ${error?.message}`);
  return { id: data.id as string, key };
}

/** Cria contato e oportunidade direto pela API (para preparar cenários de alerta). */
export async function seedOpportunity(
  companyId: string,
  ownerId: string,
  o: { title: string; contact: string; nextStep?: string; nextStepAt?: string },
) {
  const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
  const { data: stage } = await admin
    .from("pipeline_stages")
    .select("id, pipeline_id")
    .eq("company_id", companyId)
    .eq("kind", "open")
    .order("position")
    .limit(1)
    .single();
  const { data: contact, error: ce } = await admin
    .from("contacts")
    .insert({ company_id: companyId, owner_id: ownerId, name: o.contact })
    .select("id")
    .single();
  if (ce || !contact || !stage) throw new Error(`Falha ao criar contato: ${ce?.message}`);
  const { data, error } = await admin
    .from("opportunities")
    .insert({
      company_id: companyId,
      contact_id: contact.id,
      owner_id: ownerId,
      pipeline_id: stage.pipeline_id,
      stage_id: stage.id,
      title: o.title,
      next_step: o.nextStep ?? null,
      next_step_at: o.nextStepAt ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Falha ao criar oportunidade: ${error?.message}`);
  return data.id as string;
}

/** Grava direto no banco pela chave secreta (preparação de cenários). */
export function adminClient() {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}
