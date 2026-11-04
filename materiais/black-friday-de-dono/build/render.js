// Gera o PDF base a partir do HTML e coleta as posições dos campos preenchíveis.
// Uso: node render.js <arquivo.html> <saida.pdf> <campos.json>
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const [html, out, fieldsOut] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.emulateMedia({ media: 'print' });
  await page.goto('file://' + path.resolve(html), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const data = await page.evaluate(() => {
    const pages = [...document.querySelectorAll('.page')];
    const problems = [];
    const fields = [];
    pages.forEach((pg, i) => {
      const pr = pg.getBoundingClientRect();
      const foot = pg.querySelector('.foot');
      const limit = foot ? foot.getBoundingClientRect().top - 2 : pr.bottom;
      const content = pg.querySelector('.content') || pg;
      // elementos que passam do limite da página ou entram no rodapé
      content.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.bottom > limit + 0.5 || r.right > pr.right + 0.5) {
          problems.push({ page: i + 1, tag: el.tagName, cls: el.className && el.className.baseVal === undefined ? el.className : '', text: (el.textContent || '').trim().slice(0, 50), over: Math.round(r.bottom - limit) });
        }
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'hidden' && el.tagName !== 'svg') {
          problems.push({ page: i + 1, hidden: true, cls: el.className, text: (el.textContent || '').trim().slice(0, 40) });
        }
      });
      const dark = pg.classList.contains('dark');
      pg.querySelectorAll('[data-name]').forEach(el => {
        const r = el.getBoundingClientRect();
        let dk = dark;
        if (el.closest('.card.white')) dk = false;
        const kind = el.classList.contains('cb') ? 'check' : 'text';
        fields.push({ page: i, name: el.dataset.name, kind, dark: dk,
          x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height,
          box: el.classList.contains('field-box') });
      });
    });
    return { n: pages.length, problems, fields };
  });
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  fs.writeFileSync(fieldsOut, JSON.stringify(data.fields, null, 1));
  console.log('paginas:', data.n, 'campos:', data.fields.length);
  console.log('problemas:', JSON.stringify(data.problems.slice(0, 40), null, 0));
  await browser.close();
})();
