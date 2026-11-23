import { expect, test, type Page } from "@playwright/test";
import { seedCompanyWithTeam, type SeededUser } from "./support";

/**
 * Fase 1 · Núcleo comercial, do jeito que o time usa no dia a dia.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });

const tag = `c${Date.now().toString(36)}`;
let leader: SeededUser;
let sara: SeededUser;
let tiago: SeededUser;
let saraPage: Page;
let leaderPage: Page;
let oppUrl = "";
let tiagoOppUrl = "";

test.describe.configure({ mode: "serial" });

async function login(page: Page, u: SeededUser) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(u.email);
  await field(page, "Senha").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test.beforeAll(async ({ browser }) => {
  const seed = await seedCompanyWithTeam(tag, 2);
  leader = seed.leader;
  [sara, tiago] = seed.sellers;
  saraPage = await (await browser.newContext()).newPage();
  leaderPage = await (await browser.newContext()).newPage();
  await login(saraPage, sara);
  await login(leaderPage, leader);
});

test("vendedora cria oportunidade com contato novo e próximo passo vencido", async () => {
  await saraPage.goto("/oportunidades/nova");
  await field(saraPage, "Nome do contato").fill("Maria Souza");
  await field(saraPage, "WhatsApp ou telefone").fill("(11) 91234-5678");
  await field(saraPage, "Título da oportunidade").fill("Consultoria Maria");
  await field(saraPage, "Valor (R$)").fill("12.000,00");
  await field(saraPage, "Próximo passo").fill("Enviar proposta");
  await field(saraPage, "Quando").fill("2025-01-10T10:00");
  await saraPage.getByRole("button", { name: "Criar oportunidade" }).click();

  await expect(saraPage).toHaveURL(/\/oportunidades\/[0-9a-f-]{36}$/);
  oppUrl = saraPage.url();
  await expect(saraPage.getByRole("heading", { name: "Consultoria Maria" })).toBeVisible();
  await expect(text(saraPage, /R\$\s12\.000,00/).first()).toBeVisible();
  await expect(text(saraPage, /Vencido/).first()).toBeVisible();
  await expect(text(saraPage, "Oportunidade criada: Consultoria Maria (Novo contato)")).toBeVisible();
});

test("início mostra o vencido nas prioridades do dia", async () => {
  await saraPage.goto("/inicio");
  await expect(saraPage.getByRole("link", { name: /Próximos passos vencidos\s*1/ })).toBeVisible();
  await expect(saraPage.getByRole("link", { name: "Consultoria Maria" })).toBeVisible();
});

test("telefone repetido na mesma empresa é recusado com mensagem clara", async () => {
  await saraPage.goto("/oportunidades/nova");
  await saraPage.getByLabel("Novo contato").check();
  await field(saraPage, "Nome do contato").fill("Maria de novo");
  await field(saraPage, "WhatsApp ou telefone").fill("11 91234 5678");
  await field(saraPage, "Título da oportunidade").fill("Duplicada");
  await saraPage.getByRole("button", { name: "Criar oportunidade" }).click();
  await expect(text(saraPage, /Já existe um contato com esse telefone/)).toBeVisible();
});

test("objeção registrada e resolvida aparece no histórico", async () => {
  await saraPage.goto(oppUrl);
  await field(saraPage, "Nova objeção").fill("Achou caro para o momento");
  await field(saraPage, "Tipo").selectOption("preco");
  await saraPage.getByRole("button", { name: "Registrar objeção" }).click();
  await expect(text(saraPage, "Objeção registrada.")).toBeVisible();
  await saraPage.getByRole("button", { name: "Resolvida" }).click();
  await expect(text(saraPage, "Objeção marcada como resolvida")).toBeVisible();
});

test("mudar de etapa fica registrado", async () => {
  await saraPage.goto(oppUrl);
  await field(saraPage, "Mover para a etapa").selectOption({ label: "Proposta" });
  await saraPage.getByRole("button", { name: "Mover" }).click();
  await expect(text(saraPage, "Etapa: Novo contato → Proposta")).toBeVisible();
});

test("perda exige motivo e encerra a negociação", async () => {
  await saraPage.goto(oppUrl);
  await field(saraPage, "Mover para a etapa").selectOption({ label: "Perdido (perda)" });
  await saraPage.getByRole("button", { name: "Encerrar como perdida" }).click();
  await expect(text(saraPage, "Informe o motivo da perda.").first()).toBeVisible();

  await field(saraPage, "Mover para a etapa").selectOption({ label: "Perdido (perda)" });
  await field(saraPage, "Motivo da perda").selectOption("preco");
  await saraPage.getByRole("button", { name: "Encerrar como perdida" }).click();
  await expect(text(saraPage, "Negociação perdida")).toBeVisible();
  await expect(text(saraPage, /Encerrada como perdida \(preço\)/)).toBeVisible();
});

test("outro vendedor não abre a oportunidade da colega", async ({ browser }) => {
  const tiagoPage = await (await browser.newContext()).newPage();
  await login(tiagoPage, tiago);
  // Tiago cria a dele
  await tiagoPage.goto("/oportunidades/nova");
  await field(tiagoPage, "Nome do contato").fill("Cliente do Tiago");
  await field(tiagoPage, "Título da oportunidade").fill("Negócio do Tiago");
  await tiagoPage.getByRole("button", { name: "Criar oportunidade" }).click();
  await expect(tiagoPage).toHaveURL(/\/oportunidades\/[0-9a-f-]{36}$/);
  tiagoOppUrl = tiagoPage.url();

  await tiagoPage.goto(oppUrl);
  await expect(text(tiagoPage, "Não encontramos esta página")).toBeVisible();
  await expect(text(tiagoPage, "Consultoria Maria")).toHaveCount(0);
  await tiagoPage.goto("/oportunidades?status=all");
  await expect(tiagoPage.getByRole("link", { name: "Consultoria Maria" })).toHaveCount(0);
  await expect(tiagoPage.getByRole("link", { name: "Negócio do Tiago" })).toBeVisible();
});

test("líder vê as oportunidades do time com responsável e filtra por pessoa", async () => {
  await leaderPage.goto("/oportunidades?status=all");
  await expect(leaderPage.getByRole("link", { name: "Consultoria Maria" })).toBeVisible();
  await expect(leaderPage.getByRole("link", { name: "Negócio do Tiago" })).toBeVisible();
  await expect(leaderPage.getByRole("row", { name: /Consultoria Maria/ }).getByText(sara.name)).toBeVisible();

  await leaderPage.getByLabel("Responsável", { exact: true }).filter({ visible: true }).selectOption({ label: tiago.name });
  await leaderPage.getByRole("button", { name: "Filtrar" }).click();
  await expect(leaderPage.getByRole("link", { name: "Consultoria Maria" })).toHaveCount(0);
  await expect(leaderPage.getByRole("link", { name: "Negócio do Tiago" })).toBeVisible();
});

test("líder transfere a oportunidade e o histórico registra", async () => {
  await leaderPage.goto(tiagoOppUrl);
  await field(leaderPage, "Responsável").selectOption({ label: sara.name });
  await leaderPage.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(text(leaderPage, "Alterações salvas.")).toBeVisible();
  await expect(text(leaderPage, `Responsável: ${tiago.name} → ${sara.name}`)).toBeVisible();
});

test("líder ajusta o funil e o sistema impede deixar o funil sem etapa de perda", async () => {
  await leaderPage.goto("/funil");
  await field(leaderPage, "Nome da etapa").fill("Reunião agendada");
  await leaderPage.getByRole("button", { name: "Adicionar etapa" }).click();
  await expect(text(leaderPage, "Etapa adicionada.")).toBeVisible();

  const perdido = leaderPage.getByRole("listitem").filter({ has: leaderPage.getByLabel("Nome da etapa Perdido") });
  await perdido.getByRole("button", { name: "Arquivar Perdido" }).click();
  await expect(perdido.getByText(/pelo menos uma etapa aberta, uma de ganho e uma de perda/)).toBeVisible();
});

test("vendedor não acessa a configuração do funil", async () => {
  await saraPage.goto("/funil");
  await expect(saraPage).toHaveURL(/\/inicio/);
});

test("busca de contato por parte do telefone", async () => {
  await saraPage.goto("/contatos?q=91234");
  await expect(saraPage.getByRole("link", { name: "Maria Souza" })).toBeVisible();
  await expect(saraPage.getByRole("link", { name: "Cliente do Tiago" })).toHaveCount(0);
});
