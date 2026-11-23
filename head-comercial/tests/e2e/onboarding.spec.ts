import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * O Next.js 16 guarda telas visitadas escondidas na memória (para voltar rápido).
 * Por isso procuramos sempre só os campos visíveis.
 */
const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });
import { createPlatformAdmin, waitForConfirmLink } from "./support";

/**
 * Fluxo completo da Fase 0, como acontece na vida real:
 * admin cria empresa -> convida líder -> líder cria senha -> líder convida vendedor
 * -> vendedor cria senha -> permissões por papel -> histórico -> desativação corta acesso.
 */

const tag = Date.now().toString(36);
const ADMIN = { email: `admin-${tag}@orbion.test`, password: "Admin12345" };
const LEADER = { name: "Lia Líder", email: `lider-${tag}@empresa.test`, password: "Lider12345" };
const SELLER = { name: "Vitor Vendedor", email: `vendedor-${tag}@empresa.test`, password: "Vende12345" };
const COMPANY = `Empresa E2E ${tag}`;

test.describe.configure({ mode: "serial" });

let adminPage: Page;
let leaderPage: Page;
let sellerPage: Page;

async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function acceptInvite(browser: Browser, email: string, password: string) {
  const link = await waitForConfirmLink(email);
  const page = await (await browser.newContext()).newPage();
  await page.goto(link);
  await expect(page).toHaveURL(/\/definir-senha/);
  await field(page, "Nova senha").fill(password);
  await field(page, "Repita a senha").fill(password);
  await page.getByRole("button", { name: "Salvar senha e entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  return page;
}

test.beforeAll(async () => {
  await createPlatformAdmin(ADMIN.email, ADMIN.password);
});

test("senha errada mostra mensagem genérica", async ({ page }) => {
  await login(page, ADMIN.email, "senhaErrada1");
  await expect(page.getByText("E-mail ou senha incorretos.").filter({ visible: true })).toBeVisible();
});

test("admin cria empresa e convida o líder", async ({ browser }) => {
  adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  // Admin sem empresa vai direto para a administração.
  await expect(adminPage).toHaveURL(/\/admin\/empresas/);

  await field(adminPage, "Nome da empresa").fill(COMPANY);
  await adminPage.getByRole("button", { name: "Criar empresa" }).click();
  await expect(adminPage.getByRole("heading", { name: COMPANY })).toBeVisible();

  await field(adminPage, "Nome").fill(LEADER.name);
  await field(adminPage, "E-mail").fill(LEADER.email);
  await field(adminPage, "Papel").selectOption("leader");
  await adminPage.getByRole("button", { name: "Enviar convite" }).click();
  await expect(adminPage.getByText(`Convite enviado para ${LEADER.email}.`).filter({ visible: true })).toBeVisible();
  await expect(adminPage.getByText("Convites aguardando").filter({ visible: true })).toBeVisible();
});

test("líder aceita o convite e entra na empresa", async ({ browser }) => {
  leaderPage = await acceptInvite(browser, LEADER.email, LEADER.password);
  await expect(leaderPage.getByRole("heading", { name: "Olá, Lia" })).toBeVisible();
  await expect(leaderPage.getByText(`${COMPANY} · Líder`).filter({ visible: true })).toBeVisible();
});

test("líder convida vendedor, que aceita e entra como vendedor", async ({ browser }) => {
  await leaderPage.goto("/equipe");
  await field(leaderPage, "Nome").fill(SELLER.name);
  await field(leaderPage, "E-mail").fill(SELLER.email);
  await leaderPage.getByRole("button", { name: "Enviar convite" }).click();
  await expect(leaderPage.getByText(`Convite enviado para ${SELLER.email}.`).filter({ visible: true })).toBeVisible();

  sellerPage = await acceptInvite(browser, SELLER.email, SELLER.password);
  await expect(sellerPage.getByText(`${COMPANY} · Vendedor`).filter({ visible: true })).toBeVisible();
});

test("convite repetido para quem já está na equipe é recusado", async () => {
  await leaderPage.goto("/equipe");
  await field(leaderPage, "Nome").fill(SELLER.name);
  await field(leaderPage, "E-mail").fill(SELLER.email);
  await leaderPage.getByRole("button", { name: "Enviar convite" }).click();
  await expect(leaderPage.getByText("Essa pessoa já faz parte da equipe.").filter({ visible: true })).toBeVisible();
});

test("vendedor não acessa páginas de líder nem de admin", async () => {
  await sellerPage.goto("/equipe");
  await expect(sellerPage).toHaveURL(/\/inicio/);
  await sellerPage.goto("/historico");
  await expect(sellerPage).toHaveURL(/\/inicio/);
  await sellerPage.goto("/admin/empresas");
  await expect(sellerPage).toHaveURL(/\/inicio/);
  await expect(sellerPage.getByRole("link", { name: "Equipe" })).toHaveCount(0);
});

test("histórico mostra quem fez cada ação", async () => {
  await leaderPage.goto("/historico");
  await expect(leaderPage.getByText(`${SELLER.name} entrou na equipe como vendedor`).filter({ visible: true })).toBeVisible();
  await expect(leaderPage.getByText(`Convite enviado para ${SELLER.email} como vendedor`).filter({ visible: true })).toBeVisible();
  await expect(leaderPage.getByText(`por ${LEADER.name}`).filter({ visible: true }).first()).toBeVisible();
  await expect(leaderPage.getByText(`Empresa ${COMPANY} criada`).filter({ visible: true })).toBeVisible();
});

test("líder desativa o vendedor e o acesso é cortado", async () => {
  await leaderPage.goto("/equipe");
  const row = leaderPage.getByRole("row", { name: new RegExp(SELLER.name) });
  await row.getByRole("button", { name: "Desativar" }).click();
  await expect(row.getByText("Desativado").filter({ visible: true })).toBeVisible();

  await sellerPage.goto("/inicio");
  await expect(sellerPage).toHaveURL(/\/sem-acesso/);
});

test("troca de nome no perfil", async () => {
  await leaderPage.goto("/perfil");
  await field(leaderPage, "Nome").fill("Lia Souza");
  await leaderPage.getByRole("button", { name: "Salvar nome" }).click();
  await expect(leaderPage.getByText("Nome atualizado.").filter({ visible: true })).toBeVisible();
});
