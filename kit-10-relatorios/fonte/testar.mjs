// Testes funcionais da Central de Relatórios.
// Uso: node testar.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = playwright;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.resolve(aqui, '..', 'Kit_10_Relatorios_Gestao_Residuos.html')).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-rel-'));

// logotipo de teste: PNG 4x4 gerado aqui mesmo
function png() {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (tipo, dados) => { const len = Buffer.alloc(4); len.writeUInt32BE(dados.length); const td = Buffer.concat([Buffer.from(tipo), dados]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(4, 0); ihdr.writeUInt32BE(4, 4); ihdr[8] = 8; ihdr[9] = 2;
  const linhas = Buffer.concat(Array.from({ length: 4 }, () => Buffer.from([0, 16, 60, 57, 230, 181, 102, 16, 60, 57, 230, 181, 102])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(linhas)), chunk('IEND', Buffer.alloc(0))]);
}
const logoArq = path.join(tmp, 'logo.png');
fs.writeFileSync(logoArq, png());

let falhas = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) falhas++; };
const esperar = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 3000 }).catch(() => {});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true, locale: 'pt-BR' });
const page = await ctx.newPage();
const erros = [], externos = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) externos.push(r.url()); });
let resposta = true;
page.on('dialog', (d) => (resposta ? d.accept() : d.dismiss()));
await page.goto(url);
await page.evaluate(() => document.fonts.ready);

async function abrirRel(id) {
  await page.evaluate((i) => { location.hash = i; }, id);
  await esperar(page, (i) => document.getElementById(i).classList.contains('ativo'), id);
}
async function preencherLinha(tid, i, valores) {
  const reg = page.locator(`#${tid} tbody.reg`).nth(i);
  for (const [k, v] of Object.entries(valores)) {
    const el = reg.locator(`[data-col="${k}"]`);
    if ((await el.evaluate((e) => e.tagName)) === 'SELECT') await el.selectOption(v);
    else await el.fill(v);
  }
}
const kpis = (id) => page.evaluate((i) => [...document.querySelectorAll(`#${i} .kpi`)].map((k) => k.querySelector('.kpi-l').textContent + ': ' + (k.querySelector('.kpi-v')?.innerText.replace(/\n/g, ' | ') ?? k.querySelector('.kpi-in').value)), id);

// ------------------------------------------------ estrutura
const est = await page.evaluate(() => {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  const rels = [...document.querySelectorAll('.rel')];
  const fora = rels.flatMap((r) => [...r.querySelectorAll('[name]')].filter((el) => !el.name.startsWith(r.id + '-')).map((el) => el.name));
  const semRotulo = rels.flatMap((r) => [...r.querySelectorAll('input:not([type=checkbox]), textarea, select')].filter((el) => {
    if (el.closest('.tbl')) return !el.getAttribute('aria-label');
    return !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.getAttribute('aria-label');
  })).length;
  const textos = rels.map((r) => r.querySelectorAll('textarea[data-base]').length);
  return { dup: ids.filter((v, i) => ids.indexOf(v) !== i), n: rels.length, cods: rels.map((r) => r.dataset.rel).join(','), fora, semRotulo, textos, titulos: rels.map((r) => r.querySelector('.rh h2').textContent) };
});
ok(est.n === 10 && est.cods === 'R01,R02,R03,R04,R05,R06,R07,R08,R09,R10', '10 relatórios numerados de 01 a 10');
ok(new Set(est.titulos).size === 10, 'títulos dos 10 relatórios são distintos');
ok(est.dup.length === 0, `identificadores únicos ${est.dup.slice(0, 4)}`);
ok(est.fora.length === 0, 'campos de cada relatório têm nomes próprios, sem conflito com outro relatório');
ok(est.semRotulo === 0, `todo campo tem rótulo (${est.semRotulo} sem rótulo)`);
ok(est.textos.every((n) => n >= 2), `todos os relatórios têm textos-base editáveis (${est.textos.join(', ')})`);
const kpiInicial = await page.evaluate(() => [...document.querySelectorAll('.kpi-v')].filter((k) => /\d/.test(k.textContent)).length);
ok(kpiInicial === 0, 'nenhum indicador mostra número antes do preenchimento (sem dados fictícios)');

// ------------------------------------------------ abrir pelos cartões
let abertos = 0;
for (let i = 1; i <= 10; i++) {
  const id = 'r' + String(i).padStart(2, '0');
  await page.evaluate(() => { location.hash = 'inicio'; });
  await page.locator(`.rcard a[href="#${id}"]`).click();
  await esperar(page, (x) => document.getElementById(x).classList.contains('ativo'), id);
  const vis = await page.evaluate(() => [...document.querySelectorAll('.rel')].filter((r) => getComputedStyle(r).display !== 'none').map((r) => r.id));
  if (vis.length === 1 && vis[0] === id) abertos++;
}
ok(abertos === 10, `os 10 botões "Abrir relatório" abrem o modelo certo (${abertos}/10)`);

// ------------------------------------------------ dados da empresa e logotipo
await page.evaluate(() => { location.hash = 'perfil'; });
await page.fill('#perfil-empresa', 'Empresa de Teste');
await page.fill('#perfil-unidade', 'Unidade Norte');
await page.fill('#perfil-responsavel', 'Responsável Teste');
await page.fill('#perfil-cargo', 'Analista ambiental');
await page.fill('#perfil-cliente', 'Cliente de Teste');
await page.fill('#perfil-consultoria', 'Consultoria de Teste');
await page.setInputFiles('#logo-arquivo', logoArq);
await esperar(page, () => [...document.querySelectorAll('img.logo-img')].every((i) => i.src.startsWith('data:image/png')));
const logos = await page.evaluate(() => [...document.querySelectorAll('img.logo-img')].filter((i) => i.src.startsWith('data:image/png') && !i.hidden).length);
ok(logos === 13, `logotipo inserido aparece na central e nos cabeçalhos e capas dos 10 relatórios (${logos} imagens)`);

// ------------------------------------------------ relatório 01: indicadores e gráfico
await abrirRel('r01');
await page.locator('#r01 [data-acao="perfil"]').click();
ok(await page.inputValue('#r01-empresa') === 'Empresa de Teste' && await page.inputValue('#r01-elaborado') === 'Responsável Teste' && await page.inputValue('#r01-resp_cargo') === 'Analista ambiental',
  '"Usar dados salvos da empresa" preenche a identificação e o responsável');
await page.fill('#r01-per_ini', '2026-09-01');
await page.fill('#r01-per_fim', '2026-09-30');
await preencherLinha('r01-tipos', 0, { residuo: 'Papelão', quantidade: '1.250,5', unidade: 'kg' });
await preencherLinha('r01-tipos', 1, { residuo: 'Plástico', quantidade: '300', unidade: 'kg' });
await preencherLinha('r01-tipos', 2, { residuo: 'Óleo usado', quantidade: '2', unidade: 'm³' });
await preencherLinha('r01-tipos', 3, { residuo: 'Sucata', quantidade: '5' });
await preencherLinha('r01-movs', 0, { data: '2026-09-05', referencia: 'MTR-A', residuo: 'Papelão', situacao: 'Recebimento informado' });
await preencherLinha('r01-movs', 1, { data: '2026-09-12', referencia: 'MTR-B', residuo: 'Plástico', situacao: 'Pendente de conferência' });
await preencherLinha('r01-docs', 0, { quantidade: '2' });
await preencherLinha('r01-docs', 1, { quantidade: '1' });
await preencherLinha('r01-pend', 0, { pendencia: 'CDF do MTR-B', situacao: 'Aberta' });
await page.fill('#r01-coletas', '3');
await page.waitForTimeout(300);
const k1 = await kpis('r01');
ok(k1[0].includes('1.550,5kg') && k1[0].includes('2m³'), `quantidades somadas só dentro da mesma unidade: "${k1[0]}"`);
ok(await page.locator('#r01 .kpi').first().locator('.kpi-n').textContent() === '1 registro sem unidade não somado', 'registro sem unidade fica fora da soma, com aviso');
ok(k1[1].endsWith(': 2') && k1[3].endsWith(': 3') && k1[4].endsWith(': 1'), `movimentações, documentos e pendências calculados: ${k1.slice(1).join(' / ')}`);
const g1 = await page.evaluate(() => { const f = document.querySelector('#r01 figure.graf'); return { svgs: f.querySelectorAll('.graf-c svg').length, tem: f.classList.contains('tem-dados'), txt: f.textContent }; });
ok(g1.svgs === 2 && g1.tem && g1.txt.includes('Quantidades em kg') && g1.txt.includes('Quantidades em m³'), 'gráfico por tipo de resíduo gera um gráfico por unidade de medida');
ok(await page.evaluate(() => document.querySelectorAll('#r01-movs tbody.reg.atencao').length) === 1, 'movimentação "Pendente de conferência" fica destacada na tabela');
ok((await page.locator('#r01 .rh-vivo').textContent()).includes('Empresa de Teste') && (await page.locator('#r01 .rh-vivo').textContent()).includes('01/09/2026'), 'cabeçalho mostra empresa e período preenchidos');

// textos-base: editar e restaurar
const base = await page.locator('#r01-resumo').getAttribute('data-base');
await page.fill('#r01-resumo', 'Texto ajustado pelo responsável.');
resposta = true;
await page.locator('#r01 [data-restaurar="r01-resumo"]').click();
ok(await page.inputValue('#r01-resumo') === base, 'texto-base pode ser editado e restaurado');
await page.fill('#r01-resumo', 'Resumo do mês de setembro com três coletas.');

// ------------------------------------------------ adicionar e remover registros em todas as tabelas
const tabelas = await page.evaluate(() => [...document.querySelectorAll('.tbl')].map((t) => t.closest('.rel').id + '|' + t.id));
let tabOk = 0;
for (const par of tabelas) {
  const [rid, tid] = par.split('|');
  await abrirRel(rid);
  const n = () => page.locator(`#${tid} tbody.reg`).count();
  const antes = await n();
  await page.locator(`#${tid} [data-add]`).click();
  await page.locator(`#${tid} [data-add]`).click();
  const d1 = await n();
  const ult = page.locator(`#${tid} tbody.reg`).last();
  const campo = ult.locator('input[type=text]').first();
  if (await campo.count()) await campo.fill('registro novo');
  resposta = true;
  await ult.locator('[data-del]').click();
  const d2 = await n();
  const nums = await page.locator(`#${tid} tbody.reg .r-main td.c-n`).allTextContents();
  if (d1 === antes + 2 && d2 === antes + 1 && nums.every((x, i) => x === String(i + 1))) tabOk++;
  else console.log('   ', tid, { antes, d1, d2 });
}
ok(tabOk === tabelas.length, `adicionar e remover registros funciona nas ${tabelas.length} tabelas, com numeração refeita (${tabOk})`);
await abrirRel('r01');
resposta = false;
const nAntes = await page.locator('#r01-tipos tbody.reg').count();
await page.locator('#r01-tipos tbody.reg').first().locator('[data-del]').click();
ok(await page.locator('#r01-tipos tbody.reg').count() === nAntes, 'remover registro preenchido pede confirmação e respeita o "Cancelar"');
resposta = true;

// ------------------------------------------------ demais relatórios
await abrirRel('r03');
await preencherLinha('r03-cdfs', 0, { cdf: 'CDF-1', residuo: 'Papelão', quantidade: '1', unidade: 't', destinador: 'Dest A', modalidade: 'Reciclagem', situacao: 'Disponível' });
await preencherLinha('r03-cdfs', 1, { cdf: 'CDF-2', residuo: 'Papelão', quantidade: '0,5', unidade: 't', destinador: 'Dest A', modalidade: 'Reciclagem', situacao: 'Em verificação' });
await preencherLinha('r03-cdfs', 2, { cdf: 'CDF-3', residuo: 'Lodo', quantidade: '800', unidade: 'kg', destinador: 'Dest B', modalidade: 'Tratamento' });
await page.waitForTimeout(250);
const r3 = await page.evaluate(() => ({ resumo: document.querySelector('#r03 [data-resumo]').innerText, lista: document.querySelector('#r03 [data-lista]').innerText }));
ok(/Reciclagem\s+2\s+1,5 t/.test(r3.resumo) && /Tratamento\s+1\s+800 kg/.test(r3.resumo), 'R03: resumo por modalidade soma por modalidade e unidade');
ok(r3.lista.includes('CDF-2') && r3.lista.includes('CDF-3') && !r3.lista.includes('CDF-1'), 'R03: lista de certificados pendentes inclui só os não disponíveis');
const k3 = await kpis('r03');
ok(k3[0].endsWith(': 3') && k3[1].endsWith(': 1') && k3[2].endsWith(': 1') && k3[3].endsWith(': 2'), `R03: indicadores ${k3.slice(0, 4).join(' / ')}`);

await abrirRel('r04');
await preencherLinha('r04-pend', 0, { descricao: 'Falta CDF', situacao: 'Aberta' });
await preencherLinha('r04-pend', 1, { descricao: 'Placa divergente', situacao: 'Verificação adicional' });
await preencherLinha('r04-pend', 2, { descricao: 'Ticket recebido', situacao: 'Resolução informada' });
await page.waitForTimeout(250);
const k4 = await kpis('r04');
ok(k4.map((k) => k.split(': ')[1]).join(',') === '3,1,1,1', `R04: indicadores por situação ${k4.join(' / ')}`);
ok(await page.evaluate(() => document.querySelector('#r04 figure.graf svg') !== null), 'R04: gráfico de pendências por situação é gerado');

await abrirRel('r05');
await preencherLinha('r05-coletas', 0, { data: '2026-08-10', origem: 'Unidade A', residuo: 'Papelão', quantidade: '200', unidade: 'kg', transportador: 'Trans X' });
await preencherLinha('r05-coletas', 1, { data: '2026-09-02', origem: 'Unidade B', residuo: 'Papelão', quantidade: '150', unidade: 'kg', transportador: 'Trans X' });
await preencherLinha('r05-coletas', 2, { data: '2026-09-20', origem: 'Unidade A', residuo: 'Vidro', quantidade: '1', unidade: 't', transportador: 'Trans Y' });
await page.waitForTimeout(250);
const k5 = await kpis('r05');
const g5 = await page.evaluate(() => document.querySelector('#r05 figure.graf').textContent);
ok(k5[0].endsWith(': 3') && k5[2].endsWith(': 2') && k5[3].endsWith(': 2'), `R05: indicadores ${k5.join(' / ')}`);
ok(g5.includes('ago/26') && g5.includes('set/26'), 'R05: gráfico de evolução mensal com agosto e setembro');

await abrirRel('r07');
await preencherLinha('r07-dest', 0, { empresa: 'Recicla Ltda', residuos: 'Papelão', quantidade: '2', unidade: 't', situacao: 'Sem pendências registradas' });
await preencherLinha('r07-dest', 1, { empresa: 'Recicla Ltda', residuos: 'Plástico', quantidade: '0,5', unidade: 't', situacao: 'Com pendências registradas' });
await preencherLinha('r07-dest', 2, { empresa: 'Trata SA', residuos: 'Lodo', quantidade: '900', unidade: 'kg' });
await page.waitForTimeout(250);
const c7 = await page.evaluate(() => [...document.querySelectorAll('#r07 .dcard')].map((c) => c.innerText.replace(/\n/g, ' ')));
ok(c7.length === 2 && c7[0].includes('2,5 t') && c7[0].includes('Papelão, Plástico') && c7[1].includes('900 kg'), 'R07: um cartão por destinador, com resíduos e quantidades por unidade');

await abrirRel('r08');
await preencherLinha('r08-comp', 0, { residuo: 'Papelão', unidade: 'kg', anterior: '100', atual: '120' });
await preencherLinha('r08-comp', 1, { residuo: 'Vidro', unidade: 't', anterior: '2', atual: '1,5' });
await page.fill('#r08-per_ant', 'Agosto/2026');
await page.fill('#r08-per_atual', 'Setembro/2026');
await page.waitForTimeout(250);
const v8 = await page.locator('#r08-comp output[data-var]').allTextContents();
const g8 = await page.evaluate(() => document.querySelectorAll('#r08 figure.graf')[1].textContent);
ok(v8[0] === '+20 kg (+20%)' && v8[1] === '-0,5 t (-25%)', `R08: variação linha a linha na mesma unidade (${v8.slice(0, 2).join(' | ')})`);
ok(g8.includes('Agosto/2026') && g8.includes('Setembro/2026') && g8.includes('Quantidades em kg') && g8.includes('Quantidades em t'), 'R08: gráfico de comparação separado por unidade, com os nomes dos períodos');
const vazio8 = await page.evaluate(() => { const f = document.querySelectorAll('#r08 figure.graf')[0]; return !f.classList.contains('tem-dados') && getComputedStyle(f.querySelector('.vazio')).display !== 'none'; });
ok(vazio8, 'R08: gráfico sem dados mostra estado vazio com instrução');

await abrirRel('r09');
await page.locator('#r09 [data-acao="perfil"]').click();
ok(await page.inputValue('#r09-empresa') === 'Cliente de Teste' && await page.inputValue('#r09-consultoria') === 'Consultoria de Teste', 'R09: capa recebe cliente e consultoria dos dados da empresa');
await preencherLinha('r09-quadro', 0, { quantidade: '12' });
await preencherLinha('r09-quadro', 4, { quantidade: '4' });
await page.locator('#r09 .chks .chip').nth(1).click();
await page.waitForTimeout(250);
const k9 = await kpis('r09');
ok(k9[0].endsWith(': 12') && k9[1].includes('Não informado') && k9[3].endsWith(': 4'), `R09: destaques repetem o quadro de movimentações (${k9.join(' / ')})`);
ok((await page.evaluate(() => window.KitRel.ler('r09'))).campos['r09-escopo'].join() === 'Conferência de MTRs', 'R09: escopo registra apenas as atividades marcadas');

await abrirRel('r10');
await preencherLinha('r10-docs', 0, { total: '10', pend: '2' });
await preencherLinha('r10-docs', 1, { total: '8', pend: '3' });
await page.fill('#r10-resolvidas', '1');
await page.waitForTimeout(250);
const k10 = await kpis('r10');
ok(k10[3].endsWith(': 18') && k10[4].endsWith(': 5') && k10[5].endsWith('1'), `R10: painel soma documentos e pendências (${k10.slice(3).join(' / ')})`);
ok(await page.evaluate(() => document.querySelectorAll('#r10 figure.graf')[1].querySelector('svg') !== null), 'R10: gráfico de documentos acompanhados e com pendência é gerado');

// ------------------------------------------------ impressão individual com dados
await abrirRel('r01');
await page.evaluate(() => { window.__p = 0; window.print = () => { window.__p++; }; });
await page.locator('[data-acao="imprimir"]').click();
const imp = await page.evaluate(() => ({ p: window.__p, one: document.documentElement.classList.contains('pm-one'), alvos: [...document.querySelectorAll('.rel.alvo')].map((r) => r.id) }));
ok(imp.p === 1 && imp.one && imp.alvos.join() === 'r01', 'Imprimir prepara somente o relatório aberto');
await page.emulateMedia({ media: 'print' });
const pdf1 = path.join(tmp, 'r01.pdf');
await page.pdf({ path: pdf1, preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
const t1 = execFileSync('pdftotext', [pdf1, '-'], { encoding: 'utf8' });
ok(t1.includes('Empresa de Teste') && t1.includes('Papelão') && t1.includes('1.550,5') && t1.includes('01/09/2026') && t1.includes('Resumo do mês de setembro'),
  'PDF do relatório traz os dados digitados, as datas no formato brasileiro e os indicadores calculados');
ok(!t1.includes('Relatório de CDFs e destinações') && !t1.includes('10 RELATÓRIOS PRONTOS'), 'PDF individual não inclui outros relatórios nem a capa do kit');
ok(t1.includes('300 kg') && t1.includes('2 m³'), 'gráfico aparece no PDF como elemento vetorial, com rótulos de valor em texto');
ok(t1.includes('Relatório 01 · Mensal de gestão · Empresa de Teste'), 'rodapé impresso traz o nome do modelo e a empresa');
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
ok(await page.evaluate(() => !document.documentElement.classList.contains('pm-one')), 'depois da impressão o modo volta ao normal');
await page.emulateMedia({ media: 'print' });
const ctrl = await page.evaluate(() => [...document.querySelectorAll('.appbar, .rtools, .btn-add, .btn-del, .side, .btn-base, .btn-perfil')].filter((e) => getComputedStyle(e).display !== 'none').length);
await page.emulateMedia({ media: 'screen' });
ok(ctrl === 0, 'botões e barras da interface não aparecem na impressão');
// texto longo não é cortado
const longo = 'Linha de análise detalhada. '.repeat(180);
await page.fill('#r01-final', longo);
await page.evaluate(() => { window.KitRel.modo('one', 'r01'); });
await page.emulateMedia({ media: 'print' });
const pdf2 = path.join(tmp, 'r01b.pdf');
await page.pdf({ path: pdf2, preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
const t2 = execFileSync('pdftotext', [pdf2, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok((t2.match(/Linha de análise detalhada\./g) || []).length === 180, 'texto longo aparece inteiro no PDF, sem cortes');
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
await page.fill('#r01-final', 'Considerações finais de teste.');

// ------------------------------------------------ exportar, limpar, importar
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.appbar [data-acao="exportar-todos"]').click()]);
const json = path.join(tmp, await dl.suggestedFilename());
await dl.saveAs(json);
const pac = JSON.parse(fs.readFileSync(json, 'utf8'));
ok(pac.kit === 'kit-10-relatorios' && Object.keys(pac.relatorios).length === 10 && pac.logo.startsWith('data:image/png') && pac.perfil.empresa === 'Empresa de Teste', 'exportação gera .json com os 10 relatórios, os dados da empresa e o logotipo');
const [dl1] = await Promise.all([page.waitForEvent('download'), page.locator('.rtools [data-acao="exportar-um"]').click()]);
const json1 = path.join(tmp, await dl1.suggestedFilename());
await dl1.saveAs(json1);
ok(Object.keys(JSON.parse(fs.readFileSync(json1, 'utf8')).relatorios).join() === 'R01', 'exportar só o relatório aberto');

resposta = false;
await page.locator('[data-acao="limpar"]').click();
ok(await page.inputValue('#r01-empresa') === 'Empresa de Teste', 'limpar pede confirmação e "Cancelar" mantém os dados');
resposta = true;
await page.locator('[data-acao="limpar"]').click();
ok(await page.evaluate(() => window.KitRel.vazio('r01')), 'limpar deixa o relatório como modelo: textos-base de volta e tabelas vazias');
ok(await page.evaluate(() => document.querySelector('#r01 .kpi-v').textContent) === 'Sem registros', 'indicadores voltam ao estado sem registros');
ok((await page.evaluate(() => window.KitRel.ler('r05'))).tabelas.coletas[0].origem === 'Unidade A', 'limpar um relatório não altera os outros');

await page.waitForTimeout(800);
await page.reload();
ok(await page.evaluate(() => window.KitRel.ler('r05').tabelas.coletas[1].origem) === 'Unidade B', 'rascunho local recupera os dados ao reabrir');

const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const p2 = await ctx2.newPage();
p2.on('dialog', (d) => d.accept());
p2.on('pageerror', (e) => erros.push(e.message));
await p2.goto(url);
ok(await p2.evaluate(() => window.KitRel.vazio('r01') && window.KitRel.vazio('r08')), 'em um navegador novo os relatórios começam como modelos vazios');
const [ch] = await Promise.all([p2.waitForEvent('filechooser'), p2.locator('.appbar [data-acao="importar"]').click()]);
await ch.setFiles(json);
await p2.waitForTimeout(500);
const imp2 = await p2.evaluate(() => ({ r01: window.KitRel.ler('r01'), r08: window.KitRel.ler('r08'), logo: document.querySelector('#r01 img.logo-img').src.slice(0, 15), emp: document.getElementById('perfil-empresa').value }));
ok(imp2.r01.tabelas.tipos[0].residuo === 'Papelão' && imp2.r01.campos['r01-coletas'] === '3' && imp2.emp === 'Empresa de Teste' && imp2.logo === 'data:image/png;', 'importação restaura relatórios, dados da empresa e logotipo');
await p2.evaluate(() => { location.hash = 'r08'; });
await p2.waitForTimeout(300);
ok((await p2.locator('#r08-comp output[data-var]').first().textContent()) === '+20 kg (+20%)', 'após importar, cálculos e gráficos são refeitos');
fs.writeFileSync(path.join(tmp, 'ruim.json'), '{"x":1}');
const [ch2] = await Promise.all([p2.waitForEvent('filechooser'), p2.locator('.appbar [data-acao="importar"]').click()]);
await ch2.setFiles(path.join(tmp, 'ruim.json'));
await p2.waitForTimeout(300);
ok(/não foi exportado/.test(await p2.locator('#toast').textContent()), 'arquivo que não é da Central é recusado com aviso');
await ctx2.close();

// remover logotipo
await page.evaluate(() => { location.hash = 'perfil'; });
await page.locator('[data-acao="logo-remover"]').click();
ok(await page.evaluate(() => [...document.querySelectorAll('img.logo-img')].every((i) => i.hidden)), 'remover logotipo tira a imagem de todos os relatórios');

// ------------------------------------------------ celular
const cel = await browser.newPage({ viewport: { width: 390, height: 844 } });
let semRolagem = 0;
for (const h of ['inicio', ...Array.from({ length: 10 }, (_, i) => 'r' + String(i + 1).padStart(2, '0'))]) {
  await cel.goto(url + '#' + h);
  await cel.waitForTimeout(80);
  const [sw, cw] = await cel.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  if (sw <= cw) semRolagem++; else console.log('   rolagem lateral em', h, sw, cw);
}
ok(semRolagem === 11, `celular sem rolagem lateral na central e nos 10 relatórios (${semRolagem}/11)`);

ok(erros.length === 0, `nenhum erro de JavaScript ${erros.slice(0, 3)}`);
ok(externos.length === 0, `nenhuma requisição externa ${externos.slice(0, 3)}`);
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} teste(s) com falha.` : '\nTodos os testes passaram.');
process.exitCode = falhas ? 1 : 0;
