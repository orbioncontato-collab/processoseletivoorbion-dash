// Teste de ponta a ponta no navegador (Playwright + Chromium).
// Uso: sirva a pasta out/ e rode: node tests/e2e.mjs http://127.0.0.1:4310 [pasta_de_capturas]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://127.0.0.1:4310";
const SHOTS = process.argv[3];
let total = 0;
const falhas = [];
const check = (nome, cond, det = "") => {
  total++;
  if (!cond) falhas.push(`${nome} ${det}`);
};

const EXEMPLOS = {
  forcas: "141,4214", tensao: "100", deformacao: "0,5", torcao: "63,662", "potencia-torque": "15,708",
  "gases-ideais": "1,2043", rendimento: "30", hidrostatica: "19,62", vazao: "3,927", reynolds: "2.000",
  "perda-de-carga": "0,8155", conducao: "480",
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
const p = await ctx.newPage();
const erros = [];
p.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
p.on("pageerror", (e) => erros.push(String(e)));

// Início
await p.goto(BASE + "/");
check("home 12 cartões", (await p.locator("article").count()) === 12);
await p.fill('input[type="search"]', "reynolds");
check("busca reynolds", (await p.locator("article").count()) === 1);
await p.fill('input[type="search"]', "kw");
check("busca kw", (await p.locator("article").count()) >= 1);
await p.fill('input[type="search"]', "");
await p.click('button:has-text("Fluidos")');
check("filtro fluidos", (await p.locator("article").count()) === 4);
await p.click('button:has-text("Todas")');
await p.click('button[aria-label="Adicionar Vazão em Tubos às favoritas"]');
await p.click('button:has-text("Favoritas")');
check("favoritas", (await p.locator("article").count()) === 1);
await p.click('button:has-text("Todas")');
if (SHOTS) await p.screenshot({ path: `${SHOTS}/home.png`, fullPage: true });

// Exemplos das 12 calculadoras
for (const [slug, esperado] of Object.entries(EXEMPLOS)) {
  await p.goto(`${BASE}/calc/${slug}/`);
  await p.click('button:has-text("Carregar exemplo")');
  await p.click('button[type="submit"]');
  const txt = (await p.locator('[data-test="main"]').innerText()).trim();
  check(`exemplo ${slug}`, txt.startsWith(esperado), `obtido "${txt}"`);
  check(`memória ${slug}`, (await p.locator("ol li").count()) >= 1);
}

// Fluxo de erro, atualização automática e unidades
await p.goto(`${BASE}/calc/tensao/`);
await p.click('button[type="submit"]');
check("campos vazios", (await p.locator("text=Preencha os campos obrigatórios.").count()) === 1);
await p.fill("#f-F", "10");
await p.fill("#f-A", "0");
check("área zero", (await p.locator("#e-A").innerText()).includes("maior que zero"));
await p.fill("#f-A", "1");
await p.selectOption('select[aria-label="Unidade de Área da seção transversal"]', "cm²");
check("auto + unidade cm²", (await p.locator('[data-test="main"]').innerText()).startsWith("100"));
await p.fill("#f-F", "1.500");
check("número ambíguo", (await p.locator("#e-F").innerText()).includes("ambíguo"));
await p.fill("#f-F", "abc");
check("texto", (await p.locator("#e-F").innerText()).includes("Digite apenas números"));

// Troca de modo
await p.goto(`${BASE}/calc/potencia-torque/`);
await p.click('label:has-text("Torque (T)")');
await p.fill("#f-n", "1500");
await p.fill("#f-P", "15,707963267948966");
await p.click('button[type="submit"]');
check("modo inverso", (await p.locator('[data-test="main"]').innerText()).startsWith("100"));

// Grupo opcional
await p.goto(`${BASE}/calc/torcao/`);
await p.click('button:has-text("Carregar exemplo")');
await p.click('input[type="checkbox"]');
check("opcional desligado", (await p.locator("#f-L").count()) === 0 && (await p.locator('[data-test="main"]').innerText()).startsWith("63,662"));

// Preset de fluido
await p.goto(`${BASE}/calc/reynolds/`);
await p.click('button:has-text("Água")');
await p.fill("#f-v", "1");
await p.fill("#f-D", "50");
await p.click('button[type="submit"]');
check("preset água", (await p.locator("text=Turbulento").count()) >= 1);

// Casas decimais
await p.goto(`${BASE}/calc/forcas/`);
await p.click('button:has-text("Carregar exemplo")');
await p.selectOption('select[aria-label="Casas decimais dos resultados"]', "2");
check("2 casas", (await p.locator('[data-test="main"]').innerText()).startsWith("141,42"));
if (SHOTS) await p.screenshot({ path: `${SHOTS}/calc.png`, fullPage: true });
await p.selectOption('select[aria-label="Casas decimais dos resultados"]', "4");

// Histórico
await p.goto(`${BASE}/historico/`);
const nHist = await p.locator("li").count();
check("histórico tem itens", nHist >= 10, `(${nHist})`);
await p.locator("li a").first().click();
await p.waitForSelector('[data-test="main"]');
// O item mais recente é o Reynolds com água, v = 1 m/s e D = 50 mm
check("abrir do histórico", /reynolds\/\?h=/.test(p.url()) && (await p.locator("#f-v").inputValue()) === "1" && (await p.locator("#f-D").inputValue()) === "50");

// Celular
const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(BASE + "/");
const larg = await m.evaluate(() => document.documentElement.scrollWidth);
check("sem rolagem lateral (home)", larg <= 390, `(${larg}px)`);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/mobile-home.png` });
await m.click('button[aria-label="Abrir menu"]');
check("menu móvel", await m.locator('aside >> text=Perda de Carga').last().isVisible());
if (SHOTS) await m.screenshot({ path: `${SHOTS}/mobile-menu.png` });
await m.locator("aside >> text=Gases Ideais").last().click();
await m.waitForURL(/gases-ideais/);
await m.click('button:has-text("Carregar exemplo")');
const larg2 = await m.evaluate(() => document.documentElement.scrollWidth);
check("sem rolagem lateral (calc)", larg2 <= 390, `(${larg2}px)`);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/mobile-calc.png`, fullPage: true });

check("sem erros no console", erros.length === 0, erros.slice(0, 3).join(" | "));
await b.close();
console.log(`Testes no navegador: ${total - falhas.length}/${total} aprovados`);
for (const f of falhas) console.log("  FALHA:", f);
process.exit(falhas.length ? 1 : 0);
