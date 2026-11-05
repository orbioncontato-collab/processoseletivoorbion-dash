#!/usr/bin/env node
/*
 * Gera docs/RELATORIO-PRECISAO.md com os valores realmente calculados pelo motor
 * para a bateria obrigatória de testes. Uso: node scripts/precision-report.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var MEC = require('../tests/load.js');
var C = MEC.calculators;
var OHM = MEC.units.OHM;
var MU = MEC.units.MU;

function st(id, values, units, list) {
  var s = C.defaultState(C.BY_ID[id]);
  Object.keys(values).forEach(function (k) { s.values[k] = values[k]; });
  Object.keys(units || {}).forEach(function (k) { s.units[k] = units[k]; });
  if (list) s.list = list;
  return s;
}

function val(res, label) {
  return res.primary.concat(res.results).filter(function (i) { return i.label === label; })[0];
}

var CASES = [
  ['Lei de Ohm', 'V=12 V, R=6 Ω', 'ohm', { mode: 'I', V: '12', R: '6' }, null, null, [['Corrente', 2, 'I = 2 A']]],
  ['Potência CC', 'V=24 V, I=3 A', 'powerdc', { mode: 'VI', V: '24', I: '3' }, null, null, [['Potência', 72, 'P = 72 W']]],
  ['Energia', '500 W, 4 h/dia, 30 dias, R$ 0,80/kWh', 'energy', { P: '500', h: '4', days: '30', tariff: '0,80' }, null, null,
    [['Consumo no período', 60, '60 kWh'], ['Custo estimado', 48, 'R$ 48']]],
  ['Resistores (série)', '10 Ω e 20 Ω', 'resistors', { type: 'serie' }, null, [{ value: '10', unit: OHM }, { value: '20', unit: OHM }], [['Resistência equivalente', 30, '30 Ω']]],
  ['Resistores (paralelo)', '10 Ω e 20 Ω', 'resistors', { type: 'paralelo' }, null, [{ value: '10', unit: OHM }, { value: '20', unit: OHM }], [['Resistência equivalente', 20 / 3, '≈ 6,667 Ω']]],
  ['Divisor de tensão', '12 V, 1 kΩ e 2 kΩ', 'vdiv', { Vin: '12', R1: '1', R2: '2' }, { R1: 'k' + OHM, R2: 'k' + OHM },
    null, [['Tensão sobre R2 (saída)', 8, 'VR2 = 8 V'], ['Tensão sobre R1', 4, 'VR1 = 4 V'], ['Corrente do circuito', 0.004, 'I = 4 mA']]],
  ['Divisor de corrente', '3 A, 2 Ω e 4 Ω', 'idiv', { It: '3', R1: '2', R2: '4' }, null, null, [['Corrente no ramo R1', 2, 'I1 = 2 A'], ['Corrente no ramo R2', 1, 'I2 = 1 A']]],
  ['Frequência', '50 Hz', 'freq', { mode: 'T', f: '50' }, null, null, [['Período', 0.02, 'T = 0,02 s']]],
  ['Reatância indutiva', '60 Hz, 0,1 H', 'reactance', { mode: 'L', f: '60', L: '0,1' }, { L: 'H' }, null, [['Reatância indutiva', 2 * Math.PI * 6, 'XL ≈ 37,699 Ω']]],
  ['Impedância RL', 'R=10 Ω, L=0,1 H, f=60 Hz', 'impedance', { type: 'RL', R: '10', L: '0,1', f: '60' }, { L: 'H' }, null,
    [['Módulo da impedância', Math.hypot(10, 2 * Math.PI * 6), '\\|Z\\| ≈ 39,003 Ω']]],
  ['Potência monofásica', '120 V, 5 A, FP=0,8 indutiva', 'mono', { V: '120', I: '5', FP: '0,8', nature: 'indutiva' }, null, null,
    [['Potência ativa', 480, 'P = 480 W'], ['Potência aparente', 600, 'S = 600 VA'], ['Potência reativa', 360, 'Q = +360 var']]],
  ['Potência trifásica', '380 V, 10 A, FP=0,8, estrela', 'tri', { VL: '380', IL: '10', FP: '0,8', conn: 'estrela', nature: 'indutiva' }, null, null,
    [['Potência ativa', Math.sqrt(3) * 3040, 'P ≈ 5.265,43 W']]],
  ['Conversão', '2,2 kΩ para Ω', 'converter', { qty: 'resistance', value: '2,2', from: 'k' + OHM, to: OHM }, null, null, [['Resistência em Ω', 2200, '2.200 Ω']]]
];

var rows = [];
var fails = 0;
CASES.forEach(function (c) {
  var res = C.run(c[2], st(c[2], c[3], c[4], c[5]), { precision: 6 });
  c[6].forEach(function (e) {
    var it = res.ok ? val(res, e[0]) : null;
    var v = it ? it.value : NaN;
    var diff = Math.abs(v - e[1]);
    var tol = 1e-9 * Math.max(1, Math.abs(e[1]));
    var ok = it && diff <= tol;
    if (!ok) fails++;
    rows.push('| ' + c[0] + ' | ' + c[1] + ' | ' + e[2] + ' | ' + (it ? it.text.replace(/ /g, ' ') + (it.base ? ' (' + it.base + ')' : '') : 'erro') +
      ' | ' + (it ? diff.toExponential(1) : '-') + ' | ' + (ok ? 'Passou' : 'FALHOU') + ' |');
  });
});

var md = '# Relatório de precisão\n\n' +
  'Arquivo gerado automaticamente por `scripts/precision-report.js` em ' + new Date().toISOString().slice(0, 10) + '.\n' +
  'Os valores da coluna "Obtido" vêm do próprio motor do aplicativo, exibidos com 6 casas decimais.\n\n' +
  'Tolerância usada: diferença absoluta de até 1 × 10⁻⁹ × max(1, |esperado|), adequada a cálculos em ponto flutuante de 64 bits.\n\n' +
  '| Ferramenta | Entradas | Esperado | Obtido | Diferença | Situação |\n|---|---|---|---|---|---|\n' + rows.join('\n') +
  '\n\nResultado: ' + (rows.length - fails) + ' de ' + rows.length + ' verificações dentro da tolerância.\n';

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'RELATORIO-PRECISAO.md'), md);
console.log(md);
process.exit(fails ? 1 : 0);
