/*
 * Grava o vídeo de demonstração do MapaElétrica Calc (app HTML).
 * Uso: node demo/gravar_video.js   (depois de npm run build)
 * Saída: demo/MapaEletrica-Calc-demo.mp4 (precisa do ffmpeg)
 */
'use strict';
var path = require('path');
var fs = require('fs');
var cp = require('child_process');
var playwright = require('playwright');

var ROOT = path.join(__dirname, '..');
var URL = 'file://' + path.join(ROOT, 'dist', 'index.html');
var TMP = path.join(__dirname, '.video-tmp');
var OUT = path.join(__dirname, 'MapaEletrica-Calc-demo.mp4');
var W = 1280, H = 720;

/* Legenda, cursor e cartões de abertura/encerramento desenhados por cima do app. */
var OVERLAY = function () {
  if (document.getElementById('__demo')) return;
  var st = document.createElement('style');
  st.textContent =
    '#__demo-cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:880px;width:calc(100% - 80px);' +
    'background:rgba(16,33,58,.94);color:#fff;font:600 21px/1.35 Inter,system-ui,sans-serif;padding:14px 22px;border-radius:14px;' +
    'box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:2147483646;text-align:center;transition:opacity .25s;pointer-events:none}' +
    '#__demo-cap b{color:#8FB3FF}#__demo-cap .n{display:inline-block;background:#2563EB;border-radius:8px;padding:0 9px;margin-right:10px}' +
    '#__demo-cur{position:fixed;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -4px;z-index:2147483647;pointer-events:none;' +
    'transition:transform .65s cubic-bezier(.4,0,.2,1)}' +
    '#__demo-cur svg{width:26px;height:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}' +
    '.__ripple{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #2563EB;z-index:2147483645;' +
    'pointer-events:none;animation:__rp .55s ease-out forwards}@keyframes __rp{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}' +
    '#__demo-card{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;text-align:center;' +
    'background:linear-gradient(135deg,#10213A,#1E3F78);color:#fff;font-family:Inter,system-ui,sans-serif;transition:opacity .5s}' +
    '#__demo-card h1{font-size:54px;margin:0 0 10px;color:#fff}#__demo-card p{font-size:24px;color:#C9D6EA;margin:6px 0}' +
    '#__demo-card .k{font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:#8FB3FF;font-weight:700;margin-bottom:18px}';
  document.head.appendChild(st);
  var d = document.createElement('div');
  d.id = '__demo';
  d.innerHTML = '<div id="__demo-cap" style="opacity:0"></div><div id="__demo-cur"><svg viewBox="0 0 24 24"><path d="M3 2l16 9-7 2-3 7z" fill="#fff" stroke="#10213A" stroke-width="1.6" stroke-linejoin="round"/></svg></div>';
  document.body.appendChild(d);
  window.__demoPos = window.__demoPos || { x: 640, y: 400 };
  document.getElementById('__demo-cur').style.transform = 'translate(' + window.__demoPos.x + 'px,' + window.__demoPos.y + 'px)';
};

async function ensureOverlay(page) { await page.evaluate(OVERLAY); }
var curPos = { x: 640, y: 400 };

async function caption(page, html, ms) {
  await ensureOverlay(page);
  await page.evaluate(function (h) {
    var c = document.getElementById('__demo-cap');
    c.innerHTML = h;
    c.style.opacity = h ? '1' : '0';
  }, html || '');
  if (ms) await page.waitForTimeout(ms);
}

async function card(page, html, ms) {
  await ensureOverlay(page);
  await page.evaluate(function (h) {
    var el = document.getElementById('__demo-card');
    if (!el) { el = document.createElement('div'); el.id = '__demo-card'; document.body.appendChild(el); }
    el.innerHTML = '<div>' + h + '</div>';
    el.style.opacity = '1';
  }, html);
  await page.waitForTimeout(ms);
  await page.evaluate(function () { var el = document.getElementById('__demo-card'); if (el) { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 500); } });
  await page.waitForTimeout(500);
}

async function moveTo(page, locator) {
  await ensureOverlay(page);
  await locator.scrollIntoViewIfNeeded();
  var b = await locator.boundingBox();
  var x = Math.round(b.x + Math.min(b.width / 2, 60));
  var y = Math.round(b.y + b.height / 2);
  curPos = { x: x, y: y };
  await page.evaluate(function (p) {
    window.__demoPos = p;
    document.getElementById('__demo-cur').style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
  }, curPos);
  await page.waitForTimeout(750);
}

async function click(page, locator, after) {
  await moveTo(page, locator);
  await page.evaluate(function (p) {
    var r = document.createElement('div');
    r.className = '__ripple';
    r.style.left = p.x + 'px';
    r.style.top = p.y + 'px';
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 600);
  }, curPos);
  await locator.click();
  await page.waitForTimeout(after === undefined ? 700 : after);
}

async function type(page, locator, text) {
  await click(page, locator, 250);
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 170 });
  await page.waitForTimeout(500);
}

async function scrollTo(page, locator, block) {
  await locator.evaluate(function (el, b) { el.scrollIntoView({ behavior: 'smooth', block: b || 'start' }); }, block);
  await page.waitForTimeout(1300);
}

(async function main() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('Rode npm run build antes.');
  fs.rmSync(TMP, { recursive: true, force: true });
  var browser = await playwright.chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: TMP, size: { width: W, height: H } } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  var page = await ctx.newPage();
  await page.addInitScript(function () {
    window.print = function () {};
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(URL);
  await page.waitForTimeout(300);

  /* Abertura */
  await card(page, '<p class="k">Kit de Calculadoras Elétricas Automáticas</p><h1>MapaElétrica Calc</h1><p>Como usar, em menos de dois minutos</p>', 3200);

  /* 1. Página inicial */
  await caption(page, '<span class="n">1</span>Na página inicial ficam as <b>12 calculadoras</b>, separadas por categoria.', 2600);
  await page.mouse.wheel(0, 380);
  await page.waitForTimeout(1600);
  await page.mouse.wheel(0, -380);
  await page.waitForTimeout(900);

  /* 2. Busca */
  await caption(page, '<span class="n">2</span>Use a <b>busca</b> para achar a calculadora pelo nome ou pelo assunto.');
  await type(page, page.locator('#search'), 'ohm');
  await page.waitForTimeout(1200);
  await caption(page, '<span class="n">2</span>Toque em <b>Abrir calculadora</b>.');
  await click(page, page.locator('.tool-card a[href="#/calc/ohm"]'), 1200);

  /* 3. Preencher */
  await caption(page, '<span class="n">3</span>Escolha <b>o que você quer calcular</b>. Aqui, a corrente.', 600);
  await click(page, page.locator('label:has(input[data-choice="mode"][value="I"])'), 900);
  await caption(page, '<span class="n">3</span>Digite os valores e escolha a <b>unidade</b> ao lado de cada campo.');
  await type(page, page.locator('#f-V'), '12');
  await type(page, page.locator('#f-R'), '6');
  await page.waitForTimeout(400);

  /* 4. Calcular */
  await caption(page, '<span class="n">4</span>Toque em <b>Calcular</b>. O resultado aparece em destaque, em verde.');
  await click(page, page.locator('button[type="submit"]'), 2600);

  /* 5. Memória */
  await caption(page, '<span class="n">5</span>A <b>memória de cálculo</b> mostra a fórmula, a substituição dos números e o resultado.');
  await scrollTo(page, page.locator('#memo-title'), 'start');
  await page.waitForTimeout(2600);
  await caption(page, '<span class="n">5</span>Logo abaixo vêm a <b>explicação</b> e as hipóteses do modelo.');
  await scrollTo(page, page.locator('#exp-title'), 'start');
  await page.waitForTimeout(2200);
  await scrollTo(page, page.locator('#calc-title'), 'start');

  /* 6. Atualização automática e erros */
  await caption(page, '<span class="n">6</span>Mudou um valor? O resultado <b>se atualiza sozinho</b>.');
  await type(page, page.locator('#f-R'), '3');
  await page.waitForTimeout(1800);
  await caption(page, '<span class="n">6</span>Se algum dado estiver errado, o app <b>explica o que corrigir</b>.');
  await type(page, page.locator('#f-R'), '0');
  await page.waitForTimeout(2600);
  await type(page, page.locator('#f-R'), '6');
  await page.waitForTimeout(800);

  /* 7. Exemplo pronto */
  await caption(page, '<span class="n">7</span>Em qualquer calculadora, <b>Carregar exemplo</b> preenche e resolve um caso pronto.');
  await page.goto(URL + '#/calc/vdiv');
  await page.waitForTimeout(900);
  await caption(page, '<span class="n">7</span>Em qualquer calculadora, <b>Carregar exemplo</b> preenche e resolve um caso pronto.');
  await click(page, page.locator('[data-act="example"]'), 1500);
  await scrollTo(page, page.locator('.diagram'), 'center');
  await caption(page, '<span class="n">7</span>Nos circuitos, um <b>esquema</b> mostra os valores no lugar certo.', 2600);
  await scrollTo(page, page.locator('#calc-title'), 'start');

  /* 8. Casas decimais */
  await caption(page, '<span class="n">8</span>No topo, escolha <b>2, 4 ou 6 casas decimais</b>. Só muda a exibição.');
  await moveTo(page, page.locator('#precision'));
  await page.selectOption('#precision', '2');
  await page.waitForTimeout(2000);
  await page.selectOption('#precision', '4');
  await page.waitForTimeout(600);

  /* 9. Copiar e imprimir */
  await caption(page, '<span class="n">9</span><b>Copiar resolução</b> leva dados, fórmulas e resultado para colar onde quiser.');
  await scrollTo(page, page.locator('.res-actions'), 'center');
  await click(page, page.locator('[data-act="copy-full"]'), 2000);
  await caption(page, '<span class="n">9</span><b>Imprimir ou salvar PDF</b> gera um relatório limpo como este.');
  await click(page, page.locator('[data-act="print"]'), 500);
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(function () { document.documentElement.style.background = '#fff'; var p = document.getElementById('print-area'); p.style.padding = '30px 120px'; p.style.background = '#fff'; window.scrollTo(0, 0); });
  await page.waitForTimeout(1800);
  await page.evaluate(function () { window.scrollTo({ top: 420, behavior: 'smooth' }); });
  await page.waitForTimeout(2200);
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(function () { document.getElementById('print-area').style.padding = ''; });

  /* 10. Histórico e favoritas */
  await caption(page, '<span class="n">10</span>O <b>histórico</b> guarda seus últimos cálculos neste aparelho.');
  await click(page, page.locator('.topbar a[href="#/historico"]'), 2400);
  await caption(page, '<span class="n">10</span>E a <b>estrela</b> guarda suas calculadoras favoritas no menu.');
  await page.goto(URL + '#/');
  await page.waitForTimeout(700);
  await caption(page, '<span class="n">10</span>E a <b>estrela</b> guarda suas calculadoras favoritas no menu.');
  await click(page, page.locator('.tool-card [data-fav="ohm"]'), 2200);
  await caption(page, '');

  /* Encerramento */
  await card(page, '<p class="k">MapaElétrica Calc</p><h1>Pronto para estudar</h1><p>Funciona sem internet, sem cadastro e no celular.</p>' +
    '<p style="font-size:16px;margin-top:26px;color:#9FB0C8">Ferramenta educacional. Não substitui normas técnicas, projetos nem profissionais habilitados.</p>', 3800);

  var video = page.video();
  await ctx.close();
  var webm = await video.path();
  await browser.close();
  cp.execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', '30', OUT]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Vídeo gerado:', path.relative(ROOT, OUT));
})().catch(function (e) { console.error(e); process.exit(1); });
