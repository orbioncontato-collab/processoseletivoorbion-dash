// Converte o HTML final em PDF A4 com Playwright + Chromium
// e verifica se algum bloco ultrapassa o limite da página.
//
// Uso: node gerar_pdf.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright')); }
const { chromium } = playwright;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const html = path.resolve(aqui, '..', 'Kit_30_Mensagens_Prontas_MTR_CDF.html');
const pdf = path.resolve(aqui, '..', 'Kit_30_Mensagens_Prontas_MTR_CDF.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => document.fonts.ready);

// Conferência de paginação: nada pode passar do limite da página
const problemas = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.page').forEach((pg) => {
    const n = pg.dataset.page;
    const r = pg.getBoundingClientRect();
    const content = pg.querySelector('.content');
    if (content && content.scrollHeight > content.clientHeight + 1) {
      out.push(`página ${n}: conteúdo excede a área útil em ${content.scrollHeight - content.clientHeight}px`);
    }
    // Todo elemento visível precisa caber na área útil da página
    // e dentro do bloco (card) que o contém.
    const lim = content ? content.getBoundingClientRect() : r;
    pg.querySelectorAll('.content *').forEach((el) => {
      const e = el.getBoundingClientRect();
      if (!e.width || !e.height || el.closest('svg') && el.tagName !== 'svg') return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const caixa = el.parentElement.closest('.card, .side, .msg-win, .cat-head') ;
      const lb = caixa ? caixa.getBoundingClientRect() : lim;
      if (e.bottom > lim.bottom + 0.5 || e.right > lim.right + 0.5 || e.bottom > lb.bottom + 0.5 || e.right > lb.right + 0.5) {
        out.push(`página ${n}: <${el.tagName.toLowerCase()} class="${el.className && el.className.baseVal === undefined ? el.className : ''}"> ultrapassa o limite`);
      }
    });
    if (Math.abs(r.height - 1122.5) > 2) out.push(`página ${n}: altura ${r.height}px diferente de A4`);
  });
  const fontes = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight);
  return { out, fontes, paginas: document.querySelectorAll('.page').length, cards: document.querySelectorAll('.card').length };
});
console.log('Páginas no HTML:', problemas.paginas, '| Mensagens:', problemas.cards);
console.log('Fontes carregadas:', [...new Set(problemas.fontes)].join(', '));
if (problemas.out.length) {
  console.log('PROBLEMAS DE PAGINAÇÃO:\n' + problemas.out.join('\n'));
} else {
  console.log('Paginação OK: nenhum bloco ultrapassa a página.');
}

await page.pdf({
  path: pdf,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  outline: true,
  tagged: true,
});
await browser.close();
console.log('PDF gerado:', pdf, `(${(fs.statSync(pdf).size / 1024).toFixed(0)} KB)`);
process.exitCode = problemas.out.length ? 1 : 0;
