/*
 * MapaElétrica Calc | report.js
 * Monta os textos de cópia (resultado e resolução completa) e os resumos do histórico.
 * Módulo puro (sem DOM).
 */
(function (root) {
  'use strict';
  var MEC = root.MEC || (root.MEC = {});

  var PRODUCT = 'MapaElétrica Calc';
  var DISCLAIMER = 'Ferramenta educacional. Os resultados não substituem normas técnicas, projetos, medições nem profissionais habilitados.';

  function itemLine(it) {
    var name = it.label + (it.symbol ? ' (' + it.symbol + ')' : '');
    return name + ': ' + it.text + (it.base ? ' [' + it.base + ']' : '');
  }

  function formatDate(date) {
    var d = date || new Date();
    try {
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return d.toISOString();
    }
  }

  /* Texto curto: grandeza, valor e unidade dos resultados principais. */
  function resultText(res) {
    var lines = [res.calcName];
    if (res.equation) lines.push(res.equation);
    else res.primary.forEach(function (it) { lines.push(itemLine(it)); });
    return lines.join('\n');
  }

  function stepLines(step, idx) {
    var out = [(idx + 1) + '. ' + step.title];
    if (step.lines) step.lines.forEach(function (l) { out.push('   ' + l); });
    if (step.formula) out.push('   Fórmula: ' + step.formula);
    if (step.subst) out.push('   Substituição: ' + step.subst);
    if (step.result) out.push('   Resultado: ' + step.result);
    return out;
  }

  /* Resolução completa: dados, resultados, memória de cálculo e hipóteses. */
  function reportText(res, date) {
    var L = [];
    L.push(PRODUCT + ' | ' + res.calcName);
    L.push('Gerado em ' + formatDate(date));
    L.push('');
    L.push('DADOS DE ENTRADA');
    res.inputs.forEach(function (i) {
      L.push('- ' + i.label + (i.symbol ? ' (' + i.symbol + ')' : '') + ': ' + i.text + (i.si ? ' = ' + i.si : ''));
    });
    L.push('');
    L.push('RESULTADOS');
    if (res.equation) L.push('- ' + res.equation);
    res.primary.forEach(function (it) { L.push('- ' + itemLine(it)); });
    res.results.forEach(function (it) { L.push('- ' + itemLine(it)); });
    L.push('');
    L.push('MEMÓRIA DE CÁLCULO');
    res.steps.forEach(function (s, i) { L = L.concat(stepLines(s, i)); });
    if (res.warnings.length) {
      L.push('');
      L.push('AVISOS');
      res.warnings.forEach(function (w) { L.push('- ' + w); });
    }
    L.push('');
    L.push('HIPÓTESES E LIMITAÇÕES');
    res.assumptions.forEach(function (a) { L.push('- ' + a); });
    L.push('');
    L.push(DISCLAIMER);
    return L.join('\n');
  }

  function inputsSummary(res) {
    return res.inputs.map(function (i) { return (i.symbol || i.label) + ' = ' + i.text; }).join('; ');
  }

  function resultSummary(res) {
    if (res.equation) return res.equation;
    return res.primary.map(function (it) { return (it.symbol || it.label) + ' = ' + it.text; }).join('; ');
  }

  MEC.report = {
    PRODUCT: PRODUCT,
    DISCLAIMER: DISCLAIMER,
    resultText: resultText,
    reportText: reportText,
    inputsSummary: inputsSummary,
    resultSummary: resultSummary,
    formatDate: formatDate
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
