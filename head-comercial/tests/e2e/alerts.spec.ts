import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { seedCompanyWithTeam, seedOpportunity, seedSource, type SeededUser } from "./support";

/**
 * Fase 4 · Alertas e painéis: o Head chama atenção sozinho.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });
const CRON = process.env.CRON_SECRET ?? "";

const tag = `a${Date.now().toString(36)}`;
let leader: SeededUser;
let sara: SeededUser;
let tiago: SeededUser;

test.describe.configure({ mode: "serial" });
test.skip(!CRON, "CRON_SECRET não configurado neste ambiente.");

async function login(page: Page, u: SeededUser) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(u.email);
  await field(page, "Senha").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

const recalc = (request: APIRequestContext) =>
  request.get("/api/cron/alerts", { headers: { Authorization: `Bearer ${CRON}` } });

test.beforeAll(async ({ request }) => {
  const seed = await seedCompanyWithTeam(tag, 2);
  leader = seed.leader;
  [sara, tiago] = seed.sellers;
  const yesterday = new Date(Date.now() - 26 * 3600_000).toISOString();
  await seedOpportunity(seed.companyId, sara.id, { title: "Proposta Sara", contact: "Cliente S1", nextStep: "Ligar", nextStepAt: yesterday });
  await seedOpportunity(seed.companyId, sara.id, { title: "Lead sem passo", contact: "Cliente S2" });
  await seedOpportunity(seed.companyId, tiago.id, { title: "Proposta Tiago", contact: "Cliente T1", nextStep: "Visitar", nextStepAt: yesterday });

  // Cliente escreveu para a Sara há 5 horas e ninguém respondeu.
  const source = await seedSource(seed.companyId, "whatsapp_device", "WhatsApp da Sara", sara.id);
  const res = await request.post(`/api/webhooks/ingest/${source.id}`, {
    headers: { Authorization: `Bearer ${source.key}` },
    data: {
      type: "message",
      data: {
        external_id: "al-1",
        direction: "inbound",
        sent_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
        contact: { phone: "5511977770001", name: "Bruna Espera" },
        body: "Oi, vocês podem me mandar o orçamento?",
      },
    },
  });
  expect((await res.json()).processed).toBe(1);
});

test("agendador exige a chave e recalcula com ela", async ({ request }) => {
  expect((await request.get("/api/cron/alerts")).status()).toBe(401);
  const res = await recalc(request);
  expect(res.status()).toBe(200);
  expect((await res.json()).ok).toBe(true);
});

test("vendedora vê o que fazer agora, com o mais urgente primeiro", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, sara);
  const list = page.getByTestId("alert-list").filter({ visible: true });
  await expect(list.getByRole("link").first()).toHaveText("Cliente esperando resposta: Bruna Espera");
  await expect(list.getByRole("link", { name: "Próximo passo vencido: Proposta Sara" })).toBeVisible();
  await expect(list.getByRole("link", { name: "Sem próximo passo: Lead sem passo" })).toBeVisible();
  await expect(list.getByRole("link", { name: /Proposta Tiago/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Dispensar: Sem próximo passo: Lead sem passo" }).click();
  await expect(list.getByRole("link", { name: "Sem próximo passo: Lead sem passo" })).toHaveCount(0);

  await list.getByRole("link", { name: "Cliente esperando resposta: Bruna Espera" }).click();
  await expect(page).toHaveURL(/\/conversas\/[0-9a-f-]{36}$/);
});

test("líder vê a leitura da operação e quem merece atenção", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, leader);
  const card = page.getByTestId("leitura-operacao").filter({ visible: true });
  await expect(card.getByText(/O time tem 1 cliente esperando resposta e 2 próximos passos vencidos\./)).toBeVisible();
  await expect(card.getByText(`Quem merece atenção primeiro: ${sara.name}.`, { exact: false })).toBeVisible();
  const items = card.getByRole("listitem");
  await expect(items.first()).toContainText(sara.name);
  await expect(items.first()).toContainText("1 cliente esperando resposta e 1 próximo passo vencido");
  await expect(items.nth(1)).toContainText(tiago.name);

  await card.getByRole("link", { name: tiago.name }).click();
  await expect(page).toHaveURL(/\/alertas\?pessoa=/);
  await expect(page.getByRole("link", { name: "Próximo passo vencido: Proposta Tiago" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Proposta Sara/ })).toHaveCount(0);
});

test("líder muda a referência de espera e o alerta se resolve sozinho", async ({ browser, request }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, leader);
  await page.goto("/configuracoes");
  await field(page, "Cliente esperando há mais de (horas)").fill("10");
  await page.getByRole("button", { name: "Salvar referências" }).click();
  await expect(text(page, /Referências salvas/)).toBeVisible();

  await recalc(request);
  await page.goto("/inicio");
  const card = page.getByTestId("leitura-operacao").filter({ visible: true });
  await expect(card.getByText(/O time tem 2 próximos passos vencidos\./)).toBeVisible();
  await expect(card.getByText(/cliente esperando resposta/)).toHaveCount(0);
});

test("vendedor não acessa as configurações", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, tiago);
  await page.goto("/configuracoes");
  await expect(page).toHaveURL(/\/inicio/);
});
