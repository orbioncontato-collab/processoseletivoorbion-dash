#!/usr/bin/env python3
"""
Gera MapaEletrica-Calc.xlsx: as 12 calculadoras do MapaElétrica Calc em planilha,
pronta para enviar ao Google Drive e abrir no Planilhas Google (também abre no Excel).

Uso: python3 gerar_planilha.py [saida.xlsx]
Todas as contas são fórmulas: a planilha recalcula sozinha quando um valor muda.
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.workbook.defined_name import DefinedName

OUT = sys.argv[1] if len(sys.argv) > 1 else 'MapaEletrica-Calc.xlsx'

NAVY = '10213A'
BLUE = '2563EB'
GREEN = '15803D'
MUTED = '64748B'
F = 'Arial'

FILL_HEAD = PatternFill('solid', fgColor=NAVY)
FILL_SECTION = PatternFill('solid', fgColor='DCE6FD')
FILL_INPUT = PatternFill('solid', fgColor='FFF4C2')
FILL_RESULT = PatternFill('solid', fgColor='E8F7EE')
FILL_MAIN = PatternFill('solid', fgColor='C9EED6')
FILL_SOFT = PatternFill('solid', fgColor='F3F6FB')
FILL_OK = PatternFill('solid', fgColor='C9EED6')
FILL_ERR = PatternFill('solid', fgColor='FBD5D5')
THIN = Side(style='thin', color='CBD5E1')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical='top')
MID = Alignment(vertical='center')

OHM = 'Ω'
MU = 'µ'
OK_TEXT = 'Dados válidos'


def font(**kw):
    kw.setdefault('name', F)
    kw.setdefault('size', 10)
    return Font(**kw)


def q(s):
    """Texto entre aspas para uso dentro de fórmula."""
    return '"' + s.replace('"', '""') + '"'


def t(ref):
    """Número como texto, arredondado só para exibição (valores pequenos ficam como estão)."""
    return 'IF(ABS({0})<0.001,{0},ROUND({0},CASAS))&""'.format(ref)


def nested_if(checks):
    expr = q(OK_TEXT)
    for cond, msg in reversed(checks):
        expr = 'IF({},{},{})'.format(cond, q(msg), expr)
    return '=' + expr


# --------------------------------------------------------------------------
# Tabela de unidades
# --------------------------------------------------------------------------
UNITS = [
    ('mV', 'Tensão', 1e-3, 'milivolt'), ('V', 'Tensão', 1, 'volt'), ('kV', 'Tensão', 1e3, 'quilovolt'),
    (MU + 'A', 'Corrente', 1e-6, 'microampere'), ('mA', 'Corrente', 1e-3, 'miliampere'), ('A', 'Corrente', 1, 'ampere'),
    (OHM, 'Resistência', 1, 'ohm'), ('k' + OHM, 'Resistência', 1e3, 'quilo-ohm'), ('M' + OHM, 'Resistência', 1e6, 'mega-ohm'),
    ('mW', 'Potência ativa', 1e-3, 'miliwatt'), ('W', 'Potência ativa', 1, 'watt'), ('kW', 'Potência ativa', 1e3, 'quilowatt'),
    ('VA', 'Potência aparente', 1, 'volt-ampere'), ('kVA', 'Potência aparente', 1e3, 'quilovolt-ampere'),
    ('var', 'Potência reativa', 1, 'volt-ampere reativo'), ('kvar', 'Potência reativa', 1e3, 'quilovolt-ampere reativo'),
    ('pF', 'Capacitância', 1e-12, 'picofarad'), ('nF', 'Capacitância', 1e-9, 'nanofarad'), (MU + 'F', 'Capacitância', 1e-6, 'microfarad'),
    ('F', 'Capacitância', 1, 'farad'),
    (MU + 'H', 'Indutância', 1e-6, 'micro-henry'), ('mH', 'Indutância', 1e-3, 'mili-henry'), ('H', 'Indutância', 1, 'henry'),
    ('Hz', 'Frequência', 1, 'hertz'), ('kHz', 'Frequência', 1e3, 'quilo-hertz'), ('MHz', 'Frequência', 1e6, 'mega-hertz'),
    ('J', 'Energia', 1, 'joule'), ('Wh', 'Energia', 3600, 'watt-hora'), ('kWh', 'Energia', 3.6e6, 'quilowatt-hora'),
    (MU + 's', 'Tempo', 1e-6, 'microssegundo'), ('ms', 'Tempo', 1e-3, 'milissegundo'), ('s', 'Tempo', 1, 'segundo'),
    ('min', 'Tempo', 60, 'minuto'), ('h', 'Tempo', 3600, 'hora'),
]
UNIT_LAST_ROW = 1 + len(UNITS)

U_V = ['V', 'mV', 'kV']
U_A = ['A', 'mA', MU + 'A']
U_R = [OHM, 'k' + OHM, 'M' + OHM]
U_F = ['Hz', 'kHz', 'MHz']
U_L = ['H', 'mH', MU + 'H']
U_C = [MU + 'F', 'nF', 'pF', 'F']
U_T = ['s', 'ms', MU + 's']
U_P = ['W', 'kW']


# --------------------------------------------------------------------------
# Construtor de abas
# --------------------------------------------------------------------------
class Tab:
    def __init__(self, wb, name, num, title, category, objective, guidance):
        self.ws = wb.create_sheet(name)
        self.name = name
        self.ok = None
        self.r = 1
        self.refs = {}
        ws = self.ws
        ws.sheet_view.showGridLines = False
        for col, w in zip('ABCDEFG', [38, 14, 27, 11, 22, 58, 18]):
            ws.column_dimensions[col].width = w
        ws.merge_cells('A1:G1')
        c = ws['A1']
        c.value = 'MapaElétrica Calc  |  Calculadora {:02d}: {}'.format(num, title)
        c.font = font(size=15, bold=True, color='FFFFFF')
        c.fill = FILL_HEAD
        c.alignment = Alignment(vertical='center', indent=1)
        ws.row_dimensions[1].height = 30
        ws.merge_cells('A2:G2')
        ws['A2'].value = category + '. ' + objective
        ws['A2'].font = font(size=10.5, bold=True, color=NAVY)
        ws['A2'].alignment = Alignment(vertical='center', indent=1, wrap_text=True)
        ws.row_dimensions[2].height = 30
        ws.merge_cells('A3:G3')
        ws['A3'].value = guidance + ' Células amarelas: digite ou escolha. Células verdes: resultado.'
        ws['A3'].font = font(color=MUTED, italic=True)
        ws['A3'].alignment = Alignment(vertical='center', indent=1, wrap_text=True)
        ws.row_dimensions[3].height = 30
        self.r = 5

    # -- seções ------------------------------------------------------------
    def section(self, text, heads=None):
        ws = self.ws
        ws.merge_cells('A{0}:G{0}'.format(self.r))
        c = ws.cell(self.r, 1, text)
        c.font = font(size=11, bold=True, color=NAVY)
        c.fill = FILL_SECTION
        c.alignment = Alignment(vertical='center', indent=1)
        ws.row_dimensions[self.r].height = 22
        self.r += 1
        if heads:
            for i, h in enumerate(heads):
                cell = ws.cell(self.r, i + 1, h)
                cell.font = font(bold=True, color=MUTED, size=9)
            self.r += 1

    def input_heads(self):
        self.section('DADOS DE ENTRADA', ['Grandeza', 'Símbolo', 'Valor', 'Unidade', 'Valor no SI', 'Observação', 'Exemplo'])

    def _label(self, label, sym):
        ws = self.ws
        ws.cell(self.r, 1, label).font = font(bold=True, color=NAVY)
        ws.cell(self.r, 2, sym).font = font(color=BLUE, bold=True)
        ws.cell(self.r, 1).alignment = MID

    def _dropdown(self, cell, options=None, ref=None):
        if ref:
            dv = DataValidation(type='list', formula1=ref, allow_blank=True)
        else:
            dv = DataValidation(type='list', formula1='"' + ','.join(options) + '"', allow_blank=True)
        dv.error = 'Escolha uma opção da lista.'
        dv.errorTitle = 'Opção inválida'
        self.ws.add_data_validation(dv)
        dv.add(cell)

    def _input_style(self, cell):
        cell.fill = FILL_INPUT
        cell.font = font(size=11, bold=True, color='1D3B8F')
        cell.border = BOX

    def choice(self, key, label, options, value, note=''):
        ws = self.ws
        self._label(label, '')
        c = ws.cell(self.r, 3, value)
        self._input_style(c)
        ws.merge_cells(start_row=self.r, start_column=3, end_row=self.r, end_column=5)
        self._dropdown('C{}'.format(self.r), options)
        ws.cell(self.r, 6, note).font = font(color=MUTED)
        ws.cell(self.r, 7, value).font = font(color=MUTED)
        self.refs[key] = '$C${}'.format(self.r)
        self.r += 1

    def inp(self, key, label, sym, value, units=None, fixed=None, note=None, example=''):
        ws = self.ws
        r = self.r
        self._label(label, sym)
        c = ws.cell(r, 3, value)
        self._input_style(c)
        if units:
            u = ws.cell(r, 4, units[0] if not isinstance(value, tuple) else value[1])
            self._input_style(u)
            self._dropdown('D{}'.format(r), units)
            ws.cell(r, 5, '=IF(ISNUMBER(C{0}),C{0}*VLOOKUP(D{0},UNID,3,FALSE),"")'.format(r))
        else:
            ws.cell(r, 4, fixed or '').font = font(color=MUTED, bold=True)
            ws.cell(r, 5, '=IF(ISNUMBER(C{0}),C{0},"")'.format(r))
        ws.cell(r, 5).font = font(color=MUTED)
        ws.cell(r, 5).number_format = 'General'
        if note:
            ws.cell(r, 6, note).font = font(color=MUTED, italic=True)
        ws.cell(r, 7, example).font = font(color=MUTED)
        self.refs[key] = {'v': '$C${}'.format(r), 'u': '$D${}'.format(r), 'si': '$E${}'.format(r)}
        self.r += 1

    def set_unit(self, key, unit):
        cell = self.refs[key]['u'].replace('$', '')
        self.ws[cell].value = unit

    def status(self, checks):
        ws = self.ws
        r = self.r
        ws.cell(r, 1, 'Situação dos dados').font = font(bold=True, color=NAVY)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
        c = ws.cell(r, 2, nested_if(checks))
        c.font = font(bold=True, size=10.5)
        c.alignment = Alignment(vertical='center', wrap_text=True, indent=1)
        ws.row_dimensions[r].height = 28
        addr = '$B${}'.format(r)
        ws.conditional_formatting.add('B{}'.format(r), FormulaRule(formula=['{}="{}"'.format(addr, OK_TEXT)], fill=FILL_OK, font=Font(name=F, color=GREEN, bold=True)))
        ws.conditional_formatting.add('B{}'.format(r), FormulaRule(formula=['{}<>"{}"'.format(addr, OK_TEXT)], fill=FILL_ERR, font=Font(name=F, color='B91C1C', bold=True)))
        self.ok = '{}="{}"'.format(addr, OK_TEXT)
        self.r += 2

    def result_heads(self):
        self.section('RESULTADOS', ['Resultado', 'Símbolo', 'Valor', 'Unidade', 'Valor interno (sem arredondar)', 'Observação', ''])

    def res(self, key, label, sym, expr, unit, main=False, note=None, money=False, text=False):
        """expr: expressão sem '=' que calcula o valor no SI. Só aparece se os dados forem válidos."""
        ws = self.ws
        r = self.r
        lc = ws.cell(r, 1, label)
        lc.font = font(bold=True, color=NAVY)
        ws.cell(r, 2, sym).font = font(color=BLUE, bold=True)
        if text:
            ws.cell(r, 3, '=IF({},{},"")'.format(self.ok, expr))
        else:
            ws.cell(r, 5, '=IF({},{},"")'.format(self.ok, expr))
            ws.cell(r, 5).font = font(color=MUTED)
            ws.cell(r, 5).number_format = 'General'
            if money:
                ws.cell(r, 3, '=IF(ISNUMBER(E{0}),E{0},"")'.format(r))
                ws.cell(r, 3).number_format = '"R$" #,##0.00'
            else:
                ws.cell(r, 3, '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),"")'.format(r))
                ws.cell(r, 3).number_format = 'General'
        vc = ws.cell(r, 3)
        vc.font = font(size=12 if main else 11, bold=True, color=NAVY)
        vc.fill = FILL_MAIN if main else FILL_RESULT
        vc.border = BOX
        vc.alignment = Alignment(horizontal='left' if text else 'right', vertical='center', indent=1)
        uc = ws.cell(r, 4, unit)
        uc.font = font(bold=True, color=NAVY)
        if main:
            ws.row_dimensions[r].height = 22
        if note:
            ws.cell(r, 6, note).font = font(color=MUTED, italic=True)
            ws.cell(r, 6).alignment = Alignment(wrap_text=True, vertical='center')
        self.refs[key] = '$E${}'.format(r) if not text else '$C${}'.format(r)
        self.r += 1
        return self.refs[key]

    def memo_heads(self):
        self.r += 1
        self.section('MEMÓRIA DE CÁLCULO (fórmula, substituição dos valores no SI e resultado)')

    def step(self, title, formula, subst, result):
        ws = self.ws
        ws.cell(self.r, 1, title).font = font(bold=True, color=NAVY)
        rows = [('Fórmula', formula, NAVY, False), ('Substituição', subst, '334155', False), ('Resultado', result, GREEN, True)]
        for lab, val, color, bold in rows:
            ws.cell(self.r, 2, lab).font = font(color=MUTED, size=9, bold=True)
            if val.startswith('='):
                ws.cell(self.r, 3, val)
            else:
                ws.cell(self.r, 3, val)
            ws.cell(self.r, 3).font = Font(name='Consolas', size=10.5, color=color, bold=bold)
            self.r += 1
        self.r += 0

    def ok_text(self, expr):
        return '=IF({},{},"")'.format(self.ok, expr)

    def notes(self, title, items):
        self.r += 1
        self.section(title)
        for it in items:
            self.ws.merge_cells(start_row=self.r, start_column=1, end_row=self.r, end_column=7)
            c = self.ws.cell(self.r, 1, '• ' + it)
            c.font = font(color='334155')
            c.alignment = Alignment(wrap_text=True, vertical='top', indent=1)
            self.ws.row_dimensions[self.r].height = 28 if len(it) > 110 else 16
            self.r += 1

    def explain(self, items):
        self.notes('EXPLICAÇÃO', items)

    def finish(self, assumptions):
        self.notes('HIPÓTESES E LIMITAÇÕES', assumptions)
        self.r += 1
        self.ws.merge_cells(start_row=self.r, start_column=1, end_row=self.r, end_column=7)
        c = self.ws.cell(self.r, 1, 'Ferramenta educacional. Os resultados não substituem normas técnicas, projetos, medições nem profissionais habilitados.')
        c.font = font(color=MUTED, italic=True, size=9)
        self.ws.cell(self.r + 1, 1, '← Voltar ao Início').hyperlink = "#'Início'!A1"
        self.ws.cell(self.r + 1, 1).font = font(color=BLUE, underline='single')
        self.ws.freeze_panes = 'A4'
        self.ws.print_options.horizontalCentered = True
        self.ws.page_setup.orientation = 'portrait'
        self.ws.page_setup.fitToWidth = 1
        self.ws.page_setup.fitToHeight = 0
        self.ws.sheet_properties.pageSetUpPr.fitToPage = True


# --------------------------------------------------------------------------
# Verificações reutilizáveis (todas "preguiçosas": não geram erro em campo vazio)
# --------------------------------------------------------------------------
def field_checks(ref, label, kind='any', need='TRUE', noun=None):
    v, si = ref['v'], ref['si']
    L = '“' + label + '”'
    noun = noun or ('um valor para ' + L)
    out = [
        ('IF({},ISBLANK({}),FALSE)'.format(need, v), 'Preencha o campo ' + L + '.'),
        ('IF({},NOT(ISNUMBER({})),FALSE)'.format(need, v), L + ': digite apenas números, como 12 ou 0,5. Se a vírgula não funcionar, ajuste a localidade da planilha para Brasil (Arquivo > Configurações).'),
    ]

    def lazy(c):
        return 'IF({},IF(ISNUMBER({}),{},FALSE),FALSE)'.format(need, si, c)

    if kind == 'pos':
        out.append((lazy('{}<=0'.format(si)), 'Informe {} maior que zero para realizar este cálculo.'.format(noun)))
    elif kind == 'nonneg':
        out.append((lazy('{}<0'.format(si)), L + ' não pode ser negativo neste cálculo. Use o valor em módulo, sem o sinal de menos.'))
    elif kind == 'fp':
        out.append((lazy('OR({0}<0,{0}>1)'.format(si)), 'O fator de potência precisa ficar entre 0 e 1 (por exemplo, 0,8).'))
    elif kind == 'hours':
        out.append((lazy('OR({0}<0,{0}>24)'.format(si)), 'Um dia tem 24 horas. Informe um uso diário entre 0 e 24 horas.'))
    out.append((lazy('OR(ABS({0})>1E+18,AND({0}<>0,ABS({0})<1E-18))'.format(si)), L + ' está fora da faixa que a planilha trata com segurança. Confira o valor e a unidade.'))
    return out


# --------------------------------------------------------------------------
# Abas
# --------------------------------------------------------------------------
def tab_ohm(wb):
    T = Tab(wb, '01 Lei de Ohm', 1, 'Lei de Ohm', 'Fundamentos elétricos',
            'Encontrar tensão, corrente ou resistência usando as duas grandezas conhecidas.',
            'Escolha o que deseja calcular e preencha as outras duas grandezas, em módulo.')
    T.input_heads()
    T.choice('m', 'O que você quer calcular?', ['Corrente (I)', 'Tensão (V)', 'Resistência (R)'], 'Corrente (I)')
    m = T.refs['m']
    T.inp('V', 'Tensão', 'V', 12, U_V, example='12 V')
    T.inp('I', 'Corrente', 'I', None, U_A, example='(calculado)')
    T.inp('R', 'Resistência', 'R', 6, U_R, example='6 ' + OHM)
    for key, mode in (('V', 'Tensão (V)'), ('I', 'Corrente (I)'), ('R', 'Resistência (R)')):
        row = T.refs[key]['v'].split('$')[-1]
        T.ws['F' + row] = '=IF({}="{}","Este é o valor calculado: deixe em branco.","")'.format(m, mode)
        T.ws['F' + row].font = font(color=MUTED, italic=True)
    V, I, R = T.refs['V'], T.refs['I'], T.refs['R']
    checks = []
    checks += field_checks(V, 'Tensão', 'nonneg', '{}<>"Tensão (V)"'.format(m))
    checks += field_checks(I, 'Corrente', 'nonneg', '{}="Tensão (V)"'.format(m))
    checks += field_checks(I, 'Corrente', 'pos', '{}="Resistência (R)"'.format(m), 'uma corrente')
    checks += field_checks(R, 'Resistência', 'pos', '{}<>"Resistência (R)"'.format(m), 'uma resistência')
    T.r += 1
    T.status(checks)
    T.result_heads()
    vs, is_, rs = V['si'], I['si'], R['si']
    lab = '=IF({0}="Tensão (V)","Tensão calculada",IF({0}="Corrente (I)","Corrente calculada","Resistência calculada"))'.format(m)
    sym = '=IF({0}="Tensão (V)","V",IF({0}="Corrente (I)","I","R"))'.format(m)
    unit = '=IF({0}="Tensão (V)","V",IF({0}="Corrente (I)","A","{1}"))'.format(m, OHM)
    main = T.res('main', lab, sym, 'IF({0}="Tensão (V)",{1}*{3},IF({0}="Corrente (I)",{2}/{3},{2}/{1}))'.format(m, is_, vs, rs), unit, main=True)
    Vr = 'IF({0}="Tensão (V)",{1},{2})'.format(m, main, vs)
    Ir = 'IF({0}="Corrente (I)",{1},{2})'.format(m, main, is_)
    P = T.res('P', 'Potência dissipada', 'P', '{}*{}'.format(Vr, Ir), 'W', note='P = V × I')
    rrow = main.split('$')[-1]
    T.ws['F' + rrow] = '=IF(AND({0},{1}="Resistência (R)"),IF({2}=0,"Resistência zero indica curto-circuito ideal.",""),"")'.format(T.ok, m, main)
    T.ws['F' + rrow].font = font(color='B45309', italic=True)
    T.memo_heads()
    T.step('Lei de Ohm',
           '=IF({0}="Tensão (V)","V = I × R",IF({0}="Corrente (I)","I = V / R","R = V / I"))'.format(m),
           T.ok_text('IF({0}="Tensão (V)","V = "&{1}&" A × "&{2}&" {4}",IF({0}="Corrente (I)","I = "&{3}&" V / "&{2}&" {4}","R = "&{3}&" V / "&{1}&" A"))'.format(m, t(is_), t(rs), t(vs), OHM)),
           T.ok_text('IF({0}="Tensão (V)","V = "&{1}&" V",IF({0}="Corrente (I)","I = "&{1}&" A","R = "&{1}&" {2}"))'.format(m, t(main), OHM)))
    T.step('Potência associada', 'P = V × I', T.ok_text('"P = "&{}&" V × "&{}&" A"'.format(t(Vr), t(Ir))), T.ok_text('"P = "&{}&" W"'.format(t(P))))
    T.explain(['Para a mesma tensão, quanto maior a resistência, menor a corrente. Se a corrente dobrar, a queda de tensão no resistor também dobra.',
               'A potência P = V × I mostra quanta energia o resistor transforma em calor a cada segundo.'])
    T.finish(['Resistor ideal e linear: a resistência não muda com a temperatura nem com a corrente.',
              'Valores em módulo, em corrente contínua ou em valores eficazes (RMS) num circuito puramente resistivo.'])


def tab_powerdc(wb):
    T = Tab(wb, '02 Potência CC', 2, 'Potência CC', 'Fundamentos elétricos',
            'Calcular a potência elétrica de um circuito resistivo em corrente contínua.',
            'Escolha quais grandezas você conhece e preencha só esses dois campos.')
    T.input_heads()
    T.choice('m', 'Quais dados você tem?', ['Tensão e corrente', 'Corrente e resistência', 'Tensão e resistência'], 'Tensão e corrente')
    m = T.refs['m']
    T.inp('V', 'Tensão', 'V', 24, U_V, example='24 V')
    T.inp('I', 'Corrente', 'I', 3, U_A, example='3 A')
    T.inp('R', 'Resistência', 'R', None, U_R, example='(não usado)')
    V, I, R = T.refs['V'], T.refs['I'], T.refs['R']
    uses = {'V': '{}<>"Corrente e resistência"'.format(m), 'I': '{}<>"Tensão e resistência"'.format(m), 'R': '{}<>"Tensão e corrente"'.format(m)}
    for key in 'VIR':
        row = T.refs[key]['v'].split('$')[-1]
        T.ws['F' + row] = '=IF({},"","Não usado neste modo.")'.format(uses[key])
        T.ws['F' + row].font = font(color=MUTED, italic=True)
    checks = field_checks(V, 'Tensão', 'nonneg', uses['V']) + field_checks(I, 'Corrente', 'nonneg', uses['I']) + \
        field_checks(R, 'Resistência', 'pos', uses['R'], 'uma resistência')
    T.r += 1
    T.status(checks)
    T.result_heads()
    vs, is_, rs = V['si'], I['si'], R['si']
    pexpr = 'IF({0}="Tensão e corrente",{1}*{2},IF({0}="Corrente e resistência",{2}^2*{3},{1}^2/{3}))'.format(m, vs, is_, rs)
    P = T.res('P', 'Potência', 'P', pexpr, 'W', main=True)
    T.res('Pk', 'Potência em kW', 'P', '{}/1000'.format(P), 'kW')
    inter_lab = '=IF({0}="Tensão e corrente","Resistência (valor intermediário)",IF({0}="Corrente e resistência","Tensão (valor intermediário)","Corrente (valor intermediário)"))'.format(m)
    inter_unit = '=IF({0}="Tensão e corrente","{1}",IF({0}="Corrente e resistência","V","A"))'.format(m, OHM)
    inter = T.res('X', inter_lab, '', 'IF({0}="Tensão e corrente",IF({2}>0,{1}/{2},"sem valor (corrente zero)"),IF({0}="Corrente e resistência",{2}*{3},{1}/{3}))'.format(m, vs, is_, rs), inter_unit)
    T.memo_heads()
    T.step('Potência',
           '=IF({0}="Tensão e corrente","P = V × I",IF({0}="Corrente e resistência","P = I² × R","P = V² / R"))'.format(m),
           T.ok_text('IF({0}="Tensão e corrente","P = "&{1}&" V × "&{2}&" A",IF({0}="Corrente e resistência","P = ("&{2}&" A)² × "&{3}&" {4}","P = ("&{1}&" V)² / "&{3}&" {4}"))'.format(m, t(vs), t(is_), t(rs), OHM)),
           T.ok_text('"P = "&{}&" W"'.format(t(P))))
    T.step('Valor intermediário',
           '=IF({0}="Tensão e corrente","R = V / I",IF({0}="Corrente e resistência","V = I × R","I = V / R"))'.format(m),
           T.ok_text('IF({0}="Tensão e corrente","R = "&{1}&" V / "&{2}&" A",IF({0}="Corrente e resistência","V = "&{2}&" A × "&{3}&" {4}","I = "&{1}&" V / "&{3}&" {4}"))'.format(m, t(vs), t(is_), t(rs), OHM)),
           T.ok_text('IF(ISNUMBER({0}),{1}&" "&{2},"sem valor: com corrente zero o circuito está aberto")'.format(inter, t(inter), '$D$' + inter.split('$')[-1])))
    T.explain(['A potência mostra a rapidez com que a energia elétrica é transformada: 1 W = 1 joule por segundo.',
               'As três fórmulas chegam ao mesmo valor porque todas saem de P = V × I combinada com a Lei de Ohm (V = I × R).'])
    T.finish(['Circuito em corrente contínua (ou resistivo puro com valores RMS).', 'Resistência ideal e constante.'])


def tab_energy(wb):
    T = Tab(wb, '03 Energia', 3, 'Energia e Consumo', 'Fundamentos elétricos',
            'Calcular a energia consumida por um equipamento e estimar o custo.',
            'Informe a potência, as horas de uso por dia e o número de dias. A tarifa é opcional.')
    T.input_heads()
    T.inp('P', 'Potência do aparelho', 'P', 500, U_P, example='500 W')
    T.inp('h', 'Uso por dia', 't', 4, fixed='h/dia', example='4 h/dia')
    T.inp('d', 'Número de dias', 'd', 30, fixed='dias', example='30 dias')
    T.inp('tar', 'Tarifa (opcional)', 'tarifa', 0.8, fixed='R$/kWh', note='Deixe em branco se quiser só o consumo.', example='R$ 0,80/kWh')
    P, h, d, tar = T.refs['P'], T.refs['h'], T.refs['d'], T.refs['tar']
    checks = field_checks(P, 'Potência do aparelho', 'nonneg') + field_checks(h, 'Uso por dia', 'hours') + field_checks(d, 'Número de dias', 'nonneg')
    checks += field_checks(tar, 'Tarifa', 'nonneg', 'NOT(ISBLANK({}))'.format(tar['v']))
    T.r += 1
    T.status(checks)
    T.result_heads()
    ed = T.res('ed', 'Consumo diário', 'E_dia', '{}*{}/1000'.format(P['si'], h['si']), 'kWh')
    et = T.res('et', 'Consumo no período', 'E_total', '{}*{}'.format(ed, d['si']), 'kWh', main=True)
    cost = T.res('c', 'Custo estimado', 'R$', 'IF(ISBLANK({}),"informe a tarifa",{}*{})'.format(tar['v'], et, tar['si']), '', main=True, money=True,
                 note='Sem impostos, bandeiras e outras parcelas da conta.')
    crow = cost.split('$')[-1]
    T.ws['C' + crow] = '=IF(ISNUMBER(E{0}),E{0},IF({1},"informe a tarifa",""))'.format(crow, T.ok)
    T.res('ht', 'Horas de uso no período', 't', '{}*{}'.format(h['si'], d['si']), 'h')
    T.res('pk', 'Potência em kW', 'P', '{}/1000'.format(P['si']), 'kW')
    T.memo_heads()
    T.step('Consumo diário', 'E_dia = P × t / 1000', T.ok_text('"E_dia = "&{}&" W × "&{}&" h / 1000"'.format(t(P['si']), t(h['si']))), T.ok_text('"E_dia = "&{}&" kWh"'.format(t(ed))))
    T.step('Consumo no período', 'E_total = E_dia × dias', T.ok_text('"E_total = "&{}&" kWh × "&{}'.format(t(ed), t(d['si']))), T.ok_text('"E_total = "&{}&" kWh"'.format(t(et))))
    T.step('Custo estimado', 'Custo = E_total × tarifa',
           T.ok_text('IF(ISNUMBER({0}),"Custo = "&{1}&" kWh × R$ "&{2}&"/kWh","(tarifa não informada)")'.format(cost, t(et), t(tar['si']))),
           T.ok_text('IF(ISNUMBER({0}),"Custo = R$ "&FIXED({0},2),"(tarifa não informada)")'.format(cost)))
    T.explain(['A divisão por 1000 transforma Wh em kWh, a unidade usada na conta de luz.',
               'O custo é uma estimativa: multiplica o consumo pela tarifa de energia, sem as outras parcelas da fatura.'])
    T.finish(['Estimativa simplificada: não inclui impostos, bandeiras tarifárias, iluminação pública, custo de disponibilidade nem outras parcelas da conta de luz.',
              'Considera o aparelho na potência informada durante todo o uso. Aparelhos com termostato ou ciclos (geladeira, ar-condicionado) costumam consumir menos.'])


def tab_resistors(wb):
    T = Tab(wb, '04 Resistores', 4, 'Associação de Resistores', 'Circuitos resistivos',
            'Calcular a resistência equivalente de resistores em série ou em paralelo.',
            'Escolha o tipo de ligação e preencha de 2 a 10 resistores. Linhas em branco são ignoradas.')
    ws = T.ws
    T.input_heads()
    T.choice('tipo', 'Tipo de ligação', ['Série', 'Paralelo'], 'Série')
    tipo = T.refs['tipo']
    ws.cell(T.r, 1, 'Resistor').font = font(bold=True, color=MUTED, size=9)
    ws.cell(T.r, 3, 'Valor').font = font(bold=True, color=MUTED, size=9)
    ws.cell(T.r, 4, 'Unidade').font = font(bold=True, color=MUTED, size=9)
    ws.cell(T.r, 5, 'Valor em ' + OHM).font = font(bold=True, color=MUTED, size=9)
    ws.cell(T.r, 6, '1/R (S)  |  texto auxiliar da memória').font = font(bold=True, color=MUTED, size=9)
    T.r += 1
    first = T.r
    vals = [10, 20] + [None] * 8
    for i in range(10):
        r = T.r
        ws.cell(r, 1, 'R{}'.format(i + 1)).font = font(bold=True, color=NAVY)
        c = ws.cell(r, 3, vals[i])
        T._input_style(c)
        u = ws.cell(r, 4, OHM)
        T._input_style(u)
        T._dropdown('D{}'.format(r), U_R)
        ws.cell(r, 5, '=IF(ISNUMBER(C{0}),C{0}*VLOOKUP(D{0},UNID,3,FALSE),"")'.format(r)).font = font(color=MUTED)
        ws.cell(r, 6, '=IF(ISNUMBER(E{0}),IF(E{0}>0,1/E{0},""),"")'.format(r)).font = font(color=MUTED)
        ws.cell(r, 7, '=IF(ISNUMBER(E{0}),{1},"")'.format(r, t('E{}'.format(r)))).font = font(color='FFFFFF', size=8)
        if i < 2:
            ws.cell(r, 2, 'exemplo').font = font(color=MUTED, size=9)
        T.r += 1
    last = T.r - 1
    C = '$C${}:$C${}'.format(first, last)
    E = '$E${}:$E${}'.format(first, last)
    Fc = '$F${}:$F${}'.format(first, last)
    G = '$G${}:$G${}'.format(first, last)
    checks = [
        ('SUMPRODUCT(--ISTEXT({}))>0'.format(C), 'Há um valor de resistor que não é número. Digite apenas números, como 10 ou 4,7.'),
        ('COUNT({})<2'.format(E), 'Cadastre pelo menos 2 resistores.'),
        ('COUNTIF({},"<=0")>0'.format(E), 'Informe uma resistência maior que zero para todos os resistores preenchidos.'),
        ('MAX({})>1E+18'.format(E), 'Um dos resistores está fora da faixa segura. Confira o valor e a unidade.'),
    ]
    T.r += 1
    T.status(checks)
    T.result_heads()
    req = T.res('req', 'Resistência equivalente', 'Req', 'IF({}="Série",SUM({}),1/SUM({}))'.format(tipo, E, Fc), OHM, main=True)
    T.res('n', 'Resistores utilizados', 'n', 'COUNT({})'.format(E), '')
    g = T.res('g', 'Condutância equivalente', 'Geq', 'SUM({})'.format(Fc), 'S', note='Soma dos inversos (usada no paralelo).')
    T.res('max', 'Maior resistor', 'Rmáx', 'MAX({})'.format(E), OHM)
    T.res('min', 'Menor resistor', 'Rmín', 'MIN({})'.format(E), OHM)
    T.memo_heads()
    T.step('Resistência equivalente',
           '=IF({}="Série","Req = R1 + R2 + ... + Rn","1/Req = 1/R1 + 1/R2 + ... + 1/Rn")'.format(tipo),
           T.ok_text('IF({0}="Série","Req = "&_xlfn.TEXTJOIN(" + ",TRUE,{1}),"1/Req = 1/"&_xlfn.TEXTJOIN(" + 1/",TRUE,{1})&" = "&{2}&" S")'.format(tipo, G, t(g))),
           T.ok_text('"Req = "&{}&" {}"'.format(t(req), OHM)))
    T.explain(['Em série, a mesma corrente passa por todos os resistores e as resistências se somam. Req fica maior que o maior resistor.',
               'Em paralelo, todos ficam sob a mesma tensão e cada ramo abre um novo caminho para a corrente. Req fica menor que o menor resistor.'])
    T.finish(['Resistores ideais, lineares e com resistência maior que zero.', 'Fios de ligação com resistência desprezível.'])


def tab_vdiv(wb):
    T = Tab(wb, '05 Divisor de Tensão', 5, 'Divisor de Tensão', 'Circuitos resistivos',
            'Calcular quanto da tensão de entrada fica sobre cada um de dois resistores em série.',
            'Informe a tensão de entrada e os dois resistores. R2 é o resistor de baixo, onde fica a saída.')
    T.input_heads()
    T.inp('Vin', 'Tensão de entrada', 'Vin', 12, U_V, example='12 V')
    T.inp('R1', 'Resistência R1', 'R1', 1, U_R, example='1 k' + OHM)
    T.inp('R2', 'Resistência R2', 'R2', 2, U_R, example='2 k' + OHM)
    T.set_unit('R1', 'k' + OHM)
    T.set_unit('R2', 'k' + OHM)
    Vin, R1, R2 = T.refs['Vin'], T.refs['R1'], T.refs['R2']
    checks = field_checks(Vin, 'Tensão de entrada') + field_checks(R1, 'Resistência R1', 'pos', noun='uma resistência R1') + \
        field_checks(R2, 'Resistência R2', 'pos', noun='uma resistência R2')
    T.r += 1
    T.status(checks)
    T.result_heads()
    v, r1, r2 = Vin['si'], R1['si'], R2['si']
    v1 = T.res('v1', 'Tensão sobre R1', 'VR1', '{}*{}/({}+{})'.format(v, r1, r1, r2), 'V', main=True)
    v2 = T.res('v2', 'Tensão sobre R2 (saída)', 'VR2', '{}*{}/({}+{})'.format(v, r2, r1, r2), 'V', main=True)
    i = T.res('i', 'Corrente do circuito', 'I', '{}/({}+{})'.format(v, r1, r2), 'A')
    T.res('ima', 'Corrente em mA', 'I', '{}*1000'.format(i), 'mA')
    rt = T.res('rt', 'Resistência total', 'Rt', '{}+{}'.format(r1, r2), OHM)
    T.res('fr', 'Fração da entrada na saída', 'VR2/Vin', '{}/({}+{})*100'.format(r2, r1, r2), '%')
    T.memo_heads()
    T.step('Resistência total', 'Rt = R1 + R2', T.ok_text('"Rt = "&{}&" {} + "&{}&" {}"'.format(t(r1), OHM, t(r2), OHM)), T.ok_text('"Rt = "&{}&" {}"'.format(t(rt), OHM)))
    T.step('Corrente', 'I = Vin / (R1 + R2)', T.ok_text('"I = "&{}&" V / "&{}&" {}"'.format(t(v), t(rt), OHM)), T.ok_text('"I = "&{}&" A"'.format(t(i))))
    T.step('Tensão sobre R1', 'VR1 = Vin × R1 / (R1 + R2)', T.ok_text('"VR1 = "&{}&" V × "&{}&" / "&{}'.format(t(v), t(r1), t(rt))), T.ok_text('"VR1 = "&{}&" V"'.format(t(v1))))
    T.step('Tensão sobre R2 (saída)', 'VR2 = Vin × R2 / (R1 + R2)', T.ok_text('"VR2 = "&{}&" V × "&{}&" / "&{}'.format(t(v), t(r2), t(rt))), T.ok_text('"VR2 = "&{}&" V"'.format(t(v2))))
    T.step('Conferência', 'VR1 + VR2 = Vin', T.ok_text('{}&" V + "&{}&" V"'.format(t(v1), t(v2))), T.ok_text('"= "&{}&" V"'.format(t('({}+{})'.format(v1, v2)))))
    T.explain(['A tensão se reparte na mesma proporção das resistências: o resistor maior fica com a maior parte da tensão.',
               'A mesma corrente passa pelos dois resistores, porque eles estão em série.'])
    T.finish(['Resistores ideais e saída sem carga.', 'Se você ligar uma carga em paralelo com R2, a tensão de saída cai, porque a carga muda a resistência do ramo de baixo.'])


def tab_idiv(wb):
    T = Tab(wb, '06 Divisor de Corrente', 6, 'Divisor de Corrente', 'Circuitos resistivos',
            'Determinar quanto da corrente total passa por cada um de dois resistores em paralelo.',
            'Informe a corrente que entra no par de resistores e o valor de cada um.')
    T.input_heads()
    T.inp('It', 'Corrente total', 'Itotal', 3, U_A, example='3 A')
    T.inp('R1', 'Resistência R1', 'R1', 2, U_R, example='2 ' + OHM)
    T.inp('R2', 'Resistência R2', 'R2', 4, U_R, example='4 ' + OHM)
    It, R1, R2 = T.refs['It'], T.refs['R1'], T.refs['R2']
    checks = field_checks(It, 'Corrente total') + field_checks(R1, 'Resistência R1', 'pos', noun='uma resistência R1') + \
        field_checks(R2, 'Resistência R2', 'pos', noun='uma resistência R2')
    T.r += 1
    T.status(checks)
    T.result_heads()
    it, r1, r2 = It['si'], R1['si'], R2['si']
    i1 = T.res('i1', 'Corrente no ramo R1', 'I1', '{}*{}/({}+{})'.format(it, r2, r1, r2), 'A', main=True)
    i2 = T.res('i2', 'Corrente no ramo R2', 'I2', '{}*{}/({}+{})'.format(it, r1, r1, r2), 'A', main=True)
    req = T.res('req', 'Resistência equivalente', 'Req', '{}*{}/({}+{})'.format(r1, r2, r1, r2), OHM)
    vv = T.res('v', 'Tensão comum aos dois ramos', 'V', '{}*{}'.format(it, req), 'V')
    T.res('sum', 'Conferência: I1 + I2', 'Itotal', '{}+{}'.format(i1, i2), 'A')
    T.memo_heads()
    T.step('Corrente no ramo R1', 'I1 = Itotal × R2 / (R1 + R2)', T.ok_text('"I1 = "&{}&" A × "&{}&" / ("&{}&" + "&{}&")"'.format(t(it), t(r2), t(r1), t(r2))), T.ok_text('"I1 = "&{}&" A"'.format(t(i1))))
    T.step('Corrente no ramo R2', 'I2 = Itotal × R1 / (R1 + R2)', T.ok_text('"I2 = "&{}&" A × "&{}&" / ("&{}&" + "&{}&")"'.format(t(it), t(r1), t(r1), t(r2))), T.ok_text('"I2 = "&{}&" A"'.format(t(i2))))
    T.step('Resistência equivalente', 'Req = (R1 × R2) / (R1 + R2)', T.ok_text('"Req = ("&{}&" × "&{}&") / ("&{}&" + "&{}&")"'.format(t(r1), t(r2), t(r1), t(r2))), T.ok_text('"Req = "&{}&" {}"'.format(t(req), OHM)))
    T.step('Tensão comum', 'V = Itotal × Req', T.ok_text('"V = "&{}&" A × "&{}&" {}"'.format(t(it), t(req), OHM)), T.ok_text('"V = "&{}&" V"'.format(t(vv))))
    T.explain(['A maior parte da corrente passa pelo ramo de menor resistência. Repare que a corrente de um ramo depende da resistência do outro ramo.',
               'Os dois resistores ficam sob a mesma tensão. Pela Lei de Ohm, I1 = V/R1 e I2 = V/R2.'])
    T.finish(['Circuito resistivo ideal com dois ramos em paralelo.', 'Fios de ligação com resistência desprezível.'])


def tab_freq(wb):
    T = Tab(wb, '07 Frequência', 7, 'Frequência e Período', 'Corrente alternada',
            'Converter frequência em período (e o contrário) e obter a frequência angular.',
            'Escolha o que quer calcular e preencha só a outra grandeza.')
    T.input_heads()
    T.choice('m', 'O que você quer calcular?', ['Calcular período', 'Calcular frequência'], 'Calcular período')
    m = T.refs['m']
    T.inp('f', 'Frequência', 'f', 60, U_F, example='60 Hz')
    T.inp('T', 'Período', 'T', None, U_T, example='(calculado)')
    f, Tp = T.refs['f'], T.refs['T']
    for key, mode in (('f', 'Calcular frequência'), ('T', 'Calcular período')):
        row = T.refs[key]['v'].split('$')[-1]
        T.ws['F' + row] = '=IF({}="{}","Este é o valor calculado: deixe em branco.","")'.format(m, mode)
        T.ws['F' + row].font = font(color=MUTED, italic=True)
    checks = field_checks(f, 'Frequência', 'pos', '{}="Calcular período"'.format(m), 'uma frequência') + \
        field_checks(Tp, 'Período', 'pos', '{}="Calcular frequência"'.format(m), 'um período')
    T.r += 1
    T.status(checks)
    T.result_heads()
    fr = T.res('f', 'Frequência', 'f', 'IF({}="Calcular período",{},1/{})'.format(m, f['si'], Tp['si']), 'Hz', main=True)
    tr = T.res('T', 'Período', 'T', 'IF({}="Calcular período",1/{},{})'.format(m, f['si'], Tp['si']), 's', main=True)
    T.res('Tms', 'Período em ms', 'T', '{}*1000'.format(tr), 'ms')
    w = T.res('w', 'Frequência angular', 'ω', '2*PI()*{}'.format(fr), 'rad/s')
    T.memo_heads()
    T.step('Inverso', '=IF({}="Calcular período","T = 1 / f","f = 1 / T")'.format(m),
           T.ok_text('IF({0}="Calcular período","T = 1 / "&{1}&" Hz","f = 1 / "&{2}&" s")'.format(m, t(f['si']), t(Tp['si']))),
           T.ok_text('IF({0}="Calcular período","T = "&{1}&" s","f = "&{2}&" Hz")'.format(m, t(tr), t(fr))))
    T.step('Frequência angular', 'ω = 2 × π × f', T.ok_text('"ω = 2 × π × "&{}&" Hz"'.format(t(fr))), T.ok_text('"ω = "&{}&" rad/s"'.format(t(w))))
    T.explain(['Frequência e período são inversos: um sinal de 60 Hz completa 60 ciclos por segundo, então cada ciclo dura 1/60 s.',
               'A frequência angular ω mede a mesma rapidez em radianos por segundo. Um ciclo completo corresponde a 2π rad.'])
    T.finish(['Sinal periódico. A frequência angular ω = 2πf vale para sinais senoidais.'])


def tab_reactance(wb):
    T = Tab(wb, '08 Reatância', 8, 'Reatância', 'Corrente alternada',
            'Calcular a oposição que indutores e capacitores ideais oferecem à corrente alternada senoidal.',
            'Escolha indutor, capacitor ou ambos. Informe a frequência e o valor dos componentes.')
    T.input_heads()
    T.choice('m', 'O que você quer calcular?', ['Ambas', 'Indutiva (XL)', 'Capacitiva (XC)'], 'Ambas')
    m = T.refs['m']
    T.inp('f', 'Frequência', 'f', 60, U_F, example='60 Hz')
    T.inp('L', 'Indutância', 'L', 0.1, U_L, example='0,1 H')
    T.inp('C', 'Capacitância', 'C', 100, U_C, example='100 ' + MU + 'F')
    f, L, C = T.refs['f'], T.refs['L'], T.refs['C']
    needL = '{}<>"Capacitiva (XC)"'.format(m)
    needC = '{}<>"Indutiva (XL)"'.format(m)
    checks = field_checks(f, 'Frequência', 'pos', noun='uma frequência') + field_checks(L, 'Indutância', 'pos', needL, 'uma indutância') + \
        field_checks(C, 'Capacitância', 'pos', needC, 'uma capacitância')
    T.r += 1
    T.status(checks)
    T.result_heads()
    xl = T.res('xl', 'Reatância indutiva', 'XL', 'IF({},2*PI()*{}*{},"não calculada")'.format(needL, f['si'], L['si']), OHM, main=True, note='Impedância do indutor: ZL = +j·XL')
    xc = T.res('xc', 'Reatância capacitiva (módulo)', 'XC', 'IF({},1/(2*PI()*{}*{}),"não calculada")'.format(needC, f['si'], C['si']), OHM, main=True,
               note='Impedância do capacitor: ZC = −j·XC (sinal negativo na parte imaginária)')
    for ref in (xl, xc):
        row = ref.split('$')[-1]
        T.ws['C' + row] = '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),E{0})'.format(row)
    f0 = T.res('f0', 'Frequência de ressonância', 'f0', 'IF({}="Ambas",1/(2*PI()*SQRT({}*{})),"só com os dois componentes")'.format(m, L['si'], C['si']), 'Hz')
    row = f0.split('$')[-1]
    T.ws['C' + row] = '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),E{0})'.format(row)
    T.res('w', 'Frequência angular', 'ω', '2*PI()*{}'.format(f['si']), 'rad/s')
    T.memo_heads()
    T.step('Reatância indutiva', 'XL = 2 × π × f × L', T.ok_text('IF({},"XL = 2 × π × "&{}&" Hz × "&{}&" H","não calculada")'.format(needL, t(f['si']), t(L['si']))),
           T.ok_text('IF(ISNUMBER({0}),"XL = "&{1}&" {2}","não calculada")'.format(xl, t(xl), OHM)))
    T.step('Reatância capacitiva', 'XC = 1 / (2 × π × f × C)', T.ok_text('IF({},"XC = 1 / (2 × π × "&{}&" Hz × "&{}&" F)","não calculada")'.format(needC, t(f['si']), t(C['si']))),
           T.ok_text('IF(ISNUMBER({0}),"XC = "&{1}&" {2}","não calculada")'.format(xc, t(xc), OHM)))
    T.step('Ressonância (com os dois)', 'f0 = 1 / (2 × π × √(L × C))', T.ok_text('IF({}="Ambas","f0 = 1 / (2 × π × √("&{}&" × "&{}&"))","não calculada")'.format(m, t(L['si']), t(C['si']))),
           T.ok_text('IF(ISNUMBER({0}),"f0 = "&{1}&" Hz","não calculada")'.format(f0, t(f0))))
    T.explain(['XL cresce com a frequência: se f dobrar, XL dobra. Em corrente contínua o indutor ideal se comporta como um fio.',
               'XC faz o caminho contrário: se f dobrar, XC cai pela metade. Na frequência de ressonância as duas reatâncias ficam iguais.'])
    T.finish(['Indutor e capacitor ideais: sem resistência interna e sem perdas.', 'Regime senoidal permanente na frequência informada.',
              'XC aparece como módulo (sempre positivo). Na impedância complexa do capacitor ele entra com sinal negativo: ZC = −j·XC.'])


def tab_impedance(wb):
    T = Tab(wb, '09 Impedância RLC', 9, 'Impedância RLC', 'Corrente alternada',
            'Calcular a impedância total de circuitos RL, RC e RLC em série.',
            'Escolha o tipo de circuito, informe os componentes e a frequência. A tensão é opcional.')
    T.input_heads()
    T.choice('tp', 'Tipo de circuito', ['RL', 'RC', 'RLC'], 'RL')
    tp = T.refs['tp']
    T.inp('R', 'Resistência', 'R', 10, U_R, example='10 ' + OHM)
    T.inp('L', 'Indutância', 'L', 0.1, U_L, example='0,1 H')
    T.inp('C', 'Capacitância', 'C', 100, U_C, note=None, example='(não usado no RL)')
    T.inp('f', 'Frequência', 'f', 60, U_F, example='60 Hz')
    T.inp('V', 'Tensão RMS (opcional)', 'V', None, U_V, note='Preencha para calcular corrente, tensões e potências.', example='(opcional)')
    R, L, C, f, V = T.refs['R'], T.refs['L'], T.refs['C'], T.refs['f'], T.refs['V']
    needL = '{}<>"RC"'.format(tp)
    needC = '{}<>"RL"'.format(tp)
    for key, need in (('L', needL), ('C', needC)):
        row = T.refs[key]['v'].split('$')[-1]
        T.ws['F' + row] = '=IF({},"","Não usado neste tipo de circuito.")'.format(need)
        T.ws['F' + row].font = font(color=MUTED, italic=True)
    checks = field_checks(R, 'Resistência', 'nonneg') + field_checks(L, 'Indutância', 'pos', needL, 'uma indutância') + \
        field_checks(C, 'Capacitância', 'pos', needC, 'uma capacitância') + field_checks(f, 'Frequência', 'pos', noun='uma frequência') + \
        field_checks(V, 'Tensão RMS', 'nonneg', 'NOT(ISBLANK({}))'.format(V['v']))
    T.r += 1
    T.status(checks)
    T.result_heads()
    w = '(2*PI()*{})'.format(f['si'])
    xl = T.res('xl', 'Reatância indutiva', 'XL', 'IF({},{}*{},0)'.format(needL, w, L['si']), OHM)
    xc = T.res('xc', 'Reatância capacitiva', 'XC', 'IF({},1/({}*{}),0)'.format(needC, w, C['si']), OHM)
    x = T.res('x', 'Reatância líquida', 'X', 'IF(ABS({0}-{1})<=1E-12*MAX({0},{1}),0,{0}-{1})'.format(xl, xc), OHM, note='X = XL − XC')
    z = T.res('z', 'Módulo da impedância', '|Z|', 'SQRT({}^2+{}^2)'.format(R['si'], x), OHM, main=True)
    T.res('zc', 'Impedância complexa', 'Z', '{}&IF({}<0," − j"," + j")&{}&" {}"'.format(t(R['si']), x, t('ABS({})'.format(x)), OHM), '', text=True)
    phi = T.res('phi', 'Ângulo de fase', 'φ', 'IF({0}=0,"indeterminado",DEGREES(ATAN2({1},{2})))'.format(z, R['si'], x), '°', main=True,
                note='Positivo: corrente atrasada (indutivo). Negativo: adiantada (capacitivo).')
    fp = T.res('fp', 'Fator de potência', 'FP', 'IF({0}=0,"indeterminado",{1}/{0})'.format(z, R['si']), '')
    for ref in (phi, fp):
        row = ref.split('$')[-1]
        T.ws['C' + row] = '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),E{0})'.format(row)
    T.res('beh', 'Comportamento', '', 'IF({0}=0,"Curto-circuito ideal (Z = 0)",IF({1}>0,"Predominantemente indutivo",IF({1}<0,"Predominantemente capacitivo","Resistivo")))'.format(z, x), '', text=True)
    f0 = T.res('f0', 'Frequência de ressonância (RLC)', 'f0', 'IF({}="RLC",1/(2*PI()*SQRT({}*{})),"só no RLC")'.format(tp, L['si'], C['si']), 'Hz')
    row = f0.split('$')[-1]
    T.ws['C' + row] = '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),E{0})'.format(row)
    hasV = 'AND(NOT(ISBLANK({})),{}>0)'.format(V['v'], z)
    i = T.res('i', 'Corrente RMS', 'I', 'IF({},{}/{},"informe a tensão")'.format(hasV, V['si'], z), 'A', main=True)
    extra = []
    for key, lab, sym, ex, un in (('vr', 'Tensão no resistor', 'VR', '{}*' + R['si'], 'V'), ('vl', 'Tensão no indutor', 'VL', '{}*' + xl, 'V'),
                                   ('vc', 'Tensão no capacitor', 'VC', '{}*' + xc, 'V'), ('p', 'Potência ativa', 'P', '{0}^2*' + R['si'], 'W'),
                                   ('q', 'Potência reativa', 'Q', '{0}^2*' + x, 'var'), ('s', 'Potência aparente', 'S', V['si'] + '*{0}', 'VA')):
        ref = T.res(key, lab, sym, 'IF(ISNUMBER({0}),{1},"")'.format(i, ex.format(i)), un)
        extra.append(ref)
    for ref in [i] + extra:
        row = ref.split('$')[-1]
        T.ws['C' + row] = '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),E{0})'.format(row)
    zrow = z.split('$')[-1]
    T.ws['F' + zrow] = '=IF(AND({},{}=0),"Com R = 0 e XL = XC a impedância ideal é zero: curto-circuito. Ângulo, FP e corrente ficam indeterminados.","")'.format(T.ok, z)
    T.ws['F' + zrow].font = font(color='B45309', italic=True)
    T.ws['F' + zrow].alignment = Alignment(wrap_text=True)
    T.memo_heads()
    T.step('Reatâncias', 'XL = 2πfL  |  XC = 1/(2πfC)', T.ok_text('"XL = "&{}&" {}  |  XC = "&{}&" {}"'.format(t(xl), OHM, t(xc), OHM)),
           T.ok_text('"(no RL, XC = 0; no RC, XL = 0)"'))
    T.step('Reatância líquida', 'X = XL − XC', T.ok_text('"X = "&{}&" − "&{}'.format(t(xl), t(xc))), T.ok_text('"X = "&{}&" {}"'.format(t(x), OHM)))
    T.step('Módulo da impedância', '|Z| = √(R² + X²)', T.ok_text('"|Z| = √("&{}&"² + "&{}&"²)"'.format(t(R['si']), t('ABS({})'.format(x)))), T.ok_text('"|Z| = "&{}&" {}"'.format(t(z), OHM)))
    T.step('Ângulo e fator de potência', 'φ = atan2(X, R)  |  FP = R / |Z|', T.ok_text('IF({0}=0,"indeterminado (Z = 0)","φ = atan2("&{1}&", "&{2}&")  |  FP = "&{2}&" / "&{3})'.format(z, t(x), t(R['si']), t(z))),
           T.ok_text('IF({0}=0,"indeterminado","φ = "&{1}&"°  |  FP = "&{2})'.format(z, t(phi), t(fp))))
    T.step('Corrente', 'I = V / |Z|', T.ok_text('IF(ISNUMBER({0}),"I = "&{1}&" V / "&{2}&" {3}","informe a tensão para calcular")'.format(i, t(V['si']), t(z), OHM)),
           T.ok_text('IF(ISNUMBER({0}),"I = "&{1}&" A","")'.format(i, t(i))))
    T.explain(['Se XL for maior que XC, o circuito é indutivo e a corrente fica atrasada em relação à tensão. Se XC for maior, é capacitivo e a corrente fica adiantada.',
               'No RLC, as tensões no indutor e no capacitor podem passar da tensão da fonte, porque estão defasadas 180° entre si e se cancelam em parte.'])
    T.finish(['Componentes ideais ligados em série, em regime senoidal permanente.', 'Tensão e corrente em valores eficazes (RMS).'])


def power_tab(wb, three):
    if three:
        T = Tab(wb, '11 Trifásica', 11, 'Potência Trifásica Equilibrada', 'Potência e utilidades',
                'Calcular as potências de um sistema trifásico equilibrado e as grandezas de fase.',
                'Informe a tensão de linha (fase-fase) e a corrente de linha, ambas RMS, além do FP, da ligação e da natureza da carga.')
    else:
        T = Tab(wb, '10 Monofásica', 10, 'Potência Monofásica em CA', 'Potência e utilidades',
                'Calcular as potências ativa, aparente e reativa de uma carga monofásica senoidal.',
                'Informe tensão e corrente RMS, o fator de potência e a natureza da carga.')
    T.input_heads()
    if three:
        T.inp('V', 'Tensão de linha (fase-fase) RMS', 'VL', 380, U_V, example='380 V')
        T.inp('I', 'Corrente de linha RMS', 'IL', 10, U_A, example='10 A')
    else:
        T.inp('V', 'Tensão RMS', 'V', 120, U_V, example='120 V')
        T.inp('I', 'Corrente RMS', 'I', 5, U_A, example='5 A')
    T.inp('FP', 'Fator de potência', 'FP', 0.8, fixed='', note='Número entre 0 e 1. Carga resistiva: FP = 1.', example='0,8')
    T.choice('nat', 'Natureza da carga', ['Indutiva', 'Capacitiva', 'Resistiva'], 'Indutiva')
    if three:
        T.choice('con', 'Tipo de ligação', ['Estrela (Y)', 'Triângulo (Δ)'], 'Estrela (Y)')
    V, I, FPr, nat = T.refs['V'], T.refs['I'], T.refs['FP'], T.refs['nat']
    lv = 'Tensão de linha' if three else 'Tensão RMS'
    li = 'Corrente de linha' if three else 'Corrente RMS'
    checks = field_checks(V, lv, 'nonneg') + field_checks(I, li, 'nonneg') + field_checks(FPr, 'Fator de potência', 'fp')
    checks.append(('IF(AND({}="Resistiva",ISNUMBER({})),{}<>1,FALSE)'.format(nat, FPr['si'], FPr['si']),
                   'Uma carga resistiva ideal tem fator de potência igual a 1. Use FP = 1 ou escolha carga indutiva ou capacitiva.'))
    T.r += 1
    T.status(checks)
    T.result_heads()
    k = 'SQRT(3)*' if three else ''
    s = T.res('s', 'Potência aparente', 'S', '{}{}*{}'.format(k, V['si'], I['si']), 'VA', main=True)
    p = T.res('p', 'Potência ativa', 'P', '{}*{}'.format(s, FPr['si']), 'W', main=True)
    sign = 'IF({0}="Capacitiva",-1,IF({0}="Resistiva",0,1))'.format(nat)
    qq = T.res('q', 'Potência reativa', 'Q', '{}*{}*SQRT(MAX(0,1-{}^2))'.format(sign, s, FPr['si']), 'var', main=True)
    qrow = qq.split('$')[-1]
    T.ws['F' + qrow] = '=IF(ISNUMBER({0}),IF({0}>0,"Positivo: carga indutiva (corrente atrasada).",IF({0}<0,"Negativo: carga capacitiva (corrente adiantada).","Zero: sem potência reativa.")),"")'.format(qq)
    T.ws['F' + qrow].font = font(color=MUTED, italic=True)
    phi = T.res('phi', 'Ângulo de fase', 'φ', '{}*DEGREES(ACOS({}))'.format(sign, FPr['si']), '°')
    if three:
        T.res('pk', 'Potência ativa em kW', 'P', '{}/1000'.format(p), 'kW')
        star = '{}="Estrela (Y)"'.format(T.refs['con'])
        vf = T.res('vf', 'Tensão de fase', 'Vfase', 'IF({},{}/SQRT(3),{})'.format(star, V['si'], V['si']), 'V')
        ifs = T.res('if', 'Corrente de fase', 'Ifase', 'IF({},{},{}/SQRT(3))'.format(star, I['si'], I['si']), 'A')
        pf = T.res('pf', 'Potência ativa por fase', 'Pfase', '{}/3'.format(p), 'W')
        zf = T.res('zf', 'Impedância por fase (módulo)', '|Zfase|', 'IF({1}>0,{0}/{1},"sem corrente")'.format(vf, ifs), OHM)
        row = zf.split('$')[-1]
        T.ws['C' + row] = '=IF(ISNUMBER(E{0}),IF(ABS(E{0})<0.001,E{0},ROUND(E{0},CASAS)),E{0})'.format(row)
    T.memo_heads()
    sv = 'VL' if three else 'V'
    si_ = 'IL' if three else 'I'
    k_txt = '√3 × ' if three else ''
    T.step('Potência aparente', 'S = {}{} × {}'.format(k_txt, sv, si_), T.ok_text('"S = {}"&{}&" V × "&{}&" A"'.format(k_txt, t(V['si']), t(I['si']))), T.ok_text('"S = "&{}&" VA"'.format(t(s))))
    T.step('Potência ativa', 'P = {}{} × {} × FP'.format(k_txt, sv, si_), T.ok_text('"P = {}"&{}&" V × "&{}&" A × "&{}'.format(k_txt, t(V['si']), t(I['si']), t(FPr['si']))), T.ok_text('"P = "&{}&" W"'.format(t(p))))
    T.step('Potência reativa', '|Q| = S × √(1 − FP²)', T.ok_text('"|Q| = "&{}&" × √(1 − "&{}&"²)"'.format(t(s), t(FPr['si']))),
           T.ok_text('"Q = "&{}&" var ("&IF({}>0,"positivo: indutiva",IF({}<0,"negativo: capacitiva","nulo"))&")"'.format(t(qq), qq, qq)))
    T.step('Ângulo de fase', '|φ| = arccos(FP)', T.ok_text('"|φ| = arccos("&{}&")"'.format(t(FPr['si']))), T.ok_text('"φ = "&{}&"°"'.format(t(phi))))
    if three:
        T.step('Grandezas de fase', 'Estrela: Vfase = VL/√3, Ifase = IL  |  Triângulo: Vfase = VL, Ifase = IL/√3',
               T.ok_text('IF({},"Estrela: Vfase = "&{}&" / √3","Triângulo: Ifase = "&{}&" / √3")'.format(star, t(V['si']), t(I['si']))),
               T.ok_text('"Vfase = "&{}&" V  |  Ifase = "&{}&" A"'.format(t(vf), t(ifs))))
    T.step('Conferência', 'S = √(P² + Q²)', T.ok_text('"S = √("&{}&"² + "&{}&"²)"'.format(t(p), t('ABS({})'.format(qq)))), T.ok_text('"S = "&{}&" VA"'.format(t('SQRT({}^2+{}^2)'.format(p, qq)))))
    if three:
        T.explain(['O fator √3 aparece porque as tensões das três fases estão defasadas 120°. Com ele, a potência total sai direto dos valores de linha.',
                   'Na estrela, cada carga fica entre uma fase e o neutro e recebe VL/√3. No triângulo, cada carga fica entre duas fases e recebe a tensão de linha inteira.'])
        T.finish(['Sistema trifásico equilibrado: as três fases têm a mesma carga, tensões e correntes de mesmo módulo defasadas 120°.',
                  'Tensões e correntes em valores eficazes (RMS) e condições senoidais.',
                  'Não aplique diretamente estas expressões a cargas desequilibradas. Nesse caso, calcule cada fase separadamente.',
                  'Convenção de sinal: Q positivo para carga indutiva e Q negativo para carga capacitiva.'])
    else:
        T.explain(['A potência ativa (W) é a parte que vira trabalho útil ou calor. A reativa (var) fica indo e voltando entre a fonte e a carga sem realizar trabalho, mas ocupa a capacidade de cabos e transformadores.',
                   'A potência aparente (VA) é o total que a fonte precisa fornecer: S² = P² + Q².'])
        T.finish(['Regime senoidal permanente, tensão e corrente em valores eficazes (RMS).', 'FP = cos φ, válido para tensão e corrente senoidais (sem harmônicas).',
                  'Convenção de sinal: Q positivo para carga indutiva (corrente atrasada) e Q negativo para carga capacitiva (corrente adiantada).'])


def tab_converter(wb):
    T = Tab(wb, '12 Conversor', 12, 'Conversor de Unidades', 'Potência e utilidades',
            'Converter valores entre unidades da mesma grandeza elétrica.',
            'Digite o valor e escolha as unidades de origem e de destino. A grandeza é reconhecida pela unidade.')
    T.input_heads()
    T.inp('v', 'Valor', '', 2.2, fixed='', example='2,2')
    r = T.r
    for key, lab, val in (('de', 'Unidade de origem', 'k' + OHM), ('para', 'Unidade de destino', OHM)):
        T._label(lab, '')
        c = T.ws.cell(T.r, 3, val)
        T._input_style(c)
        T._dropdown('C{}'.format(T.r), ref='Unidades!$A$2:$A${}'.format(UNIT_LAST_ROW))
        T.ws.cell(T.r, 6, '=IFERROR(VLOOKUP(C{},UNID,2,FALSE),"")'.format(T.r)).font = font(color=MUTED, italic=True)
        T.ws.cell(T.r, 7, val).font = font(color=MUTED)
        T.refs[key] = '$C${}'.format(T.r)
        T.r += 1
    v, de, para = T.refs['v'], T.refs['de'], T.refs['para']
    gde = 'VLOOKUP({},UNID,2,FALSE)'.format(de)
    gpara = 'VLOOKUP({},UNID,2,FALSE)'.format(para)
    checks = field_checks(v, 'Valor') + [
        ('ISNA(MATCH({},Unidades!$A$2:$A${},0))'.format(de, UNIT_LAST_ROW), 'Escolha a unidade de origem na lista.'),
        ('ISNA(MATCH({},Unidades!$A$2:$A${},0))'.format(para, UNIT_LAST_ROW), 'Escolha a unidade de destino na lista.'),
        ('{}<>{}'.format(gde, gpara), 'As unidades são de grandezas diferentes e não podem ser convertidas entre si. Para passar de tensão para potência, por exemplo, faltam dados: use a aba de potência.'),
    ]
    T.r += 1
    T.status(checks)
    T.result_heads()
    fator = T.res('fat', 'Fator de conversão', '', 'VLOOKUP({},UNID,3,FALSE)/VLOOKUP({},UNID,3,FALSE)'.format(de, para), '=' + para,
                  note='Quanto vale 1 unidade de origem na unidade de destino.')
    res = T.res('res', 'Valor convertido', '', '{}*{}'.format(v['si'], fator), '=' + para, main=True)
    T.res('gr', 'Grandeza', '', gde, '', text=True)
    T.res('eq', 'Conversão', '', '{}&" "&{}&" = "&{}&" "&{}'.format(t(v['si']), de, t(res), para), '', text=True)
    T.memo_heads()
    T.step('Fator', 'fator = (fator da origem) / (fator do destino)', T.ok_text('"1 "&{}&" = "&{}&" "&{}'.format(de, t(fator), para)), T.ok_text('""'))
    T.step('Conta', 'valor no destino = valor × fator', T.ok_text('{}&" × "&{}'.format(t(v['si']), t(fator))), T.ok_text('"= "&{}&" "&{}'.format(t(res), para)))
    T.explain(['Prefixos indicam potências de 10: k = 10³ (mil), M = 10⁶, m = 10⁻³, µ = 10⁻⁶, n = 10⁻⁹ e p = 10⁻¹².',
               'Para energia, 1 Wh = 3.600 J e 1 kWh = 3.600.000 J. Para tempo, 1 min = 60 s e 1 h = 3.600 s. A lista completa está na aba Unidades.'])
    T.finish(['A conversão só acontece entre unidades da mesma grandeza.'])


def tab_units(wb):
    ws = wb.create_sheet('Unidades')
    ws.sheet_view.showGridLines = False
    for col, w in zip('ABCD', [14, 22, 22, 28]):
        ws.column_dimensions[col].width = w
    for i, h in enumerate(['Unidade', 'Grandeza', 'Fator para a unidade base', 'Nome']):
        c = ws.cell(1, i + 1, h)
        c.font = font(bold=True, color='FFFFFF')
        c.fill = FILL_HEAD
    for r, (sym, dim, fac, name) in enumerate(UNITS, start=2):
        ws.cell(r, 1, sym).font = font(bold=True, color=NAVY)
        ws.cell(r, 2, dim).font = font()
        ws.cell(r, 3, fac).font = font()
        ws.cell(r, 3).number_format = 'General'
        ws.cell(r, 4, name).font = font(color=MUTED)
    n = UNIT_LAST_ROW + 2
    ws.cell(n, 1, 'Tabela usada pelas fórmulas das outras abas. Não altere os fatores.').font = font(italic=True, color=MUTED)
    wb.defined_names['UNID'] = DefinedName('UNID', attr_text='Unidades!$A$2:$D${}'.format(UNIT_LAST_ROW))


def tab_home(wb):
    ws = wb.active
    ws.title = 'Início'
    ws.sheet_view.showGridLines = False
    for col, w in zip('ABCDE', [6, 30, 26, 70, 4]):
        ws.column_dimensions[col].width = w
    ws.merge_cells('A1:D1')
    ws['A1'] = 'MapaElétrica Calc'
    ws['A1'].font = font(size=22, bold=True, color='FFFFFF')
    ws['A1'].fill = FILL_HEAD
    ws['A1'].alignment = Alignment(vertical='center', indent=1)
    ws.row_dimensions[1].height = 42
    ws.merge_cells('A2:D2')
    ws['A2'] = 'Kit de Calculadoras Elétricas Automáticas  |  Seus cálculos de Engenharia Elétrica, resolvidos e explicados em segundos.'
    ws['A2'].font = font(size=11, color='FFFFFF')
    ws['A2'].fill = FILL_HEAD
    ws['A2'].alignment = Alignment(vertical='center', indent=1)
    ws.row_dimensions[2].height = 24

    r = 4
    ws.cell(r, 2, 'COMO USAR').font = font(bold=True, size=11, color=NAVY)
    r += 1
    steps = ['Abra a aba da calculadora (lista abaixo ou abas no rodapé).',
             'Digite os valores nas células amarelas e escolha as unidades nas listas.',
             'O resultado aparece na hora, nas células verdes. A linha "Situação dos dados" avisa se algo precisa ser corrigido.',
             'Logo abaixo ficam a memória de cálculo (fórmula, substituição e resultado) e as hipóteses do modelo.',
             'Cada aba já vem com um exemplo preenchido. Apague e digite os seus valores.',
             'Para imprimir ou gerar PDF: Arquivo > Imprimir (ou Fazer download > PDF), escolhendo a aba atual.']
    for i, s in enumerate(steps, 1):
        ws.cell(r, 2, '{}. {}'.format(i, s)).font = font()
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        r += 1
    r += 1
    ws.cell(r, 2, 'Casas decimais dos resultados').font = font(bold=True, color=NAVY)
    c = ws.cell(r, 3, 4)
    c.fill = FILL_INPUT
    c.font = font(size=12, bold=True, color='1D3B8F')
    c.border = BOX
    c.alignment = Alignment(horizontal='center')
    dv = DataValidation(type='list', formula1='"2,4,6"', allow_blank=False)
    ws.add_data_validation(dv)
    dv.add(c)
    ws.cell(r, 4, 'Escolha 2, 4 ou 6. Só muda a exibição: o cálculo interno usa o valor completo (coluna "Valor interno").').font = font(color=MUTED, italic=True)
    wb.defined_names['CASAS'] = DefinedName('CASAS', attr_text="'Início'!$C${}".format(r))
    r += 2
    ws.cell(r, 2, 'Legenda').font = font(bold=True, color=NAVY)
    r += 1
    for fill, txt in ((FILL_INPUT, 'Amarelo: digite ou escolha aqui'), (FILL_RESULT, 'Verde: resultado calculado (não edite)'),
                      (FILL_SECTION, 'Azul claro: títulos das seções')):
        ws.cell(r, 2).fill = fill
        ws.cell(r, 2).border = BOX
        ws.cell(r, 3, txt).font = font()
        r += 1
    r += 1
    ws.cell(r, 2, 'AS 12 CALCULADORAS').font = font(bold=True, size=11, color=NAVY)
    r += 1
    for i, h in enumerate(['Nº', 'Aba', 'Categoria', 'O que faz']):
        c = ws.cell(r, i + 1, h)
        c.font = font(bold=True, color='FFFFFF')
        c.fill = FILL_HEAD
    r += 1
    calcs = [
        ('01 Lei de Ohm', 'Fundamentos elétricos', 'Tensão, corrente ou resistência a partir de duas grandezas.'),
        ('02 Potência CC', 'Fundamentos elétricos', 'Potência em corrente contínua por três caminhos.'),
        ('03 Energia', 'Fundamentos elétricos', 'Consumo em kWh e estimativa de custo.'),
        ('04 Resistores', 'Circuitos resistivos', 'Resistência equivalente em série ou paralelo (2 a 10 resistores).'),
        ('05 Divisor de Tensão', 'Circuitos resistivos', 'Como a tensão se reparte entre dois resistores em série.'),
        ('06 Divisor de Corrente', 'Circuitos resistivos', 'Como a corrente se divide entre dois resistores em paralelo.'),
        ('07 Frequência', 'Corrente alternada', 'Frequência, período e frequência angular.'),
        ('08 Reatância', 'Corrente alternada', 'Reatância indutiva (XL) e capacitiva (XC).'),
        ('09 Impedância RLC', 'Corrente alternada', 'Impedância, ângulo de fase e FP de circuitos RL, RC e RLC em série.'),
        ('10 Monofásica', 'Potência e utilidades', 'Potências ativa, aparente e reativa em circuito monofásico.'),
        ('11 Trifásica', 'Potência e utilidades', 'Potências e grandezas de fase em sistema trifásico equilibrado.'),
        ('12 Conversor', 'Potência e utilidades', 'Múltiplos e submúltiplos das unidades elétricas.'),
    ]
    for i, (tab, cat, desc) in enumerate(calcs, 1):
        ws.cell(r, 1, '{:02d}'.format(i)).font = font(bold=True, color=MUTED)
        c = ws.cell(r, 2, tab)
        c.hyperlink = "#'{}'!A1".format(tab)
        c.font = font(bold=True, color=BLUE, underline='single')
        ws.cell(r, 3, cat).font = font(color=MUTED)
        ws.cell(r, 4, desc).font = font()
        for col in range(1, 5):
            ws.cell(r, col).border = Border(bottom=THIN)
        r += 1
    r += 1
    ws.cell(r, 2, 'NO GOOGLE DRIVE').font = font(bold=True, size=11, color=NAVY)
    r += 1
    for s in ['Envie o arquivo para o Google Drive. Clique com o botão direito nele e escolha Abrir com > Planilhas Google.',
              'Para salvar como planilha do Google: Arquivo > Salvar como Planilhas Google.',
              'Se a vírgula decimal não funcionar, vá em Arquivo > Configurações e escolha a localidade Brasil.',
              'Dica: faça uma cópia (Arquivo > Fazer uma cópia) antes de testar, para manter o original com os exemplos.']:
        ws.cell(r, 2, '• ' + s).font = font()
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        r += 1
    r += 1
    ws.merge_cells(start_row=r, start_column=2, end_row=r + 1, end_column=4)
    c = ws.cell(r, 2, 'Aviso: ferramenta educacional para estudar e conferir exercícios. As fórmulas usam modelos ideais. Os resultados não substituem normas técnicas, projetos, medições nem profissionais habilitados, e não devem ser usados para dimensionar condutores, disjuntores ou proteções.')
    c.font = font(italic=True, color=MUTED)
    c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.row_dimensions[r].height = 22
    ws.row_dimensions[r + 1].height = 22
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def main():
    wb = Workbook()
    tab_home(wb)
    tab_ohm(wb)
    tab_powerdc(wb)
    tab_energy(wb)
    tab_resistors(wb)
    tab_vdiv(wb)
    tab_idiv(wb)
    tab_freq(wb)
    tab_reactance(wb)
    tab_impedance(wb)
    power_tab(wb, three=False)
    power_tab(wb, three=True)
    tab_converter(wb)
    tab_units(wb)
    wb.calculation.fullCalcOnLoad = True
    wb.save(OUT)
    print('Gerado:', OUT)


if __name__ == '__main__':
    main()
