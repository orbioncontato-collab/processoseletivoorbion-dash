// Gera os PDFs do Kit Pré-MTR a partir do HTML, com Playwright + Chromium.
//
// 1. Kit_Pre_MTR_15_Formularios.pdf        kit completo, formulários em branco
// 2. Kit_Pre_MTR_Formularios_Impressao.pdf somente os 15 formulários em branco
// 3. formularios_individuais/F01..F15.pdf  um arquivo por formulário (e um .zip)
//
// O índice impresso recebe os números de página reais: a primeira passada
// mede onde cada formulário começa, grava paginas.json, o HTML é refeito e
// o PDF é gerado de novo.
//
// Uso: node gerar_pdfs.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = playwright;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const html = path.join(raiz, 'Kit_Pre_MTR_15_Formularios.html');
const pdfKit = path.join(raiz, 'Kit_Pre_MTR_15_Formularios.pdf');
const pdfForms = path.join(raiz, 'Kit_Pre_MTR_Formularios_Impressao.pdf');
const pastaInd = path.join(raiz, 'formularios_individuais');

const opcoesPdf = { printBackground: true, preferCSSPageSize: true, outline: true, tagged: true };

function textoPaginas(arquivo) {
  // pdftotext (poppler) separa as páginas com \f
  return execFileSync('pdftotext', ['-layout', arquivo, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\f');
}
function paginas(arquivo) {
  const info = execFileSync('pdfinfo', [arquivo], { encoding: 'utf8' });
  return parseInt(info.match(/Pages:\s+(\d+)/)[1], 10);
}

const browser = await chromium.launch({ args: ['--lang=pt-BR'] });
async function abrir() {
  const ctx = await browser.newContext({ locale: 'pt-BR', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  page._erros = erros;
  return { ctx, page };
}

// Conferência de impressão: nenhum elemento pode ultrapassar a largura útil
async function conferir(page, rotulo) {
  const vp = page.viewportSize();
  await page.setViewportSize({ width: Math.round(186 * 96 / 25.4), height: 1000 });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(() => {
    const out = [];
    const largura = 186 * 96 / 25.4; // A4 menos margens laterais de 12 mm
    document.querySelectorAll('.form').forEach((f) => {
      if (getComputedStyle(f).display === 'none') return;
      const fr = f.getBoundingClientRect();
      if (fr.width > largura + 2) out.push(`${f.id}: largura ${Math.round(fr.width)}px`);
      f.querySelectorAll('input, textarea, label, th, td, .chip, .sub, .calc-box').forEach((el) => {
        const e = el.getBoundingClientRect();
        if (!e.width) return;
        if (e.right > fr.right + 1 || e.left < fr.left - 1) out.push(`${f.id}: <${el.tagName.toLowerCase()} ${el.name || el.className}> fora da largura`);
        if (el.tagName === 'INPUT' && el.type === 'text' && el.value && !el.classList.contains('guia') && el.scrollWidth > el.clientWidth + 1) out.push(`${f.id}: texto cortado no campo ${el.name}: "${el.value}"`);
      });
    });
    return out;
  });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize(vp);
  if (r.length) console.log(`PROBLEMAS (${rotulo}):\n  ` + r.slice(0, 20).join('\n  '));
  return r.length;
}

let problemas = 0;

async function gerarKit() {
  const { ctx, page } = await abrir();
  await page.evaluate(() => { window.KitPreMTR.emBranco(); window.KitPreMTR.modoImpressao('kit'); });
  problemas += await conferir(page, 'kit');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: pdfKit, ...opcoesPdf });
  if (page._erros.length) { console.log('Erros de JavaScript:', page._erros); problemas++; }
  await ctx.close();
}

function mapaPaginas() {
  const txt = textoPaginas(pdfKit);
  const mapa = {};
  for (let i = 1; i <= 15; i++) {
    const cod = 'F' + String(i).padStart(2, '0');
    const p = txt.findIndex((t) => t.includes(cod + ' · '));
    mapa[cod] = p + 1;
  }
  const total = paginas(pdfKit);
  mapa.orientacoes = total;
  mapa.total = total;
  return mapa;
}

// Passada 1: mede as páginas
await gerarKit();
let mapa = mapaPaginas();
fs.writeFileSync(path.join(aqui, 'paginas.json'), JSON.stringify(mapa, null, 2));
execFileSync('python3', [path.join(aqui, 'build.py')], { stdio: 'inherit' });
// Passada 2: índice com os números reais
await gerarKit();
const mapa2 = mapaPaginas();
if (JSON.stringify(mapa) !== JSON.stringify(mapa2)) { console.log('A paginação mudou entre as passadas:', mapa, mapa2); problemas++; }
console.log('Início de cada formulário no PDF completo:', mapa2);

// PDF somente com os formulários
{
  const { ctx, page } = await abrir();
  await page.evaluate(() => { window.KitPreMTR.emBranco(); window.KitPreMTR.modoImpressao('forms'); });
  problemas += await conferir(page, 'formulários');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: pdfForms, ...opcoesPdf });
  await ctx.close();
}

// Um PDF por formulário
fs.rmSync(pastaInd, { recursive: true, force: true });
fs.mkdirSync(pastaInd, { recursive: true });
const meta = await (async () => {
  const { ctx, page } = await abrir();
  const m = await page.evaluate(() => JSON.parse(document.getElementById('kit-meta').textContent));
  await ctx.close();
  return m;
})();
const individuais = [];
for (const [id, m] of Object.entries(meta)) {
  const { ctx, page } = await abrir();
  await page.evaluate((i) => { window.KitPreMTR.emBranco(); window.KitPreMTR.modoImpressao('one', i); }, id);
  problemas += await conferir(page, m.cod);
  await page.emulateMedia({ media: 'print' });
  const nome = `${m.cod}_${m.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '')}.pdf`;
  const arq = path.join(pastaInd, nome);
  await page.pdf({ path: arq, ...opcoesPdf });
  individuais.push([nome, paginas(arq)]);
  await ctx.close();
}
await browser.close();

// Compacta os individuais
const zip = path.join(raiz, 'Kit_Pre_MTR_Formularios_Individuais.zip');
fs.rmSync(zip, { force: true });
execFileSync('python3', ['-c', `
import zipfile, os, sys
pasta, destino = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in sorted(os.listdir(pasta)):
        z.write(os.path.join(pasta, n), os.path.join('formularios_individuais', n))
`, pastaInd, zip]);

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log(`\nPDF completo: ${path.basename(pdfKit)} · ${paginas(pdfKit)} páginas · ${kb(pdfKit)}`);
console.log(`PDF de impressão: ${path.basename(pdfForms)} · ${paginas(pdfForms)} páginas · ${kb(pdfForms)}`);
console.log(`Individuais: ${individuais.map(([n, p]) => `${n.slice(0, 3)}=${p}p`).join(' ')} · ZIP ${kb(zip)}`);
console.log(problemas ? `\n${problemas} problema(s) encontrados.` : '\nConferência de impressão sem problemas.');
process.exitCode = problemas ? 1 : 0;
