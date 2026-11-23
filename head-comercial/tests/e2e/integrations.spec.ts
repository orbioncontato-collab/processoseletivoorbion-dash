import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { seedCompanyWithTeam, type SeededUser } from "./support";

/**
 * Fase 2 · Camada de integrações: um CRM qualquer enviando dados pelo formato padrão.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });

const tag = `i${Date.now().toString(36)}`;
let leader: SeededUser;
let seller: SeededUser;
let leaderPage: Page;
let sourceId = "";
let key = "";

test.describe.configure({ mode: "serial" });

async function login(page: Page, u: SeededUser) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(u.email);
  await field(page, "Senha").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

function send(request: APIRequestContext, body: unknown, withKey = key) {
  return request.post(`/api/webhooks/ingest/${sourceId}`, {
    headers: { Authorization: `Bearer ${withKey}` },
    data: body,
  });
}

test.beforeAll(async ({ browser }) => {
  const seed = await seedCompanyWithTeam(tag, 1);
  leader = seed.leader;
  seller = seed.sellers[0];
  leaderPage = await (await browser.newContext()).newPage();
  await login(leaderPage, leader);
});

test("líder cria a conexão do CRM e recebe a chave uma única vez", async () => {
  await leaderPage.goto("/integracoes");
  await field(leaderPage, "Nome da conexão").fill("CRM de teste");
  await field(leaderPage, "Sistema").selectOption("pipedrive");
  await leaderPage.getByRole("button", { name: "Criar conexão", exact: true }).click();
  const keyBox = leaderPage.getByTestId("source-key").filter({ visible: true });
  await expect(keyBox).toBeVisible();
  key = (await keyBox.textContent())!.trim();
  expect(key).toMatch(/^hc_/);
  const href = await leaderPage.getByRole("link", { name: /Abrir a conexão/ }).getAttribute("href");
  sourceId = href!.split("/").pop()!;
});

test("CRM envia contato e oportunidades; etapa desconhecida falha com explicação", async ({ request }) => {
  const res = await send(request, {
    events: [
      { type: "contact.upsert", data: { external_id: "c-1", name: "Joana CRM", phone: "11 97777-1111", owner_email: seller.email } },
      {
        type: "opportunity.upsert",
        idempotency_key: "entrega-1",
        data: {
          external_id: "o-1",
          title: "Plano anual Joana",
          contact_external_id: "c-1",
          value: 24000,
          stage: "Proposta",
          next_step: "Ligar para fechar",
          next_step_at: "2030-01-10T13:00:00Z",
          owner_email: seller.email,
        },
      },
      {
        type: "opportunity.upsert",
        data: { external_id: "o-2", title: "Projeto Beta", contact: { external_id: "c-2", name: "Beto CRM" }, stage: "Proposta enviada" },
      },
    ],
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ received: 3, processed: 2, failed: 1 });
  expect(body.results[2].error).toContain('Etapa "Proposta enviada" não está mapeada');
});

test("chave errada é recusada e entrega repetida é ignorada", async ({ request }) => {
  const wrong = await send(request, { type: "contact.upsert", data: { external_id: "x", name: "X" } }, "hc_errada");
  expect(wrong.status()).toBe(401);

  const again = await send(request, {
    type: "opportunity.upsert",
    idempotency_key: "entrega-1",
    data: { external_id: "o-1", title: "Plano anual Joana", contact_external_id: "c-1" },
  });
  expect((await again.json()).duplicates).toBe(1);
});

test("líder mapeia a etapa desconhecida e reprocessa a falha", async () => {
  await leaderPage.goto(`/integracoes/${sourceId}`);
  await expect(text(leaderPage, /ainda sem correspondência no Head/)).toBeVisible();
  const externalInput = leaderPage.getByLabel("Etapa de origem 1").filter({ visible: true });
  await expect(externalInput).toHaveValue("Proposta enviada");
  await leaderPage.getByLabel("Etapa do Head 1").filter({ visible: true }).selectOption({ label: "Proposta" });
  await leaderPage.getByRole("button", { name: "Salvar mapeamento" }).click();
  await expect(text(leaderPage, "Mapeamento salvo (1 etapa(s)).")).toBeVisible();

  await leaderPage.getByRole("button", { name: /Reprocessar 1 com falha/ }).click();
  await expect(text(leaderPage, "1 de 1 evento(s) processado(s) com sucesso.")).toBeVisible();
});

test("oportunidades da integração aparecem com autor Integração", async () => {
  await leaderPage.goto("/oportunidades");
  await expect(leaderPage.getByRole("link", { name: "Plano anual Joana" })).toBeVisible();
  await expect(leaderPage.getByRole("link", { name: "Projeto Beta" })).toBeVisible();
  await expect(leaderPage.getByRole("row", { name: /Plano anual Joana/ }).getByText(seller.name)).toBeVisible();

  await leaderPage.getByRole("link", { name: "Plano anual Joana" }).click();
  await expect(text(leaderPage, /Oportunidade criada: Plano anual Joana \(Proposta\)/)).toBeVisible();
  await expect(text(leaderPage, "por Integração").first()).toBeVisible();
  await expect(text(leaderPage, "Ligar para fechar").first()).toBeVisible();
});

test("CRM marca como perdida sem mandar próximo passo: motivo traduzido e nada apagado indevidamente", async ({ request }) => {
  const res = await send(request, {
    type: "opportunity.upsert",
    data: { external_id: "o-1", title: "Plano anual Joana", contact_external_id: "c-1", status: "lost", lost_reason: "Cliente achou caro" },
  });
  expect((await res.json()).processed).toBe(1);

  await leaderPage.reload();
  await expect(text(leaderPage, "Negociação perdida")).toBeVisible();
  await expect(text(leaderPage, /Motivo: Preço · Cliente achou caro/)).toBeVisible();
  // O valor enviado na criação continua (a atualização não mandou valor).
  await expect(text(leaderPage, /R\$\s24\.000,00/).first()).toBeVisible();
});

test("importação por planilha cria contatos e oportunidades", async () => {
  await leaderPage.goto("/integracoes");
  const csv =
    "nome;telefone;titulo;valor;etapa;proximo_passo;data_proximo_passo\n" +
    "Carla Planilha;(21) 98888-2222;Mentoria Carla;5.000,00;Diagnóstico;Agendar reunião;10/01/2030 09:30\n" +
    "Davi Planilha;(21) 98888-3333;;;;;\n";
  await field(leaderPage, "Arquivo CSV").setInputFiles({ name: "importar.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await leaderPage.getByRole("button", { name: "Importar planilha" }).click();
  await expect(text(leaderPage, "2 linha(s) importada(s).")).toBeVisible();

  await leaderPage.goto("/oportunidades?q=Mentoria");
  await expect(leaderPage.getByRole("link", { name: "Mentoria Carla" })).toBeVisible();
  await leaderPage.goto("/contatos?q=Davi");
  await expect(leaderPage.getByRole("link", { name: "Davi Planilha" })).toBeVisible();
});

test("vendedor não acessa integrações", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, seller);
  await page.goto("/integracoes");
  await expect(page).toHaveURL(/\/inicio/);
});
