/*
 * Testes do motor matemático (sem navegador).
 * Rodar: node --test tests/engine.test.js
 */
'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var MEC = require('./load.js');
var C = MEC.calculators;
var N = MEC.numbers;
var U = MEC.units;
var OHM = U.OHM;
var MU = U.MU;

var REL_TOL = 1e-9;

function close(actual, expected, tol) {
  var t = tol === undefined ? REL_TOL * Math.max(1, Math.abs(expected)) : tol;
  assert.ok(Math.abs(actual - expected) <= t, 'esperado ' + expected + ', obtido ' + actual);
}

function st(id, values, units, list) {
  var s = C.defaultState(C.BY_ID[id]);
  Object.keys(values || {}).forEach(function (k) { s.values[k] = values[k]; });
  Object.keys(units || {}).forEach(function (k) { s.units[k] = units[k]; });
  if (list) s.list = list;
  return s;
}

function run(id, values, units, list, precision) {
  return C.run(id, st(id, values, units, list), { precision: precision || 4 });
}

function find(res, label) {
  var all = res.primary.concat(res.results);
  var it = all.filter(function (i) { return i.label === label; })[0];
  assert.ok(it, 'resultado "' + label + '" não encontrado');
  return it;
}

function noBadText(res) {
  var txt = JSON.stringify(res);
  ['NaN', 'Infinity', 'undefined'].forEach(function (bad) {
    assert.ok(txt.indexOf(bad) < 0, 'texto proibido "' + bad + '" no resultado');
  });
}

/* ------------------------------------------------------------------ */
/* Casos obrigatórios da seção 10                                      */
/* ------------------------------------------------------------------ */
test('Lei de Ohm: V=12 V, R=6 Ω → I=2 A', function () {
  var r = run('ohm', { mode: 'I', V: '12', R: '6' });
  assert.ok(r.ok);
  close(find(r, 'Corrente').value, 2);
  close(find(r, 'Potência dissipada').value, 24);
  assert.equal(find(r, 'Corrente').text, '2 A');
});

test('Potência CC: V=24 V, I=3 A → P=72 W', function () {
  var r = run('powerdc', { mode: 'VI', V: '24', I: '3' });
  close(find(r, 'Potência').value, 72);
});

test('Energia: 500 W, 4 h/dia, 30 dias, R$ 0,80 → 60 kWh e R$ 48', function () {
  var r = run('energy', { P: '500', h: '4', days: '30', tariff: '0,80' }, { P: 'W' });
  close(find(r, 'Consumo no período').value, 60);
  close(find(r, 'Consumo diário').value, 2);
  close(find(r, 'Custo estimado').value, 48);
  assert.equal(find(r, 'Custo estimado').text.replace(/ /g, ' '), 'R$ 48,00');
});

test('Resistores: 10 Ω e 20 Ω em série → 30 Ω', function () {
  var r = run('resistors', { type: 'serie' }, {}, [{ value: '10', unit: OHM }, { value: '20', unit: OHM }]);
  close(find(r, 'Resistência equivalente').value, 30);
});

test('Resistores: 10 Ω e 20 Ω em paralelo → 6,667 Ω', function () {
  var r = run('resistors', { type: 'paralelo' }, {}, [{ value: '10', unit: OHM }, { value: '20', unit: OHM }]);
  close(find(r, 'Resistência equivalente').value, 20 / 3);
  assert.equal(find(r, 'Resistência equivalente').text, '6,6667 ' + OHM);
});

test('Divisor de tensão: 12 V, 1 kΩ, 2 kΩ → VR1=4 V, VR2=8 V, I=4 mA', function () {
  var r = run('vdiv', { Vin: '12', R1: '1', R2: '2' }, { Vin: 'V', R1: 'k' + OHM, R2: 'k' + OHM });
  close(find(r, 'Tensão sobre R2 (saída)').value, 8);
  close(find(r, 'Tensão sobre R1').value, 4);
  close(find(r, 'Corrente do circuito').value, 0.004);
  assert.equal(find(r, 'Corrente do circuito').text, '4 mA');
});

test('Divisor de corrente: 3 A, 2 Ω, 4 Ω → I1=2 A, I2=1 A', function () {
  var r = run('idiv', { It: '3', R1: '2', R2: '4' });
  close(find(r, 'Corrente no ramo R1').value, 2);
  close(find(r, 'Corrente no ramo R2').value, 1);
  close(find(r, 'Soma I1 + I2').value, 3);
});

test('Frequência: 50 Hz → T=0,02 s', function () {
  var r = run('freq', { mode: 'T', f: '50' });
  close(find(r, 'Período').value, 0.02);
  var r60 = run('freq', { mode: 'T', f: '60' });
  close(find(r60, 'Período').value, 1 / 60);
  close(find(r60, 'Frequência angular').value, 376.99111843077515);
});

test('Frequência: modo inverso T=20 ms → f=50 Hz', function () {
  var r = run('freq', { mode: 'f', T: '20' }, { T: 'ms' });
  close(find(r, 'Frequência').value, 50);
});

test('Reatância indutiva: 60 Hz, 0,1 H → XL≈37,699 Ω', function () {
  var r = run('reactance', { mode: 'L', f: '60', L: '0,1' }, { L: 'H' });
  close(find(r, 'Reatância indutiva').value, 37.69911184307752, 1e-9);
});

test('Reatância capacitiva: 60 Hz, 100 µF → XC≈26,526 Ω', function () {
  var r = run('reactance', { mode: 'C', f: '60', C: '100' }, { C: MU + 'F' });
  close(find(r, 'Reatância capacitiva').value, 1 / (2 * Math.PI * 60 * 1e-4), 1e-9);
});

test('Impedância RL: R=10 Ω, L=0,1 H, f=60 Hz → |Z|≈39,003 Ω', function () {
  var r = run('impedance', { type: 'RL', R: '10', L: '0,1', f: '60' }, { L: 'H' });
  var z = find(r, 'Módulo da impedância').value;
  close(z, 39.00288, 1e-4);
  close(find(r, 'Fator de potência').value, 10 / z);
  assert.equal(find(r, 'Comportamento').text, 'Predominantemente indutivo');
  assert.ok(find(r, 'Ângulo de fase').value > 0);
});

test('Impedância RC: ângulo negativo e comportamento capacitivo', function () {
  var r = run('impedance', { type: 'RC', R: '10', C: '100', f: '60' }, { C: MU + 'F' });
  assert.ok(find(r, 'Ângulo de fase').value < 0);
  assert.equal(find(r, 'Comportamento').text, 'Predominantemente capacitivo');
  assert.ok(find(r, 'Impedância complexa').text.indexOf('− j') > 0);
});

test('Impedância RLC com tensão: I = V/|Z|', function () {
  var r = run('impedance', { type: 'RLC', R: '10', L: '0,1', C: '100', f: '60', V: '120' }, { C: MU + 'F' });
  var z = find(r, 'Módulo da impedância').value;
  close(find(r, 'Corrente RMS').value, 120 / z);
});

test('Impedância RLC em ressonância com R=0: avisa curto-circuito sem dividir por zero', function () {
  // L=1 H, C=1 F => f0 = 1/(2π)
  var f0 = 1 / (2 * Math.PI);
  var r = run('impedance', { type: 'RLC', R: '0', L: '1', C: '1', f: String(f0), V: '10' }, { L: 'H', C: 'F' });
  assert.ok(r.ok);
  close(find(r, 'Módulo da impedância').value, 0, 1e-12);
  assert.ok(r.warnings.some(function (w) { return w.indexOf('curto-circuito') >= 0; }));
  noBadText(r);
});

test('Potência monofásica: 120 V, 5 A, FP=0,8 indutiva → P=480 W, S=600 VA, Q=+360 var', function () {
  var r = run('mono', { V: '120', I: '5', FP: '0,8', nature: 'indutiva' });
  close(find(r, 'Potência ativa').value, 480);
  close(find(r, 'Potência aparente').value, 600);
  close(find(r, 'Potência reativa').value, 360, 1e-9);
  assert.equal(find(r, 'Potência reativa').text, '+360 var');
});

test('Potência monofásica capacitiva → Q negativo', function () {
  var r = run('mono', { V: '120', I: '5', FP: '0,8', nature: 'capacitiva' });
  close(find(r, 'Potência reativa').value, -360, 1e-9);
  assert.ok(find(r, 'Ângulo de fase').value < 0);
});

test('Potência trifásica: 380 V, 10 A, FP=0,8 → P≈5.265,43 W', function () {
  var r = run('tri', { VL: '380', IL: '10', FP: '0,8', conn: 'estrela', nature: 'indutiva' });
  var p = find(r, 'Potência ativa');
  close(p.value, Math.sqrt(3) * 380 * 10 * 0.8);
  assert.equal(N.formatNumber(p.value, 2), '5.265,43');
  close(find(r, 'Tensão de fase').value, 380 / Math.sqrt(3));
  close(find(r, 'Corrente de fase').value, 10);
});

test('Potência trifásica em triângulo: Vfase = VL e Ifase = IL/√3', function () {
  var r = run('tri', { VL: '380', IL: '10', FP: '0,8', conn: 'triangulo', nature: 'indutiva' });
  close(find(r, 'Tensão de fase').value, 380);
  close(find(r, 'Corrente de fase').value, 10 / Math.sqrt(3));
});

test('Conversão: 2,2 kΩ → 2.200 Ω', function () {
  var r = run('converter', { qty: 'resistance', value: '2,2', from: 'k' + OHM, to: OHM });
  assert.equal(r.primary[0].value, 2200);
  assert.equal(r.equation, '2,2 k' + OHM + ' = 2.200 ' + OHM);
});

test('Conversões de exemplo: 100 µF = 0,0001 F e 1 kWh = 3.600.000 J', function () {
  var a = run('converter', { qty: 'capacitance', value: '100', from: MU + 'F', to: 'F' });
  assert.equal(a.primary[0].value, 0.0001);
  var b = run('converter', { qty: 'energy', value: '1', from: 'kWh', to: 'J' });
  assert.equal(b.primary[0].value, 3600000);
  assert.equal(b.primary[0].text, '3.600.000 J');
});

/* ------------------------------------------------------------------ */
/* Todos os exemplos prontos funcionam                                 */
/* ------------------------------------------------------------------ */
test('Todos os 12 exemplos calculam sem erro e sem textos proibidos', function () {
  assert.equal(C.LIST.length, 12);
  C.LIST.forEach(function (c) {
    [2, 4, 6].forEach(function (p) {
      var r = C.run(c.id, C.exampleState(c), { precision: p });
      assert.ok(r.ok, c.id + ': ' + (r.errors || []).join(' '));
      assert.ok(r.steps.length > 0, c.id + ' sem memória de cálculo');
      assert.ok(r.assumptions.length > 0, c.id + ' sem hipóteses');
      noBadText(r);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Validações                                                          */
/* ------------------------------------------------------------------ */
test('Divisão por zero: resistência zero na Lei de Ohm é recusada', function () {
  var r = run('ohm', { mode: 'I', V: '12', R: '0' });
  assert.equal(r.ok, false);
  assert.equal(r.fieldErrors.R, 'Informe uma resistência maior que zero para realizar este cálculo.');
});

test('Divisão por zero: corrente zero ao calcular resistência é recusada', function () {
  var r = run('ohm', { mode: 'R', V: '12', I: '0' });
  assert.equal(r.ok, false);
  assert.ok(r.fieldErrors.I);
});

test('Frequência zero ou negativa é recusada', function () {
  assert.equal(run('freq', { mode: 'T', f: '0' }).ok, false);
  assert.equal(run('freq', { mode: 'T', f: '-50' }).ok, false);
  assert.equal(run('reactance', { mode: 'L', f: '0', L: '1' }).ok, false);
});

test('Campos vazios geram mensagem por campo', function () {
  var r = run('vdiv', { Vin: '', R1: '', R2: '' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.fieldErrors).sort(), ['R1', 'R2', 'Vin']);
  assert.ok(r.fieldErrors.Vin.indexOf('Preencha') === 0);
});

test('Texto não numérico é recusado', function () {
  var r = run('ohm', { mode: 'I', V: 'doze', R: '6' });
  assert.equal(r.ok, false);
  assert.ok(r.fieldErrors.V);
});

test('Negativos onde não são válidos', function () {
  assert.equal(run('ohm', { mode: 'I', V: '-12', R: '6' }).ok, false);
  assert.equal(run('resistors', { type: 'serie' }, {}, [{ value: '-10', unit: OHM }, { value: '20', unit: OHM }]).ok, false);
  assert.equal(run('reactance', { mode: 'C', f: '60', C: '-1' }).ok, false);
  assert.equal(run('converter', { qty: 'resistance', value: '-5', from: OHM, to: 'k' + OHM }).ok, false);
  // tensão negativa é válida no divisor e no conversor
  assert.equal(run('vdiv', { Vin: '-12', R1: '1', R2: '1' }).ok, true);
  assert.equal(run('converter', { qty: 'voltage', value: '-5', from: 'V', to: 'mV' }).ok, true);
});

test('Fator de potência fora de 0 a 1 é recusado', function () {
  assert.equal(run('mono', { V: '120', I: '5', FP: '1,2', nature: 'indutiva' }).ok, false);
  assert.equal(run('mono', { V: '120', I: '5', FP: '-0,1', nature: 'indutiva' }).ok, false);
  assert.equal(run('tri', { VL: '380', IL: '10', FP: '2', conn: 'estrela', nature: 'indutiva' }).ok, false);
});

test('Carga resistiva exige FP = 1', function () {
  var r = run('mono', { V: '120', I: '5', FP: '0,8', nature: 'resistiva' });
  assert.equal(r.ok, false);
  assert.ok(r.fieldErrors.FP);
  var ok = run('mono', { V: '120', I: '5', FP: '1', nature: 'resistiva' });
  assert.ok(ok.ok);
  close(find(ok, 'Potência reativa').value, 0, 0);
});

test('Uso diário acima de 24 h é recusado', function () {
  assert.equal(run('energy', { P: '500', h: '25', days: '30' }).ok, false);
});

test('Tarifa é opcional', function () {
  var r = run('energy', { P: '1', h: '1', days: '1' }, { P: 'kW' });
  assert.ok(r.ok);
  close(find(r, 'Consumo no período').value, 1);
  assert.equal(r.primary.length, 1);
});

test('Associação: mínimo de 2 resistores', function () {
  var r = run('resistors', { type: 'serie' }, {}, [{ value: '10', unit: OHM }]);
  assert.equal(r.ok, false);
  assert.ok(r.fieldErrors.list);
});

test('Associação com 10 resistores e unidades mistas', function () {
  var list = [];
  for (var i = 0; i < 10; i++) list.push({ value: '1', unit: i % 2 ? 'k' + OHM : OHM });
  var r = run('resistors', { type: 'serie' }, {}, list);
  close(find(r, 'Resistência equivalente').value, 5 + 5000);
});

test('Valores fora da faixa segura são recusados', function () {
  assert.equal(run('ohm', { mode: 'I', V: '1e30', R: '1' }).ok, false);
  assert.equal(run('ohm', { mode: 'I', V: '1', R: '1e-30' }).ok, false);
});

/* ------------------------------------------------------------------ */
/* Números no padrão brasileiro                                        */
/* ------------------------------------------------------------------ */
test('Leitura de números com vírgula, ponto e milhar', function () {
  var ok = { '0,5': 0.5, '0.5': 0.5, '12': 12, '-3,25': -3.25, '1.234,5': 1234.5, '1.234.567': 1234567, ',5': 0.5,
    '2,2e3': 2200, '4.7e-6': 4.7e-6, '1.5': 1.5, '0.001': 0.001, '10.25': 10.25, '1.000,0': 1000, '−5': -5 };
  Object.keys(ok).forEach(function (s) {
    var p = N.parseNumber(s);
    assert.ok(p.ok, s);
    assert.equal(p.value, ok[s], s);
  });
});

test('Números ambíguos ou malformados não são interpretados em silêncio', function () {
  ['1.234', '1.000', '12.500', '1,234.5', '1,2,3', '5,', 'abc', '1 000', '1.23.4', ''].forEach(function (s) {
    assert.equal(N.parseNumber(s).ok, false, s);
  });
  assert.equal(N.parseNumber('1.234').code, 'ambiguous');
});

test('Formatação: precisão só na exibição e sem virar zero', function () {
  assert.equal(N.formatNumber(2 / 3, 2), '0,67');
  assert.equal(N.formatNumber(2 / 3, 6), '0,666667');
  assert.equal(N.formatNumber(0.004, 2), '4 × 10⁻³');
  assert.equal(N.formatNumber(1e-7, 4), '1 × 10⁻⁷');
  assert.equal(N.formatNumber(2200, 4), '2.200');
  assert.equal(N.formatQuantity(0.004, 'A', 4).text, '4 mA');
  assert.equal(N.formatQuantity(4.7e-9, 'F', 4).text, '4,7 nF');
  assert.equal(N.formatQuantity(999.99999, 'V', 2).text, '1 kV');
  assert.equal(N.formatQuantity(5265.434, 'W', 2).text, '5,27 kW');
});

test('Valores próximos de zero continuam visíveis', function () {
  var r = run('ohm', { mode: 'I', V: '1', R: '1' }, { V: 'mV', R: 'M' + OHM });
  assert.ok(r.ok);
  close(find(r, 'Corrente').value, 1e-9, 1e-21);
  assert.equal(find(r, 'Corrente').text, '1 nA');
  var p = find(r, 'Potência dissipada');
  assert.ok(p.text !== '0 W' && p.text.indexOf('0 ') !== 0, p.text);
});

test('Conversões entre prefixos são exatas na ida e na volta', function () {
  var cases = [['resistance', 'k' + OHM, OHM, 2.2, 2200], ['current', 'mA', MU + 'A', 1.5, 1500], ['time', 'h', 's', 1, 3600],
    ['energy', 'Wh', 'kWh', 500, 0.5], ['inductance', 'mH', 'H', 33, 0.033], ['capacitance', 'pF', 'nF', 470, 0.47],
    ['frequency', 'kHz', 'Hz', 2.5, 2500], ['reactive', 'kvar', 'var', 1.2, 1200], ['apparent', 'kVA', 'VA', 15, 15000]];
  cases.forEach(function (c) {
    var a = U.convert(c[3], c[0], c[1], c[2]);
    close(a.value, c[4], 1e-12 * Math.max(1, c[4]));
    var b = U.convert(a.value, c[0], c[2], c[1]);
    close(b.value, c[3], 1e-12 * Math.max(1, c[3]));
  });
});

test('Conversão entre grandezas diferentes é recusada', function () {
  assert.equal(U.convert(1, 'voltage', 'V', 'W').ok, false);
  var r = run('converter', { qty: 'voltage', value: '5', from: 'V', to: 'W' });
  assert.equal(r.ok, false);
  assert.ok(r.fieldErrors.to);
});

test('Relatório de texto contém dados, fórmula, resultado e aviso educacional', function () {
  var r = run('ohm', { mode: 'I', V: '12', R: '6' });
  var t = MEC.report.reportText(r, new Date(2026, 0, 1, 10, 0));
  ['MapaElétrica Calc', 'Lei de Ohm', 'DADOS DE ENTRADA', 'I = V / R', 'I = 12 V / 6', 'I = 2 A', 'HIPÓTESES', 'educacional'].forEach(function (s) {
    assert.ok(t.indexOf(s) >= 0, 'faltou "' + s + '"');
  });
  assert.ok(MEC.report.resultText(r).indexOf('Corrente (I): 2 A') >= 0);
});
