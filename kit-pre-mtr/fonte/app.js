/* Kit Pré-MTR · interações da versão digital.
   Tudo roda localmente: nenhum dado é enviado para fora do navegador. */
(function () {
  'use strict';
  var KIT_ID = 'kit-pre-mtr';
  var VERSAO = '1.0';
  var RASCUNHO = 'kit-pre-mtr:rascunho:v1';
  var META = JSON.parse(document.getElementById('kit-meta').textContent);
  var IDS = Object.keys(META);
  var root = document.documentElement;
  var uid = 0;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  /* ------------------------------------------------------ aviso discreto */
  var toastEl = $('#toast');
  var toastT;
  function toast(msg, erro) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('erro', !!erro);
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  /* ------------------------------------------------------ tabelas */
  function renumerar(tbl) {
    var fixos = parseInt(tbl.getAttribute('data-fixos') || '0', 10);
    $$('tbody tr', tbl).forEach(function (tr, i) {
      var n = tr.querySelector('.c-n');
      if (n) n.textContent = String(i + 1);
      if (!tr.hasAttribute('data-fixo')) {
        $$('input', tr).forEach(function (inp) {
          var rot = inp.getAttribute('aria-label') || '';
          inp.setAttribute('aria-label', rot.replace(/linha \d+|nova linha/, 'linha ' + (i + 1 - fixos > 0 ? i + 1 : i + 1)));
        });
      }
    });
  }

  function novaLinha(tbl, valores) {
    var tpl = $('template', tbl);
    var rid = 'n' + (++uid) + '_' + Date.now().toString(36);
    var htmlRow = tpl.innerHTML.replace(/rNOVA/g, rid);
    var tbody = $('tbody', tbl);
    tbody.insertAdjacentHTML('beforeend', htmlRow);
    var tr = tbody.lastElementChild;
    if (valores) preencherLinha(tr, valores);
    renumerar(tbl);
    return tr;
  }

  function linhaTemDados(tr) {
    return $$('input', tr).some(function (i) {
      if (i.type === 'radio' || i.type === 'checkbox') return i.checked;
      return i.value.trim() !== '' && i.defaultValue !== i.value;
    }) || $$('input[type=text]', tr).some(function (i) { return i.value.trim() !== '' && !i.defaultValue; });
  }

  function removerLinha(tr) {
    var tbl = tr.closest('.tbl');
    var linhas = $$('tbody tr:not([data-fixo])', tbl);
    if (linhaTemDados(tr) && !window.confirm('Esta linha tem informações preenchidas. Deseja remover a linha?')) return;
    if (linhas.length <= 1) {
      // mantém ao menos uma linha: apenas esvazia
      limparLinha(tr);
    } else {
      tr.parentNode.removeChild(tr);
    }
    renumerar(tbl);
    salvarRascunho();
  }

  function limparLinha(tr) {
    $$('input', tr).forEach(function (i) {
      if (i.type === 'radio' || i.type === 'checkbox') i.checked = false; else i.value = '';
    });
  }

  function lerLinha(tr) {
    var o = {};
    $$('input[data-col]', tr).forEach(function (i) {
      var k = i.getAttribute('data-col');
      if (i.type === 'radio') { if (i.checked) o[k] = i.value; else if (!(k in o)) o[k] = ''; }
      else if (i.type === 'checkbox') o[k] = i.checked;
      else o[k] = i.value;
    });
    return o;
  }

  function preencherLinha(tr, o) {
    $$('input[data-col]', tr).forEach(function (i) {
      var k = i.getAttribute('data-col');
      if (!(k in o)) return;
      if (i.type === 'radio') i.checked = (o[k] === i.value);
      else if (i.type === 'checkbox') i.checked = !!o[k];
      else i.value = o[k] == null ? '' : String(o[k]);
    });
  }

  /* Recria a tabela no estado inicial: linhas mínimas e sugestões editáveis */
  function reiniciarTabela(tbl, quantidade) {
    var pre = JSON.parse(tbl.getAttribute('data-pre') || '[]');
    var min = parseInt(tbl.getAttribute('data-min'), 10);
    var n = Math.max(quantidade || min, pre.length);
    var tbody = $('tbody', tbl);
    $$('tr:not([data-fixo])', tbody).forEach(function (tr) { tr.parentNode.removeChild(tr); });
    $$('tr[data-fixo]', tbody).forEach(limparLinha);
    var primeira = $('template', tbl).content.querySelector('input[data-col]:not([type=radio]):not([type=checkbox])');
    var col1 = primeira ? primeira.getAttribute('data-col') : null;
    for (var i = 0; i < n; i++) {
      var v = {};
      if (col1 && i < pre.length) v[col1] = pre[i];
      novaLinha(tbl, v);
    }
  }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      var tbl = add.closest('.tbl');
      var tr = novaLinha(tbl);
      var foco = tr.querySelector('input[type=text], input[type=date]');
      if (foco) foco.focus();
      salvarRascunho();
      return;
    }
    var del = e.target.closest('[data-del]');
    if (del) removerLinha(del.closest('tr'));
  });

  /* ------------------------------------------------------ áreas de texto */
  function ajustar(ta) {
    if (!ta.offsetParent && !root.classList.contains('imprimindo')) return;
    ta.style.height = 'auto';
    var min = ta._min || 0;
    ta.style.height = Math.max(ta.scrollHeight + 2, min) + 'px';
  }
  function ajustarTodas(el) { $$('textarea', el).forEach(ajustar); }
  document.addEventListener('input', function (e) { if (e.target.tagName === 'TEXTAREA') ajustar(e.target); });

  /* ------------------------------------------------------ cálculo F12 */
  function numero(txt) {
    var s = String(txt || '').trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  }
  function fmt(v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  function normalizaUnidade(u) {
    return String(u || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').replace(/^(\D+?)\.?$/, '$1');
  }
  function calcular(box) {
    var fid = box.getAttribute('data-calc');
    var out = box.querySelector('output');
    var q1 = numero($('#' + fid + '-q1').value), q2 = numero($('#' + fid + '-q2').value);
    var u1 = $('#' + fid + '-u1').value, u2 = $('#' + fid + '-u2').value;
    out.classList.remove('na');
    if (isNaN(q1) || isNaN(q2)) { out.textContent = ''; return; }
    if (!u1.trim() || !u2.trim() || normalizaUnidade(u1) !== normalizaUnidade(u2)) {
      out.textContent = 'Não calculada: as unidades de medida são diferentes ou não foram informadas.';
      out.classList.add('na');
      return;
    }
    var d = q2 - q1;
    var txt = (d > 0 ? '+' : '') + fmt(d) + ' ' + u2.trim();
    if (q1 !== 0) txt += ' (' + (d > 0 ? '+' : '') + fmt(d / q1 * 100) + '% em relação à quantidade informada)';
    out.textContent = txt;
  }
  function calcularTodos() { $$('[data-calc]').forEach(calcular); }
  document.addEventListener('input', function (e) { if (e.target.closest('[data-calc-src]') || /-(q|u)[12]$/.test(e.target.id || '')) calcularTodos(); });

  /* ------------------------------------------------------ leitura e escrita */
  function lerFormulario(form) {
    var campos = {};
    $$('input[name], textarea[name]', form).forEach(function (el) {
      if (el.closest('.tbl')) return;
      var k = el.name;
      if (el.type === 'radio') { if (el.checked) campos[k] = el.value; else if (!(k in campos)) campos[k] = ''; }
      else if (el.type === 'checkbox') {
        var grupo = form.querySelectorAll('input[type=checkbox][name="' + k + '"]').length > 1;
        if (grupo) { campos[k] = campos[k] || []; if (el.checked) campos[k].push(el.value); }
        else campos[k] = el.checked;
      } else campos[k] = el.value;
    });
    var tabelas = {};
    $$('.tbl', form).forEach(function (tbl) {
      tabelas[tbl.getAttribute('data-tabela')] = $$('tbody tr', tbl).map(function (tr) {
        var o = lerLinha(tr);
        if (tr.hasAttribute('data-fixo')) o._item = (tr.querySelector('.c-item') || {}).textContent || '';
        return o;
      });
    });
    return { codigo: form.getAttribute('data-form'), titulo: META[form.id].titulo, campos: campos, tabelas: tabelas };
  }

  function escreverFormulario(form, dados) {
    var campos = dados.campos || {};
    $$('input[name], textarea[name]', form).forEach(function (el) {
      if (el.closest('.tbl')) return;
      var k = el.name;
      if (!(k in campos)) return;
      var v = campos[k];
      if (el.type === 'radio') el.checked = (v === el.value);
      else if (el.type === 'checkbox') el.checked = Array.isArray(v) ? v.indexOf(el.value) !== -1 : !!v;
      else el.value = v == null ? '' : String(v);
    });
    var tabelas = dados.tabelas || {};
    $$('.tbl', form).forEach(function (tbl) {
      var linhas = tabelas[tbl.getAttribute('data-tabela')];
      if (!Array.isArray(linhas)) return;
      var fixos = $$('tbody tr[data-fixo]', tbl);
      var tbody = $('tbody', tbl);
      $$('tr:not([data-fixo])', tbody).forEach(function (tr) { tr.parentNode.removeChild(tr); });
      fixos.forEach(function (tr, i) { limparLinha(tr); if (linhas[i]) preencherLinha(tr, linhas[i]); });
      var resto = linhas.slice(fixos.length);
      if (!resto.length) resto = [{}];
      resto.forEach(function (o) { novaLinha(tbl, o); });
    });
    ajustarTodas(form);
    calcularTodos();
  }

  function formularioVazio(dados) {
    var cheio = Object.keys(dados.campos).some(function (k) {
      var v = dados.campos[k];
      return Array.isArray(v) ? v.length : (v === true || (typeof v === 'string' && v.trim() !== ''));
    });
    if (cheio) return false;
    var form = document.getElementById(dados.id);
    return !$$('.tbl', form).some(function (tbl) {
      var pre = JSON.parse(tbl.getAttribute('data-pre') || '[]');
      return (dados.tabelas[tbl.getAttribute('data-tabela')] || []).some(function (o, i) {
        return Object.keys(o).some(function (k) {
          if (k === '_item') return false;
          var v = o[k];
          if (v === true) return true;
          if (typeof v !== 'string' || !v.trim()) return false;
          return !(i < pre.length && v === pre[i]);
        });
      });
    });
  }

  /* ------------------------------------------------------ rascunho local */
  var rascunhoT;
  var estadoRascunho = $$('[data-draft-status]');
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function salvarRascunho() {
    clearTimeout(rascunhoT);
    rascunhoT = setTimeout(function () {
      var st = storage();
      if (!st) return;
      try {
        st.setItem(RASCUNHO, JSON.stringify(pacote(IDS)));
        var h = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        estadoRascunho.forEach(function (el) { el.textContent = 'Rascunho salvo neste navegador às ' + h + '.'; });
      } catch (e) { /* armazenamento indisponível: segue sem rascunho */ }
    }, 500);
  }
  function restaurarRascunho() {
    var st = storage();
    if (!st) return;
    try {
      var bruto = st.getItem(RASCUNHO);
      if (!bruto) return;
      var p = JSON.parse(bruto);
      if (p && p.kit === KIT_ID) { aplicarPacote(p); estadoRascunho.forEach(function (el) { el.textContent = 'Rascunho anterior recuperado deste navegador.'; }); }
    } catch (e) { /* rascunho ilegível: ignorado */ }
  }
  document.addEventListener('input', function (e) { if (e.target.closest('.form')) salvarRascunho(); });
  document.addEventListener('change', function (e) { if (e.target.closest('.form')) salvarRascunho(); });

  /* ------------------------------------------------------ exportar / importar */
  function pacote(ids) {
    var formularios = {};
    ids.forEach(function (id) {
      var d = lerFormulario(document.getElementById(id));
      formularios[d.codigo] = d;
    });
    return { kit: KIT_ID, versao: VERSAO, exportado_em: new Date().toISOString(), formularios: formularios };
  }
  function aplicarPacote(p) {
    var aplicados = [];
    Object.keys(p.formularios || {}).forEach(function (cod) {
      var id = 'f' + cod.slice(1);
      var form = document.getElementById(id);
      if (!form || !META[id]) return;
      escreverFormulario(form, p.formularios[cod]);
      aplicados.push(cod);
    });
    return aplicados;
  }
  function baixar(nome, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function exportarTodos() {
    baixar('kit-pre-mtr_dados_' + hoje() + '.json', pacote(IDS));
    toast('Arquivo de dados gerado com os 15 formulários.');
  }
  function exportarUm() {
    var id = atual();
    if (!id) return;
    baixar('kit-pre-mtr_' + META[id].cod + '_' + hoje() + '.json', pacote([id]));
    toast('Dados do ' + META[id].cod + ' exportados.');
  }
  var arquivo = $('#arquivo-json');
  function importar() { arquivo.value = ''; arquivo.click(); }
  function importarTexto(texto) {
    var p;
    try { p = JSON.parse(texto); } catch (e) { toast('Não foi possível ler o arquivo. Verifique se é um .json exportado pelo kit.', true); return false; }
    if (!p || p.kit !== KIT_ID || typeof p.formularios !== 'object') { toast('Este arquivo não foi exportado pelo Kit Pré-MTR.', true); return false; }
    var cods = Object.keys(p.formularios).filter(function (c) { return META['f' + c.slice(1)]; });
    if (!cods.length) { toast('O arquivo não contém formulários do kit.', true); return false; }
    if (!window.confirm('Importar dados de ' + cods.length + ' formulário(s) (' + cods.join(', ') + ')?\nOs campos desses formulários serão substituídos pelos dados do arquivo.')) return false;
    var feitos = aplicarPacote(p);
    salvarRascunho();
    toast('Dados importados: ' + feitos.join(', ') + '.');
    if (feitos.length === 1) location.hash = 'f' + feitos[0].slice(1);
    return true;
  }
  arquivo.addEventListener('change', function () {
    var f = arquivo.files && arquivo.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { importarTexto(String(r.result)); };
    r.onerror = function () { toast('Não foi possível abrir o arquivo.', true); };
    r.readAsText(f, 'utf-8');
  });

  /* ------------------------------------------------------ limpar */
  function limpar() {
    var id = atual();
    if (!id) return;
    var form = document.getElementById(id);
    if (!window.confirm('Limpar todos os campos do ' + META[id].cod + ' (' + META[id].titulo + ')?\nOs outros formulários não serão alterados. Esta ação não pode ser desfeita.')) return;
    $$('input[name], textarea[name]', form).forEach(function (el) {
      if (el.closest('.tbl')) return;
      if (el.type === 'radio' || el.type === 'checkbox') el.checked = false; else el.value = '';
    });
    $$('.tbl', form).forEach(function (tbl) { reiniciarTabela(tbl); });
    ajustarTodas(form);
    calcularTodos();
    salvarRascunho();
    toast(META[id].cod + ' limpo.');
  }

  /* ------------------------------------------------------ impressão */
  function prepararImpressao() {
    root.classList.add('imprimindo');
    $$('textarea').forEach(function (ta) {
      ta.style.height = 'auto';
      if (ta.scrollHeight > ta.clientHeight) ta.style.height = (ta.scrollHeight + 2) + 'px';
    });
  }
  function fimImpressao() {
    root.classList.remove('imprimindo', 'pm-one', 'pm-kit', 'pm-forms', 'em-branco');
    $$('.form.alvo').forEach(function (f) { f.classList.remove('alvo'); });
    $$('textarea').forEach(function (ta) { ta.style.height = ''; });
    ajustarTodas(document);
  }
  function imprimirAtual() {
    var id = atual();
    if (!id) return;
    root.classList.remove('pm-kit', 'pm-forms');
    root.classList.add('pm-one');
    document.getElementById(id).classList.add('alvo');
    prepararImpressao();
    window.print();
  }
  window.addEventListener('beforeprint', function () {
    // Atalho de impressão do navegador: formulário aberto ou kit completo
    if (!root.classList.contains('pm-one') && !root.classList.contains('pm-kit') && !root.classList.contains('pm-forms')) {
      var id = atual();
      if (id) { root.classList.add('pm-one'); document.getElementById(id).classList.add('alvo'); }
      else root.classList.add('pm-kit');
    }
    prepararImpressao();
  });
  window.addEventListener('afterprint', fimImpressao);

  /* ------------------------------------------------------ navegação */
  function atual() { return root.getAttribute('data-view') === 'form' ? root.getAttribute('data-form') : null; }
  var navLinks = $$('[data-nav]');
  var seletor = $('#ir-para');
  function mostrar() {
    var h = decodeURIComponent(location.hash.slice(1));
    var id = META[h] ? h : null;
    $$('.form.ativo').forEach(function (f) { f.classList.remove('ativo'); });
    if (id) {
      var form = document.getElementById(id);
      form.classList.add('ativo');
      root.setAttribute('data-view', 'form');
      root.setAttribute('data-form', id);
      var i = IDS.indexOf(id);
      var prev = $('[data-prev]'), next = $('[data-next]');
      prev.setAttribute('href', '#' + (i > 0 ? IDS[i - 1] : 'inicio'));
      next.setAttribute('href', '#' + (i < IDS.length - 1 ? IDS[i + 1] : 'inicio'));
      prev.setAttribute('aria-disabled', i === 0 ? 'true' : 'false');
      next.setAttribute('aria-disabled', i === IDS.length - 1 ? 'true' : 'false');
      $('[data-pos]').textContent = META[id].cod + ' de 15';
      navLinks.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('data-nav') === id); });
      seletor.value = id;
      document.title = META[id].cod + ' · ' + META[id].titulo + ' · Kit Pré-MTR';
      window.scrollTo(0, 0);
      ajustarTodas(form);
    } else {
      root.setAttribute('data-view', 'home');
      root.removeAttribute('data-form');
      seletor.value = 'inicio';
      document.title = 'Kit Pré-MTR · 15 Formulários Prontos para Coletas e Movimentação de Resíduos';
      var alvo = h && document.getElementById(h);
      if (alvo && h !== 'inicio') setTimeout(function () { alvo.scrollIntoView({ block: 'start' }); }, 0);
      else window.scrollTo(0, 0);
    }
  }
  window.addEventListener('hashchange', mostrar);
  seletor.addEventListener('change', function () { location.hash = seletor.value; });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]');
    if (!b) return;
    var acao = b.getAttribute('data-acao');
    if (acao === 'imprimir') imprimirAtual();
    else if (acao === 'limpar') limpar();
    else if (acao === 'exportar-todos') exportarTodos();
    else if (acao === 'exportar-um') exportarUm();
    else if (acao === 'importar') importar();
  });

  /* ------------------------------------------------------ início */
  $$('textarea').forEach(function (ta) { ta._min = 0; });
  restaurarRascunho();
  calcularTodos();
  mostrar();

  /* Interface usada pela geração automática dos PDFs e pelos testes */
  window.KitPreMTR = {
    versao: VERSAO,
    ler: function (id) { return lerFormulario(document.getElementById(id)); },
    vazio: function (id) { var d = lerFormulario(document.getElementById(id)); d.id = id; return formularioVazio(d); },
    pacote: function () { return pacote(IDS); },
    importarTexto: importarTexto,
    modoImpressao: function (modo, id) {
      root.classList.remove('pm-one', 'pm-kit', 'pm-forms');
      $$('.form.alvo').forEach(function (f) { f.classList.remove('alvo'); });
      root.classList.add('pm-' + modo);
      if (modo === 'one') document.getElementById(id).classList.add('alvo');
      prepararImpressao();
    },
    emBranco: function () {
      root.classList.add('em-branco');
      $$('.tbl').forEach(function (tbl) { reiniciarTabela(tbl, parseInt(tbl.getAttribute('data-imp'), 10)); });
      // Guia neutra para datas e horários escritos à mão (independe do idioma do navegador)
      $$('input[type=date], input[type=time]').forEach(function (i) {
        var data = i.type === 'date';
        i.type = 'text';
        i.value = data ? '\u2002\u2002\u2002/\u2002\u2002\u2002/' : '\u2002\u2002\u2002:';
        i.classList.add('guia');
      });
    }
  };
})();
