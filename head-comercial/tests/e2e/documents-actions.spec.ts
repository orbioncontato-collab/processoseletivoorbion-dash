import { expect, test, type Page } from "@playwright/test";
import { seedCompanyWithTeam, seedOpportunity, type SeededUser } from "./support";

/**
 * Fase 8 · Documentos com versões, plano de ação e os agentes Estrategista
 * Comercial, Gestor de Projetos e Sales Ops.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });
const answers = (page: Page) => page.getByRole("list", { name: "Mensagens" }).filter({ visible: true });
const MOCK = process.env.E2E_MOCK_ANTHROPIC_URL ?? "http://127.0.0.1:54398";

const tag = `d${Date.now().toString(36)}`;
const DOC = `Roteiro de abordagem ${tag}`;
let leader: SeededUser;
let sara: SeededUser;
let tiago: SeededUser;
let docUrl: string;

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_AI, "Servidor falso da Anthropic não configurado neste ambiente.");

async function login(page: Page, u: SeededUser) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(u.email);
  await field(page, "Senha").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

async function ask(page: Page, agentPath: string, question: string) {
  await page.goto(agentPath);
  await page.getByLabel("Sua pergunta").filter({ visible: true }).fill(question);
  await page.getByRole("button", { name: "Enviar pergunta" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/assistente\/[0-9a-f-]{36}$/);
}

const isoDate = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

test.beforeAll(async () => {
  const seed = await seedCompanyWithTeam(tag, 2);
  leader = seed.leader;
  [sara, tiago] = seed.sellers;
  await seedOpportunity(seed.companyId, sara.id, { title: "Proposta Sara", contact: "Cliente Sara" });
  await seedOpportunity(seed.companyId, tiago.id, { title: "Proposta Tiago", contact: "Cliente Tiago" });
});

test("líder cria o documento publicado e uma versão nova como rascunho", async ({ page }) => {
  await login(page, leader);
  await page.goto("/documentos");
  await field(page, "Título do documento").fill(DOC);
  await field(page, "Tipo de documento").selectOption("script");
  await field(page, "Conteúdo da primeira versão").fill("1. Cumprimente o cliente.\n2. Apresente a empresa.");
  await page.getByRole("button", { name: "Criar documento" }).click();
  await expect(page).toHaveURL(/\/documentos\/[0-9a-f-]{36}$/);
  docUrl = new URL(page.url()).pathname;
  await expect(text(page, "Mostrando a versão 1 (publicada)")).toBeVisible();

  await field(page, "Conteúdo da nova versão").fill("1. Cumprimente o cliente.\n2. Pergunte o que motivou o contato.");
  await field(page, "O que mudou").fill("Inclui pergunta de diagnóstico");
  await page.getByRole("button", { name: "Salvar versão" }).click();
  await expect(text(page, "Versão 2 salva como rascunho.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Histórico de versões" }).getByText("Versão 2")).toBeVisible();
});

test("vendedora vê só a versão publicada, sem rascunhos nem histórico", async ({ page }) => {
  await login(page, sara);
  await page.goto("/documentos");
  await page.getByRole("link", { name: DOC }).click();
  const content = page.getByRole("article", { name: "Conteúdo do documento" });
  await expect(content).toContainText("Apresente a empresa.");
  await expect(content).not.toContainText("motivou o contato");
  await expect(page.getByRole("list", { name: "Histórico de versões" })).toHaveCount(0);
  await page.goto(`${docUrl}?v=2`);
  await expect(page.getByRole("article", { name: "Conteúdo do documento" })).not.toContainText("motivou o contato");
});

test("líder publica a versão 2 e a equipe passa a ver", async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, leader);
  await page.goto(`${docUrl}?v=2`);
  await page.getByRole("button", { name: "Publicar versão 2" }).click();
  await expect(text(page, "Mostrando a versão 2 (publicada)")).toBeVisible();
  await page.close();

  const saraPage = await browser.newPage();
  await login(saraPage, sara);
  await saraPage.goto(docUrl);
  await expect(saraPage.getByRole("article", { name: "Conteúdo do documento" })).toContainText("motivou o contato");
  await saraPage.close();
});

test("Estrategista Comercial grava a proposta como rascunho para o líder revisar", async ({ page }) => {
  await login(page, leader);
  await ask(page, "/assistente?agente=strategist", "Melhore o roteiro de abordagem");
  await expect(text(page, "Conversa com Estrategista Comercial")).toBeVisible();
  await expect(answers(page).getByText("Deixei a versão 3 como rascunho para você revisar.")).toBeVisible();
  await expect(answers(page).getByText(/Consultou: documentos, nova versão do documento/)).toBeVisible();

  await page.goto("/documentos");
  await expect(text(page, "Versão 3 esperando revisão")).toBeVisible();
  await page.goto(`${docUrl}?v=3`);
  await expect(text(page, /Rascunho proposto pelo Estrategista Comercial: Diagnóstico antes do preço/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Histórico de versões" }).getByText("Agente")).toBeVisible();
});

test("vendedor pede ao Estrategista e nada é gravado", async ({ page }) => {
  await login(page, sara);
  await ask(page, "/assistente?agente=strategist", "Melhore o roteiro de abordagem");
  await expect(answers(page).getByText("Não gravei: Só líderes podem gravar versões. Mostre a sugestão na resposta.")).toBeVisible();
});

test("líder cria ação atrasada para o vendedor, que começa e conclui", async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, leader);
  await page.goto("/acoes");
  await field(page, "Ação").fill("Revisar as propostas sem resposta");
  await field(page, "Responsável").selectOption({ label: tiago.name });
  await field(page, "Prazo").fill(isoDate(-1));
  await field(page, "Prioridade").selectOption("high");
  await page.getByRole("button", { name: "Criar ação" }).click();
  await expect(text(page, "Ação criada.")).toBeVisible();
  const team = page.getByRole("list", { name: "Ações do time" }).filter({ visible: true });
  await expect(team.getByText("Revisar as propostas sem resposta")).toBeVisible();
  await expect(team.getByText(/Atrasada desde/)).toBeVisible();
  await page.close();

  const tiagoPage = await browser.newPage();
  await login(tiagoPage, tiago);
  await expect(tiagoPage.getByTestId("minhas-acoes").getByText("Revisar as propostas sem resposta")).toBeVisible();
  await tiagoPage.goto("/acoes");
  const mine = tiagoPage.getByRole("list", { name: "Minhas ações" }).filter({ visible: true });
  await mine.getByRole("button", { name: "Comecei" }).click();
  await expect(mine.getByText("Fazendo")).toBeVisible();
  await mine.getByRole("button", { name: "Feito" }).click();
  await expect(text(tiagoPage, "Nenhuma ação em aberto com você.")).toBeVisible();
  await tiagoPage.close();
});

test("Gestor de Projetos cria a ação pedida pela vendedora; o colega não vê", async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, sara);
  await ask(page, "/assistente?agente=project", "Monte um plano para recuperar meus clientes");
  await expect(answers(page).getByText('Criei a ação "Ligar para os clientes parados" no plano de ação.')).toBeVisible();
  await page.goto("/acoes");
  const mine = page.getByRole("list", { name: "Minhas ações" }).filter({ visible: true });
  await expect(mine.getByText("Ligar para os clientes parados")).toBeVisible();
  await expect(mine.getByText("Pelo Gestor de Projetos")).toBeVisible();
  await page.close();

  const tiagoPage = await browser.newPage();
  await login(tiagoPage, tiago);
  await tiagoPage.goto("/acoes?todas=1");
  await expect(text(tiagoPage, "Ligar para os clientes parados")).toHaveCount(0);
  await tiagoPage.close();
});

test("Sales Ops lê a saúde do funil do time", async ({ page }) => {
  await login(page, leader);
  await ask(page, "/assistente?agente=sales_ops", "Como está a saúde do funil?");
  await expect(answers(page).getByText(/Saúde do funil em 90 dias: 2 em aberto/)).toBeVisible();
  await expect(answers(page).getByText("Sales Ops")).toBeVisible();
});

test("cada agente recebe só as ferramentas do seu papel", async ({ request }) => {
  const sent = (await (await request.get(`${MOCK}/__requests`)).json()) as { body: { system?: { text: string }[]; tools?: { name: string }[] } }[];
  const toolsOf = (marker: string) => {
    const r = [...sent].reverse().find((x) => x.body.system?.[0]?.text.includes(marker) && Array.isArray(x.body.tools));
    return (r?.body.tools ?? []).map((t) => t.name);
  };
  const ops = toolsOf("Você é o Sales Ops");
  expect(ops).toContain("metricas_do_funil");
  expect(ops).not.toContain("criar_acao");
  expect(ops).not.toContain("propor_versao_documento");
  expect(toolsOf("Você é o Estrategista Comercial")).toContain("propor_versao_documento");
  expect(toolsOf("Você é o Gestor de Projetos")).toContain("criar_acao");
});
