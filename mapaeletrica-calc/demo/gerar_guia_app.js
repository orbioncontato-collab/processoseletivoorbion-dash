/*
 * Gera o guia visual em PDF do app HTML, com capturas reais e marcações numeradas.
 * Uso: node demo/gerar_guia_app.js   (depois de npm run build)
 * Saída: demo/Guia-Visual-MapaEletrica-Calc-App.pdf
 */
'use strict';
var path = require('path');
var fs = require('fs');
var playwright = require('playwright');

var ROOT = path.join(__dirname, '..');
var URL = 'file://' + path.join(ROOT, 'dist', 'index.html');
var OUT = path.join(__dirname, 'Guia-Visual-MapaEletrica-Calc-App.pdf');
var OHM = 'Ω';

/* Tira a captura de uma região e calcula onde ficam os elementos marcados (em %). */
async function shot(page, clipSel, marks, opts) {
  opts = opts || {};
  await page.addStyleTag({ content: '#toast{display:none!important}' });
  if (opts.top) await page.evaluate(function () { window.scrollTo(0, 0); });
  var clip;
  if (clipSel) {
    var el = page.locator(clipSel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    clip = await el.boundingBox();
    var pad = opts.pad === undefined ? 10 : opts.pad;
    clip = { x: Math.max(0, clip.x - pad), y: Math.max(0, clip.y - pad), width: clip.width + pad * 2, height: clip.height + pad * 2 };
    if (opts.maxH) clip.height = Math.min(clip.height, opts.maxH);
  } else {
    var vp = page.viewportSize();
    clip = { x: 0, y: 0, width: vp.width, height: opts.h || vp.height };
  }
  var boxes = [];
  for (var i = 0; i < marks.length; i++) {
    var b = await page.locator(marks[i]).first().boundingBox();
    if (!b) throw new Error('Elemento não encontrado: ' + marks[i]);
    boxes.push({
      n: i + 1,
      l: (b.x - clip.x) / clip.width * 100, t: (b.y - clip.y) / clip.height * 100,
      w: b.width / clip.width * 100, h: b.height / clip.height * 100
    });
  }
  var buf = await page.screenshot({ clip: clip });
  return { src: 'data:image/png;base64,' + buf.toString('base64'), boxes: boxes, ratio: clip.width / clip.height };
}

function figure(s, cls) {
  var marks = s.boxes.map(function (b) {
    return '<div class="mk" style="left:' + b.l.toFixed(2) + '%;top:' + b.t.toFixed(2) + '%;width:' + b.w.toFixed(2) + '%;height:' + b.h.toFixed(2) + '%"><span>' + b.n + '</span></div>';
  }).join('');
  return '<div class="fig ' + (cls || '') + '"><img src="' + s.src + '">' + marks + '</div>';
}

function legend(items) {
  return '<ol class="lg">' + items.map(function (t, i) { return '<li><span class="b">' + (i + 1) + '</span><div>' + t + '</div></li>'; }).join('') + '</ol>';
}

function page(kicker, title, intro, body) {
  return '<section class="pg"><p class="kick">' + kicker + '</p><h2>' + title + '</h2>' + (intro ? '<p class="intro">' + intro + '</p>' : '') + body +
    '<footer>MapaElétrica Calc | Guia visual do aplicativo</footer></section>';
}

(async function main() {
  var browser = await playwright.chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 1280, height: 2200 }, deviceScaleFactor: 2 });
  var p = await ctx.newPage();
  await p.addInitScript(function () { window.print = function () {}; try { localStorage.clear(); } catch (e) {} });

  /* Início */
  await p.goto(URL);
  var sHome = await shot(p, null, ['#search', '#chips', '.tool-card .btn-soft', '.tool-card .star', '#sidebar .nav-group:nth-of-type(3)', '#precision', '.topbar a[href="#/historico"]'], { top: true, h: 800 });

  /* Formulário preenchido */
  await p.goto(URL + '#/calc/ohm');
  await p.click('label:has(input[data-choice="mode"][value="I"])');
  await p.fill('#f-V', '12');
  await p.fill('#f-R', '6');
  var sForm = await shot(p, '#calcForm', ['[data-field="mode"]', '#f-V', '[data-unit="V"]', 'button[type="submit"]', '[data-act="example"]', '[data-act="clear"]']);
  var sHead = await shot(p, '.calc-head', ['.calc-head .kicker', '#calc-title', '.calc-head .guidance', '.calc-head .star'], { pad: 6 });

  /* Resultado */
  await p.click('button[type="submit"]');
  await p.waitForTimeout(200);
  var sRes = await shot(p, '#resultCard', ['.res-main', '.res-sub', '.diagram', '#liveTag', '[data-act="copy-result"]', '[data-act="copy-full"]', '[data-act="print"]', '[data-act="new"]']);

  /* Memória e explicação */
  var memoSel = 'section:has(#memo-title)';
  var sMemo = await shot(p, memoSel, ['.inputs-used', '.step:first-child .f-row:nth-of-type(1)', '.step:first-child .f-row:nth-of-type(2)', '.step:first-child .f-row:nth-of-type(3)']);
  var sExp = await shot(p, 'section:has(#exp-title)', ['#explainBody > p:first-child', '.formula-chips', '#explainBody > ul', '.note-edu']);

  /* Erro */
  await p.fill('#f-R', '0');
  await p.waitForTimeout(400);
  var sErr = await shot(p, '.calc-grid', ['[data-field="R"] .input-group', '#e-R', '.res-error']);

  /* Exemplo com esquema (divisor de tensão) */
  await p.goto(URL + '#/calc/vdiv');
  await p.click('[data-act="example"]');
  await p.waitForTimeout(300);
  var sEx = await shot(p, '#resultCard', ['.res-primary', '.res-list .res-row:first-child small', '.diagram svg'], { maxH: 1100 });

  /* Resistores (lista) */
  await p.goto(URL + '#/calc/resistors');
  await p.click('[data-act="example"]');
  await p.click('[data-act="add"]');
  await p.fill('#r-2', '4,7');
  await p.selectOption('[data-lu="2"]', 'k' + OHM);
  await p.waitForTimeout(400);
  var sList = await shot(p, '#calcForm', ['[data-field="type"]', '#r-2', '[data-lu="2"]', '[data-remove="2"]', '[data-act="add"]']);

  /* Impressão */
  await p.goto(URL + '#/calc/mono');
  await p.click('[data-act="example"]');
  await p.click('[data-act="print"]');
  await p.emulateMedia({ media: 'print' });
  await p.setViewportSize({ width: 900, height: 1200 });
  await p.evaluate(function () { document.getElementById('print-area').style.padding = '24px 40px'; document.body.style.background = '#fff'; });
  var sPrint = await shot(p, null, []);
  await p.emulateMedia({ media: 'screen' });
  await p.setViewportSize({ width: 1280, height: 2200 });

  /* Histórico */
  await p.goto(URL + '#/calc/powerdc');
  await p.click('[data-act="example"]');
  await p.click('button[type="submit"]');
  await p.goto(URL + '#/calc/ohm');
  await p.click('[data-act="example"]');
  await p.click('button[type="submit"]');
  await p.goto(URL + '#/historico');
  await p.waitForTimeout(200);
  var sHist = await shot(p, '.wrap', ['.hist-item:first-child .hist-meta', '.hist-item:first-child .hist-res', '.hist-item:first-child [data-reopen]', '.hist-item:first-child [data-del]', '[data-act="hist-clear"]'], { maxH: 520 });

  /* Celular */
  var mctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  var m = await mctx.newPage();
  await m.goto(URL);
  var sMob1 = await shot(m, null, ['#menuBtn', '#precision'], { top: true });
  await m.click('#menuBtn');
  await m.waitForTimeout(400);
  var sMob2 = await shot(m, null, ['#sidebar']);
  await m.click('#sidebar a[href="#/calc/energy"]');
  await m.click('[data-act="example"]');
  await m.waitForTimeout(300);
  await m.evaluate(function () { var c = document.getElementById('resultCard'); window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - 70); });
  await m.waitForTimeout(300);
  var sMob3 = await shot(m, null, ['.res-primary', '.res-sub']);
  await mctx.close();

  /* ---------------- Monta o PDF ---------------- */
  var css = fs.readFileSync(path.join(__dirname, 'guia.css'), 'utf8');
  var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>' + css + '</style></head><body>';
  html += '<section class="cover"><div><p class="kick light">Guia visual</p><h1>MapaElétrica Calc</h1><p class="sub">Kit de Calculadoras Elétricas Automáticas</p>' +
    '<p class="cv">Como abrir, preencher, calcular, conferir a resolução e salvar seus resultados.</p>' +
    '<ul class="toc"><li>1. Abrir o aplicativo</li><li>2. Página inicial</li><li>3. Preencher os dados</li><li>4. Ler o resultado</li><li>5. Memória de cálculo e explicação</li>' +
    '<li>6. Quando algo está errado</li><li>7. Exemplos, esquemas e lista de resistores</li><li>8. Copiar, imprimir e salvar PDF</li><li>9. Histórico e favoritas</li><li>10. No celular</li><li>11. Como digitar números</li></ul></div></section>';

  html += page('Passo 1', 'Abrir o aplicativo', 'O MapaElétrica Calc é um único arquivo chamado <b>index.html</b>. Não precisa instalar nada, criar conta nem ter internet.',
    '<div class="cards3"><div class="cardx"><b>No computador</b><p>Baixe o arquivo e dê dois cliques nele. Ele abre no navegador (Chrome, Edge, Firefox ou Safari).</p></div>' +
    '<div class="cardx"><b>No Android</b><p>Baixe o arquivo, abra o app "Arquivos", toque no <b>index.html</b> e escolha o Chrome.</p></div>' +
    '<div class="cardx"><b>No iPhone</b><p>Salve em "Arquivos" e toque no arquivo. Se abrir só a pré-visualização, use "Compartilhar" e "Abrir no Safari".</p></div></div>' +
    '<p class="tip"><b>Dica:</b> depois de aberto, adicione o arquivo aos favoritos do navegador para achar mais rápido.</p>' +
    '<h3>Passo 2. A página inicial</h3>' + figure(sHome) + legend([
      '<b>Busca</b>: digite o nome ou o assunto (ex.: "ohm", "kWh", "trifásico"). Funciona com ou sem acento.',
      '<b>Filtros</b>: mostram só uma categoria ou só as suas favoritas.',
      '<b>Abrir calculadora</b>: entra na ferramenta.',
      '<b>Estrela</b>: marca a calculadora como favorita.',
      '<b>Menu lateral</b>: as 12 calculadoras, sempre à mão.',
      '<b>Casas decimais</b>: escolha 2, 4 ou 6 para os resultados.',
      '<b>Histórico</b>: seus últimos 20 cálculos.']));

  html += page('Passo 3', 'Preencher os dados', 'Toda calculadora segue o mesmo padrão. No topo ficam o nome, o objetivo e uma orientação curta sobre os campos.',
    figure(sHead, 'small') + legend(['Número e categoria da calculadora.', 'Nome da calculadora.', 'Orientação sobre como preencher.', 'Estrela para favoritar.']) +
    '<div class="two"><div>' + figure(sForm) + '</div><div>' + legend([
      '<b>Modo</b>: escolha o que quer calcular. Os campos mudam conforme a escolha.',
      '<b>Campo</b>: digite o valor. Use vírgula para decimais.',
      '<b>Unidade</b>: escolha a unidade (V, mV, kV...). A conversão para o SI é automática.',
      '<b>Calcular</b>: resolve (a tecla Enter também funciona).',
      '<b>Carregar exemplo</b>: preenche e resolve um caso pronto.',
      '<b>Limpar</b>: apaga tudo para um novo cálculo.']) + '</div></div>');

  html += page('Passo 4', 'Ler o resultado', 'O resultado aparece em destaque, com a unidade mais legível (por exemplo 4 mA) e o valor no SI logo abaixo.',
    '<div class="two"><div>' + figure(sRes) + '</div><div>' + legend([
      '<b>Resultado principal</b>, em verde.',
      '<b>Outros resultados</b> calculados com os mesmos dados.',
      '<b>Esquema simplificado</b> com os valores no lugar certo.',
      '<b>Atualização automática</b>: depois do primeiro cálculo, mudou um valor, o resultado muda junto.',
      '<b>Copiar resultado</b>: grandeza, valor e unidade.',
      '<b>Copiar resolução</b>: dados, fórmulas, resultados e hipóteses.',
      '<b>Imprimir ou salvar PDF</b>: relatório limpo.',
      '<b>Fazer novo cálculo</b>: limpa os campos.']) + '</div></div>');

  html += page('Passo 5', 'Memória de cálculo e explicação', 'Abaixo do resultado fica a resolução completa, do jeito que você escreveria no caderno.',
    figure(sMemo) + legend(['<b>Dados utilizados</b>, com a conversão para o SI quando a unidade tem prefixo.', '<b>Fórmula</b> geral.', '<b>Substituição</b> dos números.', '<b>Resultado</b> da etapa.']) +
    figure(sExp) + legend(['<b>Explicação</b> do resultado em linguagem simples.', '<b>Fórmulas</b> usadas pela calculadora.', '<b>Hipóteses e limitações</b> do modelo.', 'Aviso de uso educacional.']));

  html += page('Passo 6', 'Quando algo está errado', 'Se faltar um dado ou um valor não fizer sentido, o app não mostra resultado. Ele aponta o campo e explica o que fazer.',
    figure(sErr) + legend(['O <b>campo com problema</b> fica com borda vermelha.', 'A <b>mensagem</b> explica a correção (aqui, resistência zero causaria divisão por zero).', 'O <b>painel de resultado</b> mostra a lista do que corrigir. Resultados antigos somem para não confundir.']) +
    '<p class="tip"><b>Mensagens comuns:</b> campo vazio, texto no lugar de número, valor negativo onde não cabe, fator de potência fora de 0 a 1, mais de 24 horas de uso por dia e unidades de grandezas diferentes no conversor.</p>');

  html += page('Passo 7', 'Exemplos, esquemas e lista de resistores', '"Carregar exemplo" é a forma mais rápida de entender uma calculadora. Nos circuitos, o esquema mostra cada valor no lugar.',
    '<div class="two"><div>' + figure(sEx) + legend(['Resultados principais lado a lado.', 'Valor convertido para o SI (ex.: 4 mA = 0,004 A).', 'Esquema do circuito com tensões, corrente e resistores.']) + '</div><div>' +
    figure(sList) + legend(['Série ou paralelo.', 'Valor de cada resistor.', 'Unidade própria para cada um (Ω, kΩ, MΩ).', 'Remover um resistor (mínimo de 2).', 'Adicionar resistor (até 10).']) + '</div></div>');

  html += page('Passo 8', 'Copiar, imprimir e salvar PDF', 'O botão <b>Imprimir ou salvar PDF</b> monta um relatório limpo, sem menus. Na janela de impressão, escolha "Salvar como PDF" no destino.',
    '<div class="two"><div>' + figure(sPrint, 'paper') + '</div><div class="steps">' +
    '<p><b>O relatório traz</b></p><ul><li>Nome do produto, data e hora</li><li>Título e objetivo da calculadora</li><li>Dados de entrada</li><li>Resultados</li><li>Esquema ou triângulo, quando houver</li><li>Memória de cálculo completa</li><li>Explicação e hipóteses</li><li>Aviso de uso educacional</li></ul>' +
    '<p><b>Copiar resolução</b> leva o mesmo conteúdo em texto. É só colar no Word, no Google Docs ou numa mensagem.</p></div></div>');

  html += page('Passo 9', 'Histórico e favoritas', 'O histórico guarda os últimos 20 cálculos neste navegador. Nada é enviado para a internet.',
    figure(sHist) + legend(['Data e hora do cálculo.', 'Dados e resultado principal.', '<b>Reabrir</b>: volta à calculadora com os mesmos dados.', '<b>Excluir</b> um registro.', '<b>Limpar histórico</b> (pede confirmação).']) +
    '<p class="tip"><b>Favoritas:</b> toque na estrela de uma calculadora e ela aparece no topo do menu lateral. Em janela anônima, histórico e favoritas valem só até fechar a página.</p>');

  html += page('Passo 10', 'No celular', 'O layout se ajusta à tela. O menu vira um botão e os resultados ficam um embaixo do outro.',
    '<div class="phones"><div>' + figure(sMob1, 'phone') + legend(['Botão do menu', 'Casas decimais']) + '</div>' +
    '<div>' + figure(sMob2, 'phone') + legend(['Menu aberto, com todas as calculadoras']) + '</div>' +
    '<div>' + figure(sMob3, 'phone') + legend(['Resultado em destaque', 'Outros resultados, um embaixo do outro']) + '</div></div>');

  html += page('Passo 11', 'Como digitar números', 'O app segue o padrão brasileiro e nunca adivinha um número ambíguo em silêncio.',
    '<table class="nums"><tr><th>Você digita</th><th>O app entende</th></tr>' +
    '<tr><td>0,5</td><td>zero vírgula cinco</td></tr><tr><td>0.5</td><td>zero vírgula cinco (sem dúvida)</td></tr>' +
    '<tr><td>1.234,5</td><td>mil duzentos e trinta e quatro vírgula cinco</td></tr><tr><td>1500</td><td>mil e quinhentos</td></tr>' +
    '<tr><td>4,7e-6</td><td>4,7 × 10⁻⁶ (notação científica)</td></tr>' +
    '<tr class="warn"><td>1.500</td><td>recusado: pode ser mil e quinhentos ou um e meio. Escreva 1500 ou 1,5</td></tr></table>' +
    '<h3>Aviso importante</h3><p class="intro">O MapaElétrica Calc é uma ferramenta educacional para estudar e conferir exercícios. As fórmulas usam modelos ideais. Os resultados não substituem normas técnicas, projetos, medições nem profissionais habilitados, e não devem ser usados para dimensionar condutores, disjuntores ou proteções.</p>');

  html += '</body></html>';
  var tmpHtml = path.join(__dirname, '.guia-app.html');
  fs.writeFileSync(tmpHtml, html);
  var pp = await ctx.newPage();
  await pp.goto('file://' + tmpHtml);
  await pp.waitForTimeout(500);
  await pp.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  fs.unlinkSync(tmpHtml);
  await browser.close();
  console.log('Guia gerado:', path.relative(ROOT, OUT));
})().catch(function (e) { console.error(e); process.exit(1); });
