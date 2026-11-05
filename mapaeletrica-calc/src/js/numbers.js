/*
 * MapaElétrica Calc | numbers.js
 * Leitura de números no padrão brasileiro e formatação de resultados.
 * Módulo puro: não acessa o DOM. Funciona no navegador e no Node.
 */
(function (root) {
  'use strict';
  var MEC = root.MEC || (root.MEC = {});

  var SUPERSCRIPT = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
    '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };

  /* Multiplica um número por 10^k sem acumular erro binário.
     Ex.: shift10(2.2, 3) = 2200 exato (2.2 * 1000 daria 2200,0000000000005). */
  function shift10(value, k) {
    if (k === 0 || value === 0 || !isFinite(value)) return value;
    var s = value.toExponential();
    var i = s.indexOf('e');
    return Number(s.slice(0, i) + 'e' + (parseInt(s.slice(i + 1), 10) + k));
  }

  function decimalExponent(value) {
    var s = Math.abs(value).toExponential();
    return parseInt(s.slice(s.indexOf('e') + 1), 10);
  }

  /*
   * Lê um número digitado pelo usuário.
   * Regras:
   *  - vírgula é o separador decimal brasileiro: "0,5" -> 0.5
   *  - ponto como milhar só com grupos de 3 dígitos: "1.234,5" -> 1234.5 e "1.234.567" -> 1234567
   *  - ponto como decimal quando não há dúvida: "0.5", "2.25", "1.5"
   *  - "1.234" é ambíguo (mil duzentos e trinta e quatro ou 1,234) e é recusado
   *  - notação científica: "1e-6", "2,2e3"
   * Retorna { ok: true, value } ou { ok: false, code }.
   */
  function parseNumber(raw) {
    if (raw === null || raw === undefined) return { ok: false, code: 'empty' };
    var s = String(raw).replace(/[−‒–—]/g, '-').trim();
    if (s === '') return { ok: false, code: 'empty' };
    if (/\s/.test(s)) return { ok: false, code: 'spaces' };
    var m = /^([+-]?)([0-9.,]*)(?:[eE]([+-]?\d+))?$/.exec(s);
    if (!m || !/\d/.test(m[2])) return { ok: false, code: 'nan' };
    var sign = m[1];
    var body = m[2];
    var exp = m[3];
    var hasComma = body.indexOf(',') >= 0;
    var hasDot = body.indexOf('.') >= 0;
    var normalized;

    if (hasComma && hasDot) {
      if (/^\d{1,3}(\.\d{3})+,\d+$/.test(body)) {
        normalized = body.replace(/\./g, '').replace(',', '.');
      } else {
        return { ok: false, code: 'mixed' };
      }
    } else if (hasComma) {
      var parts = body.split(',');
      if (parts.length > 2) return { ok: false, code: 'separators' };
      if (parts[1] === '') return { ok: false, code: 'incomplete' };
      normalized = parts[0] + '.' + parts[1];
    } else if (hasDot) {
      var p = body.split('.');
      if (p.length > 2) {
        if (/^\d{1,3}(\.\d{3})+$/.test(body)) normalized = body.replace(/\./g, '');
        else return { ok: false, code: 'separators' };
      } else {
        if (p[1] === '') return { ok: false, code: 'incomplete' };
        if (exp === undefined && p[1].length === 3 && /^[1-9]\d{0,2}$/.test(p[0])) {
          return { ok: false, code: 'ambiguous', intPart: p[0], decPart: p[1] };
        }
        normalized = body;
      }
    } else {
      normalized = body;
    }

    var value = Number(sign + normalized + (exp !== undefined ? 'e' + exp : ''));
    if (isNaN(value)) return { ok: false, code: 'nan' };
    if (!isFinite(value)) return { ok: false, code: 'range' };
    if (value === 0) value = 0; // remove o -0
    return { ok: true, value: value };
  }

  function toSuperscript(n) {
    return String(n).split('').map(function (c) { return SUPERSCRIPT[c] || c; }).join('');
  }

  function trimZeros(str) {
    return str.indexOf('.') >= 0 ? str.replace(/\.?0+$/, '') : str;
  }

  /* Notação científica no padrão brasileiro: 1,6667 × 10⁻⁵ */
  function formatScientific(value, decimals) {
    var s = value.toExponential(Math.max(0, Math.min(decimals, 20)));
    var i = s.indexOf('e');
    var mant = trimZeros(s.slice(0, i)).replace('.', ',');
    var e = parseInt(s.slice(i + 1), 10);
    if (e === 0) return mant;
    return mant + ' × 10' + toSuperscript(e);
  }

  var nfCache = {};
  function numberFormatter(decimals) {
    if (!nfCache[decimals]) {
      nfCache[decimals] = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      });
    }
    return nfCache[decimals];
  }

  /*
   * Formata um número com até `decimals` casas decimais.
   * Usa notação científica quando o número arredondado viraria zero
   * (ex.: 0,00001 com 2 casas) ou quando é muito grande.
   */
  function formatNumber(value, decimals) {
    if (decimals === undefined) decimals = 4;
    if (typeof value !== 'number' || !isFinite(value)) return 'indefinido';
    if (value === 0) return '0';
    var a = Math.abs(value);
    var threshold = Math.max(1e-3, 0.5 * Math.pow(10, -decimals));
    if (a >= 1e9 || a < threshold) return formatScientific(value, decimals);
    return numberFormatter(decimals).format(value);
  }

  /* Prefixos SI aceitos por unidade, para exibir "4 mA" no lugar de "0,004 A". */
  var PREFIX_EXP = { p: -12, n: -9, 'µ': -6, m: -3, '': 0, k: 3, M: 6, G: 9 };
  var UNIT_PREFIXES = {
    'V': ['µ', 'm', '', 'k', 'M'],
    'A': ['p', 'n', 'µ', 'm', '', 'k'],
    'Ω': ['m', '', 'k', 'M', 'G'],
    'W': ['µ', 'm', '', 'k', 'M', 'G'],
    'VA': ['m', '', 'k', 'M', 'G'],
    'var': ['m', '', 'k', 'M', 'G'],
    'F': ['p', 'n', 'µ', 'm', ''],
    'H': ['n', 'µ', 'm', ''],
    'Hz': ['m', '', 'k', 'M', 'G'],
    's': ['p', 'n', 'µ', 'm', ''],
    'J': ['m', '', 'k', 'M', 'G'],
    'S': ['n', 'µ', 'm', '']
  };

  function roundTo(value, decimals) {
    return Number(value.toFixed(Math.min(decimals, 20)));
  }

  /*
   * Formata uma grandeza escolhendo o prefixo mais adequado.
   * Retorna { text: "4 mA", base: "0,004 A" ou null quando já está na unidade base }.
   * opts.sign = true mostra "+" em valores positivos (usado em potência reativa).
   */
  function formatQuantity(value, unit, decimals, opts) {
    opts = opts || {};
    if (decimals === undefined) decimals = 4;
    var plus = opts.sign && value > 0 ? '+' : '';
    var list = UNIT_PREFIXES[unit];
    var space = unit && unit !== '\u00B0' && unit !== '%' ? ' ' : '';
    if (!list || value === 0 || typeof value !== 'number' || !isFinite(value) || opts.noPrefix) {
      return { text: plus + formatNumber(value, decimals) + space + unit, base: null };
    }
    var e = decimalExponent(value);
    var e3 = Math.floor(e / 3) * 3;
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (PREFIX_EXP[list[i]] <= e3) idx = i;
    }
    var mant = shift10(value, -PREFIX_EXP[list[idx]]);
    if (Math.abs(roundTo(mant, decimals)) >= 1000 && idx < list.length - 1 &&
        PREFIX_EXP[list[idx + 1]] - PREFIX_EXP[list[idx]] === 3) {
      idx += 1;
      mant = shift10(value, -PREFIX_EXP[list[idx]]);
    }
    var prefix = list[idx];
    var text = plus + formatNumber(mant, decimals) + space + prefix + unit;
    var base = prefix === '' ? null : plus + formatNumber(value, decimals) + ' ' + unit;
    return { text: text, base: base };
  }

  function formatCurrency(value) {
    if (typeof value !== 'number' || !isFinite(value)) return 'indefinido';
    if (value > 0 && value < 0.005) return 'menos de R$ 0,01';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatAngle(value, decimals) {
    return formatNumber(value, decimals) + '°';
  }

  MEC.numbers = {
    parseNumber: parseNumber,
    formatNumber: formatNumber,
    formatScientific: formatScientific,
    formatQuantity: formatQuantity,
    formatCurrency: formatCurrency,
    formatAngle: formatAngle,
    shift10: shift10,
    decimalExponent: decimalExponent
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
