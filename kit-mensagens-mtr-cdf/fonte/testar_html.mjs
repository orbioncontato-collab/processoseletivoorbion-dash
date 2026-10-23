// Testes da versão digital: botões de copiar, busca, links do sumário,
// impressão sem controles e layout de celular sem rolagem horizontal.
//
// Uso: node testar_html.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = playwright;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const arquivo = path.resolve(aqui, '..', 'Kit_30_Mensagens_Prontas_MTR_CDF.html');

// servidor local (localhost é contexto seguro, como um arquivo aberto no navegador)
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(fs.readFileSync(arquivo)); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${srv.address().port}/`;

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALHA') + ' ' + msg); if (!cond) falhas++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url.slice(0, -1) });
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto(url);
await page.evaluate(() => document.fonts.ready);

const dados = await page.evaluate(() => JSON.parse(document.getElementById('kit-data').textContent));
const ids = Object.keys(dados);
ok(ids.length === 30, `30 mensagens nos dados (${ids.length})`);

// 1. botões de copiar mensagem
let copiasOk = 0;
for (const id of ids) {
  const btn = page.locator(`button[data-copy="${id}"][data-kind="texto"]`);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(60);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const rotulo = await btn.locator('span').textContent();
  const igual = clip === dados[id].texto;
  const temQuebras = clip.includes('\n\n');
  const semTitulo = !clip.includes('Quando utilizar') && !clip.includes('Mensagem pronta') && !clip.includes(dados[id].titulo);
  if (igual && temQuebras && semTitulo && rotulo === 'Mensagem copiada') copiasOk++;
  else console.log('   problema em', id, { igual, temQuebras, semTitulo, rotulo });
}
ok(copiasOk === 30, `30 botões "Copiar mensagem" copiam o texto limpo com parágrafos (${copiasOk}/30)`);

// texto copiado bate com o texto visível do card (mesmo conteúdo, sem marcadores)
const visivelOk = await page.evaluate((d) => Object.keys(d).every((id) => {
  const vis = document.getElementById(id + '-texto').innerText.replace(/\s+/g, ' ').trim();
  const cop = d[id].texto.replace(/• /g, '').replace(/\s+/g, ' ').trim();
  return vis === cop;
}), dados);
ok(visivelOk, 'texto copiado corresponde ao texto exibido em cada card');

// 2. botões de copiar assunto
let assuntosOk = 0;
for (const id of ids) {
  const btn = page.locator(`button[data-copy="${id}"][data-kind="assunto"]`);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(40);
  if ((await page.evaluate(() => navigator.clipboard.readText())) === dados[id].assunto) assuntosOk++;
}
ok(assuntosOk === 30, `30 botões "Copiar assunto" funcionam (${assuntosOk}/30)`);
ok(await page.locator('#toast').evaluate((e) => e.textContent.length > 0), 'aviso "copiado" exibido');

// 3. alternativa quando a área de transferência é bloqueada
await page.evaluate(() => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('bloqueado')) }, configurable: true });
  document.execCommand = () => false;
});
await page.locator('button[data-copy="msg-16"][data-kind="texto"]').click();
await page.waitForTimeout(100);
const modal = await page.evaluate(() => ({ aberto: !document.getElementById('modal').hidden, txt: document.getElementById('modal-txt').value }));
ok(modal.aberto && modal.txt === dados['msg-16'].texto, 'cópia bloqueada abre janela com o texto selecionado para copiar manualmente');
await page.locator('#modal-close').click();

// 4. busca local
const termos = { MTR: 1, CDF: 16, transporte: 6, recebimento: 8, 'pendência': 11, peso: 21, documento: 1, destinador: 3 };
for (const [t] of Object.entries(termos)) {
  await page.fill('#busca', t);
  await page.waitForTimeout(40);
  const n = await page.locator('#resultados .res').count();
  ok(n > 0, `busca "${t}" encontra ${n} mensagem(ns)`);
}
await page.fill('#busca', 'peso');
const primeiro = await page.locator('#resultados .res').first().getAttribute('href');
ok(primeiro === '#msg-21', `busca "peso" mostra primeiro a Mensagem 21 (${primeiro})`);
await page.fill('#busca', 'cdf nao localizado');
ok((await page.locator('#resultados .res').first().getAttribute('href')) === '#msg-19', 'busca sem acento "cdf nao localizado" acha a Mensagem 19');
await page.fill('#busca', 'xyzabc');
ok((await page.locator('#resultados .res-empty').count()) === 1, 'busca sem resultado mostra aviso');
await page.fill('#busca', 'recusada');
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
const topo25 = await page.locator('#msg-25').evaluate((e) => e.getBoundingClientRect().top);
ok(topo25 >= 0 && topo25 < 200, `Enter na busca rola até a mensagem encontrada (${Math.round(topo25)}px)`);

// 5. links internos
const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')));
const quebrados = await page.evaluate((ls) => ls.filter((h) => !document.getElementById(h.slice(1))), links);
ok(quebrados.length === 0, `${links.length} links internos apontam para destinos existentes`);
const sumario = await page.evaluate(() => [...document.querySelectorAll('#sumario .toc li a')].map((a) => a.getAttribute('href')));
ok(sumario.length === 30 && sumario.every((h, i) => h === `#msg-${String(i + 1).padStart(2, '0')}`), 'sumário lista as 30 mensagens em ordem, com links corretos');
await page.locator('#sumario .toc a[href="#msg-17"]').click();
await page.waitForTimeout(2500);
const topo17 = await page.locator('#msg-17').evaluate((e) => e.getBoundingClientRect().top);
ok(topo17 >= 0 && topo17 < 200, `clique no sumário leva à Mensagem 17 (${Math.round(topo17)}px)`);
// páginas indicadas no sumário batem com a página real de cada mensagem
const pags = await page.evaluate(() => [...document.querySelectorAll('#sumario .toc li a')].every((a) => {
  const alvo = document.querySelector(a.getAttribute('href'));
  return alvo.closest('.page').dataset.page === String(parseInt(a.querySelector('.li-p').textContent, 10));
}));
ok(pags, 'números de página do sumário conferem com a posição real das mensagens');

// 6. impressão: controles escondidos
await page.emulateMedia({ media: 'print' });
const visiveis = await page.evaluate(() => [...document.querySelectorAll('.toolbar, .btn-copy, .btn-mini, .to-top, #busca, #btn-print')]
  .filter((e) => getComputedStyle(e).display !== 'none' && e.offsetParent !== null).length);
ok(visiveis === 0, 'na impressão, busca e botões ficam ocultos');
await page.emulateMedia({ media: 'screen' });

// 7. celular
const cel = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await cel.goto(url);
await cel.evaluate(() => document.fonts.ready);
const larg = await cel.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
ok(larg.sw <= larg.cw, `celular sem rolagem horizontal (${larg.sw} <= ${larg.cw})`);
const tab = await browser.newPage({ viewport: { width: 820, height: 1180 } });
await tab.goto(url);
const lt = await tab.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
ok(lt.sw <= lt.cw, `tablet sem rolagem horizontal (${lt.sw} <= ${lt.cw})`);

ok(erros.length === 0, `nenhum erro de JavaScript ${erros.join(' | ')}`);

if (process.argv[2]) {
  const out = process.argv[2];
  await cel.evaluate(() => window.scrollTo(0, 0));
  await cel.screenshot({ path: path.join(out, 'celular-capa.png') });
  await cel.locator('#msg-16').scrollIntoViewIfNeeded();
  await cel.evaluate(() => window.scrollBy(0, -120));
  await cel.screenshot({ path: path.join(out, 'celular-msg.png') });
  await page.goto(url + '#msg-16');
  await page.waitForTimeout(500);
  await page.fill('#busca', 'cdf');
  await page.screenshot({ path: path.join(out, 'desktop-busca.png') });
}
await browser.close();
srv.close();
console.log(falhas ? `\n${falhas} teste(s) com falha.` : '\nTodos os testes passaram.');
process.exitCode = falhas ? 1 : 0;
