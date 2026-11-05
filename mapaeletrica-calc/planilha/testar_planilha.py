#!/usr/bin/env python3
"""
Testa a planilha gerada: altera entradas, recalcula com o LibreOffice e confere resultados e mensagens.
Uso: python3 testar_planilha.py MapaEletrica-Calc.xlsx caminho/para/recalc.py
"""
import json, os, shutil, subprocess, sys, tempfile, math
from openpyxl import load_workbook

SRC, RECALC = sys.argv[1], sys.argv[2]
OHM, MU = 'Ω', 'µ'


def find_row(ws, label, col=1, start=4):
    for r in range(start, ws.max_row + 1):
        if ws.cell(r, col).value == label:
            return r
    raise KeyError(label)


def run_case(changes):
    tmp = tempfile.mkdtemp()
    path = os.path.join(tmp, 'caso.xlsx')
    wb = load_workbook(SRC)
    for sheet, label, col, value in changes:
        ws = wb[sheet]
        ws.cell(find_row(ws, label), col).value = value
    wb.save(path)
    out = subprocess.run([sys.executable, RECALC, path, '90'], capture_output=True, text=True)
    info = json.loads(out.stdout)
    vals = load_workbook(path, data_only=True)
    return info, vals


def status(wb, sheet):
    ws = wb[sheet]
    return ws.cell(find_row(ws, 'Situação dos dados'), 2).value


def result(wb, sheet, label, col=5):
    ws = wb[sheet]
    start = find_row(ws, 'Situação dos dados')
    return ws.cell(find_row(ws, label, start=start), col).value


CASES = [
    ('Lei de Ohm: R = 0 é recusado', [('01 Lei de Ohm', 'Resistência', 3, 0)],
     lambda w: status(w, '01 Lei de Ohm') == 'Informe uma resistência maior que zero para realizar este cálculo.' and result(w, '01 Lei de Ohm', 'Corrente calculada', 3) in (None, '')),
    ('Lei de Ohm: texto no lugar de número', [('01 Lei de Ohm', 'Tensão', 3, 'doze')],
     lambda w: 'digite apenas números' in status(w, '01 Lei de Ohm')),
    ('Lei de Ohm: campo vazio', [('01 Lei de Ohm', 'Tensão', 3, None)],
     lambda w: status(w, '01 Lei de Ohm').startswith('Preencha o campo')),
    ('Lei de Ohm: tensão negativa', [('01 Lei de Ohm', 'Tensão', 3, -12)],
     lambda w: 'não pode ser negativo' in status(w, '01 Lei de Ohm')),
    ('Lei de Ohm: modo tensão, I=2 A e R=6 Ω dá 12 V', [('01 Lei de Ohm', 'O que você quer calcular?', 3, 'Tensão (V)'), ('01 Lei de Ohm', 'Tensão', 3, None), ('01 Lei de Ohm', 'Corrente', 3, 2)],
     lambda w: abs(result(w, '01 Lei de Ohm', 'Tensão calculada') - 12) < 1e-12),
    ('Lei de Ohm: modo resistência com I = 0 é recusado', [('01 Lei de Ohm', 'O que você quer calcular?', 3, 'Resistência (R)'), ('01 Lei de Ohm', 'Corrente', 3, 0)],
     lambda w: status(w, '01 Lei de Ohm') == 'Informe uma corrente maior que zero para realizar este cálculo.'),
    ('Lei de Ohm: 1 mV / 1 MΩ = 1 nA, sem virar zero', [('01 Lei de Ohm', 'Tensão', 3, 1), ('01 Lei de Ohm', 'Tensão', 4, 'mV'), ('01 Lei de Ohm', 'Resistência', 3, 1), ('01 Lei de Ohm', 'Resistência', 4, 'M' + OHM)],
     lambda w: abs(result(w, '01 Lei de Ohm', 'Corrente calculada', 3) - 1e-9) < 1e-21),
    ('Potência CC: modo I e R (3 A, 8 Ω) dá 72 W', [('02 Potência CC', 'Quais dados você tem?', 3, 'Corrente e resistência'), ('02 Potência CC', 'Resistência', 3, 8)],
     lambda w: abs(result(w, '02 Potência CC', 'Potência') - 72) < 1e-12),
    ('Energia: 25 h por dia é recusado', [('03 Energia', 'Uso por dia', 3, 25)],
     lambda w: status(w, '03 Energia').startswith('Um dia tem 24 horas')),
    ('Energia: sem tarifa calcula só o consumo', [('03 Energia', 'Tarifa (opcional)', 3, None)],
     lambda w: status(w, '03 Energia') == 'Dados válidos' and abs(result(w, '03 Energia', 'Consumo no período') - 60) < 1e-12),
    ('Resistores: paralelo 10 e 20 Ω = 6,667 Ω', [('04 Resistores', 'Tipo de ligação', 3, 'Paralelo')],
     lambda w: abs(result(w, '04 Resistores', 'Resistência equivalente') - 20 / 3) < 1e-12 and result(w, '04 Resistores', 'Resistência equivalente', 3) == 6.6667),
    ('Resistores: um só resistor é recusado', [('04 Resistores', 'R2', 3, None)],
     lambda w: status(w, '04 Resistores') == 'Cadastre pelo menos 2 resistores.'),
    ('Resistores: resistor negativo é recusado', [('04 Resistores', 'R2', 3, -5)],
     lambda w: 'maior que zero' in status(w, '04 Resistores')),
    ('Resistores: 3 em série com kΩ (10 Ω + 20 Ω + 1 kΩ)', [('04 Resistores', 'R3', 3, 1), ('04 Resistores', 'R3', 4, 'k' + OHM)],
     lambda w: abs(result(w, '04 Resistores', 'Resistência equivalente') - 1030) < 1e-9),
    ('Frequência: 50 Hz dá T = 0,02 s', [('07 Frequência', 'Frequência', 3, 50)],
     lambda w: abs(result(w, '07 Frequência', 'Período') - 0.02) < 1e-15),
    ('Frequência: modo inverso, T = 20 ms dá 50 Hz', [('07 Frequência', 'O que você quer calcular?', 3, 'Calcular frequência'), ('07 Frequência', 'Frequência', 3, None), ('07 Frequência', 'Período', 3, 20), ('07 Frequência', 'Período', 4, 'ms')],
     lambda w: abs(result(w, '07 Frequência', 'Frequência') - 50) < 1e-9),
    ('Frequência zero é recusada', [('07 Frequência', 'Frequência', 3, 0)],
     lambda w: status(w, '07 Frequência') == 'Informe uma frequência maior que zero para realizar este cálculo.'),
    ('Reatância: capacitância negativa é recusada', [('08 Reatância', 'Capacitância', 3, -1)],
     lambda w: 'capacitância maior que zero' in status(w, '08 Reatância')),
    ('Impedância RC: ângulo negativo', [('09 Impedância RLC', 'Tipo de circuito', 3, 'RC')],
     lambda w: result(w, '09 Impedância RLC', 'Ângulo de fase') < 0 and result(w, '09 Impedância RLC', 'Comportamento', 3) == 'Predominantemente capacitivo'),
    ('Impedância RLC com 120 V: I = V/|Z|', [('09 Impedância RLC', 'Tipo de circuito', 3, 'RLC'), ('09 Impedância RLC', 'Tensão RMS (opcional)', 3, 120)],
     lambda w: abs(result(w, '09 Impedância RLC', 'Corrente RMS') - 120 / result(w, '09 Impedância RLC', 'Módulo da impedância')) < 1e-9),
    ('Impedância RLC em ressonância com R = 0: aviso, sem erro', [('09 Impedância RLC', 'Tipo de circuito', 3, 'RLC'), ('09 Impedância RLC', 'Resistência', 3, 0), ('09 Impedância RLC', 'Indutância', 3, 1),
                                                                ('09 Impedância RLC', 'Capacitância', 3, 1), ('09 Impedância RLC', 'Capacitância', 4, 'F'), ('09 Impedância RLC', 'Frequência', 3, 1 / (2 * math.pi)),
                                                                ('09 Impedância RLC', 'Tensão RMS (opcional)', 3, 10)],
     lambda w: result(w, '09 Impedância RLC', 'Módulo da impedância') == 0 and result(w, '09 Impedância RLC', 'Ângulo de fase', 3) == 'indeterminado'),
    ('Monofásica: FP 1,2 é recusado', [('10 Monofásica', 'Fator de potência', 3, 1.2)],
     lambda w: status(w, '10 Monofásica').startswith('O fator de potência precisa')),
    ('Monofásica: resistiva com FP 0,8 é recusada', [('10 Monofásica', 'Natureza da carga', 3, 'Resistiva')],
     lambda w: status(w, '10 Monofásica').startswith('Uma carga resistiva')),
    ('Monofásica: capacitiva dá Q = −360 var', [('10 Monofásica', 'Natureza da carga', 3, 'Capacitiva')],
     lambda w: abs(result(w, '10 Monofásica', 'Potência reativa') + 360) < 1e-9 and result(w, '10 Monofásica', 'Ângulo de fase') < 0),
    ('Trifásica em triângulo: Vfase = VL e Ifase = IL/√3', [('11 Trifásica', 'Tipo de ligação', 3, 'Triângulo (Δ)')],
     lambda w: abs(result(w, '11 Trifásica', 'Tensão de fase') - 380) < 1e-9 and abs(result(w, '11 Trifásica', 'Corrente de fase') - 10 / math.sqrt(3)) < 1e-12),
    ('Conversor: 1 kWh = 3.600.000 J', [('12 Conversor', 'Valor', 3, 1), ('12 Conversor', 'Unidade de origem', 3, 'kWh'), ('12 Conversor', 'Unidade de destino', 3, 'J')],
     lambda w: abs(result(w, '12 Conversor', 'Valor convertido') - 3.6e6) < 1e-6),
    ('Conversor: 100 µF = 0,0001 F', [('12 Conversor', 'Valor', 3, 100), ('12 Conversor', 'Unidade de origem', 3, MU + 'F'), ('12 Conversor', 'Unidade de destino', 3, 'F')],
     lambda w: abs(result(w, '12 Conversor', 'Valor convertido') - 1e-4) < 1e-18),
    ('Conversor: tensão para potência é recusado', [('12 Conversor', 'Unidade de origem', 3, 'V'), ('12 Conversor', 'Unidade de destino', 3, 'W')],
     lambda w: status(w, '12 Conversor').startswith('As unidades são de grandezas diferentes')),
]

fails = 0

# Links da aba Início e "Voltar ao Início": precisam ser internos (location), sem endereço externo.
import re, zipfile
sheet_names = load_workbook(SRC, read_only=True).sheetnames
bad, count = [], 0
with zipfile.ZipFile(SRC) as z:
    for n in z.namelist():
        if re.match(r'xl/worksheets/sheet\d+\.xml$', n):
            for tag in re.findall(r'<hyperlink\b[^>]*>', z.read(n).decode('utf-8')):
                count += 1
                loc = re.search(r'location="([^"]*)"', tag)
                target = loc.group(1).replace('&apos;', "'").rsplit('!', 1)[0].strip("'") if loc else None
                if 'r:id=' in tag or target not in sheet_names:
                    bad.append(tag)
ok = count >= 24 and not bad
fails += not ok
print(('ok    ' if ok else 'FALHA ') + 'Links internos levam para abas existentes ({} links)'.format(count) + ('' if ok else ': ' + str(bad[:3])))
for name, changes, check in CASES:
    info, wb = run_case(changes)
    ok = info.get('status') == 'success' and info.get('total_errors') == 0
    try:
        ok = ok and bool(check(wb))
    except Exception as e:
        ok = False
        name += ' (' + repr(e) + ')'
    fails += not ok
    print(('ok    ' if ok else 'FALHA ') + name)
print('\n{} de {} casos passaram.'.format(len(CASES) + 1 - fails, len(CASES) + 1))
sys.exit(1 if fails else 0)
