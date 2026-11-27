import { expect, test, type Page } from "@playwright/test";
import { adminClient, createPlatformAdmin, seedCompanyWithTeam, seedSource, type SeededUser } from "./support";

/**
 * Fase 7 · Desenvolvimento: biblioteca, indicação pelo líder, recomendação
 * pela análise de conversa e evolução depois da conclusão.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });
const assigned = (page: Page) => page.getByRole("list", { name: "Treinamentos indicados" }).filter({ visible: true });

const tag = `t${Date.now().toString(36)}`;
const ADMIN = { email: `admin-${tag}@orbion.test`, password: "Admin12345" };
const GLOBAL_TITLE = `Diagnóstico em 5 perguntas ${tag}`;
const COMPANY_TITLE = `Como responder ao preço ${tag}`;
let leader: SeededUser;
let sara: SeededUser;
let tiago: SeededUser;
let conversationId: string;

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_AI, "Servidor falso da Anthropic não configurado neste ambiente.");

async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio|\/admin\/empresas/);
}

test.beforeAll(async ({ request }) => {
  await createPlatformAdmin(ADMIN.email, ADMIN.password);
  const seed = await seedCompanyWithTeam(tag, 2);
  leader = seed.leader;
  [sara, tiago] = seed.sellers;
  const source = await seedSource(seed.companyId, "whatsapp_device", "WhatsApp da Sara", sara.id);
  const now = Date.now();
  const events = [
    { id: "tr-1", direction: "inbound", minutes: 30, body: "Quanto custa?" },
    { id: "tr-2", direction: "outbound", minutes: 29, body: "R$ 5 mil." },
  ].map((m) => ({
    type: "message",
    data: { external_id: m.id, direction: m.direction, sent_at: new Date(now - m.minutes * 60_000).toISOString(), contact: { phone: "5511955550001", name: "Rita Rápida" }, body: m.body },
  }));
  const res = await request.post(`/api/webhooks/ingest/${source.id}`, { headers: { Authorization: `Bearer ${source.key}` }, data: { events } });
  expect((await res.json()).processed).toBe(2);
  const { data } = await adminClient().from("conversations").select("id").eq("company_id", seed.companyId).single();
  conversationId = data!.id;
});

test("administração cadastra um treinamento na biblioteca da Orbion", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/treinamentos");
  await field(page, "Título do treinamento").fill(GLOBAL_TITLE);
  await field(page, "Habilidade").selectOption("diagnostico");
  await field(page, "Resumo").fill("Perguntas para entender a necessidade antes do preço.");
  await field(page, "Conteúdo").fill("1. O que motivou a busca?\n2. Como resolvem hoje?");
  await page.getByRole("button", { name: "Salvar treinamento" }).click();
  await expect(text(page, "Treinamento salvo.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Biblioteca de treinamentos" }).getByText(GLOBAL_TITLE)).toBeVisible();
});

test("líder vê a biblioteca da Orbion, cadastra o da empresa e indica para um vendedor", async ({ page }) => {
  await login(page, leader.email, leader.password);
  await page.goto("/treinamentos");
  const library = page.getByRole("list", { name: "Biblioteca de treinamentos" }).filter({ visible: true });
  await expect(library.getByText(GLOBAL_TITLE)).toBeVisible();

  await field(page, "Título do treinamento").fill(COMPANY_TITLE);
  await field(page, "Habilidade").selectOption("objecoes");
  await field(page, "Conteúdo").fill("Mostre o retorno antes de falar de desconto.");
  await page.getByRole("button", { name: "Salvar treinamento" }).click();
  await expect(text(page, "Treinamento salvo.")).toBeVisible();
  await expect(library.getByText(COMPANY_TITLE)).toBeVisible();

  await field(page, "Para quem").selectOption({ label: tiago.name });
  await field(page, "Treinamento").selectOption({ label: `${COMPANY_TITLE} (Tratamento de objeções)` });
  await field(page, "Motivo").fill("Está dando desconto cedo demais.");
  await page.getByRole("button", { name: "Indicar treinamento" }).click();
  await expect(text(page, "Treinamento indicado.")).toBeVisible();
  await expect(assigned(page).getByText("Está dando desconto cedo demais.")).toBeVisible();

  // Indicar de novo o mesmo treinamento em aberto é recusado.
  await field(page, "Para quem").selectOption({ label: tiago.name });
  await field(page, "Treinamento").selectOption({ label: `${COMPANY_TITLE} (Tratamento de objeções)` });
  await field(page, "Motivo").fill("De novo");
  await page.getByRole("button", { name: "Indicar treinamento" }).click();
  await expect(text(page, "Essa pessoa já tem este treinamento em aberto.")).toBeVisible();
});

test("vendedor começa e conclui o treinamento indicado", async ({ page }) => {
  await login(page, tiago.email, tiago.password);
  await page.goto("/treinamentos");
  const mine = assigned(page);
  await expect(mine.getByText(COMPANY_TITLE)).toBeVisible();
  await mine.getByRole("button", { name: "Começar" }).click();
  await expect(mine.getByText("Em andamento")).toBeVisible();
  await mine.getByRole("button", { name: "Concluí" }).click();
  await expect(mine.getByText("Concluído")).toBeVisible();
  await expect(mine.getByText("Ainda sem conversas analisadas depois da conclusão.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Indicar treinamento" })).toHaveCount(0);
});

test("análise da conversa recomenda treinamento para a habilidade fraca", async ({ page }) => {
  await login(page, leader.email, leader.password);
  await page.goto(`/conversas/${conversationId}`);
  await page.getByRole("button", { name: "Analisar com IA" }).click();
  await expect(text(page, `Análise pronta. Treinamento recomendado: ${GLOBAL_TITLE}.`)).toBeVisible();
});

test("vendedora vê o motivo, conclui e o Head mostra a evolução na análise seguinte", async ({ browser }) => {
  const saraPage = await browser.newPage();
  await login(saraPage, sara.email, sara.password);
  await saraPage.goto("/treinamentos");
  const mine = assigned(saraPage);
  await expect(mine.getByText(/Na análise da conversa com Rita Rápida, "Diagnóstico da necessidade" ficou 4\/10/)).toBeVisible();
  await expect(mine.getByText("Pela análise de conversa", { exact: false })).toBeVisible();
  await mine.getByRole("button", { name: "Concluí" }).click();
  await expect(mine.getByText("Concluído")).toBeVisible();

  const leaderPage = await browser.newPage();
  await login(leaderPage, leader.email, leader.password);
  await leaderPage.goto(`/conversas/${conversationId}`);
  await leaderPage.getByRole("button", { name: "Analisar de novo" }).click();
  await expect(text(leaderPage, /Análise pronta/)).toBeVisible();
  await leaderPage.goto("/treinamentos");
  await expect(assigned(leaderPage).getByText("Antes: 4/10. Depois: 4/10 em 1 análise(s), ficou igual.")).toBeVisible();

  await saraPage.reload();
  await expect(assigned(saraPage).getByText("Antes: 4/10. Depois: 4/10 em 1 análise(s), ficou igual.")).toBeVisible();
  await saraPage.close();
  await leaderPage.close();
});

test("colega não vê os treinamentos da vendedora; vendedor não entra na biblioteca da Orbion", async ({ page }) => {
  await login(page, tiago.email, tiago.password);
  await page.goto("/treinamentos");
  await expect(text(page, /Rita Rápida/)).toHaveCount(0);
  await page.goto("/admin/treinamentos");
  await expect(page).toHaveURL(/\/inicio/);
});
