/*
 * Testes de interface no navegador (Chromium via Playwright).
 * Rodar: npm run test:ui   (gera o dist/index.html antes)
 * Requer o pacote "playwright" instalado (npm i -D playwright) e o Chromium dele.
 */
'use strict';
var path = require('path');
var fs = require('fs');

var playwright;
try { playwright = require('playwright'); } catch (e) {
  console.log('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

var FILE = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(FILE)) { console.log('Rode "npm run build" antes.'); process.exit(2); }
var URL = 'file://' + FILE;
var OHM = 'Ω';

var results = [];
var consoleErrors = [];
var externalRequests = [];

function check(name, cond, detail) {
  results.push({ name: name, ok: !!cond, detail: detail || '' });
  console.log((cond ? 'ok   ' : 'FALHA') + '  ' + name + (detail && !cond ? '  -> ' + detail : ''));
}

async function newPage(ctx) {
  var page = await ctx.newPage();
  page.on('console', function (m) { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', function (e) { consoleErrors.push(e.message); });
  await page.route('**/*', function (route) {
    var u = route.request().url();
    if (u.indexOf('file://') === 0 || u.indexOf('data:') === 0) return route.continue();
    externalRequests.push(u);
    return route.abort();
  });
  return page;
}

async function text(page, sel) { return (await page.locator(sel).first().textContent()) || ''; }
async function primaryTexts(page) { return page.locator('.res-value').allTextContents(); }

var EXPECT = {
  ohm: '2 A', powerdc: '72 W', energy: '60 kWh', resistors: '30 ' + OHM, vdiv: '8 V', idiv: '2 A',
  freq: '16,6667 ms', reactance: '37,6991 ' + OHM, impedance: '14,9947 ' + OHM, mono: '480 W', tri: '5,2654 kW', converter: '2.200 ' + OHM
};

(async function main() {
  var browser = await playwright.chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  var page = await newPage(ctx);

  /* Página inicial, busca e filtros */
  await page.goto(URL);
  check('Página inicial mostra 12 calculadoras', (await page.locator('.tool-card').count()) === 12);
  await page.fill('#search', 'kwh');
  var names = await page.locator('.tool-card h3').allTextContents();
  check('Busca "kwh" encontra Energia e Consumo', names.length >= 1 && names.indexOf('Energia e Consumo') >= 0, names.join(', '));
  await page.fill('#search', 'trifasico');
  names = await page.locator('.tool-card h3').allTextContents();
  check('Busca sem acento "trifasico" encontra Potência Trifásica', names.indexOf('Potência Trifásica') >= 0, names.join(', '));
  await page.fill('#search', 'xyzabc');
  check('Busca sem resultado mostra aviso', (await page.locator('.empty-search').count()) === 1);
  await page.fill('#search', '');
  await page.click('[data-filter="ca"]');
  check('Filtro "Corrente alternada" mostra 3 calculadoras', (await page.locator('.tool-card').count()) === 3);
  await page.click('[data-filter="all"]');

  /* Exemplos prontos de todas as calculadoras */
  for (var id in EXPECT) {
    await page.goto(URL + '#/calc/' + id);
    await page.click('[data-act="example"]');
    var vals = await primaryTexts(page);
    check('Exemplo de ' + id + ' calcula ' + EXPECT[id], vals.some(function (v) { return v.trim() === EXPECT[id]; }), vals.join(' | '));
    var steps = await page.locator('.step').count();
    check('Exemplo de ' + id + ' mostra memória de cálculo', steps > 0);
  }

  /* Digitação, botão Calcular, atualização automática e resultados antigos */
  await page.goto(URL + '#/calc/ohm');
  await page.click('[data-act="clear"]');
  await page.click('button[type="submit"]');
  check('Calcular com campos vazios mostra erros por campo', (await page.locator('.field.invalid').count()) === 2);
  check('Erro de campo vazio sem resultado visível', (await page.locator('.res-value').count()) === 0);
  await page.fill('#f-V', '12');
  await page.fill('#f-R', '6,0');
  await page.click('button[type="submit"]');
  check('Ohm digitado: 12 V e 6,0 Ω dão 2 A', (await primaryTexts(page))[0] === '2 A');
  await page.fill('#f-R', '3');
  await page.waitForTimeout(400);
  check('Atualização automática: R=3 Ω dá 4 A', (await primaryTexts(page))[0] === '4 A');
  await page.fill('#f-R', '0');
  await page.waitForTimeout(400);
  var err = await text(page, '#e-R');
  check('Resistência zero mostra mensagem simples', err === 'Informe uma resistência maior que zero para realizar este cálculo.', err);
  check('Resultado antigo some quando a entrada fica inválida', (await page.locator('.res-value').count()) === 0);
  await page.fill('#f-R', '1.234');
  await page.waitForTimeout(400);
  check('Número ambíguo "1.234" é recusado com explicação', (await text(page, '#e-R')).indexOf('pode ser lido como') >= 0);
  await page.fill('#f-R', 'abc');
  await page.waitForTimeout(400);
  var bodyTxt = await page.locator('main').innerText();
  check('Nenhum NaN, Infinity ou undefined na tela', !/NaN|Infinity|undefined/.test(bodyTxt));
  await page.fill('#f-R', '6');
  await page.focus('#f-R');
  await page.keyboard.press('Enter');
  check('Tecla Enter calcula', (await primaryTexts(page))[0] === '2 A');

  /* Troca de modo esconde os campos certos */
  await page.click('label:has(input[value="V"][data-choice="mode"])');
  check('Modo "Tensão" esconde o campo de tensão', await page.locator('[data-field="V"]').isHidden());

  /* Precisão */
  await page.goto(URL + '#/calc/resistors');
  await page.click('[data-act="example"]');
  await page.click('label:has(input[value="paralelo"])');
  await page.waitForTimeout(400);
  await page.selectOption('#precision', '2');
  check('Precisão 2 casas: paralelo 10 e 20 Ω = 6,67 Ω', (await primaryTexts(page))[0] === '6,67 ' + OHM, (await primaryTexts(page))[0]);
  await page.selectOption('#precision', '6');
  check('Precisão 6 casas: 6,666667 Ω', (await primaryTexts(page))[0] === '6,666667 ' + OHM, (await primaryTexts(page))[0]);
  await page.selectOption('#precision', '4');

  /* Lista de resistores */
  await page.click('[data-act="add"]');
  await page.fill('#r-2', '30');
  await page.waitForTimeout(400);
  check('Adicionar resistor (3 em paralelo: 10, 20, 30 Ω = 5,4545 Ω)', (await primaryTexts(page))[0] === '5,4545 ' + OHM, (await primaryTexts(page))[0]);
  await page.click('[data-remove="2"]');
  await page.waitForTimeout(400);
  check('Remover resistor volta para 6,6667 Ω', (await primaryTexts(page))[0] === '6,6667 ' + OHM);
  check('Não deixa remover abaixo de 2 resistores', await page.locator('[data-remove="0"]').isDisabled());
  for (var k = 0; k < 8; k++) await page.click('[data-act="add"]');
  check('Limite de 10 resistores desativa o botão Adicionar', await page.locator('[data-act="add"]').isDisabled());

  /* Carga resistiva trava FP = 1 */
  await page.goto(URL + '#/calc/mono');
  await page.click('[data-act="example"]');
  await page.click('label:has(input[value="resistiva"])');
  await page.waitForTimeout(400);
  check('Carga resistiva trava FP em 1', (await page.inputValue('#f-FP')) === '1' && await page.locator('#f-FP').getAttribute('readonly') !== null);
  check('Carga resistiva: P = S = 600', (await primaryTexts(page))[0] === '600 W');

  /* Conversor em tempo real e troca de grandeza */
  await page.goto(URL + '#/calc/converter');
  await page.selectOption('#f-qty', 'energy');
  await page.fill('#f-value', '1');
  await page.selectOption('#f-from', 'kWh');
  await page.selectOption('#f-to', 'J');
  await page.waitForTimeout(400);
  check('Conversor imediato: 1 kWh = 3.600.000 J', (await text(page, '[data-equation]')) === '1 kWh = 3.600.000 J', await text(page, '[data-equation]'));
  var toOpts = await page.locator('#f-to option').allTextContents();
  check('Conversor só oferece unidades da mesma grandeza', toOpts.every(function (o) { return /^(J|Wh|kWh) /.test(o); }), toOpts.join(', '));

  /* Copiar */
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(URL + '#/calc/ohm');
  await page.click('[data-act="example"]');
  await page.click('[data-act="copy-result"]');
  await page.waitForTimeout(300);
  var toastTxt = await text(page, '#toast');
  var modal = await page.locator('.modal').count();
  check('Copiar resultado funciona (cópia direta ou janela de cópia manual)', toastTxt === 'Resultado copiado.' || modal === 1, toastTxt);
  var clip = '';
  try { clip = await page.evaluate(function () { return navigator.clipboard.readText(); }); } catch (e) { clip = ''; }
  if (clip) check('Texto copiado traz grandeza, valor e unidade', clip.indexOf('Corrente (I): 2 A') >= 0, clip);
  if (modal) await page.click('.modal button');
  await page.click('[data-act="copy-full"]');
  await page.waitForTimeout(300);
  try { clip = await page.evaluate(function () { return navigator.clipboard.readText(); }); } catch (e) { clip = ''; }
  if (clip) check('Resolução copiada traz fórmula, substituição e hipóteses', clip.indexOf('I = V / R') >= 0 && clip.indexOf('HIPÓTESES') >= 0);
  else check('Copiar resolução mostra confirmação', (await text(page, '#toast')).indexOf('copiada') >= 0 || (await page.locator('.modal').count()) === 1);

  /* Imprimir */
  await page.evaluate(function () { window.__printed = 0; window.print = function () { window.__printed++; }; });
  await page.click('[data-act="print"]');
  var printed = await page.evaluate(function () { return window.__printed; });
  var printHtml = await page.locator('#print-area').innerText();
  check('Imprimir chama a impressão do navegador', printed === 1);
  check('Relatório de impressão tem produto, título, dados, resultado e fórmula',
    ['MapaElétrica Calc', 'Lei de Ohm', 'Dados de entrada', 'Resultados', 'I = V / R', 'Hipóteses'].every(function (s) { return printHtml.indexOf(s) >= 0; }));
  await page.emulateMedia({ media: 'print' });
  check('Na impressão, só o relatório fica visível', (await page.locator('#print-area').isVisible()) && !(await page.locator('.topbar').isVisible()));
  await page.emulateMedia({ media: 'screen' });

  /* Histórico */
  await page.goto(URL + '#/calc/powerdc');
  await page.click('[data-act="clear"]');
  await page.fill('#f-V', '10');
  await page.fill('#f-I', '2');
  await page.click('button[type="submit"]');
  await page.goto(URL + '#/historico');
  check('Histórico registra o cálculo', (await page.locator('.hist-item').count()) >= 1 && (await text(page, '.hist-item h3')) === 'Potência CC');
  await page.reload();
  check('Histórico continua depois de recarregar', (await page.locator('.hist-item').count()) >= 1);
  await page.click('.hist-item [data-reopen]');
  await page.waitForTimeout(200);
  check('Reabrir registro restaura dados e resultado', (await page.inputValue('#f-V')) === '10' && (await primaryTexts(page))[0] === '20 W');
  await page.goto(URL + '#/historico');
  var before = await page.locator('.hist-item').count();
  await page.click('.hist-item [data-del]');
  check('Excluir registro', (await page.locator('.hist-item').count()) === before - 1);
  await page.goto(URL + '#/calc/ohm');
  await page.click('[data-act="example"]');
  await page.click('button[type="submit"]');
  await page.goto(URL + '#/historico');
  await page.click('[data-act="hist-clear"]');
  check('Limpar histórico pede confirmação', (await page.locator('.hist-item').count()) >= 1);
  await page.click('[data-act="hist-clear"]');
  check('Limpar histórico apaga tudo', (await page.locator('.hist-item').count()) === 0);

  /* Favoritos */
  await page.goto(URL + '#/');
  await page.click('[data-fav="tri"]');
  await page.reload();
  check('Favorita salva e aparece no menu depois de recarregar', (await page.locator('.nav-fav a').count()) === 1);
  await page.click('[data-filter="fav"]');
  check('Filtro de favoritas', (await page.locator('.tool-card').count()) === 1);
  await page.click('.tool-card [data-fav="tri"]');
  check('Desmarcar favorita', (await page.locator('.tool-card').count()) === 0);

  /* Rolagem horizontal em várias larguras */
  var widths = [320, 390, 768, 1024, 1440];
  for (var w = 0; w < widths.length; w++) {
    await page.setViewportSize({ width: widths[w], height: 900 });
    var worst = 0;
    var pages = ['#/', '#/historico', '#/sobre'].concat(Object.keys(EXPECT).map(function (i) { return '#/calc/' + i; }));
    for (var p = 0; p < pages.length; p++) {
      await page.goto(URL + pages[p]);
      if (pages[p].indexOf('calc') > 0) await page.click('[data-act="example"]');
      var over = await page.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
      if (over > worst) worst = over;
    }
    check('Sem rolagem horizontal em ' + widths[w] + ' px', worst <= 0, 'excesso ' + worst + ' px');
  }

  /* Menu no celular */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL + '#/');
  check('Celular: menu lateral fica escondido', !(await page.locator('#sidebar').isVisible()));
  await page.click('#menuBtn');
  await page.waitForTimeout(300);
  check('Celular: botão abre o menu', await page.locator('#sidebar').isVisible());
  await page.click('#sidebar a[href="#/calc/vdiv"]');
  await page.waitForTimeout(300);
  check('Celular: navegar fecha o menu e abre a calculadora', !(await page.locator('#sidebar.open').count()) && (await text(page, 'h1')) === 'Divisor de Tensão');

  /* Armazenamento indisponível */
  var ctx2 = await browser.newContext();
  await ctx2.addInitScript(function () {
    Storage.prototype.setItem = function () { throw new Error('bloqueado'); };
    Storage.prototype.getItem = function () { throw new Error('bloqueado'); };
  });
  var page2 = await newPage(ctx2);
  await page2.goto(URL + '#/calc/ohm');
  await page2.click('[data-act="example"]');
  check('Sem armazenamento local: calculadora funciona', (await primaryTexts(page2))[0] === '2 A');
  await page2.click('button[type="submit"]');
  await page2.goto(URL + '#/historico');
  check('Sem armazenamento local: histórico avisa e funciona na sessão', (await page2.locator('.notice').count()) === 1 && (await page2.locator('.hist-item').count()) === 1);
  await ctx2.close();

  check('Funcionamento offline: nenhuma requisição externa', externalRequests.length === 0, externalRequests.join(', '));
  check('Nenhum erro no console nos fluxos testados', consoleErrors.length === 0, consoleErrors.join(' | '));

  await browser.close();
  var failed = results.filter(function (r) { return !r.ok; });
  console.log('\n' + (results.length - failed.length) + ' de ' + results.length + ' verificações passaram.');
  process.exit(failed.length ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
