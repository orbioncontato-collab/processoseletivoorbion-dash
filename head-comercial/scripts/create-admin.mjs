#!/usr/bin/env node
// Cria (ou promove) um administrador da plataforma no Supabase de produção.
// A pessoa recebe o e-mail de convite, cria a senha e, no primeiro acesso, aceita os termos.
//
// Uso:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SECRET_KEY=sb_secret_... \
//   NEXT_PUBLIC_SITE_URL=https://head.orbion.com.br \
//   node scripts/create-admin.mjs email@orbion.com.br "Nome da Pessoa"
import { createClient } from "@supabase/supabase-js";

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ").trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName) {
  console.error('Uso: node scripts/create-admin.mjs email@empresa.com "Nome da Pessoa"');
  process.exit(1);
}
if (!url || !key || !site) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e NEXT_PUBLIC_SITE_URL.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

// Já existe? Procura pelo perfil (criado automaticamente com o usuário).
const { data: existing } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
let userId = existing?.id;

if (!userId) {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${site.replace(/\/+$/, "")}/auth/confirm?next=/definir-senha`,
  });
  if (error || !data.user) {
    console.error("Não foi possível convidar:", error?.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`Convite enviado para ${email}.`);
} else {
  console.log(`${email} já tem conta; vou só dar acesso de administração.`);
}

const { error: adminError } = await admin.from("platform_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
if (adminError) {
  console.error("Não foi possível marcar como administrador:", adminError.message);
  process.exit(1);
}
console.log("Pronto: acesso de administração da plataforma liberado.");
