import { expect, test, type Page } from "@playwright/test";
import { seedCompanyWithTeam, type SeededUser } from "./support";

/**
 * Fase 2 · WhatsApp por QR Code, com o servidor falso da Evolution (tests/e2e/mock-evolution.mjs).
 */

const MOCK = `http://127.0.0.1:${process.env.MOCK_EVOLUTION_PORT ?? 54399}`;
const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const text = (page: Page, t: string | RegExp) => page.getByText(t).filter({ visible: true });

const tag = `z${Date.now().toString(36)}`;
let leader: SeededUser;
let seller: SeededUser;
let leaderPage: Page;
let sourceId = "";
let webhookUrl = "";

test.describe.configure({ mode: "serial" });

async function login(page: Page, u: SeededUser) {
  await page.goto("/entrar");
  await field(page, "E-mail").fill(u.email);
  await field(page, "Senha").fill(u.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test.skip(!process.env.EVOLUTION_API_URL, "Servidor falso da Evolution não configurado neste ambiente.");

test.beforeAll(async ({ browser }) => {
  const seed = await seedCompanyWithTeam(tag, 1);
  leader = seed.leader;
  seller = seed.sellers[0];
  leaderPage = await (await browser.newContext()).newPage();
  await login(leaderPage, leader);
});

test("líder precisa aceitar o aviso de risco para criar a conexão", async () => {
  await leaderPage.goto("/integracoes");
  await field(leaderPage, "WhatsApp de quem").selectOption({ label: seller.name });
  await leaderPage.getByRole("button", { name: "Criar conexão do WhatsApp" }).click();
  await expect(text(leaderPage, /É preciso confirmar que entende o risco/)).toBeVisible();
});

test("líder cria a conexão e o QR Code aparece", async () => {
  await field(leaderPage, "WhatsApp de quem").selectOption({ label: seller.name });
  await leaderPage.getByLabel(/Entendo o risco/).check();
  await leaderPage.getByRole("button", { name: "Criar conexão do WhatsApp" }).click();
  await expect(leaderPage).toHaveURL(/\/integracoes\/[0-9a-f-]{36}$/);
  sourceId = leaderPage.url().split("/").pop()!;
  await expect(leaderPage.getByRole("heading", { name: `WhatsApp de ${seller.name}` })).toBeVisible();

  await leaderPage.getByRole("button", { name: "Mostrar QR Code" }).click();
  await expect(leaderPage.getByRole("img", { name: "QR Code para conectar o WhatsApp" })).toBeVisible();

  const instances = (await (await fetch(`${MOCK}/__instances`)).json()) as { name: string; webhookUrl: string }[];
  webhookUrl = instances.find((i) => i.name === `hc-${sourceId}`)!.webhookUrl;
  expect(webhookUrl).toContain(`/api/webhooks/whatsapp/${sourceId}/hc_`);
});

test("endereço com chave errada é recusado", async ({ request }) => {
  const res = await request.post(`/api/webhooks/whatsapp/${sourceId}/hc_errada`, { data: { event: "connection.update", data: { state: "open" } } });
  expect(res.status()).toBe(401);
});

test("celular conecta e as mensagens chegam no Head", async ({ request }) => {
  await fetch(`${MOCK}/__state/hc-${sourceId}`, { method: "POST", body: JSON.stringify({ state: "open" }) });
  const path = new URL(webhookUrl).pathname;
  const conn = await request.post(path, { data: { event: "connection.update", instance: `hc-${sourceId}`, data: { state: "open" } } });
  expect((await conn.json()).connection).toBe("open");

  const now = Math.floor(Date.now() / 1000);
  const res = await request.post(path, {
    data: {
      event: "messages.upsert",
      instance: `hc-${sourceId}`,
      data: [
        { key: { remoteJid: "5511944443333@s.whatsapp.net", fromMe: false, id: "EV1" }, pushName: "Rita Zap", message: { conversation: "Boa tarde! Vi o anúncio." }, messageTimestamp: now - 120 },
        { key: { remoteJid: "5511944443333@s.whatsapp.net", fromMe: true, id: "EV2" }, pushName: seller.name, message: { extendedTextMessage: { text: "Oi Rita! Posso te ajudar?" } }, messageTimestamp: now - 60 },
        { key: { remoteJid: "120363000000000001@g.us", fromMe: false, id: "EV3" }, message: { conversation: "grupo" }, messageTimestamp: now },
      ],
    },
  });
  expect(await res.json()).toMatchObject({ processed: 2, skipped: 1 });

  await leaderPage.reload();
  await expect(text(leaderPage, /WhatsApp conectado/)).toBeVisible();
});

test("vendedor vê o próprio WhatsApp conectado e a conversa capturada", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await login(page, seller);
  await page.goto("/meu-whatsapp");
  await expect(text(page, "Ativa")).toBeVisible();
  await expect(text(page, /Última mensagem capturada/)).toBeVisible();

  await page.goto("/conversas");
  const item = page.getByRole("link", { name: /Rita Zap/ });
  await expect(item).toBeVisible();
  await item.click();
  await expect(text(page, "Boa tarde! Vi o anúncio.")).toBeVisible();
  await expect(text(page, "Oi Rita! Posso te ajudar?")).toBeVisible();
});

test("desconectar avisa e muda a situação", async () => {
  await leaderPage.goto(`/integracoes/${sourceId}`);
  await leaderPage.getByRole("button", { name: "Desconectar" }).click();
  await expect(text(leaderPage, /WhatsApp desconectado/)).toBeVisible();
});
