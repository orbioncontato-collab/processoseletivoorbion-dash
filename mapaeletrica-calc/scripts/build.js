#!/usr/bin/env node
/*
 * Gera dist/index.html: um único arquivo autossuficiente, com CSS e JavaScript embutidos.
 * Uso: node scripts/build.js
 */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'src');
var OUT_DIR = path.join(ROOT, 'dist');
var OUT = path.join(OUT_DIR, 'index.html');

var html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
var count = { css: 0, js: 0 };

html = html.replace(/<link rel="stylesheet" href="([^"]+)" data-inline>/g, function (_, href) {
  var css = fs.readFileSync(path.join(SRC, href), 'utf8');
  if (/<\/style/i.test(css)) throw new Error('O CSS ' + href + ' contém "</style".');
  count.css++;
  return '<style>\n' + css + '\n</style>';
});

html = html.replace(/<script src="([^"]+)" data-inline><\/script>/g, function (_, src) {
  var js = fs.readFileSync(path.join(SRC, src), 'utf8');
  if (/<\/script/i.test(js)) throw new Error('O script ' + src + ' contém "</script".');
  count.js++;
  return '<script>\n' + js + '\n</script>';
});

if (/(src|href)="(?!data:|#)[^"]*\.(js|css)"/.test(html)) {
  throw new Error('Ainda há referência a arquivo externo no HTML final.');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
var kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log('dist/index.html gerado (' + kb + ' KB, ' + count.css + ' CSS e ' + count.js + ' scripts embutidos).');
