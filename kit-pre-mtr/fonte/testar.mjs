// Testes funcionais do HTML interativo do Kit Pré-MTR.
// Uso: node testar.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = playwright;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.resolve(aqui, '..', 'Kit_Pre_MTR_15_Formularios.html')).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-pre-mtr-'));

let falhas = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) falhas++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const erros = [];
const externos = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) externos.push(r.url()); });
let respostaDialogo = true;
page.on('dialog', (d) => (respostaDialogo ? d.accept() : d.dismiss()));
await page.goto(url);
await page.evaluate(() => document.fonts.ready);

// ------------------------------------------------ estrutura
const est = await page.evaluate(() => {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  const forms = [...document.querySelectorAll('.form')];
  const nomesFora = forms.flatMap((f) => [...f.querySelectorAll('[name]')].filter((el) => !el.name.startsWith(f.id + '-')).map((el) => el.name));
  const porCat = {};
  forms.forEach((f) => { porCat[f.dataset.cat] = (porCat[f.dataset.cat] || 0) + 1; });
  const rotulos = forms.flatMap((f) => [...f.querySelectorAll('input:not([type=radio]):not([type=checkbox]), textarea')]
    .filter((el) => !el.closest('.tbl') && !(el.id && document.querySelector(`label[for="${el.id}"]`)))).length;
  return { dup, n: forms.length, codigos: forms.map((f) => f.dataset.form).join(','), porCat, nomesFora, rotulos };
});
ok(est.n === 15 && est.codigos === Array.from({ length: 15 }, (_, i) => 'F' + String(i + 1).padStart(2, '0')).join(','), `15 formulários numerados de F01 a F15`);
ok(JSON.stringify(est.porCat) === '{"01":5,"02":5,"03":5}', `3 categorias com 5 formulários cada ${JSON.stringify(est.porCat)}`);
ok(est.dup.length === 0, `identificadores únicos no documento ${est.dup.slice(0, 5)}`);
ok(est.nomesFora.length === 0, `todos os campos têm nome com o prefixo do próprio formulário ${est.nomesFora.slice(0, 3)}`);
ok(est.rotulos === 0, `todo campo de texto fora das tabelas tem rótulo associado (${est.rotulos} sem rótulo)`);

// ------------------------------------------------ navegação pelo índice
let abertos = 0;
for (let i = 1; i <= 15; i++) {
  const id = 'f' + String(i).padStart(2, '0');
  await page.goto(url);
  await page.locator(`.fcard a[href="#${id}"]`).click();
  await page.waitForFunction((x) => document.getElementById(x).classList.contains('ativo'), id, { timeout: 3000 }).catch(() => {});
  const vis = await page.evaluate(() => [...document.querySelectorAll('.form')].filter((f) => getComputedStyle(f).display !== 'none').map((f) => f.id));
  if (vis.length === 1 && vis[0] === id) abertos++; else console.log("   ", id, vis, await page.evaluate(() => location.hash));
}
ok(abertos === 15, `os 15 cartões "Abrir formulário" abrem o formulário certo, um de cada vez (${abertos}/15)`);
await page.locator('.ftools .ft-btn.ghost').click();
await page.waitForFunction(() => document.documentElement.dataset.view === 'home', null, { timeout: 3000 }).catch(() => {});
ok(await page.evaluate(() => document.documentElement.dataset.view === 'home'), 'botão Índice volta à página inicial');
await page.selectOption('#ir-para', 'f07');
await page.waitForFunction(() => document.querySelector('#f07').classList.contains('ativo'), null, { timeout: 3000 }).catch(() => {});
ok(await page.evaluate(() => document.querySelector('#f07').classList.contains('ativo')), 'seletor da barra superior abre o F07');
await page.locator('[data-next]').click();
await page.waitForFunction(() => location.hash === '#f08', null, { timeout: 3000 }).catch(() => {});
ok(await page.evaluate(() => location.hash === '#f08'), 'seta de próximo leva do F07 ao F08');

// ------------------------------------------------ preenchimento em todos os formulários
let preenchidos = 0;
for (let i = 1; i <= 15; i++) {
  const id = 'f' + String(i).padStart(2, '0');
  await page.goto(url + '#' + id);
  await page.locator(`#${id} .fh-reg input`).fill(`REG-${i}`);
  const txt = page.locator(`#${id} .fld input[type=text]:not([list])`).first();
  await txt.fill(`Texto do ${id}`);
  const data = page.locator(`#${id} .fld input[type=date]`).first();
  if (await data.count()) await data.fill('2026-10-23');
  const chip = page.locator(`#${id} .chips .chip`).first();
  if (await chip.count()) await chip.click();
  const ta = page.locator(`#${id} textarea`).first();
  if (await ta.count()) await ta.fill('Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5\nLinha 6');
  const lido = await page.evaluate((x) => window.KitPreMTR.ler(x), id);
  const campos = Object.values(lido.campos);
  if (campos.includes(`Texto do ${id}`) && campos.includes(`REG-${i}`) && (!(await data.count()) || campos.includes('2026-10-23'))) preenchidos++;
}
ok(preenchidos === 15, `digitação, datas e seleção funcionam nos 15 formulários (${preenchidos}/15)`);
const taAltura = await page.evaluate(() => { const t = document.querySelector('#f15 textarea'); return t.scrollHeight <= t.clientHeight + 2; });
ok(taAltura, 'áreas de texto crescem com o conteúdo, sem esconder linhas');

// checkboxes múltiplos (F13)
await page.goto(url + '#f13');
await page.locator('#f13 .chips.col .chip').nth(2).click();
await page.locator('#f13 .chips.col .chip').nth(4).click();
const tipos = (await page.evaluate(() => window.KitPreMTR.ler('f13'))).campos['f13-tipo'];
ok(Array.isArray(tipos) && tipos.includes('Divergência de informação ou documento') && tipos.includes('Dificuldade de acesso ao local'), `caixas de seleção múltipla registram as duas marcações (${JSON.stringify(tipos)})`);

// ------------------------------------------------ tabelas dinâmicas
const tabelas = await page.evaluate(() => [...document.querySelectorAll('.tbl')].map((t) => t.closest('.form').id + '|' + t.id));
let tabOk = 0;
for (const par of tabelas) {
  const [fid, tid] = par.split('|');
  await page.goto(url + '#' + fid);
  const linhas = () => page.locator(`#${tid} tbody tr`).count();
  const antes = await linhas();
  await page.locator(`#${tid} [data-add]`).click();
  await page.locator(`#${tid} [data-add]`).click();
  const depoisAdd = await linhas();
  const ultima = page.locator(`#${tid} tbody tr`).last();
  const campo = ultima.locator('input[type=text]').first();
  await campo.fill('linha nova');
  const tri = ultima.locator('.tri-o, .c-op .chip').first();
  if (await tri.count()) await tri.click();
  respostaDialogo = true;
  await ultima.locator('[data-del]').click();
  const depoisDel = await linhas();
  const nums = await page.locator(`#${tid} tbody td.c-n`).allTextContents();
  const seq = nums.every((n, i) => n === String(i + 1));
  if (depoisAdd === antes + 2 && depoisDel === antes + 1 && seq) tabOk++;
  else console.log('   ', tid, { antes, depoisAdd, depoisDel, seq });
}
ok(tabOk === tabelas.length, `adicionar e remover linhas funciona em todas as ${tabelas.length} tabelas, com numeração refeita (${tabOk})`);
// remover com recusa mantém a linha
await page.goto(url + '#f03');
await page.locator('#f03-itens tbody tr').first().locator('input[type=text]').first().fill('não apagar');
respostaDialogo = false;
const n1 = await page.locator('#f03-itens tbody tr').count();
await page.locator('#f03-itens tbody tr').first().locator('[data-del]').click();
ok(await page.locator('#f03-itens tbody tr').count() === n1, 'remover linha preenchida pede confirmação e respeita o "Cancelar"');
respostaDialogo = true;

// ------------------------------------------------ cálculo F12
await page.goto(url + '#f12');
await page.fill('#f12-q1', '1.250,5'); await page.fill('#f12-u1', 'kg');
await page.fill('#f12-q2', '1200'); await page.fill('#f12-u2', 'kg');
const r1 = await page.locator('#f12-diferenca').textContent();
await page.fill('#f12-u2', 't');
const r2 = await page.locator('#f12-diferenca').textContent();
ok(/^-50,5 kg/.test(r1), `F12 calcula a diferença com unidades iguais: "${r1}"`);
ok(/Não calculada/.test(r2), `F12 não calcula com unidades diferentes: "${r2.slice(0, 50)}..."`);
await page.fill('#f12-u2', 'kg');

// ------------------------------------------------ impressão individual com dados
await page.goto(url + '#f05');
await page.fill('#f05-empresa', 'Empresa Teste Impressão');
await page.evaluate(() => { window.__printou = 0; window.print = () => { window.__printou++; }; });
await page.locator('[data-acao="imprimir"]').click();
const estadoImp = await page.evaluate(() => ({
  printou: window.__printou,
  modo: document.documentElement.classList.contains('pm-one'),
  alvos: [...document.querySelectorAll('.form.alvo')].map((f) => f.id),
}));
ok(estadoImp.printou === 1 && estadoImp.modo && estadoImp.alvos.join() === 'f05', 'botão "Imprimir ou salvar em PDF" prepara somente o formulário aberto');
await page.emulateMedia({ media: 'print' });
const pdfUm = path.join(tmp, 'f05.pdf');
await page.pdf({ path: pdfUm, preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
const txtUm = execFileSync('pdftotext', [pdfUm, '-'], { encoding: 'utf8' });
const pags = parseInt(execFileSync('pdfinfo', [pdfUm], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)[1], 10);
ok(txtUm.includes('Empresa Teste Impressão') && txtUm.includes('Agendamento de coleta') && !txtUm.includes('Ficha cadastral do transportador') && !txtUm.includes('KIT PRÉ-MTR'),
  `PDF do formulário individual traz os dados digitados e nenhum outro formulário (${pags} página)`);
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
ok(await page.evaluate(() => !document.documentElement.classList.contains('pm-one') && !document.querySelector('.form.alvo')), 'depois da impressão o modo volta ao normal');
ok(await page.inputValue('#f05-empresa') === 'Empresa Teste Impressão', 'imprimir não apaga os dados');
// atalho Ctrl+P do navegador também imprime só o formulário aberto
await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
ok(await page.evaluate(() => document.documentElement.classList.contains('pm-one') && document.querySelector('.form.alvo').id === 'f05'), 'impressão pelo atalho do navegador também se limita ao formulário aberto');
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
// controles ocultos na impressão
await page.emulateMedia({ media: 'print' });
const ctrl = await page.evaluate(() => [...document.querySelectorAll('.appbar, .ftools, .btn-add, .btn-del, .side')].filter((e) => getComputedStyle(e).display !== 'none').length);
await page.emulateMedia({ media: 'screen' });
ok(ctrl === 0, 'botões e barras da interface não aparecem na impressão');

// ------------------------------------------------ exportar
await page.goto(url + '#f06');
await page.fill('#f06-razao', 'Transportadora Exemplo de Teste');
await page.locator('#f06-docs tbody tr').first().locator('.tri-o').nth(1).click();
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.appbar [data-acao="exportar-todos"]').click()]);
const arqJson = path.join(tmp, await dl.suggestedFilename());
await dl.saveAs(arqJson);
const pacote = JSON.parse(fs.readFileSync(arqJson, 'utf8'));
ok(pacote.kit === 'kit-pre-mtr' && Object.keys(pacote.formularios).length === 15, `exportação gera ${path.basename(arqJson)} com os 15 formulários`);
ok(pacote.formularios.F06.campos['f06-razao'] === 'Transportadora Exemplo de Teste' && pacote.formularios.F06.tabelas.docs[0].situacao === 'Pendente', 'arquivo exportado contém campos e tabelas preenchidos');
const [dl1] = await Promise.all([page.waitForEvent('download'), page.locator('.ftools [data-acao="exportar-um"]').click()]);
const arqUm = path.join(tmp, await dl1.suggestedFilename());
await dl1.saveAs(arqUm);
ok(Object.keys(JSON.parse(fs.readFileSync(arqUm, 'utf8')).formularios).join() === 'F06', `exportar só o formulário aberto gera ${path.basename(arqUm)}`);

// ------------------------------------------------ limpar
respostaDialogo = false;
await page.locator('[data-acao="limpar"]').click();
ok(await page.inputValue('#f06-razao') === 'Transportadora Exemplo de Teste', 'limpar pede confirmação e "Cancelar" mantém os dados');
respostaDialogo = true;
await page.locator('[data-acao="limpar"]').click();
const limpo = await page.evaluate(() => window.KitPreMTR.vazio('f06'));
const sugestoes = await page.locator('#f06-docs tbody tr').first().locator('input[type=text]').first().inputValue();
ok(limpo && sugestoes.startsWith('Licença'), 'limpar esvazia o formulário e restaura as linhas sugeridas da tabela');
ok(await page.evaluate(() => window.KitPreMTR.ler('f05').campos['f05-empresa']) === 'Empresa Teste Impressão', 'limpar um formulário não altera os outros');

// ------------------------------------------------ rascunho no navegador
await page.waitForTimeout(700);
await page.reload();
ok(await page.evaluate(() => window.KitPreMTR.ler('f05').campos['f05-empresa']) === 'Empresa Teste Impressão', 'rascunho local recupera os dados ao reabrir o arquivo');

// ------------------------------------------------ importar em outro navegador
const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const p2 = await ctx2.newPage();
p2.on('dialog', (d) => d.accept());
p2.on('pageerror', (e) => erros.push(e.message));
await p2.goto(url);
ok(await p2.evaluate(() => window.KitPreMTR.vazio('f06')), 'em um navegador novo os formulários começam vazios');
const [chooser] = await Promise.all([p2.waitForEvent('filechooser'), p2.locator('.appbar [data-acao="importar"]').click()]);
await chooser.setFiles(arqJson);
await p2.waitForTimeout(400);
const imp = await p2.evaluate(() => ({ f06: window.KitPreMTR.ler('f06'), f03: window.KitPreMTR.ler('f03') }));
ok(imp.f06.campos['f06-razao'] === 'Transportadora Exemplo de Teste' && imp.f06.tabelas.docs[0].situacao === 'Pendente', 'importação restaura campos e marcações de tabela');
const linhasOrig = pacote.formularios.F03.tabelas.itens.length;
ok(imp.f03.tabelas.itens.length === linhasOrig, `importação recria o número de linhas das tabelas (${imp.f03.tabelas.itens.length}/${linhasOrig})`);
fs.writeFileSync(path.join(tmp, 'ruim.json'), '{"qualquer":1}');
const [ch2] = await Promise.all([p2.waitForEvent('filechooser'), p2.locator('.appbar [data-acao="importar"]').click()]);
await ch2.setFiles(path.join(tmp, 'ruim.json'));
await p2.waitForTimeout(300);
ok(/não foi exportado/.test(await p2.locator('#toast').textContent()), 'arquivo que não é do kit é recusado com aviso');
await ctx2.close();

// ------------------------------------------------ celular
const cel = await browser.newPage({ viewport: { width: 390, height: 844 } });
let semRolagem = 0;
for (const h of ['inicio', ...Array.from({ length: 15 }, (_, i) => 'f' + String(i + 1).padStart(2, '0'))]) {
  await cel.goto(url + '#' + h);
  const [sw, cw] = await cel.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  if (sw <= cw) semRolagem++; else console.log('   rolagem lateral em', h, sw, cw);
}
ok(semRolagem === 16, `celular (390 px) sem rolagem lateral na página inicial e nos 15 formulários (${semRolagem}/16)`);

ok(erros.length === 0, `nenhum erro de JavaScript ${erros.slice(0, 3)}`);
ok(externos.length === 0, `nenhuma requisição externa durante o uso ${externos.slice(0, 3)}`);

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} teste(s) com falha.` : '\nTodos os testes passaram.');
process.exitCode = falhas ? 1 : 0;
