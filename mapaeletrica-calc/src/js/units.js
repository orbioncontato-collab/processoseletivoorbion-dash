/*
 * MapaElétrica Calc | units.js
 * Grandezas físicas, unidades, múltiplos e submúltiplos.
 * Todos os cálculos internos usam a unidade base do SI de cada grandeza.
 */
(function (root) {
  'use strict';
  var MEC = root.MEC || (root.MEC = {});
  var shift10 = MEC.numbers.shift10;

  var MU = 'µ';
  var OHM = 'Ω';

  /*
   * Cada unidade tem um fator para a unidade base:
   *   p: potência de 10 (ex.: kΩ tem p = 3)
   *   m: multiplicador comum (ex.: Wh = 3600 J)
   */
  var DIMENSIONS = {
    voltage: {
      label: 'Tensão', base: 'V', allowNegative: true,
      units: [['mV', 'milivolt', { p: -3 }], ['V', 'volt', { p: 0 }], ['kV', 'quilovolt', { p: 3 }]]
    },
    current: {
      label: 'Corrente', base: 'A', allowNegative: true,
      units: [[MU + 'A', 'microampere', { p: -6 }], ['mA', 'miliampere', { p: -3 }], ['A', 'ampere', { p: 0 }]]
    },
    resistance: {
      label: 'Resistência', base: OHM, allowNegative: false,
      units: [[OHM, 'ohm', { p: 0 }], ['k' + OHM, 'quilo-ohm', { p: 3 }], ['M' + OHM, 'mega-ohm', { p: 6 }]]
    },
    power: {
      label: 'Potência ativa', base: 'W', allowNegative: true,
      units: [['mW', 'miliwatt', { p: -3 }], ['W', 'watt', { p: 0 }], ['kW', 'quilowatt', { p: 3 }]]
    },
    apparent: {
      label: 'Potência aparente', base: 'VA', allowNegative: false,
      units: [['VA', 'volt-ampere', { p: 0 }], ['kVA', 'quilovolt-ampere', { p: 3 }]]
    },
    reactive: {
      label: 'Potência reativa', base: 'var', allowNegative: true,
      units: [['var', 'volt-ampere reativo', { p: 0 }], ['kvar', 'quilovolt-ampere reativo', { p: 3 }]]
    },
    capacitance: {
      label: 'Capacitância', base: 'F', allowNegative: false,
      units: [['pF', 'picofarad', { p: -12 }], ['nF', 'nanofarad', { p: -9 }], [MU + 'F', 'microfarad', { p: -6 }], ['F', 'farad', { p: 0 }]]
    },
    inductance: {
      label: 'Indutância', base: 'H', allowNegative: false,
      units: [[MU + 'H', 'micro-henry', { p: -6 }], ['mH', 'mili-henry', { p: -3 }], ['H', 'henry', { p: 0 }]]
    },
    frequency: {
      label: 'Frequência', base: 'Hz', allowNegative: false,
      units: [['Hz', 'hertz', { p: 0 }], ['kHz', 'quilo-hertz', { p: 3 }], ['MHz', 'mega-hertz', { p: 6 }]]
    },
    energy: {
      label: 'Energia', base: 'J', allowNegative: true,
      units: [['J', 'joule', { p: 0 }], ['Wh', 'watt-hora', { m: 3600 }], ['kWh', 'quilowatt-hora', { m: 3.6e6 }]]
    },
    time: {
      label: 'Tempo', base: 's', allowNegative: false,
      units: [[MU + 's', 'microssegundo', { p: -6 }], ['ms', 'milissegundo', { p: -3 }], ['s', 'segundo', { p: 0 }],
        ['min', 'minuto', { m: 60 }], ['h', 'hora', { m: 3600 }]]
    }
  };

  var CONVERTER_ORDER = ['voltage', 'current', 'resistance', 'power', 'apparent', 'reactive',
    'capacitance', 'inductance', 'frequency', 'energy', 'time'];

  function findUnit(dim, symbol) {
    var d = DIMENSIONS[dim];
    if (!d) return null;
    for (var i = 0; i < d.units.length; i++) {
      if (d.units[i][0] === symbol) return { symbol: d.units[i][0], name: d.units[i][1], factor: d.units[i][2] };
    }
    return null;
  }

  function unitSymbols(dim) {
    return DIMENSIONS[dim].units.map(function (u) { return u[0]; });
  }

  function factorValue(f) {
    return f.p !== undefined ? Number('1e' + f.p) : f.m;
  }

  function toSI(value, dim, symbol) {
    var u = findUnit(dim, symbol);
    if (!u) throw new Error('Unidade desconhecida: ' + symbol);
    return u.factor.p !== undefined ? shift10(value, u.factor.p) : value * u.factor.m;
  }

  function fromSI(value, dim, symbol) {
    var u = findUnit(dim, symbol);
    if (!u) throw new Error('Unidade desconhecida: ' + symbol);
    return u.factor.p !== undefined ? shift10(value, -u.factor.p) : value / u.factor.m;
  }

  /* Converte entre duas unidades da mesma grandeza. Recusa grandezas diferentes. */
  function convert(value, dim, fromSymbol, toSymbol) {
    var a = findUnit(dim, fromSymbol);
    var b = findUnit(dim, toSymbol);
    if (!a || !b) return { ok: false, code: 'incompatible' };
    var result;
    if (a.factor.p !== undefined && b.factor.p !== undefined) {
      result = shift10(value, a.factor.p - b.factor.p);
    } else {
      var ratio = factorValue(a.factor) / factorValue(b.factor);
      result = value * ratio;
    }
    return { ok: true, value: result, ratio: conversionRatio(a, b) };
  }

  function conversionRatio(a, b) {
    if (a.factor.p !== undefined && b.factor.p !== undefined) return Number('1e' + (a.factor.p - b.factor.p));
    return factorValue(a.factor) / factorValue(b.factor);
  }

  function dimensionOfUnit(symbol) {
    var found = [];
    Object.keys(DIMENSIONS).forEach(function (k) {
      if (findUnit(k, symbol)) found.push(k);
    });
    return found;
  }

  MEC.units = {
    DIMENSIONS: DIMENSIONS,
    CONVERTER_ORDER: CONVERTER_ORDER,
    MU: MU,
    OHM: OHM,
    findUnit: findUnit,
    unitSymbols: unitSymbols,
    toSI: toSI,
    fromSI: fromSI,
    convert: convert,
    dimensionOfUnit: dimensionOfUnit
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
