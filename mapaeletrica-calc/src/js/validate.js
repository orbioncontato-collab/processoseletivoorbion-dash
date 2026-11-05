/*
 * MapaElétrica Calc | validate.js
 * Validação centralizada dos campos e mensagens de erro em linguagem simples.
 */
(function (root) {
  'use strict';
  var MEC = root.MEC || (root.MEC = {});
  var parseNumber = MEC.numbers.parseNumber;
  var units = MEC.units;

  var LIMIT_MAX = 1e18;
  var LIMIT_MIN = 1e-18;

  function quote(label) { return '“' + label + '”'; }

  function parseMessage(res, def, raw) {
    var L = quote(def.label);
    switch (res.code) {
      case 'empty':
        return 'Preencha o campo ' + L + '.';
      case 'spaces':
        return L + ': remova os espaços do número (ex.: 1500 ou 1.500).';
      case 'mixed':
        return L + ': use vírgula para decimais e ponto só para milhar (ex.: 1.234,5).';
      case 'separators':
        return L + ': o número tem separadores demais. Use uma única vírgula para a parte decimal.';
      case 'incomplete':
        return L + ': o número parece incompleto. Ele termina com vírgula ou ponto.';
      case 'ambiguous':
        return L + ': o valor "' + String(raw).trim() + '" pode ser lido como ' + res.intPart + res.decPart +
          ' ou como ' + res.intPart + ',' + res.decPart + '. Escreva ' + res.intPart + res.decPart +
          ' ou ' + res.intPart + ',' + res.decPart + ' para não haver dúvida.';
      case 'range':
        return L + ': o número é grande demais para ser calculado.';
      default:
        return L + ': digite apenas números, como 12 ou 0,5.';
    }
  }

  function constraintOf(def, state) {
    return typeof def.constraint === 'function' ? def.constraint(state) : (def.constraint || 'any');
  }

  function checkConstraint(value, def, state) {
    var c = constraintOf(def, state);
    var L = quote(def.label);
    var noun = def.noun || ('um valor para ' + L);
    if (c === 'positive' && !(value > 0)) {
      return 'Informe ' + noun + ' maior que zero para realizar este cálculo.';
    }
    if (c === 'nonnegative' && value < 0) {
      return L + ' não pode ser negativo neste cálculo. Use o valor em módulo, sem o sinal de menos.';
    }
    if (c === 'fp' && (value < 0 || value > 1)) {
      return 'O fator de potência precisa ficar entre 0 e 1 (por exemplo, 0,8).';
    }
    if (c === 'hours' && (value < 0 || value > 24)) {
      return 'Um dia tem 24 horas. Informe um uso diário entre 0 e 24 horas.';
    }
    return null;
  }

  function checkRange(si, def) {
    var a = Math.abs(si);
    if (a > LIMIT_MAX || (a > 0 && a < LIMIT_MIN)) {
      return quote(def.label) + ' está fora da faixa que a calculadora trata com segurança. Confira o valor e a unidade escolhida.';
    }
    return null;
  }

  /*
   * Lê um campo numérico: texto -> número -> unidade base do SI.
   * Retorna { ok, value (SI), input (número digitado), unit, empty } ou { ok:false, error }.
   */
  function readField(def, raw, unit, state) {
    var parsed = parseNumber(raw);
    if (!parsed.ok) {
      if (parsed.code === 'empty' && def.optional) return { ok: true, empty: true };
      return { ok: false, error: parseMessage(parsed, def, raw) };
    }
    var v = parsed.value;
    var si = v;
    if (def.dim) {
      var symbol = unit || def.unit;
      if (!units.findUnit(def.dim, symbol)) {
        return { ok: false, error: 'Escolha uma unidade válida para ' + quote(def.label) + '.' };
      }
      si = units.toSI(v, def.dim, symbol);
    }
    var err = checkConstraint(si, def, state) || checkRange(si, def);
    if (err) return { ok: false, error: err };
    return { ok: true, value: si, input: v, unit: def.dim ? (unit || def.unit) : def.unit };
  }

  MEC.validate = {
    readField: readField,
    parseMessage: parseMessage,
    checkConstraint: checkConstraint,
    checkRange: checkRange,
    quote: quote,
    LIMIT_MAX: LIMIT_MAX,
    LIMIT_MIN: LIMIT_MIN
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
