// Gera os PDFs do Kit de 10 Relatórios a partir do HTML (Playwright + Chromium).
//
// 1. Kit_10_Relatorios_Gestao_Residuos.pdf   kit completo com os 10 modelos em branco
// 2. Relatorios_Individuais/01_...pdf a 10_  um PDF por modelo, em branco
// 3. Kit_10_Relatorios_Completo.zip          pacote de entrega
//
// O índice impresso recebe os números de página reais: a primeira passada mede
// onde cada relatório começa, grava paginas.json, o HTML é refeito e o PDF gerado de novo.
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
const html = path.join(raiz, 'Kit_10_Relatorios_Gestao_Residuos.html');
const pdfKit = path.join(raiz, 'Kit_10_Relatorios_Gestao_Residuos.pdf');
const pastaInd = path.join(raiz, 'Relatorios_Individuais');
const zip = path.join(raiz, 'Kit_10_Relatorios_Completo.zip');
const opcoes = { printBackground: true, preferCSSPageSize: true, outline: true, tagged: true };

const textoPaginas = (f) => execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\f');
const paginas = (f) => parseInt(execFileSync('pdfinfo', [f], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)[1], 10);

const browser = await chromium.launch();
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

// Nenhum elemento pode ultrapassar a largura útil (A4 menos 13 mm de cada lado)
async function conferir(page, rotulo) {
  const vp = page.viewportSize();
  await page.setViewportSize({ width: Math.round(184 * 96 / 25.4), height: 1000 });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.rel').forEach((rel) => {
      if (getComputedStyle(rel).display === 'none') return;
      const fr = rel.getBoundingClientRect();
      rel.querySelectorAll('*').forEach((el) => {
        if (el.closest('svg') && el.tagName !== 'svg') return;
        const e = el.getBoundingClientRect();
        if (!e.width || getComputedStyle(el).display === 'none') return;
        if (el.closest('.capa-rel')) return;
        if (e.right > fr.right + 1.5 || e.left < fr.left - 1.5) out.push(`${rel.id}: <${el.tagName.toLowerCase()} ${typeof el.className === 'string' ? el.className : ''}> fora da largura`);
      });
      if (rel.querySelectorAll('.kpi-v').length && /[0-9]/.test([...rel.querySelectorAll('.kpi-v')].map((k) => k.textContent).join('')) && document.documentElement.classList.contains('em-branco')) {
        out.push(`${rel.id}: indicador com valor no modelo em branco`);
      }
    });
    return out;
  });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize(vp);
  if (r.length) console.log(`PROBLEMAS (${rotulo}):\n  ` + [...new Set(r)].slice(0, 20).join('\n  '));
  return r.length;
}

let problemas = 0;
async function gerarKit() {
  const { ctx, page } = await abrir();
  await page.evaluate(() => { window.KitRel.emBranco(); window.KitRel.modo('kit'); });
  problemas += await conferir(page, 'kit');
  await page.evaluate(() => window.KitRel.modo('kit'));
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: pdfKit, ...opcoes });
  if (page._erros.length) { console.log('Erros de JavaScript:', page._erros); problemas++; }
  const meta = await page.evaluate(() => JSON.parse(document.getElementById('kit-meta').textContent));
  await ctx.close();
  return meta;
}
function mapa(meta) {
  const txt = textoPaginas(pdfKit);
  const m = {};
  for (const [id, r] of Object.entries(meta)) {
    let p = txt.findIndex((t) => t.includes(`Relatório ${r.num} · ${r.curto}`)) + 1;
    if (['r09', 'r10'].includes(id)) p -= 1; // a capa do modelo vem antes, sem rodapé
    m['R' + r.num] = p;
  }
  m.orientacoes = paginas(pdfKit);
  m.total = paginas(pdfKit);
  return m;
}

let meta = await gerarKit();
const m1 = mapa(meta);
fs.writeFileSync(path.join(aqui, 'paginas.json'), JSON.stringify(m1, null, 2));
execFileSync('python3', [path.join(aqui, 'build.py')], { stdio: 'inherit' });
meta = await gerarKit();
const m2 = mapa(meta);
if (JSON.stringify(m1) !== JSON.stringify(m2)) { console.log('A paginação mudou entre as passadas:', m1, m2); problemas++; }
console.log('Início de cada relatório no PDF completo:', m2);

fs.rmSync(pastaInd, { recursive: true, force: true });
fs.mkdirSync(pastaInd, { recursive: true });
const ind = [];
for (const [id, r] of Object.entries(meta)) {
  const { ctx, page } = await abrir();
  await page.evaluate((i) => { window.KitRel.emBranco(); window.KitRel.modo('one', i); }, id);
  problemas += await conferir(page, r.cod);
  await page.evaluate((i) => window.KitRel.modo('one', i), id);
  await page.emulateMedia({ media: 'print' });
  const arq = path.join(pastaInd, r.arquivo + '.pdf');
  await page.pdf({ path: arq, ...opcoes });
  ind.push([r.num, paginas(arq)]);
  await ctx.close();
}
await browser.close();

// pacote de entrega
fs.rmSync(zip, { force: true });
execFileSync('python3', ['-c', `
import zipfile, os, sys
raiz, destino = sys.argv[1], sys.argv[2]
base = 'Kit_10_Relatorios_Gestao_Residuos'
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in ['Kit_10_Relatorios_Gestao_Residuos.html', 'Kit_10_Relatorios_Gestao_Residuos.pdf', 'LEIA-ME.txt']:
        z.write(os.path.join(raiz, n), os.path.join(base, n))
    pasta = os.path.join(raiz, 'Relatorios_Individuais')
    for n in sorted(os.listdir(pasta)):
        z.write(os.path.join(pasta, n), os.path.join(base, 'Relatorios_Individuais', n))
`, raiz, zip]);

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log(`\nPDF completo: ${paginas(pdfKit)} páginas · ${kb(pdfKit)}`);
console.log(`Individuais: ${ind.map(([n, p]) => `${n}=${p}p`).join(' ')}`);
console.log(`ZIP: ${kb(zip)}`);
console.log(problemas ? `\n${problemas} problema(s) encontrados.` : '\nConferência de impressão sem problemas.');
process.exitCode = problemas ? 1 : 0;
