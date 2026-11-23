import { expect, test, type Page } from "@playwright/test";
import { todayRange } from "../../src/modules/commercial/filters";
import { seedCompanyWithTeam, seedSource, type SeededUser } from "./support";

/**
 * Fase 2 · Conversas: mensagens capturadas do WhatsApp de um vendedor.
 */

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });

const tag = `w${Date.now().toString(36)}`;
let leader: SeededUser;
let seller: SeededUser;
let other: SeededUser;
let source: { id: string; key: string };
let sellerPage: Page;

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
  [seller, other] = seed.sellers;
  source = await seedSource(seed.companyId, "whatsapp_device", "WhatsApp da Sara", seller.id);
  sellerPage = await (await browser.newContext()).newPage();
  await login(sellerPage, seller);
});

test("mensagens chegam: cliente novo criado, grupo e repetida ignorados", async ({ request }) => {
  // Horários dentro do dia de hoje no fuso da empresa, mesmo logo após a meia-noite.
  const now = Date.now();
  const sinceMidnight = now - Date.parse(todayRange("America/Sao_Paulo").start);
  const span = Math.max(4 * 60_000, Math.min(20 * 60_000, sinceMidnight - 60_000));
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const msg = (id: string, direction: string, msAgo: number, body: string, phone = "5511966667777") => ({
    type: "message",
    data: { external_id: id, direction, sent_at: iso(msAgo), contact: { phone, name: "Paula Zap" }, body },
  });

  const res = await request.post(`/api/webhooks/ingest/${source.id}`, {
    headers: { Authorization: `Bearer ${source.key}` },
    data: {
      events: [
        msg("w1", "inbound", span, "Oi, quero saber do plano"),
        msg("w2", "outbound", span / 2, "Olá Paula! Te explico agora."),
        msg("w3", "inbound", span / 4, "Pode mandar o valor?"),
        msg("g1", "inbound", span / 4, "mensagem do grupo", "120363012345678901@g.us"),
        msg("w1", "inbound", span, "Oi, quero saber do plano"),
      ],
    },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ received: 5, processed: 3, ignored: 2, failed: 0 });
});

test("vendedora vê os números do dia e a conversa esperando resposta", async () => {
  await sellerPage.goto("/inicio");
  const card = sellerPage.getByTestId("whatsapp-hoje").filter({ visible: true });
  await expect(card.getByText("Conversas", { exact: true })).toBeVisible();
  await expect(card.locator("dd").nth(0)).toHaveText("1");
  await expect(card.locator("dd").nth(1)).toHaveText("1");
  await expect(card.locator("dd").nth(2)).not.toHaveText("-");
  await expect(card.locator("dd").nth(3)).toHaveText("1");

  await sellerPage.goto("/conversas");
  const item = sellerPage.getByRole("link", { name: /Paula Zap/ });
  await expect(item).toBeVisible();
  await expect(item.getByText("Esperando resposta")).toBeVisible();
  await expect(item.getByText("Pode mandar o valor?")).toBeVisible();
});

test("conversa mostra as mensagens e pode ser ligada a uma oportunidade", async () => {
  await sellerPage.goto("/conversas");
  await sellerPage.getByRole("link", { name: /Paula Zap/ }).click();
  await expect(text(sellerPage, "Oi, quero saber do plano")).toBeVisible();
  await expect(text(sellerPage, "Olá Paula! Te explico agora.")).toBeVisible();
  await expect(text(sellerPage, /2 recebida\(s\), 1 enviada\(s\)/)).toBeVisible();
  const conversationUrl = sellerPage.url();

  await sellerPage.getByRole("link", { name: "Criar oportunidade com este contato" }).click();
  await field(sellerPage, "Título da oportunidade").fill("Plano da Paula");
  await sellerPage.getByRole("button", { name: "Criar oportunidade" }).click();
  await expect(sellerPage.getByRole("heading", { name: "Plano da Paula" })).toBeVisible();

  await sellerPage.goto(conversationUrl);
  await field(sellerPage, "Oportunidade desta conversa").selectOption({ label: "Plano da Paula" });
  await sellerPage.getByRole("button", { name: "Salvar vínculo" }).click();
  await expect(text(sellerPage, "Conversa ligada à oportunidade.")).toBeVisible();
});

test("líder vê os números da vendedora; outro vendedor não vê a conversa", async ({ browser }) => {
  const leaderPage = await (await browser.newContext()).newPage();
  await login(leaderPage, leader);
  await expect(leaderPage.getByRole("row", { name: new RegExp(seller.name) })).toBeVisible();

  const otherPage = await (await browser.newContext()).newPage();
  await login(otherPage, other);
  await otherPage.goto("/conversas");
  await expect(otherPage.getByRole("link", { name: /Paula Zap/ })).toHaveCount(0);
});
