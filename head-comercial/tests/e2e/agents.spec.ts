import { expect, test, type Page } from "@playwright/test";
import { adminClient, seedCompanyWithTeam, seedOpportunity, seedSource, type SeededUser } from "./support";

/**
 * Fase 6 · Agentes: Head Comercial no chat e Analista de Conversas.
 * A API da Anthropic é imitada por tests/e2e/mock-anthropic.mjs.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });
const MOCK = process.env.E2E_MOCK_ANTHROPIC_URL ?? "http://127.0.0.1:54398";

const tag = `g${Date.now().toString(36)}`;
let companyId: string;
let leader: SeededUser;
let sara: SeededUser;
let tiago: SeededUser;
let saraThreadUrl: string;
let conversationId: string;

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_AI, "Servidor falso da Anthropic não configurado neste ambiente.");

async function login(page: Page, u: SeededUser) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(u.email);
  await field(page, "Senha").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

async function ask(page: Page, question: string) {
  await page.getByLabel("Sua pergunta").filter({ visible: true }).fill(question);
  await page.getByRole("button", { name: "Enviar pergunta" }).filter({ visible: true }).click();
}

const answers = (page: Page) => page.getByRole("list", { name: "Mensagens" }).filter({ visible: true });

test.beforeAll(async ({ request }) => {
  const seed = await seedCompanyWithTeam(tag, 2);
  companyId = seed.companyId;
  leader = seed.leader;
  [sara, tiago] = seed.sellers;
  await seedOpportunity(companyId, sara.id, { title: "Proposta Sara", contact: "Cliente Sara" });
  await seedOpportunity(companyId, tiago.id, { title: "Proposta Tiago", contact: "Cliente Tiago" });

  const db = adminClient();
  const { data: doc } = await db
    .from("knowledge_documents")
    .insert({ scope: "company", company_id: companyId, title: `Playbook de objeções ${tag}`, kind: "objection", chunk_count: 1 })
    .select("id")
    .single();
  await db.from("knowledge_chunks").insert({
    document_id: doc!.id,
    position: 0,
    content: "Quando o cliente disser que está caro, mostre o retorno do investimento antes de falar em desconto.",
  });
  await db.from("calibration_cases").insert({
    scope: "company",
    company_id: companyId,
    title: `Caso de preço ${tag}`,
    outcome: "lost",
    conversation: "Cliente: quanto custa?\nVendedor: R$ 5 mil.",
    expected_assessment: "Passou o preço sem diagnóstico.",
  });

  const source = await seedSource(companyId, "whatsapp_device", "WhatsApp da Sara", sara.id);
  const now = Date.now();
  const events = [
    { id: "ag-1", direction: "inbound", minutes: 30, body: "Oi, quanto custa o plano?" },
    { id: "ag-2", direction: "outbound", minutes: 28, body: "Olá! Custa R$ 5 mil." },
    { id: "ag-3", direction: "inbound", minutes: 20, body: "Achei caro." },
  ].map((m) => ({
    type: "message",
    data: {
      external_id: m.id,
      direction: m.direction,
      sent_at: new Date(now - m.minutes * 60_000).toISOString(),
      contact: { phone: "5511966660001", name: "Paula Preço" },
      body: m.body,
    },
  }));
  const res = await request.post(`/api/webhooks/ingest/${source.id}`, {
    headers: { Authorization: `Bearer ${source.key}` },
    data: { events },
  });
  expect((await res.json()).processed).toBe(3);
  const { data: conv } = await db.from("conversations").select("id").eq("company_id", companyId).single();
  conversationId = conv!.id;
});

test("vendedora pergunta o que fazer e o Head responde só com as negociações dela", async ({ page }) => {
  await login(page, sara);
  await page.locator('a[href="/assistente"]').filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/assistente$/);
  await ask(page, "O que devo fazer primeiro hoje?");
  await expect(page).toHaveURL(/\/assistente\/[0-9a-f-]{36}$/);
  saraThreadUrl = new URL(page.url()).pathname;
  await expect(answers(page).getByText("Proposta Sara")).toBeVisible();
  await expect(answers(page).getByText("Proposta Tiago")).toHaveCount(0);
  await expect(answers(page).getByText(/Consultou: oportunidades/)).toBeVisible();
  // A prévia some quando a conversa gravada aparece: a resposta não fica duplicada.
  await expect(page.getByLabel("Resposta em andamento")).toHaveCount(0);
  await expect(page.getByText("Proposta Sara").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Conversas com o Head" }).getByText("O que devo fazer primeiro hoje?")).toBeVisible();
});

test("a conversa continua com o histórico completo, incluindo as consultas feitas", async ({ page }) => {
  await login(page, sara);
  await page.goto(saraThreadUrl);
  await ask(page, "E depois disso?");
  await expect(answers(page).getByText("Nesta conversa já fiz 1 consulta(s) ao sistema.")).toBeVisible();
});

test("orientação de venda vem do conhecimento da empresa, com o documento citado", async ({ page }) => {
  await login(page, sara);
  await page.goto("/assistente");
  await ask(page, "O cliente achou caro, como respondo?");
  await expect(answers(page).getByText(`Segundo o documento Playbook de objeções ${tag}`)).toBeVisible();
  await expect(answers(page).getByText(/Consultou: conhecimento/)).toBeVisible();
});

test("a rota do chat exige login e valida a pergunta", async ({ request, page }) => {
  const anon = await request.post("/api/assistente", { data: { message: "oi" }, maxRedirects: 0 });
  expect(anon.status()).toBe(307);
  await login(page, sara);
  const empty = await page.request.post("/api/assistente", { data: { message: "   " } });
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error).toBe("Escreva sua pergunta.");
  const other = await page.request.post("/api/assistente", { data: { threadId: "00000000-0000-4000-8000-000000000000", message: "oi" } });
  expect(await other.text()).toContain("Conversa não encontrada.");
});

test("pedido recusado mostra uma mensagem clara", async ({ page }) => {
  await login(page, sara);
  await page.goto("/assistente");
  await ask(page, "Isto é uma recusa de teste");
  await expect(answers(page).getByText("Não consigo ajudar com esse pedido. Tente perguntar de outro jeito.")).toBeVisible();
});

test("o chat é pessoal: o colega não abre a conversa da vendedora", async ({ page }) => {
  await login(page, tiago);
  await page.goto("/assistente");
  await expect(text(page, "O que devo fazer primeiro hoje?")).toHaveCount(0);
  await page.goto(saraThreadUrl);
  await expect(text(page, "Não encontramos esta página")).toBeVisible();
});

test("líder pede a análise da conversa e vê nota, critérios e próximo passo", async ({ page }) => {
  await login(page, leader);
  await page.goto(`/conversas/${conversationId}`);
  await page.getByRole("button", { name: "Analisar com IA" }).click();
  await expect(text(page, "Análise pronta.")).toBeVisible();
  const analysis = page.getByRole("article", { name: "Análise da conversa" }).filter({ visible: true });
  await expect(analysis.getByText("Nota 6/10")).toBeVisible();
  await expect(analysis.getByText(`Referência usada: Caso de preço ${tag}.`, { exact: false })).toBeVisible();
  await expect(analysis.getByText("Diagnóstico da necessidade: 4/10")).toBeVisible();
  await expect(analysis.getByText("Ligar para entender a necessidade e reapresentar a proposta")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analisar de novo" })).toBeVisible();
});

test("a vendedora vê a análise da própria conversa", async ({ page }) => {
  await login(page, sara);
  await page.goto(`/conversas/${conversationId}`);
  await expect(page.getByRole("article", { name: "Análise da conversa" }).getByText("Nota 6/10")).toBeVisible();
});

test("líder vê o uso da IA do mês nas configurações; vendedor não", async ({ page }) => {
  await login(page, leader);
  await page.goto("/configuracoes");
  await expect(text(page, "Uso da IA neste mês")).toBeVisible();
  await expect(text(page, /Análise de conversas 1/)).toBeVisible();
  await expect(text(page, /Chat \d+/)).toBeVisible();
});

test("o que vai para a API: instruções fixas, contexto da pessoa, ferramentas e reserva por recusa", async ({ request }) => {
  const sent = (await (await request.get(`${MOCK}/__requests`)).json()) as { beta: string; body: Record<string, unknown> }[];
  const chat = sent.filter((r) => Array.isArray(r.body.tools));
  expect(chat.length).toBeGreaterThan(0);
  const last = chat.at(-1)!;
  expect(last.beta).toContain("server-side-fallback-2026-07-01");
  expect(last.body.fallbacks).toBe("default");
  expect(last.body.model).toBe("claude-opus-5-5");
  expect(last.body.thinking).toBeUndefined();
  const system = last.body.system as { text: string; cache_control?: unknown }[];
  expect(system[0].cache_control).toBeTruthy();
  expect(system[1].text).toContain(`Empresa: Comercial ${tag}`);
  expect((last.body.tools as unknown[]).length).toBe(10);

  const analysis = sent.filter((r) => (r.body.output_config as { format?: unknown })?.format).at(-1)!;
  expect(JSON.stringify(analysis.body.messages)).toContain("Achei caro.");
});

test("resumo do dia: líder liga, o agendador entrega e o líder conversa a partir dele", async ({ page, request }) => {
  const cron = process.env.CRON_SECRET ?? "";
  test.skip(!cron, "CRON_SECRET não configurado.");

  await login(page, leader);
  await page.goto("/configuracoes");
  await page.getByLabel("Receber o resumo do dia no chat do Head").check();
  await field(page, "Horário").selectOption("7");
  await page.getByRole("button", { name: "Salvar resumo do dia" }).click();
  await expect(text(page, "Resumo do dia ligado, todo dia a partir das 7h.")).toBeVisible();

  const url = `/api/cron/daily-summary?force=1&company=${companyId}`;
  expect((await request.get(url)).status()).toBe(401);
  const res = await request.get(url, { headers: { Authorization: `Bearer ${cron}` } });
  const body = await res.json();
  expect(body.results).toEqual([{ companyId, delivered: 1, status: "ok" }]);

  // Sem forçar, não repete no mesmo dia.
  const again = await request.get(`/api/cron/daily-summary?company=${companyId}`, { headers: { Authorization: `Bearer ${cron}` } });
  expect((await again.json()).results).toEqual([]);

  await page.goto("/inicio");
  const card = page.getByTestId("resumo-do-dia").filter({ visible: true });
  await expect(card.getByText(`Bom dia! Resumo de Comercial ${tag}`, { exact: false })).toBeVisible();
  await card.getByRole("link", { name: "Abrir e conversar sobre o resumo" }).click();
  await expect(page).toHaveURL(/\/assistente\/[0-9a-f-]{36}$/);
  await ask(page, "E depois disso?");
  await expect(answers(page).getByText("Nesta conversa já fiz 0 consulta(s) ao sistema.")).toBeVisible();
});

test("vendedor não recebe o resumo do dia", async ({ page }) => {
  await login(page, sara);
  await expect(page.getByTestId("resumo-do-dia")).toHaveCount(0);
});
