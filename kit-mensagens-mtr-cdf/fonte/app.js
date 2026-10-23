/* Recursos da versão digital: copiar, busca local, impressão e navegação. */
(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('kit-data').textContent);
  var LISTA = Object.keys(DATA).map(function (k) { var d = DATA[k]; d.id = k; return d; });

  /* ---------------------------------------------------- aviso discreto */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------------------------------------------------- área de transferência */
  function copiaFallback(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, texto.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(
        function () { return true; },
        function () { return copiaFallback(texto); }
      );
    }
    return Promise.resolve(copiaFallback(texto));
  }

  /* Janela para cópia manual, caso o navegador bloqueie as duas formas acima */
  var modal = document.getElementById('modal');
  var modalTxt = document.getElementById('modal-txt');
  var ultimoFoco = null;
  function abreModal(texto) {
    ultimoFoco = document.activeElement;
    modalTxt.value = texto;
    modal.hidden = false;
    modalTxt.focus();
    modalTxt.select();
  }
  function fechaModal() {
    modal.hidden = true;
    if (ultimoFoco) ultimoFoco.focus();
  }
  document.getElementById('modal-close').addEventListener('click', fechaModal);
  document.getElementById('modal-sel').addEventListener('click', function () { modalTxt.focus(); modalTxt.select(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) fechaModal(); });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var d = DATA[btn.getAttribute('data-copy')];
    var tipo = btn.getAttribute('data-kind') === 'assunto' ? 'assunto' : 'texto';
    var texto = d[tipo];
    copiar(texto).then(function (ok) {
      if (!ok) { abreModal(texto); return; }
      var rotulo = btn.querySelector('span');
      var original = rotulo.getAttribute('data-orig') || rotulo.textContent;
      rotulo.setAttribute('data-orig', original);
      rotulo.textContent = tipo === 'texto' ? 'Mensagem copiada' : 'Assunto copiado';
      btn.classList.add('ok');
      toast((tipo === 'texto' ? 'Mensagem ' : 'Assunto da mensagem ') + String(d.n).padStart(2, '0') + ' copiado');
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { rotulo.textContent = original; btn.classList.remove('ok'); }, 2200);
    });
  });

  /* ---------------------------------------------------- impressão */
  var bp = document.getElementById('btn-print');
  if (bp) bp.addEventListener('click', function () { window.print(); });

  /* ---------------------------------------------------- busca local */
  var input = document.getElementById('busca');
  var box = document.getElementById('resultados');
  var SUGESTOES = ['MTR', 'CDF', 'transporte', 'recebimento', 'pendência', 'peso', 'documento', 'destinador'];
  var ativo = -1;

  function norm(t) {
    return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function esc(t) {
    return t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function item(d) {
    return '<a class="res" role="option" href="#' + d.id + '" style="--c:' + d.cor + '">' +
      '<span class="res-n">' + String(d.n).padStart(2, '0') + '</span>' +
      '<span><b>' + esc(d.titulo) + '</b><small>' + esc(d.cat) + ' · pág. ' + String(d.pagina).padStart(2, '0') + '</small></span></a>';
  }
  function buscar(q) {
    var termos = norm(q).split(' ').filter(Boolean);
    if (!termos.length) return null;
    var achados = LISTA.filter(function (d) {
      return termos.every(function (t) { return d.idx.indexOf(t) !== -1; });
    });
    // termo no título vale mais; depois palavras-chave; depois a ordem do kit
    function pontos(d) {
      return termos.reduce(function (s, t) {
        return s + (d.tn.indexOf(t) !== -1 ? 3 : 0) + (d.tidx.indexOf(t) !== -1 ? 1 : 0);
      }, 0);
    }
    achados.sort(function (a, b) { return (pontos(b) - pontos(a)) || (a.n - b.n); });
    return achados;
  }
  function render() {
    var q = input.value;
    var r = buscar(q);
    ativo = -1;
    if (r === null) {
      box.innerHTML = '<div class="res-h">Sugestões de busca</div><div class="sugs">' +
        SUGESTOES.map(function (s) { return '<button type="button" class="sug" data-sug="' + s + '">' + s + '</button>'; }).join('') + '</div>';
    } else if (!r.length) {
      box.innerHTML = '<div class="res-empty">Nenhuma mensagem encontrada para "' + esc(q) + '". Tente outra palavra, como MTR, CDF ou peso.</div>';
    } else {
      box.innerHTML = '<div class="res-h">' + r.length + (r.length === 1 ? ' mensagem encontrada' : ' mensagens encontradas') + '</div>' + r.map(item).join('');
    }
    abre();
  }
  function abre() { box.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function fecha() { box.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  function marca(i) {
    var itens = box.querySelectorAll('.res');
    if (!itens.length) return;
    ativo = (i + itens.length) % itens.length;
    itens.forEach(function (el, k) { el.classList.toggle('act', k === ativo); });
    itens[ativo].scrollIntoView({ block: 'nearest' });
  }
  function irPara(id) {
    var el = document.getElementById(id);
    if (!el) return;
    fecha();
    input.blur();
    history.replaceState(null, '', '#' + id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    destaca(el);
  }
  function destaca(el) {
    if (!el.classList.contains('card')) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); marca(ativo + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marca(ativo - 1); }
    else if (e.key === 'Escape') { fecha(); input.blur(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var itens = box.querySelectorAll('.res');
      var alvo = itens[ativo >= 0 ? ativo : 0];
      if (alvo) irPara(alvo.getAttribute('href').slice(1));
    }
  });
  box.addEventListener('mousedown', function (e) { e.preventDefault(); });
  box.addEventListener('click', function (e) {
    var s = e.target.closest('[data-sug]');
    if (s) { input.value = s.getAttribute('data-sug'); render(); input.focus(); return; }
    var a = e.target.closest('.res');
    if (a) { e.preventDefault(); irPara(a.getAttribute('href').slice(1)); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.tb-search')) fecha();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) fechaModal();
    if (e.key === '/' && document.activeElement !== input && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault(); input.focus();
    }
  });

  /* ---------------------------------------------------- navegação interna */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('res')) return;
    var id = a.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) setTimeout(function () { destaca(el); }, 350);
  });
  if (location.hash) {
    var alvo = document.getElementById(location.hash.slice(1));
    if (alvo) setTimeout(function () { destaca(alvo); }, 300);
  }

  /* Botão "voltar ao sumário" aparece depois do sumário */
  var topo = document.querySelector('.to-top');
  var sumario = document.getElementById('sumario');
  function checaTopo() {
    var lim = sumario ? sumario.offsetTop + sumario.offsetHeight : 1200;
    topo.classList.toggle('show', window.scrollY > lim);
  }
  window.addEventListener('scroll', checaTopo, { passive: true });
  checaTopo();
})();
