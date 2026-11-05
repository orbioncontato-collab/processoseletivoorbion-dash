/*
 * MapaElétrica Calc | calculators.js
 * Definição das 12 calculadoras: campos, exemplos, fórmulas e resolução.
 * Módulo puro (sem DOM). A interface apenas desenha o que está definido aqui.
 */
(function (root) {
  'use strict';
  var MEC = root.MEC || (root.MEC = {});
  var N = MEC.numbers;
  var U = MEC.units;
  var V = MEC.validate;
  var OHM = U.OHM;
  var MU = U.MU;
  var PI = Math.PI;
  var SQRT3 = Math.sqrt(3);

  /* ---------------------------------------------------------------- */
  /* Categorias                                                        */
  /* ---------------------------------------------------------------- */
  var CATEGORIES = [
    { id: 'fund', name: 'Fundamentos elétricos', short: 'Fundamentos', icon: 'bolt' },
    { id: 'res', name: 'Circuitos resistivos', short: 'Resistivos', icon: 'resistor' },
    { id: 'ca', name: 'Corrente alternada', short: 'Corrente alternada', icon: 'wave' },
    { id: 'pot', name: 'Potência e utilidades', short: 'Potência e utilidades', icon: 'gauge' }
  ];

  /* ---------------------------------------------------------------- */
  /* Fábricas de campos                                                */
  /* ---------------------------------------------------------------- */
  function num(id, label, symbol, dim, opts) {
    opts = opts || {};
    var unitsList = opts.units || U.unitSymbols(dim);
    return {
      id: id, type: 'number', label: label, symbol: symbol, dim: dim,
      units: unitsList, unit: opts.unit || U.DIMENSIONS[dim].base,
      constraint: opts.constraint || 'any', noun: opts.noun, optional: !!opts.optional,
      showIf: opts.showIf, hint: opts.hint, placeholder: opts.placeholder || ''
    };
  }

  function fixed(id, label, symbol, unitLabel, opts) {
    opts = opts || {};
    return {
      id: id, type: 'number', label: label, symbol: symbol, dim: null,
      unit: unitLabel, units: null,
      constraint: opts.constraint || 'any', noun: opts.noun, optional: !!opts.optional,
      showIf: opts.showIf, hint: opts.hint, placeholder: opts.placeholder || ''
    };
  }

  function choice(id, label, options, def, opts) {
    opts = opts || {};
    return {
      id: id, type: 'choice', label: label, options: options, def: def,
      isMode: !!opts.isMode, showIf: opts.showIf, hint: opts.hint, style: opts.style || 'segmented'
    };
  }

  function modeIs() {
    var list = Array.prototype.slice.call(arguments);
    return function (s) { return list.indexOf(s.values.mode) >= 0; };
  }

  function valueIs(field) {
    var list = Array.prototype.slice.call(arguments, 1);
    return function (s) { return list.indexOf(s.values[field]) >= 0; };
  }

  /* Item de resultado. O texto formatado é gerado depois, conforme a precisão escolhida. */
  function item(label, symbol, value, unit, opts) {
    return { label: label, symbol: symbol, value: value, unit: unit, opts: opts || {} };
  }

  function textItem(label, symbol, text) {
    return { label: label, symbol: symbol, text: text };
  }

  /* ---------------------------------------------------------------- */
  /* 01 Lei de Ohm                                                     */
  /* ---------------------------------------------------------------- */
  var ohm = {
    id: 'ohm', num: 1, category: 'fund', icon: 'ohm',
    name: 'Lei de Ohm',
    short: 'Encontre tensão, corrente ou resistência a partir de duas grandezas.',
    objective: 'Encontrar a tensão, a corrente ou a resistência de um resistor usando as duas grandezas que você já conhece.',
    guidance: 'Escolha o que deseja calcular e preencha os outros dois campos. Use valores positivos (em módulo).',
    keywords: ['ohm', 'tensao', 'corrente', 'resistencia', 'v=ri', 'volt', 'ampere', 'resistor'],
    formulas: ['V = I × R', 'I = V / R', 'R = V / I', 'P = V × I'],
    fields: [
      choice('mode', 'O que você quer calcular?', [
        { id: 'V', label: 'Tensão (V)' }, { id: 'I', label: 'Corrente (I)' }, { id: 'R', label: 'Resistência (R)' }
      ], 'I', { isMode: true }),
      num('V', 'Tensão', 'V', 'voltage', { constraint: 'nonnegative', noun: 'uma tensão', showIf: modeIs('I', 'R') }),
      num('I', 'Corrente', 'I', 'current', {
        noun: 'uma corrente', showIf: modeIs('V', 'R'),
        constraint: function (s) { return s.values.mode === 'R' ? 'positive' : 'nonnegative'; }
      }),
      num('R', 'Resistência', 'R', 'resistance', { constraint: 'positive', noun: 'uma resistência', showIf: modeIs('V', 'I') })
    ],
    example: { values: { mode: 'I', V: '12', R: '6' }, units: { V: 'V', R: OHM } },
    assumptions: [
      'Resistor ideal e linear: a resistência não muda com a temperatura nem com a corrente.',
      'Valores em módulo, em corrente contínua ou em valores eficazes (RMS) num circuito puramente resistivo.'
    ],
    solve: function (x, H, s) {
      var m = s.values.mode;
      var v = x.V, i = x.I, r = x.R;
      var steps = [];
      var warnings = [];
      var primary;
      var expl;
      if (m === 'V') {
        v = i * r;
        steps.push({ title: 'Tensão', formula: 'V = I × R', subst: 'V = ' + H.u(i, 'A') + ' × ' + H.u(r, OHM), result: 'V = ' + H.q(v, 'V') });
        primary = item('Tensão', 'V', v, 'V');
        expl = 'Uma corrente de ' + H.q(i, 'A') + ' passando por ' + H.q(r, OHM) + ' produz uma queda de tensão de ' + H.q(v, 'V') +
          '. Se a corrente dobrar, a tensão também dobra.';
      } else if (m === 'I') {
        i = v / r;
        steps.push({ title: 'Corrente', formula: 'I = V / R', subst: 'I = ' + H.u(v, 'V') + ' / ' + H.u(r, OHM), result: 'I = ' + H.q(i, 'A') });
        primary = item('Corrente', 'I', i, 'A');
        expl = 'Com ' + H.q(v, 'V') + ' aplicados sobre ' + H.q(r, OHM) + ', circula uma corrente de ' + H.q(i, 'A') +
          '. Para a mesma tensão, quanto maior a resistência, menor a corrente.';
      } else {
        r = v / i;
        steps.push({ title: 'Resistência', formula: 'R = V / I', subst: 'R = ' + H.u(v, 'V') + ' / ' + H.u(i, 'A'), result: 'R = ' + H.q(r, OHM) });
        primary = item('Resistência', 'R', r, OHM);
        expl = 'Para que ' + H.q(v, 'V') + ' produzam uma corrente de ' + H.q(i, 'A') + ', a resistência precisa ser de ' + H.q(r, OHM) + '.';
        if (r === 0) warnings.push('Resistência igual a zero indica um curto-circuito ideal.');
      }
      var p = v * i;
      steps.push({ title: 'Potência associada', formula: 'P = V × I', subst: 'P = ' + H.u(v, 'V') + ' × ' + H.u(i, 'A'), result: 'P = ' + H.q(p, 'W') });
      var results = [item('Potência dissipada', 'P', p, 'W')];
      return {
        primary: [primary], results: results, steps: steps, warnings: warnings,
        explanation: [expl, 'A potência P = V × I mostra quanta energia o resistor transforma em calor a cada segundo: ' + H.q(p, 'W') + '.'],
        diagram: { kind: 'ohm', V: H.q(v, 'V'), I: H.q(i, 'A'), R: H.q(r, OHM) }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 02 Potência em corrente contínua                                  */
  /* ---------------------------------------------------------------- */
  var powerdc = {
    id: 'powerdc', num: 2, category: 'fund', icon: 'gauge',
    name: 'Potência CC',
    short: 'Potência em circuitos de corrente contínua por três caminhos.',
    objective: 'Calcular a potência elétrica de um circuito resistivo em corrente contínua.',
    guidance: 'Escolha quais grandezas você conhece. Os campos mudam conforme o modo escolhido.',
    keywords: ['potencia', 'watt', 'cc', 'dc', 'continua', 'p=vi', 'joule', 'dissipada'],
    formulas: ['P = V × I', 'P = I² × R', 'P = V² / R'],
    fields: [
      choice('mode', 'Quais dados você tem?', [
        { id: 'VI', label: 'Tensão e corrente' }, { id: 'IR', label: 'Corrente e resistência' }, { id: 'VR', label: 'Tensão e resistência' }
      ], 'VI', { isMode: true }),
      num('V', 'Tensão', 'V', 'voltage', { constraint: 'nonnegative', noun: 'uma tensão', showIf: modeIs('VI', 'VR') }),
      num('I', 'Corrente', 'I', 'current', { constraint: 'nonnegative', noun: 'uma corrente', showIf: modeIs('VI', 'IR') }),
      num('R', 'Resistência', 'R', 'resistance', { constraint: 'positive', noun: 'uma resistência', showIf: modeIs('IR', 'VR') })
    ],
    example: { values: { mode: 'VI', V: '24', I: '3' }, units: { V: 'V', I: 'A' } },
    assumptions: [
      'Circuito em corrente contínua (ou resistivo puro com valores RMS).',
      'Resistência ideal e constante.'
    ],
    solve: function (x, H, s) {
      var m = s.values.mode;
      var v = x.V, i = x.I, r = x.R, p;
      var steps = [];
      var results = [];
      var notes = [];
      if (m === 'VI') {
        p = v * i;
        steps.push({ title: 'Potência', formula: 'P = V × I', subst: 'P = ' + H.u(v, 'V') + ' × ' + H.u(i, 'A'), result: 'P = ' + H.q(p, 'W') });
        if (i > 0) {
          r = v / i;
          steps.push({ title: 'Valor intermediário: resistência', formula: 'R = V / I', subst: 'R = ' + H.u(v, 'V') + ' / ' + H.u(i, 'A'), result: 'R = ' + H.q(r, OHM) });
          results.push(item('Resistência equivalente', 'R', r, OHM));
        } else {
          notes.push('Com corrente zero não dá para obter a resistência: o circuito está aberto.');
        }
      } else if (m === 'IR') {
        p = i * i * r;
        v = i * r;
        steps.push({ title: 'Potência', formula: 'P = I² × R', subst: 'P = (' + H.u(i, 'A') + ')² × ' + H.u(r, OHM), result: 'P = ' + H.q(p, 'W') });
        steps.push({ title: 'Valor intermediário: tensão', formula: 'V = I × R', subst: 'V = ' + H.u(i, 'A') + ' × ' + H.u(r, OHM), result: 'V = ' + H.q(v, 'V') });
        results.push(item('Tensão no resistor', 'V', v, 'V'));
      } else {
        p = v * v / r;
        i = v / r;
        steps.push({ title: 'Potência', formula: 'P = V² / R', subst: 'P = (' + H.u(v, 'V') + ')² / ' + H.u(r, OHM), result: 'P = ' + H.q(p, 'W') });
        steps.push({ title: 'Valor intermediário: corrente', formula: 'I = V / R', subst: 'I = ' + H.u(v, 'V') + ' / ' + H.u(r, OHM), result: 'I = ' + H.q(i, 'A') });
        results.push(item('Corrente', 'I', i, 'A'));
      }
      results.unshift(item('Potência em kW', 'P', N.shift10(p, -3), 'kW'));
      return {
        primary: [item('Potência', 'P', p, 'W')], results: results, steps: steps, warnings: notes,
        explanation: [
          'A potência mostra a rapidez com que a energia elétrica é transformada. Aqui são ' + H.q(p, 'W') + ', ou seja, ' +
            H.n(p) + ' joules a cada segundo (1 W = 1 J/s).',
          'As três fórmulas chegam ao mesmo valor porque todas saem de P = V × I combinada com a Lei de Ohm (V = I × R).'
        ]
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 03 Energia e consumo                                              */
  /* ---------------------------------------------------------------- */
  var energy = {
    id: 'energy', num: 3, category: 'fund', icon: 'bulb',
    name: 'Energia e Consumo',
    short: 'Consumo em kWh de um aparelho e estimativa de custo.',
    objective: 'Calcular a energia consumida por um equipamento e estimar quanto ela custa.',
    guidance: 'Informe a potência do aparelho, quantas horas ele fica ligado por dia e por quantos dias. A tarifa é opcional.',
    keywords: ['energia', 'consumo', 'kwh', 'conta de luz', 'tarifa', 'custo', 'reais', 'gasto'],
    formulas: ['E_dia (kWh) = P (W) × t (h) / 1000', 'E_total = E_dia × dias', 'Custo = E_total × tarifa'],
    fields: [
      num('P', 'Potência do aparelho', 'P', 'power', { units: ['W', 'kW'], constraint: 'nonnegative', noun: 'uma potência' }),
      fixed('h', 'Uso por dia', 't', 'h/dia', { constraint: 'hours', noun: 'um tempo de uso' }),
      fixed('days', 'Número de dias', 'd', 'dias', { constraint: 'nonnegative', noun: 'um número de dias' }),
      fixed('tariff', 'Tarifa (opcional)', 'tarifa', 'R$/kWh', { constraint: 'nonnegative', optional: true, hint: 'Deixe em branco se quiser só o consumo.' })
    ],
    example: { values: { P: '500', h: '4', days: '30', tariff: '0,80' }, units: { P: 'W' } },
    assumptions: [
      'Estimativa simplificada: não inclui impostos, bandeiras tarifárias, iluminação pública, custo de disponibilidade nem outras parcelas da conta de luz.',
      'Considera o aparelho funcionando na potência informada durante todo o tempo de uso. Aparelhos com termostato ou ciclos (geladeira, ar-condicionado) costumam consumir menos que potência × tempo.'
    ],
    solve: function (x, H) {
      var pw = x.P, h = x.h, d = x.days, t = x.tariff;
      var ed = pw * h / 1000;
      var et = ed * d;
      var steps = [
        { title: 'Consumo diário', formula: 'E_dia = P × t / 1000', subst: 'E_dia = ' + H.u(pw, 'W') + ' × ' + H.n(h) + ' h / 1000', result: 'E_dia = ' + H.n(ed) + ' kWh' },
        { title: 'Consumo no período', formula: 'E_total = E_dia × dias', subst: 'E_total = ' + H.n(ed) + ' kWh × ' + H.n(d), result: 'E_total = ' + H.n(et) + ' kWh' }
      ];
      var primary = [item('Consumo no período', 'E', et, 'kWh')];
      var results = [item('Consumo diário', 'E_dia', ed, 'kWh'), item('Horas de uso no período', 't', h * d, 'h'), item('Potência em kW', 'P', N.shift10(pw, -3), 'kW')];
      var expl = ['Um aparelho de ' + H.q(pw, 'W') + ' ligado ' + H.n(h) + ' h por dia gasta ' + H.n(ed) + ' kWh por dia. Em ' + H.n(d) +
        ' dias, isso soma ' + H.n(et) + ' kWh. A divisão por 1000 transforma Wh em kWh, que é a unidade usada na conta de luz.'];
      var warnings = [];
      if (t !== null && t !== undefined) {
        var cost = et * t;
        steps.push({ title: 'Custo estimado', formula: 'Custo = E_total × tarifa', subst: 'Custo = ' + H.n(et) + ' kWh × R$ ' + H.n(t) + '/kWh', result: 'Custo = ' + H.money(cost) });
        primary.push(textItem('Custo estimado', 'R$', H.money(cost)));
        primary[1].value = cost;
        primary[1].kind = 'money';
        expl.push('Com tarifa de R$ ' + H.n(t) + ' por kWh, o custo estimado fica em ' + H.money(cost) + '.');
      } else {
        warnings.push('Informe a tarifa (R$/kWh) para estimar o custo. Ela aparece na sua conta de luz.');
      }
      return { primary: primary, results: results, steps: steps, warnings: warnings, explanation: expl };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 04 Associação de resistores                                       */
  /* ---------------------------------------------------------------- */
  var resistors = {
    id: 'resistors', num: 4, category: 'res', icon: 'resistor',
    name: 'Associação de Resistores',
    short: 'Resistência equivalente em série ou em paralelo, de 2 a 10 resistores.',
    objective: 'Calcular a resistência equivalente de resistores ligados em série ou em paralelo.',
    guidance: 'Escolha o tipo de ligação e informe cada resistor. Você pode adicionar até 10 e escolher a unidade de cada um.',
    keywords: ['resistor', 'serie', 'paralelo', 'equivalente', 'req', 'associacao'],
    formulas: ['Série: Req = R1 + R2 + ... + Rn', 'Paralelo: 1/Req = 1/R1 + 1/R2 + ... + 1/Rn'],
    minItems: 2, maxItems: 10,
    fields: [
      choice('type', 'Tipo de ligação', [{ id: 'serie', label: 'Série' }, { id: 'paralelo', label: 'Paralelo' }], 'serie', { isMode: true })
    ],
    hasList: true,
    defaultList: function () { return [{ value: '', unit: OHM }, { value: '', unit: OHM }]; },
    example: { values: { type: 'serie' }, list: [{ value: '10', unit: OHM }, { value: '20', unit: OHM }] },
    assumptions: [
      'Resistores ideais, lineares e com resistência maior que zero.',
      'Fios de ligação com resistência desprezível.'
    ],
    collect: function (state, H, errors, x, echo, conv) {
      var list = state.list || [];
      if (list.length < 2) errors.list = 'Cadastre pelo menos 2 resistores.';
      if (list.length > 10) errors.list = 'O limite é de 10 resistores.';
      var vals = [];
      list.forEach(function (r, i) {
        var def = { label: 'R' + (i + 1), noun: 'uma resistência para R' + (i + 1), dim: 'resistance', constraint: 'positive', unit: OHM };
        var res = V.readField(def, r.value, r.unit, state);
        if (!res.ok) { errors['list.' + i] = res.error; return; }
        vals.push(res.value);
        echo.push({ label: 'Resistor R' + (i + 1), symbol: 'R' + (i + 1), text: H.n(res.input) + ' ' + res.unit, si: res.unit !== OHM ? H.u(res.value, OHM) : null });
        if (res.unit !== OHM) conv.push('R' + (i + 1) + ' = ' + H.n(res.input) + ' ' + res.unit + ' = ' + H.u(res.value, OHM));
      });
      x.list = vals;
    },
    solve: function (x, H, s) {
      var rs = x.list;
      var n = rs.length;
      var names = rs.map(function (_, i) { return 'R' + (i + 1); });
      var steps = [];
      var results = [];
      var req;
      var expl;
      var maxR = Math.max.apply(null, rs);
      var minR = Math.min.apply(null, rs);
      if (s.values.type === 'serie') {
        req = rs.reduce(function (a, b) { return a + b; }, 0);
        steps.push({ title: 'Soma das resistências', formula: 'Req = ' + names.join(' + '),
          subst: 'Req = ' + rs.map(function (r) { return H.u(r, OHM); }).join(' + '), result: 'Req = ' + H.q(req, OHM) });
        expl = 'Em série, a mesma corrente passa por todos os resistores e as resistências se somam. Por isso Req (' + H.q(req, OHM) +
          ') fica maior que o maior resistor (' + H.q(maxR, OHM) + ').';
      } else {
        var g = rs.reduce(function (a, r) { return a + 1 / r; }, 0);
        req = 1 / g;
        steps.push({ title: 'Soma dos inversos', formula: '1/Req = ' + names.map(function (nm) { return '1/' + nm; }).join(' + '),
          subst: '1/Req = ' + rs.map(function (r) { return '1/' + H.n(r); }).join(' + '), result: '1/Req = ' + H.n(g) + ' S' });
        steps.push({ title: 'Resistência equivalente', formula: 'Req = 1 / (1/Req)', subst: 'Req = 1 / ' + H.n(g), result: 'Req = ' + H.q(req, OHM) });
        if (n === 2) {
          steps.push({ title: 'Conferência (produto pela soma)', formula: 'Req = (R1 × R2) / (R1 + R2)',
            subst: 'Req = (' + H.n(rs[0]) + ' × ' + H.n(rs[1]) + ') / (' + H.n(rs[0]) + ' + ' + H.n(rs[1]) + ') = ' + H.n(rs[0] * rs[1]) + ' / ' + H.n(rs[0] + rs[1]),
            result: 'Req = ' + H.q(rs[0] * rs[1] / (rs[0] + rs[1]), OHM) });
        }
        results.push(item('Condutância equivalente', 'Geq', g, 'S'));
        expl = 'Em paralelo, todos os resistores ficam sob a mesma tensão e a corrente se divide entre eles. Cada ramo a mais abre um novo caminho para a corrente, então Req (' +
          H.q(req, OHM) + ') fica menor que o menor resistor (' + H.q(minR, OHM) + ').';
      }
      results.unshift(textItem('Resistores utilizados', 'n', String(n)));
      results.push(item('Maior resistor', 'Rmáx', maxR, OHM), item('Menor resistor', 'Rmín', minR, OHM));
      return {
        primary: [item('Resistência equivalente', 'Req', req, OHM)], results: results, steps: steps, warnings: [],
        explanation: [expl],
        diagram: { kind: s.values.type === 'serie' ? 'series' : 'parallel', names: names, values: rs.map(function (r) { return H.q(r, OHM); }), req: H.q(req, OHM) }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 05 Divisor de tensão                                              */
  /* ---------------------------------------------------------------- */
  var vdiv = {
    id: 'vdiv', num: 5, category: 'res', icon: 'vdiv',
    name: 'Divisor de Tensão',
    short: 'Como a tensão se reparte entre dois resistores em série.',
    objective: 'Calcular quanto da tensão de entrada fica sobre cada um de dois resistores ligados em série.',
    guidance: 'Informe a tensão de entrada e os dois resistores. R2 é o resistor de baixo, onde costuma ficar a saída.',
    keywords: ['divisor', 'tensao', 'vout', 'serie', 'saida', 'resistor'],
    formulas: ['VR1 = Vin × R1 / (R1 + R2)', 'VR2 = Vin × R2 / (R1 + R2)', 'I = Vin / (R1 + R2)'],
    fields: [
      num('Vin', 'Tensão de entrada', 'Vin', 'voltage', { noun: 'uma tensão de entrada' }),
      num('R1', 'Resistência R1', 'R1', 'resistance', { constraint: 'positive', noun: 'uma resistência R1' }),
      num('R2', 'Resistência R2', 'R2', 'resistance', { constraint: 'positive', noun: 'uma resistência R2' })
    ],
    example: { values: { Vin: '12', R1: '1', R2: '2' }, units: { Vin: 'V', R1: 'k' + OHM, R2: 'k' + OHM } },
    assumptions: [
      'Resistores ideais e saída sem carga.',
      'Se você ligar uma carga em paralelo com R2, a tensão de saída cai, porque a carga muda a resistência do ramo de baixo.'
    ],
    solve: function (x, H) {
      var vin = x.Vin, r1 = x.R1, r2 = x.R2;
      var rt = r1 + r2;
      var i = vin / rt;
      var v1 = vin * r1 / rt;
      var v2 = vin * r2 / rt;
      var frac = r2 / rt;
      var steps = [
        { title: 'Resistência total', formula: 'Rt = R1 + R2', subst: 'Rt = ' + H.u(r1, OHM) + ' + ' + H.u(r2, OHM), result: 'Rt = ' + H.q(rt, OHM) },
        { title: 'Corrente do circuito', formula: 'I = Vin / (R1 + R2)', subst: 'I = ' + H.u(vin, 'V') + ' / ' + H.u(rt, OHM), result: 'I = ' + H.q(i, 'A') },
        { title: 'Tensão sobre R1', formula: 'VR1 = Vin × R1 / (R1 + R2)', subst: 'VR1 = ' + H.u(vin, 'V') + ' × ' + H.n(r1) + ' / ' + H.n(rt), result: 'VR1 = ' + H.q(v1, 'V') },
        { title: 'Tensão sobre R2 (saída)', formula: 'VR2 = Vin × R2 / (R1 + R2)', subst: 'VR2 = ' + H.u(vin, 'V') + ' × ' + H.n(r2) + ' / ' + H.n(rt), result: 'VR2 = ' + H.q(v2, 'V') },
        { title: 'Conferência', formula: 'VR1 + VR2 = Vin', subst: H.q(v1, 'V') + ' + ' + H.q(v2, 'V'), result: '= ' + H.q(v1 + v2, 'V') }
      ];
      return {
        primary: [item('Tensão sobre R1', 'VR1', v1, 'V'), item('Tensão sobre R2 (saída)', 'VR2', v2, 'V')],
        results: [item('Corrente do circuito', 'I', i, 'A'), item('Resistência total', 'Rt', rt, OHM), item('Fração da entrada na saída', 'VR2/Vin', frac * 100, '%')],
        steps: steps, warnings: [],
        explanation: [
          'A tensão se reparte na mesma proporção das resistências. R2 representa ' + H.n(frac * 100) + '% da resistência total, então fica com ' +
            H.n(frac * 100) + '% da tensão de entrada: ' + H.q(v2, 'V') + '.',
          'A mesma corrente (' + H.q(i, 'A') + ') passa pelos dois resistores, porque eles estão em série.'
        ],
        diagram: { kind: 'vdiv', Vin: H.q(vin, 'V'), R1: H.q(r1, OHM), R2: H.q(r2, OHM), V1: H.q(v1, 'V'), V2: H.q(v2, 'V'), I: H.q(i, 'A') }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 06 Divisor de corrente                                            */
  /* ---------------------------------------------------------------- */
  var idiv = {
    id: 'idiv', num: 6, category: 'res', icon: 'idiv',
    name: 'Divisor de Corrente',
    short: 'Como a corrente total se divide entre dois resistores em paralelo.',
    objective: 'Determinar quanto da corrente total passa por cada um de dois resistores em paralelo.',
    guidance: 'Informe a corrente que entra no par de resistores e o valor de cada um.',
    keywords: ['divisor', 'corrente', 'paralelo', 'ramo', 'resistor'],
    formulas: ['I1 = Itotal × R2 / (R1 + R2)', 'I2 = Itotal × R1 / (R1 + R2)'],
    fields: [
      num('It', 'Corrente total', 'Itotal', 'current', { noun: 'uma corrente total' }),
      num('R1', 'Resistência R1', 'R1', 'resistance', { constraint: 'positive', noun: 'uma resistência R1' }),
      num('R2', 'Resistência R2', 'R2', 'resistance', { constraint: 'positive', noun: 'uma resistência R2' })
    ],
    example: { values: { It: '3', R1: '2', R2: '4' }, units: { It: 'A', R1: OHM, R2: OHM } },
    assumptions: ['Circuito resistivo ideal com dois ramos em paralelo, como no esquema.', 'Fios de ligação com resistência desprezível.'],
    solve: function (x, H) {
      var it = x.It, r1 = x.R1, r2 = x.R2;
      var sum = r1 + r2;
      var i1 = it * r2 / sum;
      var i2 = it * r1 / sum;
      var req = r1 * r2 / sum;
      var v = it * req;
      var steps = [
        { title: 'Corrente no ramo R1', formula: 'I1 = Itotal × R2 / (R1 + R2)', subst: 'I1 = ' + H.u(it, 'A') + ' × ' + H.n(r2) + ' / (' + H.n(r1) + ' + ' + H.n(r2) + ')', result: 'I1 = ' + H.q(i1, 'A') },
        { title: 'Corrente no ramo R2', formula: 'I2 = Itotal × R1 / (R1 + R2)', subst: 'I2 = ' + H.u(it, 'A') + ' × ' + H.n(r1) + ' / (' + H.n(r1) + ' + ' + H.n(r2) + ')', result: 'I2 = ' + H.q(i2, 'A') },
        { title: 'Resistência equivalente', formula: 'Req = (R1 × R2) / (R1 + R2)', subst: 'Req = (' + H.n(r1) + ' × ' + H.n(r2) + ') / ' + H.n(sum), result: 'Req = ' + H.q(req, OHM) },
        { title: 'Tensão comum aos dois ramos', formula: 'V = Itotal × Req', subst: 'V = ' + H.u(it, 'A') + ' × ' + H.u(req, OHM), result: 'V = ' + H.q(v, 'V') },
        { title: 'Conferência', formula: 'I1 + I2 = Itotal', subst: H.q(i1, 'A') + ' + ' + H.q(i2, 'A'), result: '= ' + H.q(i1 + i2, 'A') }
      ];
      var smaller = r1 <= r2 ? 'R1' : 'R2';
      return {
        primary: [item('Corrente no ramo R1', 'I1', i1, 'A'), item('Corrente no ramo R2', 'I2', i2, 'A')],
        results: [item('Resistência equivalente', 'Req', req, OHM), item('Tensão comum', 'V', v, 'V'), item('Soma I1 + I2', 'Itotal', i1 + i2, 'A')],
        steps: steps, warnings: [],
        explanation: [
          r1 === r2 ? 'Os dois resistores são iguais, então a corrente se divide meio a meio.'
            : 'A maior parte da corrente passa pelo ramo de menor resistência (' + smaller + '). Repare que a corrente de um ramo depende da resistência do outro ramo.',
          'Os dois resistores ficam sob a mesma tensão (' + H.q(v, 'V') + '). Pela Lei de Ohm, I1 = V/R1 e I2 = V/R2.'
        ],
        diagram: { kind: 'idiv', It: H.q(it, 'A'), R1: H.q(r1, OHM), R2: H.q(r2, OHM), I1: H.q(i1, 'A'), I2: H.q(i2, 'A') }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 07 Frequência, período e velocidade angular                       */
  /* ---------------------------------------------------------------- */
  var freq = {
    id: 'freq', num: 7, category: 'ca', icon: 'wave',
    name: 'Frequência e Período',
    short: 'Converte frequência em período e calcula a frequência angular.',
    objective: 'Converter frequência em período (e o contrário) e obter a frequência angular de um sinal periódico.',
    guidance: 'Escolha o que você quer calcular e informe a outra grandeza.',
    keywords: ['frequencia', 'periodo', 'hertz', 'hz', 'omega', 'angular', 'rad/s', 'senoide'],
    formulas: ['T = 1 / f', 'f = 1 / T', 'ω = 2πf'],
    fields: [
      choice('mode', 'O que você quer calcular?', [{ id: 'T', label: 'Calcular período' }, { id: 'f', label: 'Calcular frequência' }], 'T', { isMode: true }),
      num('f', 'Frequência', 'f', 'frequency', { constraint: 'positive', noun: 'uma frequência', showIf: modeIs('T') }),
      num('T', 'Período', 'T', 'time', { units: [MU + 's', 'ms', 's'], constraint: 'positive', noun: 'um período', showIf: modeIs('f') })
    ],
    example: { values: { mode: 'T', f: '60' }, units: { f: 'Hz' } },
    assumptions: ['Sinal periódico. A frequência angular ω = 2πf vale para sinais senoidais.'],
    solve: function (x, H, s) {
      var f, t;
      var steps = [];
      var primary;
      var results = [];
      if (s.values.mode === 'T') {
        f = x.f;
        t = 1 / f;
        steps.push({ title: 'Período', formula: 'T = 1 / f', subst: 'T = 1 / ' + H.u(f, 'Hz'), result: 'T = ' + H.q(t, 's') });
        primary = item('Período', 'T', t, 's');
        results.push(item('Frequência', 'f', f, 'Hz'));
      } else {
        t = x.T;
        f = 1 / t;
        steps.push({ title: 'Frequência', formula: 'f = 1 / T', subst: 'f = 1 / ' + H.u(t, 's'), result: 'f = ' + H.q(f, 'Hz') });
        primary = item('Frequência', 'f', f, 'Hz');
        results.push(item('Período', 'T', t, 's'));
      }
      var w = 2 * PI * f;
      steps.push({ title: 'Frequência angular', formula: 'ω = 2 × π × f', subst: 'ω = 2 × π × ' + H.u(f, 'Hz'), result: 'ω = ' + H.n(w) + ' rad/s' });
      results.push(item('Frequência angular', 'ω', w, 'rad/s'));
      return {
        primary: [primary], results: results, steps: steps, warnings: [],
        explanation: [
          'Frequência e período são inversos. Um sinal de ' + H.q(f, 'Hz') + ' completa ' + H.n(f) + ' ciclos por segundo, então cada ciclo dura ' + H.q(t, 's') + '.',
          'A frequência angular ω mede a mesma rapidez em radianos por segundo. Um ciclo completo corresponde a 2π rad, por isso ω = 2πf.'
        ],
        diagram: { kind: 'sine', f: H.q(f, 'Hz'), T: H.q(t, 's') }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 08 Reatância indutiva e capacitiva                                */
  /* ---------------------------------------------------------------- */
  var reactance = {
    id: 'reactance', num: 8, category: 'ca', icon: 'coil',
    name: 'Reatância',
    short: 'Reatância indutiva (XL) e capacitiva (XC) em corrente alternada.',
    objective: 'Calcular a oposição que indutores e capacitores ideais oferecem a uma corrente alternada senoidal.',
    guidance: 'Escolha indutor, capacitor ou ambos. Informe a frequência e o valor dos componentes.',
    keywords: ['reatancia', 'xl', 'xc', 'indutor', 'capacitor', 'indutancia', 'capacitancia', 'ressonancia'],
    formulas: ['XL = 2πfL', 'XC = 1 / (2πfC)', 'f0 = 1 / (2π√(LC))'],
    fields: [
      choice('mode', 'O que você quer calcular?', [{ id: 'L', label: 'Indutiva (XL)' }, { id: 'C', label: 'Capacitiva (XC)' }, { id: 'LC', label: 'Ambas' }], 'LC', { isMode: true }),
      num('f', 'Frequência', 'f', 'frequency', { constraint: 'positive', noun: 'uma frequência' }),
      num('L', 'Indutância', 'L', 'inductance', { unit: 'H', constraint: 'positive', noun: 'uma indutância', showIf: modeIs('L', 'LC') }),
      num('C', 'Capacitância', 'C', 'capacitance', { unit: MU + 'F', constraint: 'positive', noun: 'uma capacitância', showIf: modeIs('C', 'LC') })
    ],
    example: { values: { mode: 'LC', f: '60', L: '0,1', C: '100' }, units: { f: 'Hz', L: 'H', C: MU + 'F' } },
    assumptions: [
      'Indutor e capacitor ideais: sem resistência interna e sem perdas.',
      'Regime senoidal permanente na frequência informada.',
      'XC aparece aqui como módulo (sempre positivo). Na impedância complexa do capacitor ele entra com sinal negativo: ZC = −j·XC.'
    ],
    solve: function (x, H, s) {
      var m = s.values.mode;
      var f = x.f;
      var w = 2 * PI * f;
      var steps = [];
      var primary = [];
      var results = [item('Frequência angular', 'ω', w, 'rad/s')];
      var expl = [];
      var xl, xc;
      if (m === 'L' || m === 'LC') {
        xl = w * x.L;
        steps.push({ title: 'Reatância indutiva', formula: 'XL = 2 × π × f × L', subst: 'XL = 2 × π × ' + H.u(f, 'Hz') + ' × ' + H.u(x.L, 'H'), result: 'XL = ' + H.q(xl, OHM) });
        primary.push(item('Reatância indutiva', 'XL', xl, OHM));
        results.push(textItem('Impedância do indutor', 'ZL', '+j' + H.q(xl, OHM)));
        expl.push('XL cresce junto com a frequência: se f dobrar, XL dobra. Em corrente contínua (f = 0) o indutor ideal se comporta como um fio.');
      }
      if (m === 'C' || m === 'LC') {
        xc = 1 / (w * x.C);
        steps.push({ title: 'Reatância capacitiva (módulo)', formula: 'XC = 1 / (2 × π × f × C)', subst: 'XC = 1 / (2 × π × ' + H.u(f, 'Hz') + ' × ' + H.u(x.C, 'F') + ')', result: 'XC = ' + H.q(xc, OHM) });
        primary.push(item('Reatância capacitiva', 'XC', xc, OHM));
        results.push(textItem('Impedância do capacitor', 'ZC', '−j' + H.q(xc, OHM)));
        expl.push('XC faz o caminho contrário: se f dobrar, XC cai pela metade. Em frequências muito baixas o capacitor ideal bloqueia a corrente.');
      }
      if (m === 'LC') {
        var f0 = 1 / (2 * PI * Math.sqrt(x.L * x.C));
        steps.push({ title: 'Frequência de ressonância', formula: 'f0 = 1 / (2 × π × √(L × C))', subst: 'f0 = 1 / (2 × π × √(' + H.u(x.L, 'H') + ' × ' + H.u(x.C, 'F') + '))', result: 'f0 = ' + H.q(f0, 'Hz') });
        results.push(item('Frequência de ressonância', 'f0', f0, 'Hz'));
        var rel = Math.abs(xl - xc) <= 1e-9 * Math.max(xl, xc) ? 'XL e XC são praticamente iguais: o circuito está em ressonância.'
          : (xl > xc ? 'Nesta frequência XL é maior que XC, então o indutor domina.' : 'Nesta frequência XC é maior que XL, então o capacitor domina.');
        expl.push(rel + ' Na frequência de ressonância (' + H.q(f0, 'Hz') + ') as duas reatâncias ficam iguais.');
      }
      return { primary: primary, results: results, steps: steps, warnings: [], explanation: expl };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 09 Impedância RLC série                                           */
  /* ---------------------------------------------------------------- */
  var impedance = {
    id: 'impedance', num: 9, category: 'ca', icon: 'triangle',
    name: 'Impedância RLC',
    short: 'Impedância, ângulo de fase e fator de potência de circuitos RL, RC e RLC em série.',
    objective: 'Calcular a impedância total de circuitos RL, RC e RLC em série e o comportamento da corrente.',
    guidance: 'Escolha o tipo de circuito, informe os componentes e a frequência. A tensão é opcional e serve para calcular a corrente.',
    keywords: ['impedancia', 'rlc', 'rl', 'rc', 'fase', 'fator de potencia', 'serie', 'ressonancia', 'z'],
    formulas: ['X = XL − XC', 'Z = R + jX', '|Z| = √(R² + X²)', 'φ = atan2(X, R)', 'FP = R / |Z|', 'I = V / |Z|'],
    fields: [
      choice('type', 'Tipo de circuito', [{ id: 'RL', label: 'RL' }, { id: 'RC', label: 'RC' }, { id: 'RLC', label: 'RLC' }], 'RLC', { isMode: true }),
      num('R', 'Resistência', 'R', 'resistance', { constraint: 'nonnegative', noun: 'uma resistência' }),
      num('L', 'Indutância', 'L', 'inductance', { unit: 'H', constraint: 'positive', noun: 'uma indutância', showIf: valueIs('type', 'RL', 'RLC') }),
      num('C', 'Capacitância', 'C', 'capacitance', { unit: MU + 'F', constraint: 'positive', noun: 'uma capacitância', showIf: valueIs('type', 'RC', 'RLC') }),
      num('f', 'Frequência', 'f', 'frequency', { constraint: 'positive', noun: 'uma frequência' }),
      num('V', 'Tensão RMS (opcional)', 'V', 'voltage', { constraint: 'nonnegative', optional: true, hint: 'Preencha para calcular a corrente e as tensões em cada componente.' })
    ],
    example: { values: { type: 'RLC', R: '10', L: '0,1', C: '100', f: '60', V: '120' }, units: { R: OHM, L: 'H', C: MU + 'F', f: 'Hz', V: 'V' } },
    assumptions: [
      'Componentes ideais ligados em série, em regime senoidal permanente.',
      'Tensão e corrente em valores eficazes (RMS).',
      'Ângulo φ da impedância: positivo quando a corrente fica atrasada em relação à tensão (indutivo) e negativo quando fica adiantada (capacitivo).'
    ],
    solve: function (x, H, s) {
      var type = s.values.type;
      var hasL = type === 'RL' || type === 'RLC';
      var hasC = type === 'RC' || type === 'RLC';
      var r = x.R, f = x.f;
      var w = 2 * PI * f;
      var xl = hasL ? w * x.L : 0;
      var xc = hasC ? 1 / (w * x.C) : 0;
      var X = xl - xc;
      if (Math.abs(X) <= 1e-12 * Math.max(xl, xc)) X = 0;
      var z = Math.hypot(r, X);
      var steps = [];
      var warnings = [];
      var results = [];
      var primary = [];
      var expl = [];

      if (hasL) steps.push({ title: 'Reatância indutiva', formula: 'XL = 2 × π × f × L', subst: 'XL = 2 × π × ' + H.u(f, 'Hz') + ' × ' + H.u(x.L, 'H'), result: 'XL = ' + H.q(xl, OHM) });
      else steps.push({ title: 'Reatância indutiva', lines: ['XL = 0 (o circuito RC não tem indutor)'] });
      if (hasC) steps.push({ title: 'Reatância capacitiva', formula: 'XC = 1 / (2 × π × f × C)', subst: 'XC = 1 / (2 × π × ' + H.u(f, 'Hz') + ' × ' + H.u(x.C, 'F') + ')', result: 'XC = ' + H.q(xc, OHM) });
      else steps.push({ title: 'Reatância capacitiva', lines: ['XC = 0 (o circuito RL não tem capacitor)'] });
      steps.push({ title: 'Reatância líquida', formula: 'X = XL − XC', subst: 'X = ' + H.u(xl, OHM) + ' − ' + H.u(xc, OHM), result: 'X = ' + H.u(X, OHM) });
      var zc = H.n(r) + (X < 0 ? ' − j' : ' + j') + H.n(Math.abs(X)) + ' ' + OHM;
      steps.push({ title: 'Impedância complexa', formula: 'Z = R + jX', subst: 'Z = ' + H.n(r) + ' + j(' + H.n(X) + ')', result: 'Z = ' + zc });
      steps.push({ title: 'Módulo da impedância', formula: '|Z| = √(R² + X²)', subst: '|Z| = √(' + H.n(r) + '² + ' + H.n(Math.abs(X)) + '²)', result: '|Z| = ' + H.q(z, OHM) });

      results.push(textItem('Impedância complexa', 'Z', zc));
      results.push(item('Reatância indutiva', 'XL', xl, OHM), item('Reatância capacitiva', 'XC', xc, OHM), item('Reatância líquida', 'X', X, OHM));
      if (type === 'RLC') {
        var f0 = 1 / (2 * PI * Math.sqrt(x.L * x.C));
        results.push(item('Frequência de ressonância', 'f0', f0, 'Hz'));
      }

      if (z === 0) {
        primary.push(item('Módulo da impedância', '|Z|', 0, OHM));
        results.push(textItem('Ângulo de fase', 'φ', 'indeterminado'), textItem('Fator de potência', 'FP', 'indeterminado'));
        warnings.push('Com R = 0 e XL = XC, a impedância do modelo ideal vale zero: é um curto-circuito. O ângulo de fase e o fator de potência ficam indeterminados e a corrente não pode ser calculada (seria infinita no modelo ideal).');
        expl.push('O circuito está em ressonância e não tem resistência. Na prática, a resistência dos fios e do indutor limita a corrente, mas o modelo ideal não consegue dar um valor.');
        return { primary: primary, results: results, steps: steps, warnings: warnings, explanation: expl, diagram: null };
      }

      var phi = Math.atan2(X, r) * 180 / PI;
      var fp = r / z;
      var behavior;
      if (X > 0) behavior = 'Predominantemente indutivo';
      else if (X < 0) behavior = 'Predominantemente capacitivo';
      else behavior = 'Resistivo';
      steps.push({ title: 'Ângulo de fase', formula: 'φ = atan2(X, R)', subst: 'φ = atan2(' + H.n(X) + ', ' + H.n(r) + ')', result: 'φ = ' + H.deg(phi) });
      steps.push({ title: 'Fator de potência', formula: 'FP = R / |Z| = cos φ', subst: 'FP = ' + H.n(r) + ' / ' + H.n(z), result: 'FP = ' + H.n(fp) });
      primary.push(item('Módulo da impedância', '|Z|', z, OHM), item('Ângulo de fase', 'φ', phi, '°'));
      results.splice(1, 0, textItem('Comportamento', '', behavior), item('Fator de potência', 'FP', fp, ''));

      if (X > 0) expl.push('XL é maior que XC, então o circuito é predominantemente indutivo: a corrente fica atrasada ' + H.deg(Math.abs(phi)) + ' em relação à tensão.');
      else if (X < 0) expl.push('XC é maior que XL, então o circuito é predominantemente capacitivo: a corrente fica adiantada ' + H.deg(Math.abs(phi)) + ' em relação à tensão.');
      else expl.push(type === 'RLC' ? 'XL e XC se cancelam: o circuito está em ressonância e se comporta como uma resistência pura (φ = 0°).' : 'Sem reatância líquida, o circuito se comporta como uma resistência pura.');
      if (r === 0) {
        warnings.push('Sem resistência, o circuito é puramente reativo: o fator de potência é 0 e não há consumo de potência ativa.');
      }
      expl.push('O fator de potência ' + H.n(fp) + ' indica a fração da potência aparente que vira potência ativa.');

      if (x.V !== null && x.V !== undefined) {
        var vrms = x.V;
        var i = vrms / z;
        var vr = i * r, vl = i * xl, vc = i * xc;
        steps.push({ title: 'Corrente RMS', formula: 'I = V / |Z|', subst: 'I = ' + H.u(vrms, 'V') + ' / ' + H.u(z, OHM), result: 'I = ' + H.q(i, 'A') });
        var lines = ['VR = I × R = ' + H.q(vr, 'V')];
        if (hasL) lines.push('VL = I × XL = ' + H.q(vl, 'V'));
        if (hasC) lines.push('VC = I × XC = ' + H.q(vc, 'V'));
        steps.push({ title: 'Tensões nos componentes (módulos)', lines: lines });
        var p = i * i * r, q = i * i * X, sa = vrms * i;
        steps.push({ title: 'Potências', lines: ['P = I² × R = ' + H.q(p, 'W'), 'Q = I² × X = ' + H.q(q, 'var', { sign: true }), 'S = V × I = ' + H.q(sa, 'VA')] });
        primary.push(item('Corrente RMS', 'I', i, 'A'));
        results.push(item('Tensão no resistor', 'VR', vr, 'V'));
        if (hasL) results.push(item('Tensão no indutor', 'VL', vl, 'V'));
        if (hasC) results.push(item('Tensão no capacitor', 'VC', vc, 'V'));
        results.push(item('Potência ativa', 'P', p, 'W'), item('Potência reativa', 'Q', q, 'var', { sign: true }), item('Potência aparente', 'S', sa, 'VA'));
        if (vl > vrms || vc > vrms) {
          expl.push('Repare que a tensão no indutor ou no capacitor pode passar da tensão da fonte. As duas estão defasadas 180° entre si e se cancelam em parte, então a soma vetorial continua igual a V.');
        }
      }
      return {
        primary: primary, results: results, steps: steps, warnings: warnings, explanation: expl,
        diagram: { kind: 'triangle', title: 'Triângulo de impedâncias', a: r, b: X, sym: { a: 'R', b: 'X', c: '|Z|' }, legend: ['R = ' + H.q(r, OHM) + ' (cateto horizontal)', 'X = ' + H.q(X, OHM) + (X >= 0 ? ' (para cima: indutivo)' : ' (para baixo: capacitivo)'), '|Z| = ' + H.q(z, OHM) + ' (hipotenusa)', 'φ = ' + H.deg(phi)] }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* Natureza da carga (usado em 10 e 11)                              */
  /* ---------------------------------------------------------------- */
  var NATURE = [{ id: 'indutiva', label: 'Indutiva' }, { id: 'capacitiva', label: 'Capacitiva' }, { id: 'resistiva', label: 'Resistiva' }];

  function checkResistiveFP(x, s) {
    if (s.values.nature === 'resistiva' && Math.abs(x.FP - 1) > 1e-12) {
      var msg = 'Uma carga resistiva ideal tem fator de potência igual a 1. Use FP = 1 ou escolha carga indutiva ou capacitiva.';
      return { error: msg, fieldErrors: { FP: msg } };
    }
    return null;
  }

  function powerParts(sAp, fp, nature) {
    var sign = nature === 'capacitiva' ? -1 : 1;
    var qmag = sAp * Math.sqrt(Math.max(0, 1 - fp * fp));
    var q = nature === 'resistiva' ? 0 : sign * qmag;
    var phi = nature === 'resistiva' ? 0 : sign * Math.acos(fp) * 180 / PI;
    return { p: sAp * fp, q: q, phi: phi, qmag: qmag };
  }

  function powerNotes(fp, nature, H, pp) {
    var warnings = [];
    if (fp === 1 && nature !== 'resistiva') warnings.push('Com FP = 1 não há potência reativa: a carga se comporta como resistiva.');
    if (fp === 0) warnings.push('Com FP = 0 toda a potência é reativa: a carga não consome potência ativa.');
    return warnings;
  }

  /* ---------------------------------------------------------------- */
  /* 10 Potência monofásica                                            */
  /* ---------------------------------------------------------------- */
  var mono = {
    id: 'mono', num: 10, category: 'pot', icon: 'plug',
    name: 'Potência Monofásica',
    short: 'Potências ativa, aparente e reativa em circuito monofásico CA.',
    objective: 'Calcular as potências ativa, aparente e reativa de uma carga monofásica senoidal.',
    guidance: 'Informe tensão e corrente RMS, o fator de potência e a natureza da carga.',
    keywords: ['potencia', 'monofasica', 'ativa', 'reativa', 'aparente', 'fator de potencia', 'va', 'var', 'ca'],
    formulas: ['S = V × I', 'P = V × I × FP', '|Q| = S × √(1 − FP²)', '|φ| = arccos(FP)'],
    fields: [
      num('V', 'Tensão RMS', 'V', 'voltage', { constraint: 'nonnegative', noun: 'uma tensão' }),
      num('I', 'Corrente RMS', 'I', 'current', { constraint: 'nonnegative', noun: 'uma corrente' }),
      fixed('FP', 'Fator de potência', 'FP', '', { constraint: 'fp', hint: 'Número entre 0 e 1. Ex.: 0,8' }),
      choice('nature', 'Natureza da carga', NATURE, 'indutiva')
    ],
    example: { values: { V: '120', I: '5', FP: '0,8', nature: 'indutiva' }, units: { V: 'V', I: 'A' } },
    assumptions: [
      'Regime senoidal permanente, tensão e corrente em valores eficazes (RMS).',
      'FP = cos φ, válido para tensão e corrente senoidais (sem harmônicas).',
      'Convenção de sinal: Q positivo para carga indutiva (corrente atrasada) e Q negativo para carga capacitiva (corrente adiantada).'
    ],
    solve: function (x, H, s) {
      var bad = checkResistiveFP(x, s);
      if (bad) return bad;
      var nature = s.values.nature;
      var sAp = x.V * x.I;
      var pp = powerParts(sAp, x.FP, nature);
      var steps = [
        { title: 'Potência aparente', formula: 'S = V × I', subst: 'S = ' + H.u(x.V, 'V') + ' × ' + H.u(x.I, 'A'), result: 'S = ' + H.q(sAp, 'VA') },
        { title: 'Potência ativa', formula: 'P = V × I × FP', subst: 'P = ' + H.u(x.V, 'V') + ' × ' + H.u(x.I, 'A') + ' × ' + H.n(x.FP), result: 'P = ' + H.q(pp.p, 'W') },
        { title: 'Potência reativa', formula: '|Q| = S × √(1 − FP²)', subst: '|Q| = ' + H.n(sAp) + ' × √(1 − ' + H.n(x.FP) + '²)',
          result: 'Q = ' + H.q(pp.q, 'var', { sign: true }) + ' (sinal ' + (pp.q < 0 ? 'negativo: carga capacitiva' : (pp.q > 0 ? 'positivo: carga indutiva' : 'nulo')) + ')' },
        { title: 'Ângulo de fase', formula: '|φ| = arccos(FP)', subst: '|φ| = arccos(' + H.n(x.FP) + ')', result: 'φ = ' + H.deg(pp.phi) },
        { title: 'Conferência', formula: 'S = √(P² + Q²)', subst: 'S = √(' + H.n(pp.p) + '² + ' + H.n(Math.abs(pp.q)) + '²)', result: 'S = ' + H.q(Math.hypot(pp.p, pp.q), 'VA') }
      ];
      return {
        primary: [item('Potência ativa', 'P', pp.p, 'W'), item('Potência aparente', 'S', sAp, 'VA'), item('Potência reativa', 'Q', pp.q, 'var', { sign: true })],
        results: [item('Ângulo de fase', 'φ', pp.phi, '°'), item('Fator de potência', 'FP', x.FP, ''), textItem('Natureza da carga', '', NATURE.filter(function (n) { return n.id === nature; })[0].label)],
        steps: steps, warnings: powerNotes(x.FP, nature, H, pp),
        explanation: [
          'A fonte entrega ' + H.q(sAp, 'VA') + ' de potência aparente. Desse total, ' + H.q(pp.p, 'W') + ' viram trabalho útil ou calor (potência ativa).',
          'Os ' + H.q(Math.abs(pp.q), 'var') + ' de potência reativa ficam indo e voltando entre a fonte e os campos elétricos ou magnéticos da carga. Eles não realizam trabalho, mas ocupam a capacidade dos cabos e transformadores.'
        ],
        diagram: { kind: 'triangle', title: 'Triângulo de potências', a: pp.p, b: pp.q, sym: { a: 'P', b: 'Q', c: 'S' }, legend: ['P = ' + H.q(pp.p, 'W') + ' (ativa)', 'Q = ' + H.q(pp.q, 'var', { sign: true }) + ' (reativa)', 'S = ' + H.q(sAp, 'VA') + ' (aparente)', 'φ = ' + H.deg(pp.phi)] }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 11 Potência trifásica equilibrada                                 */
  /* ---------------------------------------------------------------- */
  var tri = {
    id: 'tri', num: 11, category: 'pot', icon: 'three',
    name: 'Potência Trifásica',
    short: 'Potências e grandezas de fase de um sistema trifásico equilibrado.',
    objective: 'Calcular as potências de um sistema trifásico equilibrado e as grandezas de fase para ligação estrela ou triângulo.',
    guidance: 'Informe a tensão entre fases (de linha) e a corrente de linha, ambas RMS, além do FP, da ligação e da natureza da carga.',
    keywords: ['trifasico', 'trifasica', 'estrela', 'triangulo', 'delta', 'linha', 'fase', 'raiz de 3', 'potencia'],
    formulas: ['S = √3 × VL × IL', 'P = √3 × VL × IL × FP', '|Q| = S × √(1 − FP²)', 'Estrela: Vfase = VL/√3, Ifase = IL', 'Triângulo: Vfase = VL, Ifase = IL/√3'],
    fields: [
      num('VL', 'Tensão de linha (fase-fase) RMS', 'VL', 'voltage', { constraint: 'nonnegative', noun: 'uma tensão de linha' }),
      num('IL', 'Corrente de linha RMS', 'IL', 'current', { constraint: 'nonnegative', noun: 'uma corrente de linha' }),
      fixed('FP', 'Fator de potência', 'FP', '', { constraint: 'fp', hint: 'Número entre 0 e 1. Ex.: 0,8' }),
      choice('conn', 'Tipo de ligação', [{ id: 'estrela', label: 'Estrela (Y)' }, { id: 'triangulo', label: 'Triângulo (Δ)' }], 'estrela'),
      choice('nature', 'Natureza da carga', NATURE, 'indutiva')
    ],
    example: { values: { VL: '380', IL: '10', FP: '0,8', conn: 'estrela', nature: 'indutiva' }, units: { VL: 'V', IL: 'A' } },
    assumptions: [
      'Sistema trifásico equilibrado: as três fases têm a mesma carga, tensões e correntes de mesmo módulo defasadas 120°.',
      'Tensões e correntes em valores eficazes (RMS) e condições senoidais.',
      'Não aplique diretamente estas expressões a cargas desequilibradas. Nesse caso cada fase precisa ser calculada separadamente.'
    ],
    solve: function (x, H, s) {
      var bad = checkResistiveFP(x, s);
      if (bad) return bad;
      var nature = s.values.nature;
      var star = s.values.conn === 'estrela';
      var sAp = SQRT3 * x.VL * x.IL;
      var pp = powerParts(sAp, x.FP, nature);
      var vf = star ? x.VL / SQRT3 : x.VL;
      var ifs = star ? x.IL : x.IL / SQRT3;
      var steps = [
        { title: 'Potência aparente', formula: 'S = √3 × VL × IL', subst: 'S = √3 × ' + H.u(x.VL, 'V') + ' × ' + H.u(x.IL, 'A'), result: 'S = ' + H.q(sAp, 'VA') },
        { title: 'Potência ativa', formula: 'P = √3 × VL × IL × FP', subst: 'P = √3 × ' + H.u(x.VL, 'V') + ' × ' + H.u(x.IL, 'A') + ' × ' + H.n(x.FP), result: 'P = ' + H.q(pp.p, 'W') + ' (' + H.n(pp.p) + ' W)' },
        { title: 'Potência reativa', formula: '|Q| = S × √(1 − FP²)', subst: '|Q| = ' + H.n(sAp) + ' × √(1 − ' + H.n(x.FP) + '²)', result: 'Q = ' + H.q(pp.q, 'var', { sign: true }) },
        star ? { title: 'Tensão de fase (estrela)', formula: 'Vfase = VL / √3', subst: 'Vfase = ' + H.u(x.VL, 'V') + ' / √3', result: 'Vfase = ' + H.q(vf, 'V') }
          : { title: 'Tensão de fase (triângulo)', formula: 'Vfase = VL', subst: 'Vfase = ' + H.u(x.VL, 'V'), result: 'Vfase = ' + H.q(vf, 'V') },
        star ? { title: 'Corrente de fase (estrela)', formula: 'Ifase = IL', subst: 'Ifase = ' + H.u(x.IL, 'A'), result: 'Ifase = ' + H.q(ifs, 'A') }
          : { title: 'Corrente de fase (triângulo)', formula: 'Ifase = IL / √3', subst: 'Ifase = ' + H.u(x.IL, 'A') + ' / √3', result: 'Ifase = ' + H.q(ifs, 'A') },
        { title: 'Potência ativa por fase', formula: 'Pfase = P / 3', subst: 'Pfase = ' + H.n(pp.p) + ' / 3', result: 'Pfase = ' + H.q(pp.p / 3, 'W') }
      ];
      var results = [
        item('Tensão de fase', 'Vfase', vf, 'V'), item('Corrente de fase', 'Ifase', ifs, 'A'),
        item('Ângulo de fase', 'φ', pp.phi, '°'), item('Potência ativa por fase', 'Pfase', pp.p / 3, 'W')
      ];
      if (ifs > 0) {
        var zf = vf / ifs;
        steps.push({ title: 'Impedância por fase (módulo)', formula: '|Zfase| = Vfase / Ifase', subst: '|Zfase| = ' + H.u(vf, 'V') + ' / ' + H.u(ifs, 'A'), result: '|Zfase| = ' + H.q(zf, OHM) });
        results.push(item('Impedância por fase', '|Zfase|', zf, OHM));
      }
      return {
        primary: [item('Potência ativa', 'P', pp.p, 'W'), item('Potência aparente', 'S', sAp, 'VA'), item('Potência reativa', 'Q', pp.q, 'var', { sign: true })],
        results: results, steps: steps, warnings: powerNotes(x.FP, nature, H, pp),
        explanation: [
          'O fator √3 (cerca de 1,7321) aparece porque as tensões das três fases estão defasadas 120°. Com ele, a potência total pode ser calculada direto com valores de linha.',
          star ? 'Na ligação estrela, cada carga fica entre uma fase e o neutro: recebe VL/√3 = ' + H.q(vf, 'V') + ' e é percorrida pela própria corrente de linha.'
            : 'Na ligação triângulo, cada carga fica entre duas fases: recebe a tensão de linha inteira e é percorrida por IL/√3 = ' + H.q(ifs, 'A') + '.'
        ],
        diagram: { kind: star ? 'wye' : 'delta', VL: H.q(x.VL, 'V'), IL: H.q(x.IL, 'A'), Vf: H.q(vf, 'V'), If: H.q(ifs, 'A') }
      };
    }
  };

  /* ---------------------------------------------------------------- */
  /* 12 Conversor de unidades                                          */
  /* ---------------------------------------------------------------- */
  var converter = {
    id: 'converter', num: 12, category: 'pot', icon: 'convert',
    name: 'Conversor de Unidades',
    short: 'Múltiplos e submúltiplos de tensão, corrente, potência, energia e mais.',
    objective: 'Converter valores entre unidades da mesma grandeza elétrica.',
    guidance: 'Escolha a grandeza, digite o valor e selecione as unidades de origem e de destino. A conversão aparece na hora.',
    keywords: ['conversor', 'unidade', 'converter', 'prefixo', 'kilo', 'mili', 'micro', 'nano', 'pico', 'kwh', 'joule'],
    formulas: ['valor no destino = valor × (fator da origem / fator do destino)'],
    live: true,
    fields: [
      choice('qty', 'Grandeza', U.CONVERTER_ORDER.map(function (k) { return { id: k, label: U.DIMENSIONS[k].label }; }), 'resistance', { style: 'select' }),
      { id: 'value', type: 'number', label: 'Valor', symbol: '', dim: null, unit: '', units: null, constraint: 'any', unitFrom: 'from' },
      { id: 'from', type: 'unitpick', label: 'Unidade de origem', dimFrom: 'qty', defIndex: 'base' },
      { id: 'to', type: 'unitpick', label: 'Unidade de destino', dimFrom: 'qty', defIndex: 'other' }
    ],
    example: { values: { qty: 'resistance', value: '2,2', from: 'k' + OHM, to: OHM } },
    assumptions: [
      'A conversão só acontece entre unidades da mesma grandeza. Para passar de tensão para potência, por exemplo, faltam dados (como a corrente): use a calculadora de potência.'
    ],
    collect: function (state, H, errors, x, echo) {
      var dim = state.values.qty;
      var D = U.DIMENSIONS[dim];
      if (!D) { errors.qty = 'Escolha uma grandeza para converter.'; return; }
      var from = state.values.from, to = state.values.to;
      if (!U.findUnit(dim, from)) errors.from = 'Escolha a unidade de origem.';
      if (!U.findUnit(dim, to)) errors.to = 'Escolha uma unidade de destino da mesma grandeza.';
      var def = { label: 'Valor', noun: 'um valor', dim: dim, constraint: D.allowNegative ? 'any' : 'nonnegative' };
      var res = V.readField(def, state.values.value, U.findUnit(dim, from) ? from : D.base, state);
      if (!res.ok) { errors.value = res.error; return; }
      if (errors.from || errors.to) return;
      x.dim = dim; x.from = from; x.to = to; x.input = res.input;
      echo.push({ label: 'Valor', symbol: '', text: H.n(res.input) + ' ' + from });
      echo.push({ label: 'Converter para', symbol: '', text: to });
    },
    solve: function (x, H) {
      var D = U.DIMENSIONS[x.dim];
      var c = U.convert(x.input, x.dim, x.from, x.to);
      if (!c.ok) return { error: 'Essas unidades não são da mesma grandeza e não podem ser convertidas entre si.' };
      var steps = [
        { title: 'Fator de conversão', lines: ['1 ' + x.from + ' = ' + H.n(c.ratio) + ' ' + x.to] },
        { title: 'Conta', formula: 'valor no destino = valor × fator', subst: H.n(x.input) + ' × ' + H.n(c.ratio), result: '= ' + H.n(c.value) + ' ' + x.to }
      ];
      var table = D.units.map(function (u) {
        var cv = U.convert(x.input, x.dim, x.from, u[0]);
        return item(u[1].charAt(0).toUpperCase() + u[1].slice(1), u[0], cv.value, u[0], { noPrefix: true });
      });
      return {
        primary: [item(D.label + ' em ' + x.to, '', c.value, x.to, { noPrefix: true })],
        equation: H.n(x.input) + ' ' + x.from + ' = ' + H.n(c.value) + ' ' + x.to,
        results: table, resultsTitle: 'O mesmo valor em todas as unidades',
        steps: steps, warnings: [],
        explanation: [
          'Prefixos indicam potências de 10: k = 10³ (mil), M = 10⁶ (milhão), m = 10⁻³ (milésimo), µ = 10⁻⁶, n = 10⁻⁹ e p = 10⁻¹².',
          x.dim === 'energy' ? 'Para energia, 1 Wh = 1 W durante 3.600 s = 3.600 J, e 1 kWh = 3.600.000 J.'
            : (x.dim === 'time' ? '1 min = 60 s e 1 h = 3.600 s.' : 'Mudar de unidade não muda a grandeza: só muda a escala usada para escrevê-la.')
        ]
      };
    }
  };

  var LIST = [ohm, powerdc, energy, resistors, vdiv, idiv, freq, reactance, impedance, mono, tri, converter];
  var BY_ID = {};
  LIST.forEach(function (c) { BY_ID[c.id] = c; });

  /* ---------------------------------------------------------------- */
  /* Estado e execução                                                 */
  /* ---------------------------------------------------------------- */
  function unitpickDefault(field, dim) {
    var D = U.DIMENSIONS[dim];
    if (!D) return '';
    var syms = U.unitSymbols(dim);
    if (field.defIndex === 'base') {
      var other = syms.filter(function (s) { return s !== D.base; })[0];
      return other || D.base;
    }
    return D.base;
  }

  function defaultState(calc) {
    var st = { values: {}, units: {} };
    calc.fields.forEach(function (f) {
      if (f.type === 'choice') st.values[f.id] = f.def;
      else if (f.type === 'number') { st.values[f.id] = ''; if (f.units) st.units[f.id] = f.unit; }
    });
    calc.fields.forEach(function (f) {
      if (f.type === 'unitpick') st.values[f.id] = unitpickDefault(f, st.values[f.dimFrom]);
    });
    if (calc.hasList) st.list = calc.defaultList();
    return st;
  }

  function exampleState(calc) {
    var st = defaultState(calc);
    var ex = calc.example;
    Object.keys(ex.values || {}).forEach(function (k) { st.values[k] = ex.values[k]; });
    Object.keys(ex.units || {}).forEach(function (k) { st.units[k] = ex.units[k]; });
    if (ex.list) st.list = ex.list.map(function (r) { return { value: r.value, unit: r.unit }; });
    return st;
  }

  function isVisible(field, state) {
    return !field.showIf || field.showIf(state);
  }

  function helpers(d) {
    return {
      d: d,
      n: function (v) { return N.formatNumber(v, d); },
      u: function (v, unit) { return N.formatNumber(v, d) + ' ' + unit; },
      q: function (v, unit, opts) { return N.formatQuantity(v, unit, d, opts).text; },
      deg: function (v) { return N.formatAngle(v, d); },
      money: N.formatCurrency
    };
  }

  function finalizeItem(it, d) {
    if (it.text !== undefined) return it;
    var fq = N.formatQuantity(it.value, it.unit, d, it.opts);
    it.text = fq.text;
    it.base = fq.base;
    return it;
  }

  function allFinite(list) {
    return list.every(function (it) { return it.text !== undefined && it.value === undefined ? true : (typeof it.value === 'number' && isFinite(it.value)); });
  }

  var GENERIC_RANGE_ERROR = 'Os valores informados levam a um resultado fora da faixa que a calculadora consegue representar. Confira os dados e as unidades.';

  /*
   * Executa uma calculadora.
   * state: { values: {campo: texto}, units: {campo: unidade}, list?: [{value, unit}] }
   * Retorna { ok:true, ... } ou { ok:false, errors:[...], fieldErrors:{...} }.
   */
  function run(calcId, state, opts) {
    var calc = BY_ID[calcId];
    if (!calc) return { ok: false, errors: ['Calculadora não encontrada.'], fieldErrors: {} };
    var d = (opts && opts.precision) || 4;
    var H = helpers(d);
    state = state || defaultState(calc);
    state.values = state.values || {};
    state.units = state.units || {};
    var errors = {};
    var x = {};
    var echo = [];
    var conv = [];

    calc.fields.forEach(function (f) {
      if (!isVisible(f, state)) return;
      if (f.type === 'choice') {
        var opt = f.options.filter(function (o) { return o.id === state.values[f.id]; })[0];
        if (!opt) errors[f.id] = 'Escolha uma opção em ' + V.quote(f.label) + '.';
        else {
          x[f.id] = opt.id;
          echo.push({ label: f.label, symbol: '', text: opt.label });
        }
        return;
      }
      if (f.type !== 'number' || calc.collect && !calc.hasList) return;
      var r = V.readField(f, state.values[f.id], f.units ? state.units[f.id] : f.unit, state);
      if (!r.ok) { errors[f.id] = r.error; return; }
      if (r.empty) { x[f.id] = null; return; }
      x[f.id] = r.value;
      var unitTxt = r.unit ? ' ' + r.unit : '';
      var base = f.dim ? U.DIMENSIONS[f.dim].base : null;
      echo.push({ label: f.label, symbol: f.symbol, text: H.n(r.input) + unitTxt, si: base && r.unit !== base ? H.u(r.value, base) : null });
      if (base && r.unit !== base) conv.push(f.symbol + ' = ' + H.n(r.input) + ' ' + r.unit + ' = ' + H.u(r.value, base));
    });

    if (calc.collect) calc.collect(state, H, errors, x, echo, conv);

    var keys = Object.keys(errors);
    if (keys.length) {
      return { ok: false, calcId: calcId, fieldErrors: errors, errors: keys.map(function (k) { return errors[k]; }) };
    }

    var out;
    try {
      out = calc.solve(x, H, state);
    } catch (e) {
      return { ok: false, calcId: calcId, fieldErrors: {}, errors: ['Não foi possível concluir o cálculo com esses dados. Confira os valores e as unidades.'] };
    }
    if (out.error) return { ok: false, calcId: calcId, fieldErrors: out.fieldErrors || {}, errors: [out.error] };

    var primary = out.primary.map(function (it) { return finalizeItem(it, d); });
    var results = (out.results || []).map(function (it) { return finalizeItem(it, d); });
    if (!allFinite(primary) || !allFinite(results)) {
      return { ok: false, calcId: calcId, fieldErrors: {}, errors: [GENERIC_RANGE_ERROR] };
    }
    var steps = out.steps || [];
    if (conv.length) steps.unshift({ title: 'Conversão das unidades para o SI', lines: conv });

    return {
      ok: true,
      calcId: calcId,
      calcName: calc.name,
      precision: d,
      inputs: echo,
      primary: primary,
      results: results,
      resultsTitle: out.resultsTitle || 'Outros resultados',
      equation: out.equation || null,
      steps: steps,
      warnings: out.warnings || [],
      explanation: out.explanation || [],
      assumptions: calc.assumptions || [],
      diagram: out.diagram || null
    };
  }

  MEC.calculators = {
    CATEGORIES: CATEGORIES,
    LIST: LIST,
    BY_ID: BY_ID,
    defaultState: defaultState,
    exampleState: exampleState,
    unitpickDefault: unitpickDefault,
    isVisible: isVisible,
    run: run
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
