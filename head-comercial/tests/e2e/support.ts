import { createClient } from "@supabase/supabase-js";
import pg from "pg";

/** Utilidades do teste de ponta a ponta. Rodam contra o Supabase local (supabase start). */

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
