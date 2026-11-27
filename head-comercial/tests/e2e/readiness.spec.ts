import { expect, test, type Page } from "@playwright/test";
import { createPlatformAdmin, seedCompanyWithTeam, seedOpportunity, seedSource, type SeededUser } from "./support";

/**
 * Fase 9 · Preparação para clientes convidados: maturidade, Analista de
 * Receita, limite de IA, limite de envios, termos e erros do sistema.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });
const answers = (page: Page) => page.getByRole("list", { name: "Mensagens" }).filter({ visible: true });

const tag = `r${Date.now().toString(36)}`;
const ADMIN = { email: `admin-${tag}@orbion.test`, password: "Admin12345" };
let companyId: string;
let leader: SeededUser;
let sara: SeededUser;

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_AI, "Servidor falso da Anthropic não configurado neste ambiente.");

async function login(page: Page, email: string, password: string, home = /\/inicio|\/admin\/empresas/) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(home);
}

async function ask(page: Page, path: string, question: string) {
  await page.goto(path);
  await page.getByLabel("Sua pergunta").filter({ visible: true }).fill(question);
  await page.getByRole("button", { name: "Enviar pergunta" }).filter({ visible: true }).click();
}

test.beforeAll(async () => {
  await createPlatformAdmin(ADMIN.email, ADMIN.password);
  const seed = await seedCompanyWithTeam(tag, 1);
  companyId = seed.companyId;
  leader = seed.leader;
  [sara] = seed.sellers;
  const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await seedOpportunity(companyId, sara.id, { title: "Proposta grande", contact: "Cliente A", nextStep: "Ligar", nextStepAt: nextWeek });
  await seedOpportunity(companyId, sara.id, { title: "Lead novo", contact: "Cliente B" });
});

test("termos e aviso de privacidade são públicos", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible();
  await expect(text(page, /Versão preliminar, em revisão jurídica/)).toBeVisible();
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Aviso de privacidade" })).toBeVisible();
  await expect(text(page, /Lei Geral de Proteção de Dados/)).toBeVisible();
});

test("líder calcula a maturidade com os dados reais; vendedor não acessa", async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, leader.email, leader.password);
  await page.goto("/maturidade");
  await expect(text(page, "Ainda não calculada. Use o botão Calcular agora.")).toBeVisible();
  await page.getByRole("button", { name: "Calcular agora" }).click();
  await expect(text(page, /Maturidade atualizada: \d+\/100/)).toBeVisible();
  const dims = page.getByRole("list", { name: "Dimensões da maturidade" }).filter({ visible: true });
  await expect(dims.getByText("1 de 2 negociações em aberto têm próximo passo marcado e em dia.")).toBeVisible();
  await expect(dims.getByText("Relatório diário ainda não configurado.")).toBeVisible();
  await page.close();

  const saraPage = await browser.newPage();
  await login(saraPage, sara.email, sara.password);
  await saraPage.goto("/maturidade");
  await expect(saraPage).toHaveURL(/\/inicio/);
  await saraPage.close();
});

test("Analista de Receita mostra a projeção do mês", async ({ page }) => {
  await login(page, leader.email, leader.password);
  await ask(page, "/assistente?agente=revenue", "Quanto vamos fechar este mês?");
  await expect(answers(page).getByText(/Projeção do mês: R\$/)).toBeVisible();
  await expect(answers(page).getByText("Analista de Receita")).toBeVisible();
});

test("limite mensal de IA atingido bloqueia o chat; sem limite, volta a funcionar", async ({ browser }) => {
  const adminPage = await browser.newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await adminPage.goto(`/admin/empresas/${companyId}`);
  await field(adminPage, "Limite mensal de IA (US$)").fill("0");
  await adminPage.getByRole("button", { name: "Salvar limite" }).click();
  await expect(text(adminPage, "Limite mensal de IA: US$ 0,00.")).toBeVisible();
  await expect(text(adminPage, /limite atingido/)).toBeVisible();

  const page = await browser.newPage();
  await login(page, leader.email, leader.password);
  await ask(page, "/assistente", "Oi, tudo bem?");
  await expect(text(page, "O limite mensal de uso da IA desta empresa foi atingido. Fale com a administração da Orbion.")).toBeVisible();

  await adminPage.reload();
  await field(adminPage, "Limite mensal de IA (US$)").fill("");
  await adminPage.getByRole("button", { name: "Salvar limite" }).click();
  await expect(text(adminPage, "Sem limite de IA.")).toBeVisible();
  await adminPage.close();

  await ask(page, "/assistente", "Oi de novo");
  await expect(page).toHaveURL(/\/assistente\/[0-9a-f-]{36}$/);
  await page.close();
});

test("webhook recusa quem passa do limite de envios por minuto", async ({ request }) => {
  const limit = Number(process.env.WEBHOOK_EVENTS_PER_MINUTE ?? 0);
  test.skip(!limit || limit > 99, "Limite de envios do teste não configurado.");
  const source = await seedSource(companyId, "webhook", "CRM em laço", null);
  const events = Array.from({ length: limit + 1 }, (_, i) => ({
    type: "contact.upsert",
    data: { external_id: `laco-${i}`, name: `Contato ${i}`, phone: `55119700${String(10000 + i).slice(-5)}` },
  }));
  const res = await request.post(`/api/webhooks/ingest/${source.id}`, { headers: { Authorization: `Bearer ${source.key}` }, data: { events } });
  expect(res.status()).toBe(429);
  expect(res.headers()["retry-after"]).toBe("60");
});

test("erros do sistema só para a administração", async ({ browser }) => {
  const adminPage = await browser.newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await adminPage.goto("/admin/erros");
  await expect(adminPage.getByRole("heading", { name: "Erros do sistema" })).toBeVisible();
  await adminPage.close();

  const page = await browser.newPage();
  await login(page, leader.email, leader.password);
  await page.goto("/admin/erros");
  await expect(page).toHaveURL(/\/inicio/);
  await page.close();
});

test("verificação de saúde responde sem login e as páginas têm os cabeçalhos de segurança", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, db: true });

  const page = await request.get("/entrar");
  const h = page.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("link de login com destino disfarçado não leva para outro site", async ({ page }) => {
  await page.goto("/entrar?next=/%09/exemplo-malicioso.com");
  await field(page, "E-mail").fill(leader.email);
  await field(page, "Senha").fill(leader.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/inicio|localhost:3000\/inicio/);
});
