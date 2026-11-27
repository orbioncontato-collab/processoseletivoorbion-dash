import { expect, test, type Page } from "@playwright/test";
import { createPlatformAdmin, seedCompanyWithTeam } from "./support";

/**
 * Chaves das integrações da plataforma: a administração cola, o valor fica
 * cifrado e só o final aparece na tela.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });

const tag = `p${Date.now().toString(36)}`;
const ADMIN = { email: `admin-${tag}@orbion.test`, password: "Admin12345" };

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_AI, "Servidor falso da Anthropic não configurado neste ambiente.");

async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio|\/admin\/empresas/);
}

const removeButton = (page: Page, name: string) =>
  page.locator(`form:has(input[name="name"][value="${name}"])`).getByRole("button", { name: "Remover" }).filter({ visible: true });

test.beforeAll(async () => {
  await createPlatformAdmin(ADMIN.email, ADMIN.password);
});

test("sem chave na tela, vale a variável do servidor", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/integracoes");
  await expect(text(page, "Configurada pela variável do servidor").first()).toBeVisible();
});

test("chave curta é recusada; chave salva aparece só pelo final e é testada", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/integracoes");
  await field(page, "Chave da API").fill("curta");
  await page.getByRole("button", { name: "Salvar" }).first().click();
  await expect(text(page, "Chave curta demais.")).toBeVisible();

  await field(page, "Chave da API").fill("sk-ant-api03-chave-de-teste-9f3c");
  await page.getByRole("button", { name: "Salvar" }).first().click();
  await expect(text(page, /termina em 9f3c/)).toBeVisible();
  await expect(page.getByText("sk-ant-api03-chave-de-teste-9f3c")).toHaveCount(0);

  await page.getByRole("button", { name: "Testar conexão" }).click();
  await expect(text(page, /Conexão com a Anthropic funcionando. Modelos disponíveis: claude-opus-5-5/)).toBeVisible();
});

test("chave recusada pela Anthropic mostra o motivo; remover volta para a variável", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/integracoes");
  await field(page, "Chave da API").fill("sk-ant-chave-invalida-0000");
  await page.getByRole("button", { name: "Salvar" }).first().click();
  await expect(text(page, /termina em 0000/)).toBeVisible();
  await page.getByRole("button", { name: "Testar conexão" }).click();
  await expect(text(page, "A Anthropic recusou a chave. Confira se ela foi copiada inteira.")).toBeVisible();

  await removeButton(page, "anthropic_api_key").click();
  await expect(text(page, /termina em 0000/)).toHaveCount(0);
  await expect(text(page, "Configurada pela variável do servidor").first()).toBeVisible();
});

test("líder não acessa as integrações da plataforma", async ({ page }) => {
  const { leader } = await seedCompanyWithTeam(tag, 0);
  await login(page, leader.email, leader.password);
  await page.goto("/admin/integracoes");
  await expect(page).toHaveURL(/\/inicio/);
});
