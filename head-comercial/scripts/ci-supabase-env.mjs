// Lê `supabase status -o json` e imprime as variáveis do app no formato KEY=valor
// (para anexar a $GITHUB_ENV no CI ou gerar um .env.local).
import { execSync } from "node:child_process";

const raw = execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const s = JSON.parse(raw.slice(raw.indexOf("{")));
const pick = (...keys) => keys.map((k) => s[k]).find(Boolean);

const vars = {
  NEXT_PUBLIC_SUPABASE_URL: pick("API_URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pick("PUBLISHABLE_KEY", "ANON_KEY"),
  SUPABASE_SECRET_KEY: pick("SECRET_KEY", "SERVICE_ROLE_KEY"),
  DATABASE_URL_TEST: pick("DB_URL"),
  E2E_MAIL_URL: pick("MAILPIT_URL", "INBUCKET_URL") ?? "http://127.0.0.1:54324",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
};

for (const [k, v] of Object.entries(vars)) {
  if (!v) {
    console.error(`Não encontrei ${k} na saída do supabase status. Chaves: ${Object.keys(s).join(", ")}`);
    process.exit(1);
  }
  console.log(`${k}=${v}`);
}
