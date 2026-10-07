// Gera o PDF da isca a partir do isca.html.
// Uso: node gerar-pdf.mjs [--png]   (--png também salva uma imagem de cada página em ./previa)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  playwright = require(path.join(globalRoot, 'playwright'));
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const saida = path.join(dir, 'Script-de-Reativacao-de-Base-Orbion-v2.pdf');
const gerarPng = process.argv.includes('--png');

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto('file://' + path.join(dir, 'isca.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// Destaca os campos do script: [QUALQUER COISA] e (NOME) / (SEU NOME)
await page.evaluate(() => {
  const re = /(\[[^\]]+\]|\((?:NOME|SEU NOME)\))/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement.closest('.ph, style, script')) continue;
    if (!re.test(node.nodeValue)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    node.nodeValue.replace(re, (m, _g, idx) => {
      if (idx > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, idx)));
      const span = document.createElement('span');
      span.className = 'ph';
      if (m.length <= 36) span.classList.add('curto');
      span.textContent = m;
      frag.appendChild(span);
      last = idx + m.length;
      return m;
    });
    if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
});

// Confere se algum conteúdo passou do limite da página
const problemas = await page.evaluate(() => {
  const mm = 96 / 25.4;
  const out = [];
  document.querySelectorAll('.page').forEach((pg, i) => {
    const r = pg.getBoundingClientRect();
    const temRodape = !!pg.querySelector('.rodape');
    const limite = r.bottom - (temRodape ? 15 * mm : 12 * mm);
    let maior = 0;
    pg.querySelectorAll('*').forEach((el) => {
      if (el.closest('.rodape, .orbita, .inclui, .acao, .copy')) return;
      const b = el.getBoundingClientRect().bottom;
      if (b > maior) maior = b;
    });
    const folga = (limite - maior) / mm;
    out.push({ pagina: i + 1, folgaMm: Math.round(folga * 10) / 10 });
  });
  return out;
});
for (const p of problemas) {
  console.log(`página ${String(p.pagina).padStart(2, '0')}: folga ${p.folgaMm} mm${p.folgaMm < 0 ? '  <-- ESTOUROU' : ''}`);
}

await page.pdf({ path: saida, format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log('PDF salvo em', saida);

if (gerarPng) {
  const previa = path.join(dir, 'previa');
  mkdirSync(previa, { recursive: true });
  const paginas = await page.$$('.page');
  for (let i = 0; i < paginas.length; i++) {
    await paginas[i].screenshot({ path: path.join(previa, `pagina-${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log('Prévias salvas em', previa);
}

await browser.close();
