/*
 * MapaElétrica Calc | diagrams.js
 * Desenha os esquemas simplificados (SVG) a partir dos dados do resultado.
 * Retorna texto SVG; não acessa o DOM.
 */
(function (root) {
  'use strict';
  var MEC = root.MEC || (root.MEC = {});

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function r1(n) { return Math.round(n * 10) / 10; }

  function svg(w, h, body, title) {
    return '<svg class="dg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(title) +
      '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><title>' + esc(title) + '</title>' + body + '</svg>';
  }

  function line(x1, y1, x2, y2, cls) {
    return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" class="' + (cls || 'dg-w') + '"/>';
  }

  function path(d, cls) { return '<path d="' + d + '" class="' + (cls || 'dg-w') + '"/>'; }

  function text(x, y, str, cls, anchor) {
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" class="' + (cls || 'dg-t') + '" text-anchor="' + (anchor || 'middle') + '">' + esc(str) + '</text>';
  }

  function dot(x, y) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="3.5" class="dg-dot"/>'; }

  function terminal(x, y) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="5" class="dg-term"/>'; }

  function arrow(x, y, dir, cls) {
    var s = 7;
    var pts;
    if (dir === 'right') pts = [[x + s, y], [x - s, y - s * 0.7], [x - s, y + s * 0.7]];
    else if (dir === 'left') pts = [[x - s, y], [x + s, y - s * 0.7], [x + s, y + s * 0.7]];
    else if (dir === 'down') pts = [[x, y + s], [x - s * 0.7, y - s], [x + s * 0.7, y - s]];
    else pts = [[x, y - s], [x - s * 0.7, y + s], [x + s * 0.7, y + s]];
    return '<polygon points="' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '" class="' + (cls || 'dg-arrow') + '"/>';
  }

  /* Resistor em zigue-zague entre dois pontos (horizontal ou vertical). */
  function zigH(x1, x2, y) {
    var len = x2 - x1;
    var body = Math.min(54, len * 0.7);
    var a = x1 + (len - body) / 2;
    var b = a + body;
    var n = 6;
    var w = body / n;
    var d = 'M' + r1(x1) + ' ' + r1(y) + ' H' + r1(a);
    for (var i = 0; i < n; i++) d += ' L' + r1(a + w * (i + 0.5)) + ' ' + r1(y + (i % 2 === 0 ? -7 : 7));
    d += ' L' + r1(b) + ' ' + r1(y) + ' H' + r1(x2);
    return path(d, 'dg-res');
  }

  function zigV(x, y1, y2) {
    var len = y2 - y1;
    var body = Math.min(54, len * 0.7);
    var a = y1 + (len - body) / 2;
    var b = a + body;
    var n = 6;
    var h = body / n;
    var d = 'M' + r1(x) + ' ' + r1(y1) + ' V' + r1(a);
    for (var i = 0; i < n; i++) d += ' L' + r1(x + (i % 2 === 0 ? 7 : -7)) + ' ' + r1(a + h * (i + 0.5));
    d += ' L' + r1(x) + ' ' + r1(b) + ' V' + r1(y2);
    return path(d, 'dg-res');
  }

  function box(cx, cy, angleDeg, label) {
    return '<g transform="rotate(' + r1(angleDeg) + ' ' + r1(cx) + ' ' + r1(cy) + ')"><rect x="' + r1(cx - 17) + '" y="' + r1(cy - 8) +
      '" width="34" height="16" rx="3" class="dg-box"/></g>' + (label ? text(cx, cy + 4, label, 'dg-boxt') : '');
  }

  /* -------------------------------------------------------------- */

  function ohm(d) {
    var b = '';
    b += line(60, 40, 300, 40) + line(60, 160, 300, 160);
    b += line(60, 40, 60, 90) + line(60, 110, 60, 160);
    b += line(44, 90, 76, 90, 'dg-c') + line(51, 110, 69, 110, 'dg-c');
    b += text(84, 86, '+', 'dg-m', 'start') + text(84, 120, '−', 'dg-m', 'start');
    b += text(96, 104, 'V = ' + d.V, 'dg-v', 'start');
    b += zigV(300, 40, 160);
    b += text(290, 104, 'R = ' + d.R, 'dg-v', 'end');
    b += arrow(180, 40, 'right');
    b += text(180, 28, 'I = ' + d.I, 'dg-v');
    return { svg: svg(360, 190, b, 'Circuito com fonte de tensão e resistor'), legend: [] };
  }

  function series(d) {
    var n = d.names.length;
    var per = Math.min(n, 4);
    var cellW = 110;
    var rowH = 92;
    var x0 = 30;
    var rows = Math.ceil(n / per);
    var W = x0 * 2 + per * cellW;
    var H = 34 + rows * rowH;
    var b = '';
    var endX = x0, endY = 50;
    for (var k = 0; k < n; k++) {
      var r = Math.floor(k / per);
      var c = k % per;
      var col = r % 2 === 0 ? c : per - 1 - c;
      var x1 = x0 + col * cellW;
      var x2 = x1 + cellW;
      var y = 50 + r * rowH;
      b += zigH(x1, x2, y);
      b += text((x1 + x2) / 2, y - 16, d.names[k], 'dg-t');
      b += text((x1 + x2) / 2, y + 28, d.values[k], 'dg-v');
      var lastInRow = c === per - 1 && k < n - 1;
      if (lastInRow) {
        var xc = r % 2 === 0 ? x0 + per * cellW : x0;
        b += line(xc, y, xc, y + rowH);
      }
      endX = r % 2 === 0 ? x2 : x1;
      endY = y;
    }
    b += terminal(x0, 50) + text(x0, 34, 'A', 'dg-m');
    b += terminal(endX, endY) + text(endX, endY - 16, 'B', 'dg-m');
    return { svg: svg(W, H, b, 'Resistores associados em série'), legend: ['Req entre A e B = ' + d.req] };
  }

  function parallel(d) {
    var n = d.names.length;
    var xL = 60, xR = 300;
    var gap = 62;
    var y0 = 46;
    var yN = y0 + (n - 1) * gap;
    var H = yN + 36;
    var b = '';
    b += line(xL, y0, xL, yN) + line(xR, y0, xR, yN);
    for (var i = 0; i < n; i++) {
      var y = y0 + i * gap;
      b += zigH(xL, xR, y);
      b += text((xL + xR) / 2, y - 15, d.names[i] + ' = ' + d.values[i], 'dg-v');
      b += dot(xL, y) + dot(xR, y);
    }
    b += line(20, y0, xL, y0) + line(xR, y0, 340, y0);
    b += terminal(20, y0) + text(20, y0 - 12, 'A', 'dg-m');
    b += terminal(340, y0) + text(340, y0 - 12, 'B', 'dg-m');
    return { svg: svg(360, H, b, 'Resistores associados em paralelo'), legend: ['Req entre A e B = ' + d.req] };
  }

  function vdiv(d) {
    var b = '';
    b += '<circle cx="60" cy="140" r="20" class="dg-c"/>' + text(60, 133, '+', 'dg-m') + text(60, 157, '−', 'dg-m');
    b += path('M60 120 V40 H200') + path('M200 240 H60 V160');
    b += zigV(200, 40, 140) + zigV(200, 140, 240);
    b += line(200, 140, 290, 140) + dot(200, 140) + terminal(290, 140);
    b += text(90, 144, 'Vin = ' + d.Vin, 'dg-v', 'start');
    b += text(216, 84, 'R1 = ' + d.R1, 'dg-t', 'start') + text(216, 102, 'VR1 = ' + d.V1, 'dg-v', 'start');
    b += text(216, 186, 'R2 = ' + d.R2, 'dg-t', 'start') + text(216, 204, 'VR2 = ' + d.V2, 'dg-v', 'start');
    b += text(300, 132, 'Vout', 'dg-m', 'start');
    b += arrow(130, 40, 'right') + text(130, 28, 'I = ' + d.I, 'dg-v');
    return { svg: svg(380, 262, b, 'Divisor de tensão com dois resistores em série'), legend: ['Vout = VR2 = ' + d.V2] };
  }

  function idiv(d) {
    var b = '';
    b += '<circle cx="60" cy="130" r="20" class="dg-c"/>' + line(60, 142, 60, 122, 'dg-c') + arrow(60, 118, 'up', 'dg-arrow2');
    b += path('M60 110 V40 H320') + path('M60 150 V220 H320');
    b += zigV(190, 40, 220) + zigV(320, 40, 220);
    b += dot(190, 40) + dot(190, 220);
    b += text(88, 134, 'It = ' + d.It, 'dg-v', 'start');
    b += arrow(190, 64, 'down') + text(204, 68, 'I1 = ' + d.I1, 'dg-v', 'start');
    b += arrow(320, 64, 'down') + text(334, 68, 'I2 = ' + d.I2, 'dg-v', 'start');
    b += text(204, 136, 'R1 = ' + d.R1, 'dg-t', 'start');
    b += text(334, 136, 'R2 = ' + d.R2, 'dg-t', 'start');
    return { svg: svg(430, 244, b, 'Divisor de corrente com dois ramos em paralelo'), legend: ['I1 + I2 = It'] };
  }

  function sine(d) {
    var b = '';
    var x0 = 40, x1 = 300, yc = 80, amp = 44;
    b += line(24, yc, 360, yc, 'dg-axis') + line(x0, 22, x0, 138, 'dg-axis');
    var pts = [];
    for (var i = 0; i <= 64; i++) {
      var t = i / 64;
      pts.push((i === 0 ? 'M' : 'L') + r1(x0 + t * (x1 - x0)) + ' ' + r1(yc - amp * Math.sin(2 * Math.PI * t)));
    }
    b += path(pts.join(' '), 'dg-wave');
    var ext = [];
    for (var j = 0; j <= 16; j++) {
      var t2 = j / 64;
      ext.push((j === 0 ? 'M' : 'L') + r1(x1 + t2 * (x1 - x0)) + ' ' + r1(yc - amp * Math.sin(2 * Math.PI * t2)));
    }
    b += path(ext.join(' '), 'dg-wave2');
    b += line(x0, 150, x1, 150, 'dg-c') + line(x0, 143, x0, 157, 'dg-c') + line(x1, 143, x1, 157, 'dg-c');
    b += text((x0 + x1) / 2, 144, 'T = ' + d.T, 'dg-v');
    b += text(356, 30, 'f = ' + d.f, 'dg-v', 'end');
    return { svg: svg(380, 168, b, 'Um ciclo de uma onda senoidal e seu período'), legend: [] };
  }

  /* Triângulo retângulo genérico: impedâncias (R, X, |Z|) ou potências (P, Q, S). */
  function triangle(d) {
    var a = Math.abs(d.a), bb = d.b;
    if (!(a > 0) && !(Math.abs(bb) > 0)) return null;
    var maxW = 230, maxH = 130;
    var sa = a > 0 ? maxW / a : Infinity;
    var sb = bb !== 0 ? maxH / Math.abs(bb) : Infinity;
    var sc = Math.min(sa, sb);
    var wa = a * sc, hb = Math.abs(bb) * sc;
    var up = bb >= 0;
    var ox = 60;
    var oy = up ? 160 : 36;
    var ty = up ? oy - hb : oy + hb;
    var body = '';
    body += '<path d="M' + r1(ox) + ' ' + r1(oy) + ' L' + r1(ox + wa) + ' ' + r1(oy) + ' L' + r1(ox + wa) + ' ' + r1(ty) + ' Z" class="dg-fill"/>';
    body += line(ox, oy, ox + wa, oy, 'dg-leg-a');
    if (hb > 0) body += line(ox + wa, oy, ox + wa, ty, 'dg-leg-b');
    body += line(ox, oy, ox + wa, ty, 'dg-leg-c');
    if (wa > 12 && hb > 12) {
      var m = up ? -1 : 1;
      body += path('M' + r1(ox + wa - 10) + ' ' + r1(oy) + ' V' + r1(oy + m * 10) + ' H' + r1(ox + wa), 'dg-thin');
    }
    var ang = Math.atan2(hb, wa);
    if (wa > 30 && hb > 4) {
      var rr = 30;
      var ex = ox + rr * Math.cos(ang);
      var ey = up ? oy - rr * Math.sin(ang) : oy + rr * Math.sin(ang);
      body += path('M' + r1(ox + rr) + ' ' + r1(oy) + ' A' + rr + ' ' + rr + ' 0 0 ' + (up ? 0 : 1) + ' ' + r1(ex) + ' ' + r1(ey), 'dg-thin');
      body += text(ox + rr + 10, up ? oy - 8 : oy + 18, 'φ', 'dg-sym', 'start');
    }
    if (wa > 0) body += text(ox + wa / 2, up ? oy + 22 : oy - 10, d.sym.a, 'dg-sym');
    if (hb > 0) body += text(ox + wa + 10, (oy + ty) / 2 + 5, d.sym.b, 'dg-sym', 'start');
    var mx = ox + wa / 2, my = (oy + ty) / 2;
    body += text(mx - 8, up ? my - 8 : my + 18, d.sym.c, 'dg-sym', 'end');
    return { svg: svg(360, 196, body, d.title || 'Triângulo'), legend: d.legend || [] };
  }

  function threePhaseLabels(d, star) {
    return star
      ? ['Tensão de linha VL = ' + d.VL, 'Corrente de linha IL = ' + d.IL, 'Cada carga recebe Vfase = VL/√3 = ' + d.Vf, 'Ifase = IL = ' + d.If]
      : ['Tensão de linha VL = ' + d.VL, 'Corrente de linha IL = ' + d.IL, 'Cada carga recebe Vfase = VL = ' + d.Vf, 'Ifase = IL/√3 = ' + d.If];
  }

  function wye(d) {
    var cx = 180, cy = 142;
    var ends = [[180, 34, 'L1'], [76, 202, 'L2'], [284, 202, 'L3']];
    var b = '';
    ends.forEach(function (e) {
      b += line(cx, cy, e[0], e[1]);
      var mx = (cx + e[0]) / 2, my = (cy + e[1]) / 2;
      var angle = Math.atan2(e[1] - cy, e[0] - cx) * 180 / Math.PI;
      b += box(mx, my, angle, '');
      b += terminal(e[0], e[1]);
      var lx = e[0] + (e[0] === cx ? 14 : (e[0] < cx ? -10 : 10));
      var ly = e[1] + (e[0] === cx ? 5 : 20);
      b += text(lx, ly, e[2], 'dg-t', e[0] === cx ? 'start' : (e[0] < cx ? 'end' : 'start'));
    });
    b += dot(cx, cy) + text(cx, cy + 24, 'N', 'dg-m');
    b += text(cx + 22, 92, 'Z', 'dg-sym', 'start');
    return { svg: svg(360, 236, b, 'Carga trifásica ligada em estrela'), legend: threePhaseLabels(d, true) };
  }

  function delta(d) {
    var v = [[180, 50, 'L1'], [84, 208, 'L2'], [276, 208, 'L3']];
    var b = '';
    for (var i = 0; i < 3; i++) {
      var p = v[i], q = v[(i + 1) % 3];
      b += line(p[0], p[1], q[0], q[1]);
      var angle = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
      b += box((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, angle, '');
    }
    b += line(180, 50, 180, 20) + terminal(180, 20) + text(194, 24, 'L1', 'dg-t', 'start');
    b += line(84, 208, 54, 226) + terminal(54, 226) + text(44, 230, 'L2', 'dg-t', 'end');
    b += line(276, 208, 306, 226) + terminal(306, 226) + text(316, 230, 'L3', 'dg-t', 'start');
    v.forEach(function (p) { b += dot(p[0], p[1]); });
    b += text(180, 168, 'Z', 'dg-sym');
    return { svg: svg(360, 246, b, 'Carga trifásica ligada em triângulo'), legend: threePhaseLabels(d, false) };
  }

  var RENDERERS = { ohm: ohm, series: series, parallel: parallel, vdiv: vdiv, idiv: idiv, sine: sine, triangle: triangle, wye: wye, delta: delta };

  function render(diagram) {
    if (!diagram || !RENDERERS[diagram.kind]) return null;
    return RENDERERS[diagram.kind](diagram);
  }

  MEC.diagrams = { render: render, esc: esc };
})(typeof globalThis !== 'undefined' ? globalThis : this);
