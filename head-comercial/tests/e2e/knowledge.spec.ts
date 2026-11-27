import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createPlatformAdmin, seedCompanyWithTeam, type SeededUser } from "./support";

/**
 * Fase 5 · Cérebro central, conhecimento da empresa e memória.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });
const results = (page: Page) => page.getByRole("list", { name: "Resultados da busca" }).filter({ visible: true });
const fixture = (name: string) => path.resolve(__dirname, "../fixtures", name);

const tag = `k${Date.now().toString(36)}`;
const ADMIN = { email: `admin-${tag}@orbion.test`, password: "Admin12345" };
let leader: SeededUser;
let sara: SeededUser;
let tiago: SeededUser;

test.describe.configure({ mode: "serial" });

async function login(page: Page, email: string, password: string, home = /\/inicio|\/admin\/empresas/) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(home);
}

async function search(page: Page, q: string) {
  await page.getByLabel("Buscar no conhecimento").filter({ visible: true }).fill(q);
  await page.getByRole("button", { name: "Buscar", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(q).replace(/%20/g, "(\\+|%20)")}`));
}

test.beforeAll(async () => {
  await createPlatformAdmin(ADMIN.email, ADMIN.password);
  const seed = await seedCompanyWithTeam(tag, 2);
  leader = seed.leader;
  [sara, tiago] = seed.sellers;
});

test("administração alimenta o cérebro central com PDF e casos de calibragem", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/cerebro");
  await field(page, "Título").fill(`Método Orbion ${tag}`);
  await field(page, "Etiquetas").fill("Preço, Proposta");
  await field(page, "Arquivo").setInputFiles(fixture("playbook.pdf"));
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(text(page, /Documento salvo em \d+ trecho/)).toBeVisible();
  await expect(text(page, `Método Orbion ${tag}`)).toBeVisible();

  // Busca sem acento encontra o texto com acento.
  await search(page, "objecao preco");
  await expect(results(page).getByText(`Método Orbion ${tag}`).first()).toBeVisible();
  await expect(results(page).getByText("Metodologia Orbion").first()).toBeVisible();

  await field(page, "Título do caso").fill(`Caso perdido ${tag}`);
  await field(page, "Resultado da venda").selectOption("lost");
  await field(page, "Conversa").fill("Cliente: achei caro.\nVendedor: posso dar 20% de desconto agora.");
  await field(page, "Avaliação esperada").fill("Deu desconto cedo demais. Devia ter explorado o valor antes.");
  await page.getByRole("button", { name: "Salvar caso" }).click();
  await expect(text(page, "Caso de calibragem salvo.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Casos de calibragem" }).getByText(`Caso perdido ${tag}`)).toBeVisible();
});

test("formato não aceito mostra o motivo", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/cerebro");
  await field(page, "Título").fill("Planilha");
  await field(page, "Arquivo").setInputFiles({ name: "dados.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(text(page, /Formato não aceito/)).toBeVisible();
});

test("líder cadastra o conhecimento da empresa; o acervo global fica de fora", async ({ page }) => {
  await login(page, leader.email, leader.password);
  await page.goto("/conhecimento");
  await field(page, "Título").fill(`Playbook ${tag}`);
  await field(page, "Tipo").selectOption("playbook");
  await field(page, "Ou cole o texto").fill("Na negociação com clientes grandes, ofereça parcelamento em 12 vezes e prazo de validade curto.");
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(text(page, "Documento salvo em 1 trecho(s).")).toBeVisible();

  await field(page, "Título").fill(`Script Word ${tag}`);
  await field(page, "Tipo").selectOption("script");
  await field(page, "Arquivo").setInputFiles(fixture("playbook.docx"));
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(page.getByRole("list", { name: "Documentos" }).getByText(`Script Word ${tag}`)).toBeVisible();

  await search(page, "validade");
  await expect(results(page).getByText(`Playbook ${tag}`).first()).toBeVisible();
  await expect(results(page).getByText(`Script Word ${tag}`).first()).toBeVisible();
  await expect(results(page).getByText(`Método Orbion ${tag}`)).toHaveCount(0);

  // Líder também registra casos da empresa.
  await expect(text(page, "Casos de calibragem da empresa")).toBeVisible();

  // Não acessa o cérebro central.
  await page.goto("/admin/cerebro");
  await expect(page).toHaveURL(/\/inicio/);
});

test("vendedor consulta o conhecimento, sem cadastrar nem ver a calibragem", async ({ page }) => {
  await login(page, sara.email, sara.password);
  await page.goto("/conhecimento");
  await expect(text(page, `Playbook ${tag}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar documento" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Arquivar/ })).toHaveCount(0);
  await expect(text(page, "Casos de calibragem da empresa")).toHaveCount(0);
  await search(page, "negociacao");
  await expect(results(page).getByText(`Playbook ${tag}`).first()).toBeVisible();
});

test("líder arquiva um documento e ele sai da busca", async ({ page }) => {
  await login(page, leader.email, leader.password);
  await page.goto("/conhecimento");
  await page.getByRole("button", { name: `Arquivar Script Word ${tag}` }).click();
  await expect(page.getByRole("list", { name: "Documentos" }).getByText(`Script Word ${tag}`)).toHaveCount(0);
  await search(page, "validade");
  await expect(results(page).getByText(`Playbook ${tag}`).first()).toBeVisible();
  await expect(results(page).getByText(`Script Word ${tag}`)).toHaveCount(0);
});

test("memória: a empresa toda vê o da empresa; o pessoal só a pessoa e o líder", async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, leader.email, leader.password);
  await page.goto("/memoria");
  await field(page, "Assunto").selectOption("pricing");
  await field(page, "O que vale lembrar").fill("Ticket médio de R$ 12 mil.");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(text(page, "Registrado na memória.")).toBeVisible();

  await field(page, "Sobre").selectOption({ label: sara.name });
  await field(page, "Assunto").selectOption("difficulty");
  await field(page, "O que vale lembrar").fill("Precisa melhorar o fechamento.");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(text(page, `Sobre ${sara.name}`)).toBeVisible();
  await expect(text(page, "Precisa melhorar o fechamento.")).toBeVisible();
  await expect(text(page, `registrado por ${leader.name}`).first()).toBeVisible();
  await page.close();

  const saraPage = await browser.newPage();
  await login(saraPage, sara.email, sara.password);
  await saraPage.goto("/memoria");
  await expect(text(saraPage, "Ticket médio de R$ 12 mil.")).toBeVisible();
  await expect(text(saraPage, "Precisa melhorar o fechamento.")).toBeVisible();
  await expect(saraPage.getByRole("button", { name: "Registrar" })).toHaveCount(0);
  await saraPage.close();

  const tiagoPage = await browser.newPage();
  await login(tiagoPage, tiago.email, tiago.password);
  await tiagoPage.goto("/memoria");
  await expect(text(tiagoPage, "Ticket médio de R$ 12 mil.")).toBeVisible();
  await expect(text(tiagoPage, "Precisa melhorar o fechamento.")).toHaveCount(0);
  await expect(text(tiagoPage, "Nada registrado sobre você ainda.")).toBeVisible();
  await tiagoPage.close();
});
