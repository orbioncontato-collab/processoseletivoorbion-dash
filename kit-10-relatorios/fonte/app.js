/* Central de Relatórios Ambientais · interações da versão digital.
   Tudo roda localmente: nenhum dado é enviado para fora do navegador. */
(function () {
  'use strict';
  var KIT_ID = 'kit-10-relatorios';
  var VERSAO = '1.0';
  var RASCUNHO = 'kit-10-relatorios:rascunho:v1';
  var META = JSON.parse(document.getElementById('kit-meta').textContent);
  var TONS = JSON.parse(document.getElementById('kit-tons').textContent);
  var IDS = Object.keys(META);
  var root = document.documentElement;
  var uid = 0;
  var logo = '';
  var PERFIL = ['empresa', 'unidade', 'cliente', 'consultoria', 'responsavel', 'cargo'];

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function vazio(v) { return v == null || String(v).trim() === ''; }

  /* ------------------------------------------------------ aviso */
  var toastEl = $('#toast');
  var toastT;
  function toast(msg, erro) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('erro', !!erro);
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3600);
  }

  /* ------------------------------------------------------ números e unidades */
  function numero(txt) {
    var s = String(txt == null ? '' : txt).trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  }
  function soma(a, b) { return Math.round((a + b) * 1e6) / 1e6; }
  function fmt(v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  function chaveUnidade(u) { return String(u || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, ''); }
  function chaveTexto(t) { return String(t || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' '); }
  function dataBR(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || '');
  }
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* ------------------------------------------------------ valores para impressão */
  // Na impressão os campos dão lugar a blocos de texto (.pv), que quebram linha e página sem cortar nada.
  function pvDe(el) {
    var pv = el.nextElementSibling;
    if (!pv || !pv.classList.contains('pv')) {
      pv = document.createElement('div');
      pv.className = 'pv';
      pv.setAttribute('aria-hidden', 'true');
      el.parentNode.insertBefore(pv, el.nextSibling);
    }
    return pv;
  }
  function pvAtualizar(el) {
    if (el.type === 'checkbox' || el.type === 'file' || el.type === 'radio') return;
    var pv = pvDe(el);
    var branco = root.classList.contains('em-branco');
    pv.className = 'pv';
    if (el.tagName === 'SELECT') {
      var v = el.value;
      pv.innerHTML = v ? '<span class="chip-s t-' + (TONS[v] || 'neutro') + '">' + esc(v) + '</span>' : '';
      return;
    }
    var val = el.value;
    if (el.type === 'date') {
      if (val) pv.textContent = dataBR(val);
      else if (branco) { pv.textContent = '\u2002\u2002\u2002/\u2002\u2002\u2002/'; pv.classList.add('guia'); }
      else pv.textContent = '';
      return;
    }
    if (el.classList.contains('kpi-in') && !val) {
      pv.textContent = branco ? '' : 'Não informado';
      if (!branco) pv.classList.add('vz');
      return;
    }
    pv.textContent = val;
    if (el.tagName === 'TEXTAREA' && val.length > 700) pv.classList.add('longo');
  }
  function pvTodos(escopo) { $$('input, textarea, select', escopo || document).forEach(function (el) { if (el.closest('.rel')) pvAtualizar(el); }); }

  /* ------------------------------------------------------ tabelas */
  function registros(tbl) { return $$('tbody.reg', tbl); }
  function renumerar(tbl) {
    registros(tbl).forEach(function (r, i) {
      var c = r.querySelector('.r-main .c-n');
      if (c) c.textContent = String(i + 1);
      $$('[aria-label]', r).forEach(function (el) {
        el.setAttribute('aria-label', el.getAttribute('aria-label').replace(/registro (\d+|novo)$/, 'registro ' + (i + 1)).replace(/registro (\d+|novo)(,|:)/, 'registro ' + (i + 1) + '$2'));
      });
    });
  }
  function novoRegistro(tbl, valores) {
    var tpl = $('template', tbl);
    var rid = 'n' + (++uid) + '_' + Date.now().toString(36);
    $('table', tbl).insertAdjacentHTML('beforeend', tpl.innerHTML.replace(/rNOVA/g, rid));
    var regs = registros(tbl);
    var r = regs[regs.length - 1];
    if (valores) preencherRegistro(r, valores);
    renumerar(tbl);
    pvTodos(r);
    return r;
  }
  function lerRegistro(r) {
    var o = {};
    $$('[data-col]', r).forEach(function (el) {
      if (el.tagName === 'OUTPUT') return;
      o[el.getAttribute('data-col')] = el.value;
    });
    return o;
  }
  function preencherRegistro(r, o) {
    $$('[data-col]', r).forEach(function (el) {
      var k = el.getAttribute('data-col');
      if (el.tagName === 'OUTPUT' || !(k in o)) return;
      el.value = o[k] == null ? '' : String(o[k]);
    });
  }
  function preDe(tbl) { return JSON.parse(tbl.getAttribute('data-pre') || '[]'); }
  function registroTemDados(r, i, pre) {
    var o = lerRegistro(r);
    var primeira = Object.keys(o)[0];
    return Object.keys(o).some(function (k) {
      if (vazio(o[k])) return false;
      return !(k === primeira && i < pre.length && o[k] === pre[i]);
    });
  }
  function reiniciarTabela(tbl, n) {
    var pre = preDe(tbl);
    var total = Math.max(n || parseInt(tbl.getAttribute('data-min'), 10), pre.length);
    registros(tbl).forEach(function (r) { r.parentNode.removeChild(r); });
    var primeira = $('template', tbl).content.querySelector('[data-col]').getAttribute('data-col');
    for (var i = 0; i < total; i++) {
      var v = {};
      if (i < pre.length) v[primeira] = pre[i];
      novoRegistro(tbl, v);
    }
  }
  function removerRegistro(r) {
    var tbl = r.closest('.tbl');
    var regs = registros(tbl);
    var i = regs.indexOf(r);
    if (registroTemDados(r, i, preDe(tbl)) && !window.confirm('Este registro tem informações preenchidas. Deseja remover o registro?')) return;
    if (regs.length <= 1) $$('[data-col]', r).forEach(function (el) { if (el.tagName !== 'OUTPUT') el.value = ''; });
    else r.parentNode.removeChild(r);
    renumerar(tbl);
    pvTodos(tbl);
    alterou(tbl.closest('.rel'));
  }
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      var tbl = add.closest('.tbl');
      var r = novoRegistro(tbl);
      var f = r.querySelector('input, select');
      if (f) f.focus();
      alterou(tbl.closest('.rel'));
      return;
    }
    var del = e.target.closest('[data-del]');
    if (del) removerRegistro(del.closest('tbody.reg'));
    var rest = e.target.closest('[data-restaurar]');
    if (rest) {
      var ta = document.getElementById(rest.getAttribute('data-restaurar'));
      if (ta.value !== ta.getAttribute('data-base') && !window.confirm('Substituir o texto atual pelo texto-base original?')) return;
      ta.value = ta.getAttribute('data-base');
      ajustar(ta); pvAtualizar(ta); alterou(ta.closest('.rel'));
    }
  });

  /* ------------------------------------------------------ áreas de texto */
  function ajustar(ta) {
    if (!ta.offsetParent) return;
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 2) + 'px';
  }
  function ajustarTodas(el) { $$('textarea', el).forEach(ajustar); }

  /* ------------------------------------------------------ leitura dos dados de uma tabela */
  function linhas(rel, chave) {
    var tbl = rel.querySelector('.tbl[data-tabela="' + chave + '"]');
    if (!tbl) return [];
    var pre = preDe(tbl);
    return registros(tbl).map(function (r, i) {
      var o = lerRegistro(r);
      o._dados = registroTemDados(r, i, pre);
      o._el = r;
      return o;
    });
  }
  function comDados(rows) { return rows.filter(function (o) { return o._dados; }); }
  function somarPorUnidade(rows, q, u) {
    var mapa = {}, ordem = [], semUnidade = 0;
    rows.forEach(function (o) {
      var v = numero(o[q]);
      if (isNaN(v)) return;
      if (vazio(o[u])) { semUnidade++; return; }
      var k = chaveUnidade(o[u]);
      if (!mapa[k]) { mapa[k] = { u: String(o[u]).trim(), total: 0, n: 0 }; ordem.push(k); }
      mapa[k].total = soma(mapa[k].total, v);
      mapa[k].n++;
    });
    return { grupos: ordem.map(function (k) { return mapa[k]; }), semUnidade: semUnidade };
  }
  function htmlUnidades(res) {
    return res.grupos.map(function (g) { return '<span class="u">' + fmt(g.total) + '<small>' + esc(g.u) + '</small></span>'; }).join('');
  }

  /* ------------------------------------------------------ indicadores */
  function calcularKpi(rel, out) {
    var d = JSON.parse(out.getAttribute('data-kpi'));
    var nota = out.nextElementSibling;
    var rows = d.tabela ? comDados(linhas(rel, d.tabela)) : [];
    var valor = null, html = null, msg = '';
    if (d.tipo === 'contar') valor = rows.filter(function (o) { return !vazio(o[d.campo]); }).length || (rows.length ? rows.length : null);
    else if (d.tipo === 'onde') valor = rows.length ? rows.filter(function (o) { return d.valores.indexOf(o[d.col]) !== -1; }).length : null;
    else if (d.tipo === 'distintos') {
      if (rows.length) {
        var vistos = {};
        rows.forEach(function (o) { if (!vazio(o[d.col])) vistos[chaveTexto(o[d.col])] = 1; });
        valor = Object.keys(vistos).length;
        if (!valor) { valor = null; msg = 'Coluna não preenchida'; }
      }
    } else if (d.tipo === 'soma') {
      var t = null;
      rows.forEach(function (o) { var v = numero(o[d.col]); if (!isNaN(v)) t = soma(t || 0, v); });
      if (t !== null) valor = t; else if (rows.length) msg = 'Não informado';
    } else if (d.tipo === 'unidades') {
      var res = somarPorUnidade(rows, d.q, d.u);
      if (res.grupos.length) html = htmlUnidades(res);
      if (res.semUnidade) msg = res.semUnidade + (res.semUnidade === 1 ? ' registro sem unidade não somado' : ' registros sem unidade não somados');
      if (!res.grupos.length && rows.length) valor = undefined;
    } else if (d.tipo === 'celula') {
      var todos = linhas(rel, d.tabela);
      var lin = todos[d.linha];
      var v2 = lin ? numero(lin[d.col]) : NaN;
      valor = isNaN(v2) ? undefined : v2;
    }
    out.classList.remove('vz');
    if (html) out.innerHTML = html;
    else if (typeof valor === 'number') out.textContent = fmt(valor);
    else {
      out.classList.add('vz');
      out.textContent = (valor === undefined || rows.length || d.tipo === 'celula') ? 'Não informado' : 'Sem registros';
    }
    if (nota && nota.classList.contains('kpi-n')) nota.textContent = msg;
  }

  /* ------------------------------------------------------ gráficos SVG */
  var PALETA = ['#17806C', '#256B83', '#B26A12', '#103C39', '#6A8D3A', '#7A5AA6', '#2E8FA3', '#9A6B22'];
  var TOM_COR = { ok: '#17806C', alerta: '#B26A12', info: '#256B83', neutro: '#64748B' };
  function corte(t, n) { t = String(t); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function svgBarras(itens, cores, rotuloValor) {
    var max = Math.max.apply(null, itens.map(function (i) { return i.v; }).concat([0]));
    var lh = 26, top = 6, w = 640, lx = 190, vx = 74, h = top + itens.length * lh + 6;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Gráfico de barras">';
    itens.forEach(function (it, i) {
      var y = top + i * lh;
      var bw = max > 0 ? Math.max(2, (w - lx - vx - 12) * (it.v / max)) : 2;
      var cor = it.cor || cores[i % cores.length];
      s += '<text x="' + (lx - 10) + '" y="' + (y + 16) + '" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="#334155"><title>' + esc(it.l) + '</title>' + esc(corte(it.l, 28)) + '</text>';
      s += '<rect x="' + lx + '" y="' + (y + 4) + '" width="' + (w - lx - vx - 12) + '" height="16" rx="4" fill="#EEF4F2"/>';
      s += '<rect x="' + lx + '" y="' + (y + 4) + '" width="' + bw.toFixed(1) + '" height="16" rx="4" fill="' + cor + '"/>';
      s += '<text x="' + (w - vx + 4) + '" y="' + (y + 16) + '" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#1E293B">' + esc(rotuloValor(it.v)) + '</text>';
    });
    return s + '</svg>';
  }
  function svgColunas(itens, cor) {
    var max = Math.max.apply(null, itens.map(function (i) { return i.v; }).concat([0]));
    var w = 640, h = 220, base = 182, top = 22, n = itens.length, gap = 14;
    var cw = Math.min(56, (w - 40 - gap * (n - 1)) / n);
    var total = n * cw + (n - 1) * gap, x0 = (w - total) / 2;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Gráfico de colunas por mês">';
    s += '<path d="M20 ' + base + ' H' + (w - 20) + '" stroke="#CFDDD8" stroke-width="1.2"/>';
    itens.forEach(function (it, i) {
      var bh = max > 0 ? (base - top - 14) * (it.v / max) : 0;
      var x = x0 + i * (cw + gap);
      s += '<rect x="' + x.toFixed(1) + '" y="' + (base - bh).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="4" fill="' + cor + '"/>';
      s += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (base - bh - 6).toFixed(1) + '" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#1E293B">' + fmt(it.v) + '</text>';
      s += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (base + 17) + '" text-anchor="middle" font-family="Inter, sans-serif" font-size="11.5" fill="#475569">' + esc(it.l) + '</text>';
    });
    return s + '</svg>';
  }
  function svgPares(itens, ca, cb, rot) {
    var max = Math.max.apply(null, itens.map(function (i) { return Math.max(i.a || 0, i.b || 0); }).concat([0]));
    var lh = 40, top = 6, w = 640, lx = 190, vx = 74, h = top + itens.length * lh + 4;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Gráfico de barras comparativas">';
    itens.forEach(function (it, i) {
      var y = top + i * lh;
      s += '<text x="' + (lx - 10) + '" y="' + (y + 22) + '" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="#334155"><title>' + esc(it.l) + '</title>' + esc(corte(it.l, 28)) + '</text>';
      [['a', ca, 4], ['b', cb, 20]].forEach(function (p) {
        var v = it[p[0]];
        if (v == null) return;
        var bw = max > 0 ? Math.max(2, (w - lx - vx - 12) * (v / max)) : 2;
        s += '<rect x="' + lx + '" y="' + (y + p[2]) + '" width="' + bw.toFixed(1) + '" height="13" rx="3" fill="' + p[1] + '"/>';
        s += '<text x="' + (lx + bw + 6).toFixed(1) + '" y="' + (y + p[2] + 11) + '" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#1E293B">' + esc(rot(v)) + '</text>';
      });
    });
    return s + '</svg>';
  }
  function legenda(itens) {
    return '<div class="graf-leg">' + itens.map(function (i) { return '<span><i style="background:' + i[1] + '"></i>' + esc(i[0]) + '</span>'; }).join('') + '</div>';
  }
  function grafico(rel, fig) {
    var d = JSON.parse(fig.getAttribute('data-graf'));
    var c = fig.querySelector('.graf-c');
    var rows = comDados(linhas(rel, d.tabela));
    var partes = [];
    if (d.tipo === 'barras') {
      var porUnidade = {}, ordemU = [];
      rows.forEach(function (o) {
        var v = numero(o[d.q]);
        if (isNaN(v) || vazio(o[d.u]) || vazio(o[d.rotulo])) return;
        var ku = chaveUnidade(o[d.u]);
        if (!porUnidade[ku]) { porUnidade[ku] = { u: String(o[d.u]).trim(), itens: {}, ordem: [] }; ordemU.push(ku); }
        var g = porUnidade[ku], kl = chaveTexto(o[d.rotulo]);
        if (!g.itens[kl]) { g.itens[kl] = { l: String(o[d.rotulo]).trim(), v: 0 }; g.ordem.push(kl); }
        g.itens[kl].v = soma(g.itens[kl].v, v);
      });
      ordemU.forEach(function (ku, j) {
        var g = porUnidade[ku];
        var itens = g.ordem.map(function (k) { return g.itens[k]; }).sort(function (a, b) { return b.v - a.v; });
        var extra = '';
        if (itens.length > 12) { extra = '<p class="nota">Mostrando os 12 maiores de ' + itens.length + ' itens nesta unidade.</p>'; itens = itens.slice(0, 12); }
        partes.push('<div><span class="graf-u">Quantidades em ' + esc(g.u) + '</span>' + svgBarras(itens, [PALETA[j % PALETA.length]], function (v) { return fmt(v) + ' ' + g.u; }) + extra + '</div>');
      });
      if (ordemU.length > 1) partes.push('<p class="nota">Cada unidade de medida aparece em um gráfico separado, sem conversão entre unidades.</p>');
    } else if (d.tipo === 'contagem') {
      var cont = {};
      rows.forEach(function (o) { if (!vazio(o[d.col])) cont[o[d.col]] = (cont[o[d.col]] || 0) + 1; });
      var itens2 = (d.ordem || Object.keys(cont)).filter(function (k) { return cont[k]; }).map(function (k) { return { l: k, v: cont[k], cor: TOM_COR[TONS[k]] || '#256B83' }; });
      if (itens2.length) partes.push(svgBarras(itens2, ['#256B83'], function (v) { return v + (v === 1 ? ' registro' : ' registros'); }));
    } else if (d.tipo === 'mensal') {
      var meses = {};
      rows.forEach(function (o) { var m = /^(\d{4})-(\d{2})/.exec(o[d.data] || ''); if (m) meses[m[1] + '-' + m[2]] = (meses[m[1] + '-' + m[2]] || 0) + 1; });
      var ks = Object.keys(meses).sort();
      if (ks.length >= 2) {
        var itens3 = ks.map(function (k) { return { l: MESES[parseInt(k.slice(5), 10) - 1] + '/' + k.slice(2, 4), v: meses[k] }; });
        partes.push('<span class="graf-u">Número de coletas por mês</span>' + svgColunas(itens3, '#17806C'));
      }
    } else if (d.tipo === 'comparacao') {
      var la = (rel.querySelector('[id$="-per_ant"]') || {}).value || 'Período anterior';
      var lb = (rel.querySelector('[id$="-per_atual"]') || {}).value || 'Período atual';
      var grupos = {}, ordem = [];
      rows.forEach(function (o) {
        var a = numero(o[d.a]), b = numero(o[d.b]);
        if ((isNaN(a) && isNaN(b)) || vazio(o[d.u]) || vazio(o[d.rotulo])) return;
        var ku = chaveUnidade(o[d.u]);
        if (!grupos[ku]) { grupos[ku] = { u: String(o[d.u]).trim(), itens: [] }; ordem.push(ku); }
        grupos[ku].itens.push({ l: String(o[d.rotulo]).trim(), a: isNaN(a) ? null : a, b: isNaN(b) ? null : b });
      });
      ordem.forEach(function (ku) {
        var g = grupos[ku];
        partes.push('<div><span class="graf-u">Quantidades em ' + esc(g.u) + '</span>' + svgPares(g.itens, '#9DB5AE', '#17806C', function (v) { return fmt(v) + ' ' + g.u; }) + '</div>');
      });
      if (ordem.length) partes.push(legenda([[la, '#9DB5AE'], [lb, '#17806C']]));
    } else if (d.tipo === 'pares') {
      var itens4 = rows.filter(function (o) { return !vazio(o[d.rotulo]) && (!isNaN(numero(o[d.a])) || !isNaN(numero(o[d.b]))); })
        .map(function (o) { var a = numero(o[d.a]), b = numero(o[d.b]); return { l: o[d.rotulo], a: isNaN(a) ? null : a, b: isNaN(b) ? null : b }; });
      if (itens4.length) partes.push(svgPares(itens4, '#256B83', '#B26A12', fmt) + legenda([[d.la, '#256B83'], [d.lb, '#B26A12']]));
    }
    c.innerHTML = partes.join('');
    fig.classList.toggle('tem-dados', partes.length > 0);
  }

  /* ------------------------------------------------------ blocos calculados */
  function agrupar(rows, d) {
    var g = {}, ordem = [];
    rows.forEach(function (o) {
      if (vazio(o[d.grupo])) return;
      var k = chaveTexto(o[d.grupo]);
      if (!g[k]) { g[k] = { nome: String(o[d.grupo]).trim(), regs: [] }; ordem.push(k); }
      g[k].regs.push(o);
    });
    return ordem.map(function (k) { return g[k]; });
  }
  function chipsSituacao(regs, col) {
    var c = {};
    regs.forEach(function (o) { var s = o[col] || 'Sem situação informada'; c[s] = (c[s] || 0) + 1; });
    return Object.keys(c).map(function (s) { return '<span class="chip-s t-' + (TONS[s] || 'neutro') + '">' + c[s] + ' ' + esc(s) + '</span>'; }).join(' ');
  }
  function resumo(rel, box) {
    var d = JSON.parse(box.getAttribute('data-resumo'));
    var grupos = agrupar(comDados(linhas(rel, d.tabela)), d);
    var cont = box.parentNode;
    if (!grupos.length) { box.innerHTML = ''; cont.classList.remove('tem-dados'); return; }
    var h = '<table><thead><tr><th>' + esc(d.rg) + '</th><th>Registros</th><th>Quantidade, por unidade</th>' + (d.situacao ? '<th>Situação</th>' : '') + '</tr></thead><tbody>';
    grupos.forEach(function (g) {
      var res = somarPorUnidade(g.regs, d.q, d.u);
      var q = res.grupos.map(function (x) { return fmt(x.total) + ' ' + esc(x.u); }).join('<br>') || 'Não informado';
      if (res.semUnidade) q += '<br><small>' + res.semUnidade + ' sem unidade</small>';
      h += '<tr><td>' + esc(g.nome) + '</td><td class="n">' + g.regs.length + '</td><td class="n">' + q + '</td>' + (d.situacao ? '<td>' + chipsSituacao(g.regs, d.situacao) + '</td>' : '') + '</tr>';
    });
    box.innerHTML = h + '</tbody></table>';
    cont.classList.add('tem-dados');
  }
  function lista(rel, box) {
    var d = JSON.parse(box.getAttribute('data-lista'));
    var rows = comDados(linhas(rel, d.tabela)).filter(function (o) { return vazio(o[d.sit]) || d.valores.indexOf(o[d.sit]) !== -1; });
    var cont = box.parentNode;
    if (!rows.length) { box.innerHTML = ''; cont.classList.remove('tem-dados'); return; }
    var h = '<table><thead><tr>' + d.colunas.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (o) {
      h += '<tr>' + d.colunas.map(function (c) {
        var v = o[c[0]];
        if (c[0] === d.sit) return '<td><span class="chip-s t-' + (TONS[v] || 'alerta') + '">' + esc(v || 'Sem situação informada') + '</span></td>';
        return '<td>' + (vazio(v) ? '<span class="vz">Não informado</span>' : esc(v)) + '</td>';
      }).join('') + '</tr>';
    });
    box.innerHTML = h + '</tbody></table>';
    cont.classList.add('tem-dados');
  }
  function cards(rel, box) {
    var d = JSON.parse(box.getAttribute('data-cards'));
    var grupos = agrupar(comDados(linhas(rel, d.tabela)), d);
    var cont = box.parentNode;
    if (!grupos.length) { box.innerHTML = ''; cont.classList.remove('tem-dados'); return; }
    box.innerHTML = grupos.map(function (g) {
      var res = somarPorUnidade(g.regs, d.q, d.u);
      var resid = {};
      g.regs.forEach(function (o) { if (!vazio(o[d.resid])) resid[chaveTexto(o[d.resid])] = String(o[d.resid]).trim(); });
      var rs = Object.keys(resid).map(function (k) { return resid[k]; });
      return '<div class="dcard"><b>' + esc(g.nome) + '</b>' +
        '<span class="dc-l">Registros</span><span class="dc-v">' + g.regs.length + '</span>' +
        '<span class="dc-l">Resíduos encaminhados</span><span class="dc-v">' + (rs.length ? esc(rs.join(', ')) : 'Não informado') + '</span>' +
        '<span class="dc-l">Quantidades registradas</span><span class="dc-v">' + (res.grupos.map(function (x) { return fmt(x.total) + ' ' + esc(x.u); }).join(' · ') || 'Não informado') + '</span>' +
        '<span class="dc-l">Situação documental</span><span class="dc-v">' + chipsSituacao(g.regs, d.sit) + '</span></div>';
    }).join('');
    cont.classList.add('tem-dados');
  }

  /* ------------------------------------------------------ recálculo do relatório */
  function recalcular(rel) {
    // variação linha a linha (relatório 08)
    $$('output[data-var]', rel).forEach(function (out) {
      var r = out.closest('tbody.reg');
      var o = lerRegistro(r);
      var a = numero(o.anterior), b = numero(o.atual);
      out.classList.remove('vz');
      if (isNaN(a) || isNaN(b)) { out.textContent = ''; return; }
      var dif = soma(b, -a);
      var t = (dif > 0 ? '+' : '') + fmt(dif) + (vazio(o.unidade) ? '' : ' ' + String(o.unidade).trim());
      if (a !== 0) t += ' (' + (dif > 0 ? '+' : '') + fmt(Math.round(dif / a * 1000) / 10) + '%)';
      out.textContent = t;
    });
    // destaque dos registros que pedem atenção
    $$('.tbl[data-atencao]', rel).forEach(function (tbl) {
      var d = JSON.parse(tbl.getAttribute('data-atencao'));
      registros(tbl).forEach(function (r) {
        var sel = r.querySelector('[data-col="' + d.col + '"]');
        r.classList.toggle('atencao', !!sel && d.valores.indexOf(sel.value) !== -1);
      });
    });
    $$('select', rel).forEach(function (s) { if (s.value) s.setAttribute('data-tom', TONS[s.value] || 'neutro'); else s.removeAttribute('data-tom'); });
    $$('output[data-kpi]', rel).forEach(function (o) { calcularKpi(rel, o); });
    $$('figure[data-graf]', rel).forEach(function (f) { grafico(rel, f); });
    $$('[data-resumo]', rel).forEach(function (b) { resumo(rel, b); });
    $$('[data-lista]', rel).forEach(function (b) { lista(rel, b); });
    $$('[data-cards]', rel).forEach(function (b) { cards(rel, b); });
    // identificação no cabeçalho
    var id = rel.id;
    function v(k) { var el = document.getElementById(id + '-' + k); return el ? el.value.trim() : ''; }
    var periodo = (v('per_ini') || v('per_fim')) ? 'Período: ' + (dataBR(v('per_ini')) || '...') + ' a ' + (dataBR(v('per_fim')) || '...') : '';
    var linha1 = [v('empresa'), v('unidade')].filter(Boolean).join(' · ');
    $$('[data-vivo="' + id + '"]', rel).forEach(function (el) {
      if (el.classList.contains('cr-emp')) el.textContent = linha1;
      else el.innerHTML = esc(linha1) + (linha1 && periodo ? '<br>' : '') + esc(periodo);
    });
  }
  var recalcT = {};
  function alterou(rel) {
    if (!rel) return;
    clearTimeout(recalcT[rel.id]);
    recalcT[rel.id] = setTimeout(function () { recalcular(rel); }, 120);
    salvarRascunho();
  }
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.tagName === 'TEXTAREA') ajustar(el);
    if (el.closest('.rel')) { pvAtualizar(el); alterou(el.closest('.rel')); }
    else if (el.id && el.id.indexOf('perfil-') === 0) salvarRascunho();
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.closest('.rel')) { pvAtualizar(el); alterou(el.closest('.rel')); }
  });

  /* ------------------------------------------------------ logotipo */
  function aplicarLogo() {
    $$('img.logo-img').forEach(function (img) {
      if (logo) { img.src = logo; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
      var ph = img.parentNode.querySelector('.logo-ph');
      if (ph) ph.style.display = logo ? 'none' : '';
    });
  }
  var logoArq = $('#logo-arquivo');
  logoArq.addEventListener('change', function () {
    var f = logoArq.files && logoArq.files[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { toast('Use uma imagem PNG, JPG, SVG ou WEBP.', true); return; }
    if (f.size > 1024 * 1024) { toast('A imagem tem mais de 1 MB. Reduza o arquivo e tente de novo.', true); return; }
    var r = new FileReader();
    r.onload = function () { logo = String(r.result); aplicarLogo(); salvarRascunho(); toast('Logotipo inserido em todos os relatórios.'); };
    r.readAsDataURL(f);
    logoArq.value = '';
  });

  /* ------------------------------------------------------ leitura e escrita dos relatórios */
  function lerRelatorio(rel) {
    var campos = {};
    $$('input[name], textarea[name]', rel).forEach(function (el) {
      if (el.closest('.tbl')) return;
      if (el.type === 'checkbox') { campos[el.name] = campos[el.name] || []; if (el.checked) campos[el.name].push(el.value); }
      else campos[el.name] = el.value;
    });
    var tabelas = {};
    $$('.tbl', rel).forEach(function (tbl) { tabelas[tbl.getAttribute('data-tabela')] = registros(tbl).map(lerRegistro); });
    return { codigo: rel.getAttribute('data-rel'), titulo: META[rel.id].titulo, campos: campos, tabelas: tabelas };
  }
  function escreverRelatorio(rel, d) {
    var campos = d.campos || {};
    $$('input[name], textarea[name]', rel).forEach(function (el) {
      if (el.closest('.tbl') || !(el.name in campos)) return;
      var v = campos[el.name];
      if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.indexOf(el.value) !== -1;
      else el.value = v == null ? '' : String(v);
    });
    var tabs = d.tabelas || {};
    $$('.tbl', rel).forEach(function (tbl) {
      var regs = tabs[tbl.getAttribute('data-tabela')];
      if (!Array.isArray(regs)) return;
      registros(tbl).forEach(function (r) { r.parentNode.removeChild(r); });
      (regs.length ? regs : [{}]).forEach(function (o) { novoRegistro(tbl, o); });
    });
    pvTodos(rel);
    ajustarTodas(rel);
    recalcular(rel);
  }
  function relatorioVazio(id) {
    var rel = document.getElementById(id);
    var semCampos = $$('input[name], textarea[name]', rel).every(function (el) {
      if (el.closest('.tbl')) return true;
      if (el.type === 'checkbox') return !el.checked;
      if (el.tagName === 'TEXTAREA') return el.value === (el.getAttribute('data-base') || '');
      return vazio(el.value);
    });
    var semTabelas = $$('.tbl', rel).every(function (tbl) { var pre = preDe(tbl); return registros(tbl).every(function (r, i) { return !registroTemDados(r, i, pre); }); });
    return semCampos && semTabelas;
  }

  /* ------------------------------------------------------ dados da empresa */
  function lerPerfil() { var p = {}; PERFIL.forEach(function (k) { p[k] = document.getElementById('perfil-' + k).value; }); return p; }
  function escreverPerfil(p) { PERFIL.forEach(function (k) { if (k in p) document.getElementById('perfil-' + k).value = p[k] || ''; }); }
  function usarPerfil() {
    var id = atual();
    if (!id) return;
    var p = lerPerfil();
    if (PERFIL.every(function (k) { return vazio(p[k]); })) { toast('Cadastre os dados da empresa na Central de Relatórios.', true); return; }
    var mapa = {
      empresa: id === 'r09' ? (p.cliente || p.empresa) : p.empresa,
      consultoria: p.consultoria, unidade: p.unidade, elaborado: p.responsavel,
      resp_nome: p.responsavel, resp_cargo: p.cargo, resp_empresa: p.consultoria,
    };
    var n = 0;
    Object.keys(mapa).forEach(function (k) {
      var el = document.getElementById(id + '-' + k);
      if (el && vazio(el.value) && !vazio(mapa[k])) { el.value = mapa[k]; pvAtualizar(el); n++; }
    });
    var rel = document.getElementById(id);
    recalcular(rel); salvarRascunho();
    toast(n ? n + (n === 1 ? ' campo preenchido' : ' campos preenchidos') + ' com os dados da empresa.' : 'Os campos de identificação já estavam preenchidos.');
  }

  /* ------------------------------------------------------ rascunho, exportar e importar */
  function pacote(ids) {
    var relatorios = {};
    ids.forEach(function (id) { var d = lerRelatorio(document.getElementById(id)); relatorios[d.codigo] = d; });
    return { kit: KIT_ID, versao: VERSAO, exportado_em: new Date().toISOString(), perfil: lerPerfil(), logo: logo, relatorios: relatorios };
  }
  function aplicarPacote(p) {
    var feitos = [];
    if (p.perfil) escreverPerfil(p.perfil);
    if ('logo' in p) { logo = typeof p.logo === 'string' && p.logo.indexOf('data:image/') === 0 ? p.logo : ''; aplicarLogo(); }
    Object.keys(p.relatorios || {}).forEach(function (cod) {
      var id = 'r' + cod.slice(1);
      var rel = document.getElementById(id);
      if (!rel || !META[id]) return;
      escreverRelatorio(rel, p.relatorios[cod]);
      feitos.push(cod);
    });
    return feitos;
  }
  var estado = $$('[data-draft-status]');
  var rascunhoT;
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function salvarRascunho() {
    clearTimeout(rascunhoT);
    rascunhoT = setTimeout(function () {
      var st = storage();
      if (!st) return;
      var p = pacote(IDS), msg = 'Rascunho salvo neste navegador às ';
      try { st.setItem(RASCUNHO, JSON.stringify(p)); }
      catch (e) {
        try { p.logo = ''; st.setItem(RASCUNHO, JSON.stringify(p)); msg = 'Rascunho salvo sem o logotipo (limite do navegador) às '; } catch (e2) { return; }
      }
      var h = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      estado.forEach(function (el) { el.textContent = msg + h + '.'; });
    }, 600);
  }
  function restaurarRascunho() {
    var st = storage();
    if (!st) return;
    try {
      var bruto = st.getItem(RASCUNHO);
      if (!bruto) return;
      var p = JSON.parse(bruto);
      if (p && p.kit === KIT_ID) { aplicarPacote(p); estado.forEach(function (el) { el.textContent = 'Rascunho anterior recuperado deste navegador.'; }); }
    } catch (e) { /* rascunho ilegível: ignorado */ }
  }
  function baixar(nome, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var arquivo = $('#arquivo-json');
  function importarTexto(texto) {
    var p;
    try { p = JSON.parse(texto); } catch (e) { toast('Não foi possível ler o arquivo. Verifique se é um .json exportado pela Central.', true); return false; }
    if (!p || p.kit !== KIT_ID || typeof p.relatorios !== 'object') { toast('Este arquivo não foi exportado pela Central de Relatórios.', true); return false; }
    var cods = Object.keys(p.relatorios).filter(function (c) { return META['r' + c.slice(1)]; });
    var msg = 'Importar dados de ' + cods.length + ' relatório(s)' + (cods.length ? ' (' + cods.join(', ') + ')' : '') + '?\nOs campos desses relatórios' + (p.perfil ? ', os dados da empresa e o logotipo' : '') + ' serão substituídos pelos dados do arquivo.';
    if (!window.confirm(msg)) return false;
    var feitos = aplicarPacote(p);
    salvarRascunho();
    toast(feitos.length ? 'Dados importados: ' + feitos.join(', ') + '.' : 'Dados da empresa importados.');
    if (feitos.length === 1) location.hash = 'r' + feitos[0].slice(1);
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
    var rel = document.getElementById(id);
    if (!window.confirm('Limpar o relatório ' + META[id].num + ' (' + META[id].titulo + ')?\nOs textos voltam ao texto-base e as tabelas ficam vazias. Os outros relatórios não serão alterados. Esta ação não pode ser desfeita.')) return;
    $$('input[name], textarea[name]', rel).forEach(function (el) {
      if (el.closest('.tbl')) return;
      if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName === 'TEXTAREA') el.value = el.getAttribute('data-base') || '';
      else el.value = '';
    });
    $$('.tbl', rel).forEach(function (tbl) { reiniciarTabela(tbl); });
    pvTodos(rel); ajustarTodas(rel); recalcular(rel); salvarRascunho();
    toast('Relatório ' + META[id].num + ' limpo.');
  }

  /* ------------------------------------------------------ impressão */
  function textoCss(t) { return String(t).replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' '); }
  function rodapes() {
    var css = '';
    IDS.forEach(function (id) {
      var emp = (document.getElementById(id + '-empresa') || {}).value || '';
      var base = 'Relatório ' + META[id].num + ' · ' + META[id].curto + (emp.trim() ? ' · ' + emp.trim() : '') + ' · Modelo gerencial editável';
      css += '@page ' + id + '{@bottom-left{content:"' + textoCss(base) + '"}}\n';
    });
    $('#rodapes-dinamicos').textContent = css;
  }
  var tituloOriginal = document.title;
  function prepararImpressao() {
    IDS.forEach(function (id) { recalcular(document.getElementById(id)); });
    pvTodos();
    rodapes();
  }
  function fimImpressao() {
    root.classList.remove('pm-one', 'pm-kit');
    $$('.rel.alvo').forEach(function (r) { r.classList.remove('alvo'); });
    document.title = tituloOriginal;
    if (atual()) document.title = META[atual()].titulo + ' · Central de Relatórios';
  }
  function nomeArquivo(id) {
    var emp = ((document.getElementById(id + '-empresa') || {}).value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    return META[id].arquivo + (emp ? '_' + emp : '') + '_' + hoje();
  }
  function imprimirAtual(paraPdf) {
    var id = atual();
    if (!id) return;
    root.classList.remove('pm-kit');
    root.classList.add('pm-one');
    document.getElementById(id).classList.add('alvo');
    if (paraPdf) document.title = nomeArquivo(id);
    prepararImpressao();
    window.print();
  }
  window.addEventListener('beforeprint', function () {
    if (!root.classList.contains('pm-one') && !root.classList.contains('pm-kit')) {
      var id = atual();
      if (id) { root.classList.add('pm-one'); document.getElementById(id).classList.add('alvo'); }
      else root.classList.add('pm-kit');
    }
    prepararImpressao();
  });
  window.addEventListener('afterprint', fimImpressao);

  /* ------------------------------------------------------ navegação */
  function atual() { return root.getAttribute('data-view') === 'rel' ? root.getAttribute('data-rel') : null; }
  var nav = $$('[data-nav]');
  var seletor = $('#ir-para');
  function mostrar() {
    var h = decodeURIComponent(location.hash.slice(1));
    var id = META[h] ? h : null;
    $$('.rel.ativo').forEach(function (r) { r.classList.remove('ativo'); });
    if (id) {
      var rel = document.getElementById(id);
      rel.classList.add('ativo');
      root.setAttribute('data-view', 'rel');
      root.setAttribute('data-rel', id);
      var i = IDS.indexOf(id), prev = $('[data-prev]'), next = $('[data-next]');
      prev.setAttribute('href', '#' + (i > 0 ? IDS[i - 1] : 'inicio'));
      next.setAttribute('href', '#' + (i < IDS.length - 1 ? IDS[i + 1] : 'inicio'));
      prev.setAttribute('aria-disabled', i === 0 ? 'true' : 'false');
      next.setAttribute('aria-disabled', i === IDS.length - 1 ? 'true' : 'false');
      $('[data-pos]').textContent = META[id].num + ' de 10';
      nav.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('data-nav') === id); });
      seletor.value = id;
      document.title = META[id].titulo + ' · Central de Relatórios';
      window.scrollTo(0, 0);
      ajustarTodas(rel);
      recalcular(rel);
    } else {
      root.setAttribute('data-view', 'home');
      root.removeAttribute('data-rel');
      seletor.value = 'inicio';
      document.title = tituloOriginal;
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
    var a = b.getAttribute('data-acao');
    if (a === 'pdf') { toast('Na janela que abrir, escolha Salvar como PDF no destino.'); setTimeout(function () { imprimirAtual(true); }, 350); }
    else if (a === 'imprimir') imprimirAtual(false);
    else if (a === 'limpar') limpar();
    else if (a === 'perfil') usarPerfil();
    else if (a === 'exportar-todos') { baixar('central-relatorios_dados_' + hoje() + '.json', pacote(IDS)); toast('Arquivo de dados gerado com os 10 relatórios e os dados da empresa.'); }
    else if (a === 'exportar-um') { var id = atual(); if (id) { baixar('central-relatorios_' + META[id].cod + '_' + hoje() + '.json', pacote([id])); toast('Dados do relatório ' + META[id].num + ' exportados.'); } }
    else if (a === 'importar') { arquivo.value = ''; arquivo.click(); }
    else if (a === 'logo-remover') {
      if (!logo) { toast('Nenhum logotipo inserido.'); return; }
      if (!window.confirm('Remover o logotipo de todos os relatórios?')) return;
      logo = ''; aplicarLogo(); salvarRascunho(); toast('Logotipo removido.');
    }
  });

  /* ------------------------------------------------------ início */
  pvTodos();
  restaurarRascunho();
  IDS.forEach(function (id) { recalcular(document.getElementById(id)); });
  aplicarLogo();
  mostrar();

  /* Interface usada pela geração automática dos PDFs e pelos testes */
  window.KitRel = {
    versao: VERSAO,
    ler: function (id) { return lerRelatorio(document.getElementById(id)); },
    vazio: relatorioVazio,
    pacote: function () { return pacote(IDS); },
    importarTexto: importarTexto,
    recalcular: function (id) { recalcular(document.getElementById(id)); },
    modo: function (m, id) {
      root.classList.remove('pm-one', 'pm-kit');
      $$('.rel.alvo').forEach(function (r) { r.classList.remove('alvo'); });
      root.classList.add('pm-' + m);
      if (m === 'one') document.getElementById(id).classList.add('alvo');
      prepararImpressao();
    },
    emBranco: function () {
      root.classList.add('em-branco');
      $$('.tbl').forEach(function (tbl) { reiniciarTabela(tbl, parseInt(tbl.getAttribute('data-imp'), 10)); });
      pvTodos();
    }
  };
})();
