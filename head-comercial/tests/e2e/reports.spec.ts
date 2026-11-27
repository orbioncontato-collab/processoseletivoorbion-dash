import { expect, test, type Page } from "@playwright/test";
import { createPlatformAdmin, seedCompanyWithTeam, seedSource, type SeededUser } from "./support";

/**
 * Fase 3 · Relatório diário e cruzamento com os dados capturados.
 * O relatório é configurado para abrir à meia-noite, todos os dias: o pendente é sempre o de hoje.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });

const tag = `r${Date.now().toString(36)}`;
const ADMIN = { email: `admin-${tag}@orbion.test`, password: "Admin12345" };
let companyId = "";
let leader: SeededUser;
let seller: SeededUser;

test.describe.configure({ mode: "serial" });

async function login(page: Page, email: string, password: string, home = /\/inicio|\/admin\/empresas/) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(home);
}

test.beforeAll(async ({ request }) => {
  const seed = await seedCompanyWithTeam(tag, 1);
  companyId = seed.companyId;
  leader = seed.leader;
  seller = seed.sellers[0];
  await createPlatformAdmin(ADMIN.email, ADMIN.password);

  // WhatsApp do vendedor com conversas de hoje com 2 clientes.
  const source = await seedSource(companyId, "whatsapp_device", "WhatsApp do vendedor", seller.id);
  const now = new Date().toISOString();
  const res = await request.post(`/api/webhooks/ingest/${source.id}`, {
    headers: { Authorization: `Bearer ${source.key}` },
    data: {
      events: ["5511933330001", "5511933330002"].map((phone, i) => ({
        type: "message",
        data: { external_id: `r-${i}`, direction: "outbound", sent_at: now, contact: { phone, name: `Cliente ${i}` }, body: "Oi" },
      })),
    },
  });
  expect((await res.json()).processed).toBe(2);
});

test("administração configura o relatório e as perguntas", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(`/admin/empresas/${companyId}/relatorio`);

  await field(page, "Horário de abertura").fill("00:00");
  await page.getByLabel("Sáb", { exact: true }).check();
  await page.getByLabel("Dom", { exact: true }).check();
  await page.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(text(page, "Configuração salva.")).toBeVisible();

  const add = async (label: string, kind: string, opts: { metric?: string; stage?: string; options?: string; optional?: boolean } = {}) => {
    await field(page, "Pergunta").fill(label);
    await field(page, "Tipo de resposta").selectOption(kind);
    if (kind === "number" || kind === "currency") {
      await field(page, "Comparar com dado capturado (opcional)").selectOption(opts.metric ?? "");
      if (opts.stage) await field(page, "Etapa").selectOption({ label: opts.stage });
    }
    if (opts.options) await field(page, "Opções (uma por linha)").fill(opts.options);
    const req = page.getByLabel("Resposta obrigatória");
    if (opts.optional) await req.uncheck();
    else await req.check();
    await page.getByRole("button", { name: "Adicionar pergunta" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: label })).toBeVisible();
  };
  await add("Contatos feitos hoje", "number", { metric: "wa_conversations" });
  await add("Propostas enviadas", "number", { metric: "stage_entries", stage: "Proposta" });
  await add("Como foi o dia?", "single_choice", { options: "Bom\nDifícil" });
  await add("Dificuldades", "text", { optional: true });

  await expect(text(page, /Compara com: Conversas no WhatsApp no dia · margem 20% ou 1/)).toBeVisible();
  await expect(text(page, /Compara com: Oportunidades que entraram na etapa "Proposta"/)).toBeVisible();
});

test("vendedor responde e o Head aponta a diferença com o capturado", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, seller.email, seller.password);
  await expect(page.getByTestId("relatorio-card").filter({ visible: true }).getByText(/Seu relatório está pendente/)).toBeVisible();

  await page.getByRole("link", { name: "Responder agora" }).click();
  await field(page, "Contatos feitos hoje").fill("10");
  await field(page, "Propostas enviadas").fill("0");
  await field(page, "Como foi o dia?").selectOption("Bom");
  await page.getByRole("button", { name: "Enviar relatório" }).click();

  await expect(text(page, /O Head encontrou 1 diferença\(s\)/)).toBeVisible();
  await expect(text(page, /Informado: 10 · Capturado: 2/)).toBeVisible();
  await expect(text(page, /Pode haver atividade fora dos canais conectados/)).toBeVisible();

  await field(page, "Explicação").fill("Fiz 8 contatos por ligação");
  await page.getByRole("button", { name: "Enviar explicação" }).click();
  await expect(text(page, "Explicação registrada.")).toBeVisible();
});

test("líder vê quem enviou, lê a explicação e verifica", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, leader.email, leader.password);
  await page.goto("/relatorios");
  await expect(text(page, /1 de 2 enviados/)).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(leader.name) }).getByText("Não enviado")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(seller.name) }).getByText("10")).toBeVisible();

  await expect(text(page, "Explicação: Fiz 8 contatos por ligação")).toBeVisible();
  await expect(text(page, "Explicada")).toBeVisible();
  await page.getByRole("button", { name: "Verificada" }).click();
  await expect(text(page, "Nenhuma divergência em aberto.")).toBeVisible();
});

test("vendedor corrige o relatório", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, seller.email, seller.password);
  await page.goto("/relatorio");
  await expect(page.getByRole("button", { name: "Atualizar relatório" })).toBeVisible();
  await field(page, "Contatos feitos hoje").fill("2");
  await page.getByRole("button", { name: "Atualizar relatório" }).click();
  await expect(text(page, /Relatório atualizado\. Nenhuma diferença encontrada/)).toBeVisible();
});

test("líder não acessa a configuração do relatório", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, leader.email, leader.password);
  await page.goto(`/admin/empresas/${companyId}/relatorio`);
  await expect(page).toHaveURL(/\/inicio/);
});
