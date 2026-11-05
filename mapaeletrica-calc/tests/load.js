/* Carrega os módulos puros do MapaElétrica Calc no Node, na mesma ordem do navegador. */
'use strict';
var path = require('path');
var FILES = ['numbers.js', 'units.js', 'validate.js', 'calculators.js', 'report.js'];
FILES.forEach(function (f) { require(path.join(__dirname, '..', 'src', 'js', f)); });
module.exports = globalThis.MEC;
