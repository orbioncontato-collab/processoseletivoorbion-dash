/*
 * MapaElétrica Calc | app.js
 * Interface: navegação, formulários, resultados, histórico, favoritos, cópia e impressão.
 * Toda a matemática vem de calculators.js. Este arquivo apenas desenha e reage ao usuário.
 */
(function () {
  'use strict';
  var MEC = window.MEC;
  var C = MEC.calculators;
  var R = MEC.report;
  var DG = MEC.diagrams;
  var U = MEC.units;
  var esc = DG.esc;
  var VERSION = '1.0.0';

  /* ------------------------------------------------------------ */
  /* Ícones (SVG em linha, sem dependências externas)             */
  /* ------------------------------------------------------------ */
  var ICONS = {
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    ohm: '<path d="M4 20h5v-2.6A7 7 0 1 1 15 17.4V20h5"/>',
    gauge: '<path d="M4.9 19a9 9 0 1 1 14.2 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.6"/>',
    bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.2V17h6v-.7c0-.8.3-1.6 1-2.2A6.5 6.5 0 0 0 12 2.5z"/>',
    resistor: '<path d="M2 12h4l1.5-4 3 8 3-8 3 8 1.5-4h4"/>',
    vdiv: '<rect x="8.5" y="2.5" width="7" height="7" rx="1.5"/><rect x="8.5" y="14.5" width="7" height="7" rx="1.5"/><path d="M12 9.5v5M12 12h8"/>',
    idiv: '<path d="M2 12h5"/><path d="M7 12c3 0 3-6 7-6h8"/><path d="M7 12c3 0 3 6 7 6h8"/>',
    wave: '<path d="M2 12c1.7-5.3 3.3-5.3 5 0s3.3 5.3 5 0 3.3-5.3 5 0 3.3 5.3 5 0"/>',
    coil: '<path d="M2 14h2.5"/><path d="M4.5 14a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0"/><path d="M19.5 14H22"/>',
    triangle: '<path d="M4 19h16V6z"/><path d="M8.5 19A4.5 4.5 0 0 0 7.5 16.2"/>',
    plug: '<path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
    three: '<path d="M3 6h12M3 12h12M3 18h12"/><circle cx="18.5" cy="6" r="2"/><circle cx="18.5" cy="12" r="2"/><circle cx="18.5" cy="18" r="2"/>',
    convert: '<path d="M7 4 3 8l4 4"/><path d="M3 8h13"/><path d="m17 12 4 4-4 4"/><path d="M21 16H8"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h7"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
    eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4L13.3 4.7a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21z"/><path d="M22 21H7M5.5 12.5l6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    swap: '<path d="M7 3v18M3 7l4-4 4 4M17 21V3M21 17l-4 4-4-4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
  };

  function icon(name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  /* ------------------------------------------------------------ */
  /* Armazenamento local (opcional)                               */
  /* ------------------------------------------------------------ */
  var store = (function () {
    var ok = false;
    try {
      var k = '__mec_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      ok = true;
    } catch (e) { ok = false; }
    return {
      available: ok,
      get: function (key, def) {
        if (!ok) return def;
        try {
          var v = window.localStorage.getItem(key);
          return v === null ? def : JSON.parse(v);
        } catch (e) { return def; }
      },
      set: function (key, val) {
        if (!ok) return false;
        try { window.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
      }
    };
  })();

  var KEYS = { history: 'mec.history.v1', fav: 'mec.favorites.v1', prec: 'mec.precision.v1' };
  var HISTORY_MAX = 20;

  var app = {
    precision: 4,
    favorites: [],
    history: [],
    states: {},
    auto: {},
    last: {},
    filter: 'all',
    query: '',
    route: null,
    pendingCompute: null,
    timers: {}
  };

  (function loadSaved() {
    var p = store.get(KEYS.prec, 4);
    app.precision = [2, 4, 6].indexOf(p) >= 0 ? p : 4;
    var f = store.get(KEYS.fav, []);
    app.favorites = Array.isArray(f) ? f.filter(function (id) { return C.BY_ID[id]; }) : [];
    var h = store.get(KEYS.history, []);
    app.history = Array.isArray(h) ? h.filter(function (r) { return r && C.BY_ID[r.calcId] && r.state; }).slice(0, HISTORY_MAX) : [];
  })();

  var $main = document.getElementById('main');
  var $sidebar = document.getElementById('sidebar');
  var $scrim = document.getElementById('scrim');
  var $menuBtn = document.getElementById('menuBtn');
  var $prec = document.getElementById('precision');
  var $toast = document.getElementById('toast');
  var $print = document.getElementById('print-area');

  function catOf(calc) { return C.CATEGORIES.filter(function (c) { return c.id === calc.category; })[0]; }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isFav(id) { return app.favorites.indexOf(id) >= 0; }
  function normalize(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function getState(id) {
    if (!app.states[id]) app.states[id] = C.defaultState(C.BY_ID[id]);
    return app.states[id];
  }

  /* ------------------------------------------------------------ */
  /* Aviso flutuante e janela de cópia manual                     */
  /* ------------------------------------------------------------ */
  var toastTimer = null;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.classList.remove('show'); }, 2600);
  }

  function manualCopy(text) {
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mc-title"><h2 id="mc-title">Copie o texto abaixo</h2>' +
      '<p class="hint">O navegador bloqueou a cópia automática. Selecione o texto e use Ctrl+C (ou toque e segure no celular).</p>' +
      '<textarea readonly></textarea><div style="display:flex;justify-content:flex-end"><button type="button" class="btn btn-primary">Fechar</button></div></div>';
    back.querySelector('textarea').value = text;
    document.body.appendChild(back);
    var ta = back.querySelector('textarea');
    ta.focus();
    ta.select();
    function close() { back.remove(); }
    back.querySelector('button').addEventListener('click', close);
    back.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text, okMsg) {
    function done(ok) {
      if (ok) toast(okMsg);
      else manualCopy(text);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));
    }
  }

  /* ------------------------------------------------------------ */
  /* Menu lateral                                                 */
  /* ------------------------------------------------------------ */
  function renderSidebar() {
    var r = app.route || {};
    var cur = function (cond) { return cond ? ' aria-current="page"' : ''; };
    var h = '<div class="nav-group">' +
      '<a class="nav-link" href="#/"' + cur(r.view === 'home') + '>' + icon('home') + 'Início</a>' +
      '<a class="nav-link" href="#/historico"' + cur(r.view === 'history') + '>' + icon('history') + 'Histórico</a>' +
      '<a class="nav-link" href="#/sobre"' + cur(r.view === 'about') + '>' + icon('info') + 'Como usar e avisos</a></div>';
    if (app.favorites.length) {
      h += '<div class="nav-group nav-fav"><div class="nav-title">' + icon('star', 'ico-sm') + 'Favoritas</div>';
      app.favorites.forEach(function (id) {
        var c = C.BY_ID[id];
        h += '<a class="nav-link" href="#/calc/' + c.id + '"><span class="nav-num">' + pad2(c.num) + '</span>' + esc(c.name) + '</a>';
      });
      h += '</div>';
    }
    h += '<div class="nav-sep"></div>';
    C.CATEGORIES.forEach(function (cat) {
      h += '<div class="nav-group"><div class="nav-title"><span class="dotc dot-' + cat.id + '"></span>' + esc(cat.name) + '</div>';
      C.LIST.filter(function (c) { return c.category === cat.id; }).forEach(function (c) {
        h += '<a class="nav-link" href="#/calc/' + c.id + '"' + cur(r.view === 'calc' && r.id === c.id) + '><span class="nav-num">' + pad2(c.num) + '</span>' + esc(c.name) + '</a>';
      });
      h += '</div>';
    });
    $sidebar.innerHTML = h;
  }

  function openMenu() {
    $sidebar.classList.add('open');
    $scrim.classList.add('show');
    $menuBtn.setAttribute('aria-expanded', 'true');
    $menuBtn.setAttribute('aria-label', 'Fechar menu');
    var first = $sidebar.querySelector('a');
    if (first) first.focus();
  }
  function closeMenu() {
    if (!$sidebar.classList.contains('open')) return;
    $sidebar.classList.remove('open');
    $scrim.classList.remove('show');
    $menuBtn.setAttribute('aria-expanded', 'false');
    $menuBtn.setAttribute('aria-label', 'Abrir menu');
  }
  $menuBtn.addEventListener('click', function () {
    if ($sidebar.classList.contains('open')) closeMenu(); else openMenu();
  });
  $scrim.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $sidebar.classList.contains('open')) { closeMenu(); $menuBtn.focus(); }
  });

  /* ------------------------------------------------------------ */
  /* Página inicial                                               */
  /* ------------------------------------------------------------ */
  function starButton(c, extra) {
    var on = isFav(c.id);
    return '<button type="button" class="star' + (extra ? ' ' + extra : '') + '" data-fav="' + c.id + '" aria-pressed="' + on + '" aria-label="' +
      (on ? 'Remover ' : 'Adicionar ') + esc(c.name) + (on ? ' das favoritas' : ' às favoritas') + '" title="Favoritar">' + icon('star') + '</button>';
  }

  function toolCard(c) {
    var cat = catOf(c);
    return '<article class="card tool-card">' +
      '<div class="tool-top"><span class="tool-icon cat-' + c.category + '">' + icon(c.icon) + '</span>' + starButton(c) + '</div>' +
      '<p class="tool-num">' + pad2(c.num) + ' | ' + esc(cat.short) + '</p>' +
      '<h3>' + esc(c.name) + '</h3>' +
      '<p class="tool-desc">' + esc(c.short) + '</p>' +
      '<a class="btn btn-soft" href="#/calc/' + c.id + '">Abrir calculadora</a></article>';
  }

  function matches(c, q) {
    if (!q) return true;
    var hay = normalize([c.name, c.short, c.objective, catOf(c).name, c.keywords.join(' '), (c.formulas || []).join(' ')].join(' '));
    return normalize(q).split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function renderCards() {
    var box = document.getElementById('cards');
    if (!box) return;
    var list = C.LIST.filter(function (c) {
      if (app.filter === 'fav' && !isFav(c.id)) return false;
      if (app.filter !== 'all' && app.filter !== 'fav' && c.category !== app.filter) return false;
      return matches(c, app.query);
    });
    if (!list.length) {
      box.innerHTML = '<div class="empty-search card">' + (app.filter === 'fav' && !app.favorites.length
        ? 'Você ainda não marcou favoritas. Toque na estrela de uma calculadora para guardá-la aqui.'
        : 'Nenhuma calculadora encontrada para essa busca. Tente outra palavra, como "ohm", "kWh" ou "trifásico".') + '</div>';
      return;
    }
    var h = '';
    C.CATEGORIES.forEach(function (cat) {
      var items = list.filter(function (c) { return c.category === cat.id; });
      if (!items.length) return;
      h += '<section class="cat-block" aria-labelledby="cat-' + cat.id + '"><div class="cat-head"><span class="tool-icon cat-' + cat.id + '" style="width:34px;height:34px;border-radius:10px">' +
        icon(cat.icon, 'ico-sm') + '</span><h2 id="cat-' + cat.id + '">' + esc(cat.name) + '</h2><span class="count">' + items.length + (items.length > 1 ? ' calculadoras' : ' calculadora') + '</span></div>' +
        '<div class="grid-cards">' + items.map(toolCard).join('') + '</div></section>';
    });
    box.innerHTML = h;
  }

  function renderChips() {
    var box = document.getElementById('chips');
    if (!box) return;
    var chips = [{ id: 'all', name: 'Todas', icon: 'grid' }].concat(C.CATEGORIES.map(function (c) { return { id: c.id, name: c.short, icon: c.icon }; }))
      .concat([{ id: 'fav', name: 'Favoritas', icon: 'star' }]);
    box.innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip" data-filter="' + c.id + '" aria-pressed="' + (app.filter === c.id) + '">' + icon(c.icon) + esc(c.name) + '</button>';
    }).join('');
  }

  function footer() {
    return '<footer class="site-foot"><span>MapaElétrica Calc v' + VERSION + ' | Ferramenta educacional</span>' +
      '<span>Os cálculos rodam no seu aparelho. Nenhum dado é enviado para a internet.</span></footer>';
  }

  function renderHome() {
    $main.innerHTML = '<div class="wrap">' +
      '<section class="hero" aria-labelledby="home-title"><div class="hero-text">' +
      '<p class="eyebrow">Kit de Calculadoras Elétricas Automáticas</p>' +
      '<h1 id="home-title" tabindex="-1">Seus cálculos de Engenharia Elétrica, resolvidos e explicados em segundos.</h1>' +
      '<p class="lead">Preencha os dados, calcule e veja a fórmula, a substituição dos valores e a explicação do resultado.</p></div>' +
      '<div class="hero-stats"><div class="stat"><strong>12</strong><span>calculadoras</span></div>' +
      '<div class="stat"><strong>4</strong><span>categorias</span></div>' +
      '<div class="stat"><strong>0</strong><span>cadastros</span></div></div></section>' +
      '<div class="finder"><div class="search">' + icon('search') +
      '<input type="search" id="search" autocomplete="off" placeholder="Buscar por nome ou assunto (ex.: ohm, kWh, trifásico)" aria-label="Buscar calculadora por nome ou assunto" value="' + esc(app.query) + '"></div>' +
      '<div class="chips" id="chips" role="group" aria-label="Filtrar por categoria"></div></div>' +
      '<div id="cards"></div>' +
      '<div class="disclaimer-box">' + icon('info') + '<p>Ferramenta educacional para estudar e conferir exercícios. Ela não substitui normas técnicas, projetos, medições nem profissionais habilitados.</p></div>' +
      footer() + '</div>';
    renderChips();
    renderCards();
  }

  /* ------------------------------------------------------------ */
  /* Calculadora: formulário                                       */
  /* ------------------------------------------------------------ */
  function unitOptions(list, selected) {
    return list.map(function (u) { return '<option value="' + esc(u) + '"' + (u === selected ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('');
  }

  function fieldHtml(calc, f, st) {
    var vis = C.isVisible(f, st);
    var hid = vis ? '' : ' hidden';
    var fid = 'f-' + f.id;
    if (f.type === 'choice') {
      if (f.style === 'select') {
        return '<div class="field" data-field="' + f.id + '"' + hid + '><label for="' + fid + '">' + esc(f.label) + '</label>' +
          '<select class="select-full" id="' + fid + '" data-choice="' + f.id + '">' +
          f.options.map(function (o) { return '<option value="' + o.id + '"' + (st.values[f.id] === o.id ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') +
          '</select><p class="err" id="e-' + f.id + '"></p></div>';
      }
      return '<fieldset class="seg field" data-field="' + f.id + '"' + hid + '><legend>' + esc(f.label) + '</legend><div class="seg-opts">' +
        f.options.map(function (o) {
          return '<label><input type="radio" name="' + fid + '" value="' + o.id + '" data-choice="' + f.id + '"' + (st.values[f.id] === o.id ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>';
        }).join('') + '</div><p class="err" id="e-' + f.id + '"></p></fieldset>';
    }
    if (f.type === 'unitpick') {
      var dim = st.values[f.dimFrom];
      var syms = U.DIMENSIONS[dim] ? U.unitSymbols(dim) : [];
      var html = '<div class="field" data-field="' + f.id + '"' + hid + '><label for="' + fid + '">' + esc(f.label) + '</label>' +
        '<select class="select-full" id="' + fid + '" data-unitpick="' + f.id + '">' +
        syms.map(function (s) {
          var u = U.findUnit(dim, s);
          return '<option value="' + esc(s) + '"' + (st.values[f.id] === s ? ' selected' : '') + '>' + esc(s) + ' (' + esc(u.name) + ')</option>';
        }).join('') + '</select><p class="err" id="e-' + f.id + '"></p></div>';
      if (calc.id === 'converter' && f.id === 'from') {
        html += '<div class="swap-row"><button type="button" class="btn btn-ghost btn-small" data-act="swap">' + icon('swap', 'ico-sm') + 'Inverter unidades</button></div>';
      }
      return html;
    }
    var unitPart = '';
    if (f.units) {
      unitPart = '<select data-unit="' + f.id + '" aria-label="Unidade de ' + esc(f.label) + '">' + unitOptions(f.units, st.units[f.id]) + '</select>';
    } else if (f.unit) {
      unitPart = '<span class="unit-fixed" aria-hidden="true">' + esc(f.unit) + '</span>';
    } else if (f.unitFrom) {
      unitPart = '<span class="unit-fixed" aria-hidden="true" data-unit-echo>' + esc(st.values[f.unitFrom] || '') + '</span>';
    }
    var desc = 'e-' + f.id + (f.hint ? ' h-' + f.id : '');
    return '<div class="field" data-field="' + f.id + '"' + hid + '>' +
      '<label for="' + fid + '">' + esc(f.label) + (f.symbol ? ' <span class="sym">' + esc(f.symbol) + '</span>' : '') + '</label>' +
      '<div class="input-group"><input id="' + fid + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" enterkeyhint="done" data-num="' + f.id +
      '" value="' + esc(st.values[f.id] || '') + '" placeholder="' + esc(f.placeholder || (f.optional ? 'opcional' : 'Digite o valor')) + '" aria-describedby="' + desc + '">' + unitPart + '</div>' +
      (f.hint ? '<p class="hint" id="h-' + f.id + '">' + esc(f.hint) + '</p>' : '') +
      '<p class="err" id="e-' + f.id + '"></p></div>';
  }

  function listHtml(calc, st) {
    var n = st.list.length;
    var rows = st.list.map(function (r, i) {
      var name = 'R' + (i + 1);
      return '<li class="rrow" data-row="' + i + '"><label for="r-' + i + '">' + name + '</label>' +
        '<div class="input-group"><input id="r-' + i + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-li="' + i + '" value="' + esc(r.value) +
        '" placeholder="Valor de ' + name + '" aria-describedby="e-list-' + i + '">' +
        '<select data-lu="' + i + '" aria-label="Unidade de ' + name + '">' + unitOptions(U.unitSymbols('resistance'), r.unit) + '</select></div>' +
        '<button type="button" class="icon-btn" data-remove="' + i + '" aria-label="Remover ' + name + '"' + (n <= calc.minItems ? ' disabled' : '') + '>' + icon('x') + '</button>' +
        '<p class="err" id="e-list-' + i + '"></p></li>';
    }).join('');
    return '<div class="field" data-field="list"><div class="list-meta">Resistores cadastrados <span>' + n + ' de ' + calc.maxItems + '</span></div>' +
      '<ol class="rlist">' + rows + '</ol>' +
      '<button type="button" class="btn btn-ghost btn-small" data-act="add"' + (n >= calc.maxItems ? ' disabled' : '') + '>' + icon('plus', 'ico-sm') + 'Adicionar resistor</button>' +
      '<p class="err" id="e-list"></p></div>';
  }

  function renderFields(calc, st) {
    var box = document.getElementById('fields');
    var h = calc.fields.map(function (f) { return fieldHtml(calc, f, st); }).join('');
    if (calc.hasList) h += listHtml(calc, st);
    box.innerHTML = h;
    applyLocks(calc, st);
  }

  function updateVisibility(calc, st) {
    calc.fields.forEach(function (f) {
      var el = document.querySelector('[data-field="' + f.id + '"]');
      if (el) el.hidden = !C.isVisible(f, st);
    });
  }

  /* Carga resistiva ideal: FP fica travado em 1. */
  function applyLocks(calc, st) {
    if (!st.values.hasOwnProperty('nature')) return;
    var input = document.getElementById('f-FP');
    var hint = document.getElementById('h-FP');
    if (!input) return;
    var lock = st.values.nature === 'resistiva';
    if (lock) {
      st.values.FP = '1';
      input.value = '1';
    }
    input.readOnly = lock;
    if (hint) hint.textContent = lock ? 'Carga resistiva ideal: o fator de potência é sempre 1.' : 'Número entre 0 e 1. Ex.: 0,8';
  }

  function allEmpty(calc, st) {
    var numbers = calc.fields.filter(function (f) { return f.type === 'number' && C.isVisible(f, st); });
    var e = numbers.every(function (f) { return !String(st.values[f.id] || '').trim(); });
    if (calc.hasList) e = e && st.list.every(function (r) { return !String(r.value || '').trim(); });
    return e;
  }

  function clearFieldErrors() {
    Array.prototype.forEach.call($main.querySelectorAll('.err'), function (el) { el.textContent = ''; });
    Array.prototype.forEach.call($main.querySelectorAll('.invalid'), function (el) { el.classList.remove('invalid'); });
    Array.prototype.forEach.call($main.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
  }

  function showFieldErrors(fieldErrors) {
    clearFieldErrors();
    Object.keys(fieldErrors || {}).forEach(function (k) {
      var msg = fieldErrors[k];
      var m = /^list\.(\d+)$/.exec(k);
      var errEl, wrap, input;
      if (m) {
        errEl = document.getElementById('e-list-' + m[1]);
        wrap = document.querySelector('.rrow[data-row="' + m[1] + '"]');
        input = document.getElementById('r-' + m[1]);
      } else {
        errEl = document.getElementById('e-' + k);
        wrap = document.querySelector('[data-field="' + k + '"]');
        input = document.getElementById('f-' + k);
      }
      if (errEl) errEl.textContent = msg;
      if (wrap) wrap.classList.add('invalid');
      if (input) input.setAttribute('aria-invalid', 'true');
    });
  }

  /* ------------------------------------------------------------ */
  /* Calculadora: resultado, memória e explicação                  */
  /* ------------------------------------------------------------ */
  function emptyResult() {
    return '<div class="res-empty">' + icon('calc') + '<p><strong style="color:var(--navy)">Pronto para calcular</strong></p>' +
      '<p>Preencha os dados e toque em <b>Calcular</b>. Se preferir, use <b>Carregar exemplo</b> para ver um caso resolvido.</p></div>';
  }

  function staticExplain(calc, res) {
    var h = '';
    if (res && res.ok) {
      h += res.explanation.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    } else {
      h += '<p class="muted-box">' + esc(calc.objective) + ' A explicação do seu resultado aparece aqui depois do cálculo.</p>';
    }
    h += '<h3>Fórmulas desta calculadora</h3><div class="formula-chips">' + calc.formulas.map(function (f) { return '<code>' + esc(f) + '</code>'; }).join('') + '</div>';
    h += '<h3>Hipóteses e limitações</h3><ul>' + calc.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    h += '<p class="note-edu">' + icon('info', 'ico-sm') + '<span>' + esc(R.DISCLAIMER) + '</span></p>';
    return h;
  }

  function stepHtml(s) {
    var h = '<li class="step"><h3>' + esc(s.title) + '</h3>';
    if (s.lines) h += '<ul class="f-lines">' + s.lines.map(function (l) { return '<li class="f">' + esc(l) + '</li>'; }).join('') + '</ul>';
    if (s.formula) h += '<div class="f-row"><span class="f-tag">Fórmula</span><span class="f">' + esc(s.formula) + '</span></div>';
    if (s.subst) h += '<div class="f-row"><span class="f-tag">Substituição</span><span class="f">' + esc(s.subst) + '</span></div>';
    if (s.result) h += '<div class="f-row"><span class="f-tag">Resultado</span><span class="f f-res">' + esc(s.result) + '</span></div>';
    return h + '</li>';
  }

  function itemRow(it) {
    return '<div class="res-row"><dt>' + esc(it.label) + (it.symbol ? '<span class="sym">' + esc(it.symbol) + '</span>' : '') + '</dt><dd>' + esc(it.text) +
      (it.base ? '<small>' + esc(it.base) + '</small>' : '') + '</dd></div>';
  }

  function diagramHtml(res) {
    var dg = DG.render(res.diagram);
    if (!dg) return '';
    var title = res.diagram.title || 'Esquema simplificado';
    return '<figure class="diagram" style="margin-left:0;margin-right:0"><h3>' + esc(title) + '</h3>' + dg.svg +
      (dg.legend.length ? '<ul class="dg-legend">' + dg.legend.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') + '</figure>';
  }

  function renderOutput(calc, res, isLive) {
    var body = document.getElementById('resultBody');
    var memo = document.getElementById('memoBody');
    var exp = document.getElementById('explainBody');
    var live = document.getElementById('liveTag');
    if (!body) return;
    if (live) live.hidden = !isLive;
    if (!res) {
      body.innerHTML = emptyResult();
      memo.innerHTML = '<p class="muted-box">Depois do cálculo, você verá aqui a fórmula geral, a substituição dos números, a operação e o resultado final de cada etapa.</p>';
      exp.innerHTML = staticExplain(calc, null);
      return;
    }
    if (!res.ok) {
      body.innerHTML = '<div class="res-error" role="alert"><strong>' + icon('alert') + 'Confira os dados</strong><ul>' +
        res.errors.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>';
      memo.innerHTML = '<p class="muted-box">Corrija os dados indicados para ver a memória de cálculo.</p>';
      exp.innerHTML = staticExplain(calc, null);
      return;
    }
    var h = '<div class="res-primary">' + res.primary.map(function (it) {
      return '<div class="res-main"><span class="res-label">' + icon('check', 'ico-sm') + esc(it.label) + (it.symbol ? ' <span class="sym">' + esc(it.symbol) + '</span>' : '') + '</span>' +
        '<strong class="res-value" data-result="' + esc(it.symbol || it.label) + '">' + esc(it.text) + '</strong>' + (it.base ? '<span class="res-base">= ' + esc(it.base) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
    if (res.equation) h += '<p class="equation" data-equation>' + esc(res.equation) + '</p>';
    if (res.results.length) h += '<div class="res-sub"><h3>' + esc(res.resultsTitle) + '</h3><dl class="res-list">' + res.results.map(itemRow).join('') + '</dl></div>';
    if (res.warnings.length) h += '<div class="alerts">' + res.warnings.map(function (w) { return '<p class="alert">' + icon('alert', 'ico-sm') + '<span>' + esc(w) + '</span></p>'; }).join('') + '</div>';
    h += diagramHtml(res);
    h += '<div class="res-actions">' +
      '<button type="button" class="btn btn-ghost btn-small" data-act="copy-result">' + icon('copy', 'ico-sm') + 'Copiar resultado</button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-act="copy-full">' + icon('file', 'ico-sm') + 'Copiar resolução</button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-act="print">' + icon('printer', 'ico-sm') + 'Imprimir ou salvar PDF</button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-act="new">' + icon('refresh', 'ico-sm') + 'Fazer novo cálculo</button></div>';
    body.innerHTML = h;

    var m = '<h3 class="kicker" style="margin-bottom:8px">Dados utilizados</h3><div class="inputs-used">' + res.inputs.map(function (i) {
      return '<span class="pill"><b>' + esc(i.symbol || i.label) + '</b> ' + esc(i.text) + (i.si ? ' <small>(' + esc(i.si) + ')</small>' : '') + '</span>';
    }).join('') + '</div><ol class="steps">' + res.steps.map(stepHtml).join('') + '</ol>';
    memo.innerHTML = m;
    exp.innerHTML = staticExplain(calc, res);
  }

  /* ------------------------------------------------------------ */
  /* Calculadora: execução                                         */
  /* ------------------------------------------------------------ */
  function compute(id, mode) {
    var calc = C.BY_ID[id];
    var st = getState(id);
    if ((calc.live || mode !== 'explicit') && allEmpty(calc, st)) {
      app.last[id] = null;
      clearFieldErrors();
      renderOutput(calc, null, !!calc.live);
      return null;
    }
    var res = C.run(id, st, { precision: app.precision });
    app.last[id] = res;
    showFieldErrors(res.ok ? {} : res.fieldErrors);
    renderOutput(calc, res, app.auto[id] || !!calc.live);
    if (res.ok) {
      if (mode === 'explicit') saveHistory(id, st, res);
      else if (mode === 'auto') scheduleHistory(id);
    }
    return res;
  }

  function scheduleCompute(id) {
    clearTimeout(app.timers.compute);
    app.timers.compute = setTimeout(function () { if (app.route && app.route.id === id) compute(id, 'auto'); }, 140);
  }

  function onEdit(id) {
    var calc = C.BY_ID[id];
    if (app.auto[id] || calc.live) scheduleCompute(id);
  }

  /* ------------------------------------------------------------ */
  /* Histórico                                                     */
  /* ------------------------------------------------------------ */
  function persistHistory() { store.set(KEYS.history, app.history); }

  function saveHistory(id, st, res) {
    var sig = JSON.stringify(st);
    var top = app.history[0];
    if (top && top.calcId === id && top.sig === sig) {
      top.ts = Date.now();
      top.result = R.resultSummary(res);
    } else {
      app.history.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        calcId: id, ts: Date.now(), state: clone(st), sig: sig,
        inputs: R.inputsSummary(res), result: R.resultSummary(res)
      });
    }
    app.history = app.history.slice(0, HISTORY_MAX);
    persistHistory();
  }

  function scheduleHistory(id) {
    clearTimeout(app.timers.hist);
    app.timers.hist = setTimeout(function () {
      var res = app.last[id];
      if (res && res.ok && app.route && app.route.id === id) saveHistory(id, getState(id), res);
    }, 2500);
  }

  function renderHistory() {
    var h = '<div class="wrap"><div class="page-head"><div><h1 id="page-title" tabindex="-1">Histórico de cálculos</h1>' +
      '<p>Os últimos ' + HISTORY_MAX + ' cálculos ficam guardados neste navegador.</p></div>' +
      (app.history.length ? '<button type="button" class="btn btn-ghost" data-act="hist-clear">' + icon('trash', 'ico-sm') + '<span>Limpar histórico</span></button>' : '') + '</div>';
    if (!store.available) {
      h += '<div class="notice">O armazenamento deste navegador está indisponível (por exemplo, em janela anônima ou com dados bloqueados). O histórico funciona apenas enquanto esta página estiver aberta.</div>';
    }
    if (!app.history.length) {
      h += '<div class="card empty-search">Nenhum cálculo no histórico ainda. Ao calcular, o resultado aparece aqui.</div>';
    } else {
      h += '<ul class="hist-list">' + app.history.map(function (r) {
        var c = C.BY_ID[r.calcId];
        return '<li class="card hist-item"><div><p class="hist-meta">' + esc(R.formatDate(new Date(r.ts))) + '</p><h3>' + esc(c.name) + '</h3>' +
          '<p class="hist-data">' + esc(r.inputs) + '</p><p class="hist-res">' + esc(r.result) + '</p></div>' +
          '<div class="hist-actions"><button type="button" class="btn btn-soft btn-small" data-reopen="' + r.id + '">Reabrir</button>' +
          '<button type="button" class="btn btn-ghost btn-small" data-del="' + r.id + '" aria-label="Excluir registro de ' + esc(c.name) + '">' + icon('trash', 'ico-sm') + '</button></div></li>';
      }).join('') + '</ul>';
    }
    h += footer() + '</div>';
    $main.innerHTML = h;
  }

  /* ------------------------------------------------------------ */
  /* Página "Como usar e avisos"                                   */
  /* ------------------------------------------------------------ */
  function renderAbout() {
    $main.innerHTML = '<div class="wrap"><div class="page-head"><div><h1 id="page-title" tabindex="-1">Como usar e avisos</h1><p>Tudo o que você precisa para usar o MapaElétrica Calc.</p></div></div>' +
      '<div class="card card-pad prose">' +
      '<h2 style="margin-top:0">Passo a passo</h2><ol>' +
      '<li>Escolha a calculadora pela busca, pelas categorias ou pelo menu.</li>' +
      '<li>Preencha os campos e escolha as unidades. Se quiser ver um caso pronto, toque em <b>Carregar exemplo</b>.</li>' +
      '<li>Toque em <b>Calcular</b>. Depois do primeiro cálculo, o resultado se atualiza sozinho quando você muda um valor.</li>' +
      '<li>Confira a memória de cálculo: fórmula, substituição e resultado de cada etapa.</li>' +
      '<li>Copie o resultado, copie a resolução completa ou imprima/salve em PDF.</li></ol>' +
      '<h2>Como digitar números</h2><ul>' +
      '<li>Use vírgula para decimais: <b>0,5</b> ou <b>2,25</b>. O ponto também funciona quando não há dúvida, como <b>0.5</b>.</li>' +
      '<li>Milhar com ponto só é aceito junto com a vírgula decimal ou em grupos de três: <b>1.234,5</b> ou <b>1.000.000</b>.</li>' +
      '<li>Um valor como <b>1.500</b> é ambíguo (mil e quinhentos ou um e meio). A calculadora pede para você escrever <b>1500</b> ou <b>1,5</b>.</li>' +
      '<li>Notação científica é aceita: <b>4,7e-6</b> significa 4,7 × 10⁻⁶.</li></ul>' +
      '<h2>Precisão</h2><p>Escolha 2, 4 ou 6 casas decimais no topo da tela. O arredondamento acontece só na exibição: os cálculos internos usam o valor completo. Números muito pequenos aparecem com prefixo (mA, µF) ou em notação científica para não virarem zero.</p>' +
      '<h2>Privacidade</h2><p>Não há cadastro, login nem envio de dados. Todos os cálculos acontecem no seu aparelho. O histórico e as favoritas ficam guardados só neste navegador.' +
      (store.available ? '' : ' Neste momento o armazenamento do navegador está indisponível, então histórico e favoritas valem apenas até fechar a página.') + '</p>' +
      '<h2>Aviso importante</h2><p>O MapaElétrica Calc é uma ferramenta educacional, feita para estudar e conferir exercícios. As fórmulas usam modelos ideais (componentes ideais, regime senoidal, sistemas equilibrados quando indicado). Os resultados não substituem normas técnicas, projetos, medições nem profissionais habilitados, e não devem ser usados para dimensionar condutores, disjuntores ou proteções.</p>' +
      '<p class="hint" style="margin-top:18px">Versão ' + VERSION + '</p></div>' + footer() + '</div>';
  }

  /* ------------------------------------------------------------ */
  /* Página da calculadora                                         */
  /* ------------------------------------------------------------ */
  function renderCalc(id) {
    var calc = C.BY_ID[id];
    var cat = catOf(calc);
    var st = getState(id);
    if (calc.live) app.auto[id] = true;
    $main.innerHTML = '<div class="wrap">' +
      '<nav class="crumbs" aria-label="Navegação"><a href="#/">' + icon('back', 'ico-sm') + 'Todas as calculadoras</a></nav>' +
      '<section class="card calc-head" aria-labelledby="calc-title"><span class="tool-icon cat-' + calc.category + '">' + icon(calc.icon) + '</span>' +
      '<div class="head-text"><p class="kicker">Calculadora ' + pad2(calc.num) + ' | ' + esc(cat.name) + '</p>' +
      '<h1 id="calc-title" tabindex="-1">' + esc(calc.name) + '</h1><p class="objective">' + esc(calc.objective) + '</p><p class="guidance">' + esc(calc.guidance) + '</p></div>' +
      starButton(calc) + '</section>' +
      '<div class="calc-grid">' +
      '<form class="card inputs-card" id="calcForm" novalidate aria-labelledby="in-title"><h2 class="section-title" id="in-title">' + icon('calc') + 'Dados de entrada</h2>' +
      '<div id="fields"></div>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + icon('check') + 'Calcular</button>' +
      '<button type="button" class="btn btn-ghost" data-act="example">' + icon('book', 'ico-sm') + 'Carregar exemplo</button>' +
      '<button type="button" class="btn btn-ghost" data-act="clear">' + icon('eraser', 'ico-sm') + 'Limpar</button></div></form>' +
      '<section class="card result-card" id="resultCard" aria-labelledby="res-title"><div class="result-head"><h2 class="section-title" id="res-title">' + icon('check') + 'Resultado</h2>' +
      '<span class="live" id="liveTag" hidden>Atualização automática</span></div><div id="resultBody" aria-live="polite"></div></section></div>' +
      '<div class="lower"><section class="card card-pad" aria-labelledby="memo-title"><h2 class="section-title" id="memo-title">' + icon('file') + 'Memória de cálculo</h2><div id="memoBody"></div></section>' +
      '<section class="card card-pad explain" aria-labelledby="exp-title"><h2 class="section-title" id="exp-title">' + icon('book') + 'Explicação</h2><div id="explainBody"></div></section></div>' +
      footer() + '</div>';
    renderFields(calc, st);
    if (app.pendingCompute === id) {
      app.pendingCompute = null;
      compute(id, 'refresh');
    } else if (app.last[id] && (app.auto[id] || calc.live)) {
      compute(id, 'refresh');
    } else {
      renderOutput(calc, null, !!calc.live);
    }
  }

  function loadExample(id) {
    var calc = C.BY_ID[id];
    app.states[id] = C.exampleState(calc);
    app.auto[id] = true;
    renderFields(calc, app.states[id]);
    compute(id, 'example');
    toast('Exemplo carregado e calculado.');
  }

  function clearCalc(id, focus) {
    var calc = C.BY_ID[id];
    app.states[id] = C.defaultState(calc);
    app.auto[id] = !!calc.live;
    app.last[id] = null;
    clearTimeout(app.timers.hist);
    renderFields(calc, app.states[id]);
    clearFieldErrors();
    renderOutput(calc, null, !!calc.live);
    if (focus) {
      var first = document.querySelector('#fields input[type="text"]:not([readonly])');
      var top = document.getElementById('calcForm');
      if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
      if (first) first.focus({ preventScroll: true });
    }
  }

  function focusFirstInvalid() {
    var el = $main.querySelector('[aria-invalid="true"]');
    if (el) el.focus();
  }

  /* ------------------------------------------------------------ */
  /* Impressão / PDF                                               */
  /* ------------------------------------------------------------ */
  function buildPrint(calc, res) {
    var dg = DG.render(res.diagram);
    var h = '<div class="p-head"><div><strong>' + esc(R.PRODUCT) + '</strong><br><span>Kit de Calculadoras Elétricas Automáticas</span></div><div>' + esc(R.formatDate(new Date())) + '</div></div>';
    h += '<h1>' + esc(calc.name) + '</h1><p>' + esc(calc.objective) + '</p>';
    h += '<h2>Dados de entrada</h2><table>' + res.inputs.map(function (i) {
      return '<tr><td>' + esc(i.label) + (i.symbol ? ' (' + esc(i.symbol) + ')' : '') + '</td><td class="v">' + esc(i.text) + (i.si ? ' = ' + esc(i.si) : '') + '</td></tr>';
    }).join('') + '</table>';
    h += '<h2>Resultados</h2><table>' + (res.equation ? '<tr><td colspan="2"><b>' + esc(res.equation) + '</b></td></tr>' : '') +
      res.primary.concat(res.results).map(function (it) {
        return '<tr><td>' + esc(it.label) + (it.symbol ? ' (' + esc(it.symbol) + ')' : '') + '</td><td class="v">' + esc(it.text) + (it.base ? ' = ' + esc(it.base) : '') + '</td></tr>';
      }).join('') + '</table>';
    if (res.warnings.length) h += '<h2>Avisos</h2><ul>' + res.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
    if (dg) h += '<div class="p-diagram">' + dg.svg + '</div>' + (dg.legend.length ? '<p>' + dg.legend.map(esc).join(' | ') + '</p>' : '');
    h += '<h2>Memória de cálculo</h2>' + res.steps.map(function (s, i) {
      var t = '<div class="p-step"><b>' + (i + 1) + '. ' + esc(s.title) + '</b><br>';
      if (s.lines) t += s.lines.map(function (l) { return '<code>' + esc(l) + '</code>'; }).join('<br>') + '<br>';
      if (s.formula) t += 'Fórmula: <code>' + esc(s.formula) + '</code><br>';
      if (s.subst) t += 'Substituição: <code>' + esc(s.subst) + '</code><br>';
      if (s.result) t += 'Resultado: <code><b>' + esc(s.result) + '</b></code>';
      return t + '</div>';
    }).join('');
    h += '<h2>Explicação</h2>' + res.explanation.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    h += '<h2>Hipóteses e limitações</h2><ul>' + res.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    h += '<p class="p-disc">' + esc(R.DISCLAIMER) + '</p>';
    return h;
  }

  function printResult(id) {
    var res = app.last[id];
    if (!res || !res.ok) { toast('Calcule primeiro para imprimir o resultado.'); return; }
    $print.innerHTML = buildPrint(C.BY_ID[id], res);
    window.print();
  }

  /* ------------------------------------------------------------ */
  /* Favoritos                                                     */
  /* ------------------------------------------------------------ */
  function toggleFav(id) {
    var i = app.favorites.indexOf(id);
    if (i >= 0) app.favorites.splice(i, 1); else app.favorites.push(id);
    var saved = store.set(KEYS.fav, app.favorites);
    var on = isFav(id);
    var name = C.BY_ID[id].name;
    Array.prototype.forEach.call(document.querySelectorAll('[data-fav="' + id + '"]'), function (b) {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? 'Remover ' : 'Adicionar ') + name + (on ? ' das favoritas' : ' às favoritas'));
    });
    renderSidebar();
    if (app.route.view === 'home' && app.filter === 'fav') renderCards();
    toast(on ? (saved ? 'Adicionada às favoritas.' : 'Adicionada às favoritas (válido só nesta sessão).') : 'Removida das favoritas.');
  }

  /* ------------------------------------------------------------ */
  /* Eventos                                                       */
  /* ------------------------------------------------------------ */
  function currentCalcId() { return app.route && app.route.view === 'calc' ? app.route.id : null; }

  $main.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'search') {
      app.query = t.value;
      renderCards();
      return;
    }
    var id = currentCalcId();
    if (!id) return;
    var st = getState(id);
    if (t.hasAttribute('data-num')) { st.values[t.getAttribute('data-num')] = t.value; onEdit(id); }
    else if (t.hasAttribute('data-li')) { st.list[+t.getAttribute('data-li')].value = t.value; onEdit(id); }
  });

  $main.addEventListener('change', function (e) {
    var t = e.target;
    var id = currentCalcId();
    if (!id) return;
    var calc = C.BY_ID[id];
    var st = getState(id);
    if (t.hasAttribute('data-unit')) { st.units[t.getAttribute('data-unit')] = t.value; onEdit(id); }
    else if (t.hasAttribute('data-lu')) { st.list[+t.getAttribute('data-lu')].unit = t.value; onEdit(id); }
    else if (t.hasAttribute('data-unitpick')) {
      st.values[t.getAttribute('data-unitpick')] = t.value;
      var echo = $main.querySelector('[data-unit-echo]');
      if (echo) echo.textContent = st.values.from || '';
      onEdit(id);
    } else if (t.hasAttribute('data-choice')) {
      var fid = t.getAttribute('data-choice');
      st.values[fid] = t.value;
      if (calc.fields.some(function (f) { return f.type === 'unitpick' && f.dimFrom === fid; })) {
        calc.fields.forEach(function (f) { if (f.type === 'unitpick') st.values[f.id] = C.unitpickDefault(f, st.values[fid]); });
        renderFields(calc, st);
        var sel = document.getElementById('f-' + fid);
        if (sel) sel.focus();
      } else {
        updateVisibility(calc, st);
        applyLocks(calc, st);
      }
      onEdit(id);
    }
  });

  $main.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = currentCalcId();
    if (!id) return;
    app.auto[id] = true;
    clearTimeout(app.timers.compute);
    var res = compute(id, 'explicit');
    if (res && !res.ok) { focusFirstInvalid(); return; }
    var card = document.getElementById('resultCard');
    if (card && window.innerWidth < 1100) {
      var top = card.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.6 || top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  $main.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;
    if (t.hasAttribute('data-fav')) { toggleFav(t.getAttribute('data-fav')); return; }
    if (t.hasAttribute('data-filter')) {
      app.filter = t.getAttribute('data-filter');
      renderChips();
      renderCards();
      return;
    }
    if (t.hasAttribute('data-reopen')) {
      var rec = app.history.filter(function (r) { return r.id === t.getAttribute('data-reopen'); })[0];
      if (rec) {
        app.states[rec.calcId] = clone(rec.state);
        app.auto[rec.calcId] = true;
        app.pendingCompute = rec.calcId;
        location.hash = '#/calc/' + rec.calcId;
      }
      return;
    }
    if (t.hasAttribute('data-del')) {
      var delId = t.getAttribute('data-del');
      app.history = app.history.filter(function (r) { return r.id !== delId; });
      persistHistory();
      renderHistory();
      toast('Registro excluído.');
      return;
    }
    var act = t.getAttribute('data-act');
    if (!act) return;
    if (act === 'hist-clear') {
      if (t.getAttribute('data-confirm') === '1') {
        app.history = [];
        persistHistory();
        renderHistory();
        toast('Histórico apagado.');
      } else {
        t.setAttribute('data-confirm', '1');
        t.querySelector('span').textContent = 'Toque de novo para confirmar';
        setTimeout(function () {
          if (document.body.contains(t)) { t.removeAttribute('data-confirm'); t.querySelector('span').textContent = 'Limpar histórico'; }
        }, 4000);
      }
      return;
    }
    var id = currentCalcId();
    if (!id) return;
    var calc = C.BY_ID[id];
    var st = getState(id);
    if (act === 'example') loadExample(id);
    else if (act === 'clear') clearCalc(id, true);
    else if (act === 'new') clearCalc(id, true);
    else if (act === 'add') {
      if (st.list.length < calc.maxItems) {
        st.list.push({ value: '', unit: U.OHM });
        renderFields(calc, st);
        var inp = document.getElementById('r-' + (st.list.length - 1));
        if (inp) inp.focus();
        onEdit(id);
      }
    } else if (act === 'swap') {
      var tmp = st.values.from;
      st.values.from = st.values.to;
      st.values.to = tmp;
      renderFields(calc, st);
      onEdit(id);
    } else if (act === 'copy-result' || act === 'copy-full') {
      var res = app.last[id];
      if (!res || !res.ok) return;
      if (act === 'copy-result') copyText(R.resultText(res), 'Resultado copiado.');
      else copyText(R.reportText(res, new Date()), 'Resolução completa copiada.');
    } else if (act === 'print') printResult(id);
  });

  $main.addEventListener('click', function (e) {
    var t = e.target.closest('[data-remove]');
    if (!t) return;
    var id = currentCalcId();
    var calc = C.BY_ID[id];
    var st = getState(id);
    if (st.list.length <= calc.minItems) return;
    st.list.splice(+t.getAttribute('data-remove'), 1);
    renderFields(calc, st);
    onEdit(id);
  });

  $prec.value = String(app.precision);
  $prec.addEventListener('change', function () {
    app.precision = +$prec.value;
    store.set(KEYS.prec, app.precision);
    var id = currentCalcId();
    if (id && app.last[id]) compute(id, 'refresh');
    toast('Resultados com ' + app.precision + ' casas decimais.');
  });

  /* ------------------------------------------------------------ */
  /* Rotas                                                         */
  /* ------------------------------------------------------------ */
  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    if (parts[0] === 'calc' && C.BY_ID[parts[1]]) return { view: 'calc', id: parts[1] };
    if (parts[0] === 'historico') return { view: 'history' };
    if (parts[0] === 'sobre') return { view: 'about' };
    return { view: 'home' };
  }

  var firstRender = true;
  function route() {
    var r = parseRoute();
    app.route = r;
    closeMenu();
    clearTimeout(app.timers.compute);
    if (r.view === 'calc') renderCalc(r.id);
    else if (r.view === 'history') renderHistory();
    else if (r.view === 'about') renderAbout();
    else renderHome();
    renderSidebar();
    var titles = { home: 'MapaElétrica Calc', history: 'Histórico | MapaElétrica Calc', about: 'Como usar | MapaElétrica Calc' };
    document.title = r.view === 'calc' ? C.BY_ID[r.id].name + ' | MapaElétrica Calc' : titles[r.view];
    if (!firstRender) {
      window.scrollTo(0, 0);
      var h1 = $main.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
    }
    firstRender = false;
  }

  window.addEventListener('hashchange', route);
  route();

  /* Exposto para testes automatizados. Não é usado pela interface. */
  window.MEC.app = { state: app, store: store, version: VERSION };
})();
