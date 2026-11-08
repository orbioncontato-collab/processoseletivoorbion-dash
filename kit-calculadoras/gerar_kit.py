# -*- coding: utf-8 -*-
"""
Gera o arquivo Kit_12_Calculadoras_Engenharia_Mecanica.xlsx

Uso:
    python gerar_kit.py [pasta_de_saida]

Requer apenas openpyxl. Sem macros, sem VBA, sem links externos.
"""
import math
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.workbook.properties import CalcProperties
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.hyperlink import Hyperlink
from openpyxl.styles.differential import DifferentialStyle

NOME_ARQUIVO = "Kit_12_Calculadoras_Engenharia_Mecanica.xlsx"

# --------------------------------------------------------------------------
# Identidade visual
# --------------------------------------------------------------------------
AZUL_ESCURO = "142D4E"
AZUL_TEC = "2563EB"
AZUL_CLARO = "DBEAFE"
VERDE = "DCFCE7"
VERDE_ESC = "166534"
FUNDO = "F1F5F9"
BRANCO = "FFFFFF"
CINZA = "64748B"
CINZA_CLARO = "E2E8F0"
VERMELHO = "DC2626"
VERMELHO_CLARO = "FEE2E2"
AMARELO = "FEF3C7"
AMARELO_ESC = "92400E"
TEXTO = "1E293B"

FONTE = "Calibri"


def fill(cor):
    return PatternFill("solid", start_color=cor, end_color=cor)


def font(size=11, bold=False, color=TEXTO, italic=False, underline=None):
    return Font(name=FONTE, size=size, bold=bold, color=color, italic=italic, underline=underline)


FINO = Side(style="thin", color="CBD5E1")
FINO_AZUL = Side(style="thin", color="93C5FD")
FINO_VERDE = Side(style="thin", color="86EFAC")
BORDA = Border(left=FINO, right=FINO, top=FINO, bottom=FINO)
BORDA_AZUL = Border(left=FINO_AZUL, right=FINO_AZUL, top=FINO_AZUL, bottom=FINO_AZUL)
BORDA_VERDE = Border(left=FINO_VERDE, right=FINO_VERDE, top=FINO_VERDE, bottom=FINO_VERDE)
SEM_BORDA = Border()


def al(h="left", v="center", wrap=True, shrink=False, indent=0):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap if not shrink else False,
                     shrink_to_fit=shrink, indent=indent)


def box(ws, rng, value=None, f=None, bg=None, a=None, border=None, fmt=None, locked=True):
    """Mescla (se for intervalo), escreve na célula superior esquerda e aplica estilo a todas."""
    if ":" in rng:
        ws.merge_cells(rng)
        cells = [c for row in ws[rng] for c in row]
    else:
        cells = [ws[rng]]
    anchor = cells[0]
    if value is not None:
        anchor.value = value
    for c in cells:
        if f is not None:
            c.font = f
        if bg is not None:
            c.fill = fill(bg)
        if a is not None:
            c.alignment = a
        if border is not None:
            c.border = border
        if fmt is not None:
            c.number_format = fmt
        c.protection = Protection(locked=locked)
    return anchor


def link(cell, sheet, display=None):
    cell.hyperlink = Hyperlink(ref=cell.coordinate, location=f"'{sheet}'!A1", display=display or str(cell.value))


def q(s):
    """Texto entre aspas para fórmula."""
    return '"' + s.replace('"', '""') + '"'


def chain(pairs, final='"OK"'):
    """Monta IF aninhados: [(condição, mensagem), ...] -> fórmula."""
    expr = final
    for cond, msg in reversed(pairs):
        expr = f"IF({cond},{q(msg)},{expr})"
    return expr


def fundo_planilha(ws, ultima_col=22, ultima_lin=60):
    for r in range(1, ultima_lin + 1):
        for c in range(1, ultima_col + 1):
            ws.cell(r, c).fill = fill(FUNDO)


# --------------------------------------------------------------------------
# Regras genéricas de validação
# --------------------------------------------------------------------------
MSG_PREENCHA = "Preencha os campos obrigatórios."
MSG_NUM = "Erro: informe apenas valores numéricos."


def regra_violada(cell, regra):
    if regra == "pos":
        return f"{cell}<=0"
    if regra == "nonneg":
        return f"{cell}<0"
    if regra == "tempC":
        return f"{cell}<=-273.15"
    return None


def status_generico(campos, pares=(), extras=()):
    """campos: [(celula, obrigatorio, regra, mensagem)]
    pares: [(cel_a, cel_b, mensagem)] campos opcionais que devem vir juntos
    extras: [(condicao, mensagem)] testes finais"""
    obrig = [c for c, ob, _, _ in campos if ob]
    opc = [c for c, ob, _, _ in campos if not ob]
    pairs = []
    if obrig:
        pairs.append(("OR(" + ",".join(f'{c}=""' for c in obrig) + ")", MSG_PREENCHA))
    for a, b, msg in pares:
        pairs.append((f'OR(AND({a}="",{b}<>""),AND({a}<>"",{b}=""))', msg))
    partes = [f"NOT(ISNUMBER({c}))" for c in obrig] + [f'AND({c}<>"",NOT(ISNUMBER({c})))' for c in opc]
    pairs.append(("OR(" + ",".join(partes) + ")", MSG_NUM))
    for c, ob, regra, msg in campos:
        v = regra_violada(c, regra)
        if v is None:
            continue
        cond = v if ob else f'AND({c}<>"",{v})'
        pairs.append((cond, msg))
    pairs.extend(extras)
    return "=" + chain(pairs)


def condicao_ruim(cell, regra):
    """Condição para pintar o campo de vermelho."""
    v = regra_violada(cell, regra)
    if v is None:
        return f'AND({cell}<>"",NOT(ISNUMBER({cell})))'
    return f'AND({cell}<>"",OR(NOT(ISNUMBER({cell})),{v}))'


def dv_para(regra, nome, unidade):
    if regra == "pos":
        dv = DataValidation(type="decimal", operator="greaterThan", formula1="0", allow_blank=True)
        dv.error = f"{nome} deve ser um número maior que zero ({unidade})."
    elif regra == "nonneg":
        dv = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True)
        dv.error = f"{nome} deve ser um número maior ou igual a zero ({unidade})."
    elif regra == "tempC":
        dv = DataValidation(type="decimal", operator="greaterThan", formula1="-273.15", allow_blank=True)
        dv.error = f"{nome} deve ser um número acima de -273,15 °C (zero absoluto)."
    else:
        dv = DataValidation(type="decimal", operator="between", formula1="-1000000000", formula2="1000000000",
                            allow_blank=True)
        dv.error = f"{nome} deve ser um número ({unidade})."
    dv.errorTitle = "Valor inválido"
    dv.errorStyle = "stop"
    dv.promptTitle = nome[:32]
    dv.prompt = f"Unidade: {unidade}"
    dv.showErrorMessage = True
    dv.showInputMessage = True
    return dv


# --------------------------------------------------------------------------
# Especificação das 12 calculadoras
# --------------------------------------------------------------------------
# Entrada: dict(row, label, unit, ex, fmt, regra, obrig)
# Saída:   dict(row, label, unit, f, fmt, texto=False)

OK = '$L$18<>"OK"'


def R(expr):
    return f'=IF({OK},"",{expr})'


CALCS = []

# ---------------- 01 FORÇAS ----------------
_fx = ("E8*COS(RADIANS(E9))+IF(E10=\"\",0,E10*COS(RADIANS(E11)))"
       "+IF(E12=\"\",0,E12*COS(RADIANS(E13)))+IF(E14=\"\",0,E14*COS(RADIANS(E15)))")
_fy = ("E8*SIN(RADIANS(E9))+IF(E10=\"\",0,E10*SIN(RADIANS(E11)))"
       "+IF(E12=\"\",0,E12*SIN(RADIANS(E13)))+IF(E14=\"\",0,E14*SIN(RADIANS(E15)))")
_soma = 'E8+IF(E10="",0,E10)+IF(E12="",0,E12)+IF(E14="",0,E14)'
CALCS.append(dict(
    sheet="01_FORCAS", num="01", titulo="FORÇAS E VETORES", nome="Forças e Vetores",
    categoria="ESTÁTICA",
    card="Componentes, resultante e direção de até 4 forças coplanares.",
    desc="Calcula as componentes horizontal e vertical de até quatro forças no plano, o módulo da força resultante e a sua direção.",
    entradas=[
        dict(row=8, label="Força 1: intensidade", unit="N", ex=100, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=9, label="Força 1: ângulo", unit="graus", ex=0, fmt="0.000", regra="any", obrig=True),
        dict(row=10, label="Força 2: intensidade (opcional)", unit="N", ex=100, fmt="#,##0.000", regra="nonneg", obrig=False),
        dict(row=11, label="Força 2: ângulo (opcional)", unit="graus", ex=90, fmt="0.000", regra="any", obrig=False),
        dict(row=12, label="Força 3: intensidade (opcional)", unit="N", ex=None, fmt="#,##0.000", regra="nonneg", obrig=False),
        dict(row=13, label="Força 3: ângulo (opcional)", unit="graus", ex=None, fmt="0.000", regra="any", obrig=False),
        dict(row=14, label="Força 4: intensidade (opcional)", unit="N", ex=None, fmt="#,##0.000", regra="nonneg", obrig=False),
        dict(row=15, label="Força 4: ângulo (opcional)", unit="graus", ex=None, fmt="0.000", regra="any", obrig=False),
    ],
    saidas=[
        dict(row=8, label="Resultante horizontal (ΣFx)", unit="N",
             f=R(f"IF(ABS({_fx})<=1E-12*({_soma}),0,{_fx})"), fmt="#,##0.000"),
        dict(row=9, label="Resultante vertical (ΣFy)", unit="N",
             f=R(f"IF(ABS({_fy})<=1E-12*({_soma}),0,{_fy})"), fmt="#,##0.000"),
        dict(row=10, label="Módulo da resultante (R)", unit="N", f=R("SQRT(L8^2+L9^2)"), fmt="#,##0.000"),
        dict(row=11, label="Ângulo da resultante (θ)", unit="graus",
             f=R(f'IF(L10<=1E-12*({_soma}),"",MOD(DEGREES(ATAN2(L8,L9)),360))'), fmt="0.000"),
        dict(row=12, label="Direção da resultante", unit="",
             f=R(f'IF(L10<=1E-12*({_soma}),"Direção indefinida","Eixo x+, anti-horário")'),
             fmt="@", texto=True),
    ],
    pares=[("E10", "E11", "Erro: preencha intensidade e ângulo da força 2 juntos."),
           ("E12", "E13", "Erro: preencha intensidade e ângulo da força 3 juntos."),
           ("E14", "E15", "Erro: preencha intensidade e ângulo da força 4 juntos.")],
    msgs={"E8": "Erro: a intensidade da força 1 não pode ser negativa.",
          "E10": "Erro: a intensidade da força 2 não pode ser negativa.",
          "E12": "Erro: a intensidade da força 3 não pode ser negativa.",
          "E14": "Erro: a intensidade da força 4 não pode ser negativa."},
    dica=None,
    aviso="Confira as unidades: forças em N e ângulos em graus, medidos a partir do eixo x positivo, no sentido anti-horário. Intensidade e ângulo de uma mesma força são preenchidos juntos.",
    expl=[
        ("Fórmula principal", "Fx = F·cos(θ)    Fy = F·sen(θ)    R = √(ΣFx² + ΣFy²)    θR = atan2(ΣFy, ΣFx)"),
        ("Variáveis", "F: intensidade da força (N)  •  θ: ângulo em relação ao eixo x positivo, anti-horário (graus)  •  ΣFx, ΣFy: somas das componentes  •  R: módulo da resultante  •  θR: direção da resultante, de 0° a 360°."),
        ("Conversões", "Os ângulos em graus são convertidos internamente para radianos antes do seno e do cosseno. Ângulos negativos ou maiores que 360° são aceitos (ex.: -90° equivale a 270°)."),
        ("Como é feito", "Cada força é decomposta nos eixos x e y. As componentes de mesmo eixo são somadas. A resultante é a hipotenusa formada pelas duas somas e a direção sai da função atan2, que identifica o quadrante corretamente."),
        ("Exemplo", "100 N a 0° + 100 N a 90°  →  ΣFx = 100 N, ΣFy = 100 N, R = 141,421 N, θR = 45°."),
    ],
    cuidados=[
        "• As forças devem ser coplanares (todas no mesmo plano). O cálculo é a soma vetorial em dois eixos ortogonais.",
        "• A resultante de forças não informa o momento. Para equilíbrio de corpo rígido, verifique também a soma dos momentos.",
        "• Se a resultante for nula, a direção fica indefinida e o ângulo é deixado em branco.",
    ],
))

# ---------------- 02 TENSÃO ----------------
CALCS.append(dict(
    sheet="02_TENSAO", num="02", titulo="TENSÃO NORMAL", nome="Tensão Normal",
    categoria="RESISTÊNCIA DOS MATERIAIS",
    card="Tensão normal média em barras sob carga axial.",
    desc="Calcula a tensão normal média gerada por uma carga axial centrada atuando sobre a área da seção transversal.",
    entradas=[
        dict(row=8, label="Força axial (F)", unit="kN", ex=10, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=9, label="Área da seção transversal (A)", unit="mm²", ex=100, fmt="#,##0.000", regra="pos", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Tensão normal média (σ)", unit="MPa", f=R("E8*1000/E9"), fmt="#,##0.000"),
        dict(row=9, label="Tensão normal média (σ)", unit="Pa", f=R("L8*1000000"), fmt="#,##0"),
    ],
    msgs={"E8": "Erro: a força não pode ser negativa.", "E9": "Erro: a área deve ser maior que zero."},
    dica=None,
    aviso="Confira as unidades: força em kN e área em mm². Lembre que 1 MPa = 1 N/mm². O resultado é o módulo da tensão.",
    expl=[
        ("Fórmula principal", "σ = F / A"),
        ("Variáveis", "σ: tensão normal média  •  F: força axial (kN)  •  A: área da seção transversal (mm²)."),
        ("Conversões", "F (kN) × 1000 = F (N). Como N/mm² = MPa, σ (MPa) = F·1000 / A. Para Pa, multiplica-se por 1.000.000."),
        ("Como é feito", "A força é convertida para newtons e dividida pela área em mm², o que já resulta em MPa. Tração ou compressão: informe a intensidade e interprete o sinal pelo sentido da carga."),
        ("Exemplo", "F = 10 kN e A = 100 mm²  →  σ = 10.000 N / 100 mm² = 100 MPa = 100.000.000 Pa."),
    ],
    cuidados=[
        "• Válido para carga axial centrada em barra com distribuição uniforme de tensão na seção.",
        "• Perto de furos, entalhes, mudanças de seção ou pontos de aplicação da carga existe concentração de tensões, que esta fórmula não considera.",
        "• Em compressão de peças esbeltas, verifique também a flambagem.",
    ],
))

# ---------------- 03 DEFORMAÇÃO ----------------
CALCS.append(dict(
    sheet="03_DEFORMACAO", num="03", titulo="DEFORMAÇÃO AXIAL DE BARRAS", nome="Deformação Axial",
    categoria="RESISTÊNCIA DOS MATERIAIS",
    card="Alongamento elástico, deformação e tensão em barras.",
    desc="Calcula o alongamento elástico de uma barra prismática submetida a carga axial, além da deformação longitudinal e da tensão média.",
    entradas=[
        dict(row=8, label="Força axial (F)", unit="kN", ex=10, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=9, label="Comprimento inicial (L)", unit="mm", ex=1000, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=10, label="Área da seção (A)", unit="mm²", ex=100, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=11, label="Módulo de elasticidade (E)", unit="GPa", ex=200, fmt="#,##0.000", regra="pos", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Alongamento (ΔL)", unit="mm", f=R("(E8*1000*E9)/(E10*E11*1000)"), fmt="#,##0.0000"),
        dict(row=9, label="Deformação longitudinal (ε)", unit="adim.", f=R("L8/E9"), fmt="0.000E+00"),
        dict(row=10, label="Tensão axial média (σ)", unit="MPa", f=R("E8*1000/E10"), fmt="#,##0.000"),
    ],
    msgs={"E8": "Erro: a força não pode ser negativa.",
          "E9": "Erro: o comprimento deve ser maior que zero.",
          "E10": "Erro: a área deve ser maior que zero.",
          "E11": "Erro: o módulo de elasticidade deve ser maior que zero."},
    dica=("E11>1500", "Atenção: E acima de 1.500 GPa. Verifique as unidades informadas (E em GPa; aço ≈ 200 GPa)."),
    aviso="Força em kN, comprimento em mm, área em mm² e módulo E em GPa (aço ≈ 200 GPa; alumínio ≈ 70 GPa).",
    expl=[
        ("Fórmula principal", "ΔL = F·L / (A·E)      ε = ΔL / L      σ = F / A"),
        ("Variáveis", "ΔL: alongamento  •  F: força axial  •  L: comprimento inicial  •  A: área da seção  •  E: módulo de elasticidade  •  ε: deformação  •  σ: tensão."),
        ("Conversões", "F (kN) × 1000 = N.  E (GPa) × 1000 = MPa = N/mm². Com L em mm e A em mm², o alongamento sai direto em mm."),
        ("Como é feito", "A lei de Hooke (σ = E·ε) é combinada com σ = F/A e ε = ΔL/L. Assim ΔL = F·L/(A·E). A deformação é a razão entre o alongamento e o comprimento inicial."),
        ("Exemplo", "F = 10 kN, L = 1000 mm, A = 100 mm², E = 200 GPa  →  ΔL = 0,5 mm, ε = 0,0005, σ = 100 MPa."),
    ],
    cuidados=[
        "• Barra prismática (seção constante), material elástico linear e carga axial constante ao longo do comprimento.",
        "• Confira se a tensão calculada está abaixo do limite de proporcionalidade do material. Acima dele a lei de Hooke deixa de valer.",
        "• Não considera dilatação térmica, flambagem ou peso próprio da barra.",
    ],
))

# ---------------- 04 TORÇÃO ----------------
CALCS.append(dict(
    sheet="04_TORCAO", num="04", titulo="TORÇÃO DE EIXOS CIRCULARES", nome="Torção de Eixos",
    categoria="RESISTÊNCIA DOS MATERIAIS",
    card="Tensão de cisalhamento máxima e ângulo de torção.",
    desc="Calcula a tensão máxima de cisalhamento em um eixo circular maciço e, se informados comprimento e G, o ângulo de torção.",
    entradas=[
        dict(row=8, label="Torque aplicado (T)", unit="N·m", ex=100, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=9, label="Diâmetro do eixo (d)", unit="mm", ex=20, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=10, label="Comprimento do eixo (L) (opcional)", unit="mm", ex=1000, fmt="#,##0.000", regra="pos", obrig=False),
        dict(row=11, label="Módulo de cisalhamento (G) (opcional)", unit="GPa", ex=80, fmt="#,##0.000", regra="pos", obrig=False),
    ],
    saidas=[
        dict(row=8, label="Tensão máxima de cisalhamento (τ)", unit="MPa", f=R("16*(E8*1000)/(PI()*E9^3)"), fmt="#,##0.000"),
        dict(row=9, label="Ângulo de torção (φ)", unit="rad",
             f='=IF(OR($L$18<>"OK",E10=""),"",32*(E8*1000)*E10/(PI()*(E11*1000)*E9^4))', fmt="0.00000"),
        dict(row=10, label="Ângulo de torção (φ)", unit="graus",
             f='=IF(OR($L$18<>"OK",E10=""),"",DEGREES(L9))', fmt="#,##0.000"),
    ],
    pares=[("E10", "E11", "Erro: preencha comprimento e G juntos (ou deixe os dois vazios).")],
    msgs={"E8": "Erro: o torque não pode ser negativo.",
          "E9": "Erro: informe um diâmetro positivo.",
          "E10": "Erro: o comprimento deve ser maior que zero.",
          "E11": "Erro: o módulo G deve ser maior que zero."},
    dica=('AND(E11<>"",E11>1000)', "Atenção: G acima de 1.000 GPa. Verifique as unidades informadas (G em GPa; aço ≈ 80 GPa)."),
    aviso="Torque em N·m e diâmetro em milímetros. Comprimento e G são opcionais, mas devem ser preenchidos juntos para obter o ângulo de torção.",
    expl=[
        ("Fórmula principal", "τmáx = 16·T / (π·d³)        φ = 32·T·L / (π·G·d⁴)"),
        ("Variáveis", "τmáx: tensão de cisalhamento na superfície do eixo  •  T: torque  •  d: diâmetro  •  L: comprimento  •  G: módulo de cisalhamento  •  φ: ângulo de torção."),
        ("Conversões", "T (N·m) × 1000 = N·mm.  G (GPa) × 1000 = MPa = N/mm². Com d e L em mm, τ sai em MPa e φ em radianos. Graus = rad × 180/π."),
        ("Como é feito", "Usa τ = T·c/J e φ = T·L/(G·J), com c = d/2 e J = π·d⁴/32 (momento polar de inércia do círculo maciço)."),
        ("Exemplo", "T = 100 N·m, d = 20 mm, L = 1000 mm, G = 80 GPa  →  τ = 63,662 MPa, φ = 0,07958 rad ≈ 4,559°."),
    ],
    cuidados=[
        "• Somente eixo circular maciço. Para eixo vazado, J = π(D⁴ − d⁴)/32 e as fórmulas mudam.",
        "• Torção elástica: a tensão calculada deve ficar abaixo do limite de escoamento ao cisalhamento do material.",
        "• Geometria, torque e propriedades constantes ao longo do comprimento. Rasgos de chaveta e degraus geram concentração de tensões.",
    ],
))

# ---------------- 05 POTÊNCIA E TORQUE ----------------
MT = "Torque para potência"
MP = "Potência para torque"
CALCS.append(dict(
    sheet="05_POTENCIA_TORQUE", num="05", titulo="POTÊNCIA E TORQUE", nome="Potência e Torque",
    categoria="ELEMENTOS DE MÁQUINAS",
    card="Converte torque e rotação em potência, e vice-versa.",
    desc="Calcula a potência mecânica de um eixo a partir do torque e da rotação, ou o torque a partir da potência e da rotação.",
    entradas=[
        dict(row=8, label="Modo de cálculo (escolha na lista)", unit="", ex=MT, fmt="@", regra="lista", obrig=True,
             lista=[MT, MP]),
        dict(row=9, label="Rotação do eixo (n)", unit="RPM", ex=1500, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=10, label="Torque (T): modo Torque para potência", unit="N·m", ex=100, fmt="#,##0.000", regra="nonneg", obrig=False),
        dict(row=11, label="Potência (P): modo Potência para torque", unit="kW", ex=None, fmt="#,##0.000", regra="nonneg", obrig=False),
    ],
    saidas=[
        dict(row=8, label="Potência mecânica (P)", unit="kW", f=R(f'IF(E8={q(MT)},E10*L10/1000,E11)'), fmt="#,##0.000"),
        dict(row=9, label="Torque no eixo (T)", unit="N·m", f=R(f'IF(E8={q(MP)},E11*1000/L10,E10)'), fmt="#,##0.000"),
        dict(row=10, label="Velocidade angular (ω)", unit="rad/s", f=R("2*PI()*E9/60"), fmt="#,##0.000"),
    ],
    status="=" + chain([
        ('E8=""', "Selecione o modo de cálculo."),
        (f'AND(E8<>{q(MT)},E8<>{q(MP)})', "Erro: escolha um modo válido na lista."),
        (f'OR(E9="",AND(E8={q(MT)},E10=""),AND(E8={q(MP)},E11=""))', MSG_PREENCHA),
        (f'OR(NOT(ISNUMBER(E9)),AND(E8={q(MT)},NOT(ISNUMBER(E10))),AND(E8={q(MP)},NOT(ISNUMBER(E11))))', MSG_NUM),
        ("E9<=0", "Erro: a rotação deve ser maior que zero."),
        (f'AND(E8={q(MT)},E10<0)', "Erro: o torque não pode ser negativo."),
        (f'AND(E8={q(MP)},E11<0)', "Erro: a potência não pode ser negativa."),
        (f'AND(E8={q(MT)},E11<>"")', "Erro: neste modo, deixe vazio o campo Potência."),
        (f'AND(E8={q(MP)},E10<>"")', "Erro: neste modo, deixe vazio o campo Torque."),
    ]),
    desativar=[("E10", f'$E$8={q(MP)}'), ("E11", f'$E$8={q(MT)}')],
    msgs={},
    dica=None,
    aviso="Escolha o modo na lista e preencha só os campos daquele modo. O campo que aparece em cinza não é usado e deve ficar vazio.",
    expl=[
        ("Fórmula principal", "P = T·ω        ω = 2·π·n / 60        T = P / ω"),
        ("Variáveis", "P: potência mecânica no eixo  •  T: torque  •  ω: velocidade angular (rad/s)  •  n: rotação (RPM)."),
        ("Conversões", "RPM para rad/s: multiplicar por 2π/60. Potência: W = N·m·rad/s; kW = W / 1000. No modo inverso, kW × 1000 = W."),
        ("Como é feito", "A rotação em RPM é convertida para rad/s. Depois, conforme o modo, multiplica-se o torque por ω (potência) ou divide-se a potência por ω (torque)."),
        ("Exemplo", "T = 100 N·m e n = 1500 RPM  →  ω = 157,080 rad/s e P = 15,708 kW."),
    ],
    cuidados=[
        "• Calcula a potência mecânica rotacional do eixo. Não confunda com potência elétrica ou potência consumida pelo equipamento.",
        "• Para obter a potência de entrada de um motor, considere o rendimento do conjunto (perdas em mancais, engrenagens e no próprio motor).",
        "• Considera regime permanente: torque e rotação constantes.",
    ],
))

# ---------------- 06 GASES IDEAIS ----------------
GM, GP, GV, GT = "Calcular massa", "Calcular pressão", "Calcular volume", "Calcular temperatura"
_inc = {GM: ("E11", "massa"), GP: ("E9", "pressão"), GV: ("E10", "volume"), GT: ("E12", "temperatura")}
_vars = {"E9": "pressão", "E10": "volume", "E11": "massa", "E12": "temperatura"}
_st6 = [('E8=""', "Selecione a variável a calcular."),
        ("AND(" + ",".join(f"E8<>{q(m)}" for m in _inc) + ")", "Erro: escolha uma opção válida na lista.")]
for m, (cel, nome) in _inc.items():
    _st6.append((f'AND(E8={q(m)},{cel}<>"")', f"Erro: para calcular a {nome}, deixe vazio o campo {nome.capitalize()}."))
_falt = []
_nnum = []
for m, (cel, _) in _inc.items():
    conhecidos = [c for c in _vars if c != cel]
    _falt.append(f"AND(E8={q(m)},OR(" + ",".join(f'{c}=""' for c in conhecidos) + "))")
    _nnum.append(f"AND(E8={q(m)},OR(" + ",".join(f"NOT(ISNUMBER({c}))" for c in conhecidos) + "))")
_st6.append(('OR(E13="",' + ",".join(_falt) + ")", MSG_PREENCHA))
_st6.append(("OR(NOT(ISNUMBER(E13))," + ",".join(_nnum) + ")", MSG_NUM))
_st6 += [
    (f"AND(E8<>{q(GP)},E9<=0)", "Erro: a pressão absoluta deve ser maior que zero."),
    (f"AND(E8<>{q(GV)},E10<=0)", "Erro: o volume deve ser maior que zero."),
    (f"AND(E8<>{q(GM)},E11<=0)", "Erro: a massa deve ser maior que zero."),
    (f"AND(E8<>{q(GT)},E12<=-273.15)", "Erro: a temperatura deve ser maior que -273,15 °C (zero absoluto)."),
    ("E13<=0", "Erro: a constante R deve ser maior que zero."),
]
CALCS.append(dict(
    sheet="06_GASES_IDEAIS", num="06", titulo="GASES IDEAIS (pV = mRT)", nome="Gases Ideais",
    categoria="TERMODINÂMICA",
    card="Pressão, volume, massa ou temperatura por pV = mRT.",
    desc="Calcula pressão, volume, massa ou temperatura de um gás ideal. Preencha três variáveis de estado e deixe vazia a que deseja calcular.",
    entradas=[
        dict(row=8, label="Variável a calcular (escolha na lista)", unit="", ex=GM, fmt="@", regra="lista", obrig=True,
             lista=[GM, GP, GV, GT]),
        dict(row=9, label="Pressão absoluta (p)", unit="kPa", ex=101.325, fmt="#,##0.000", regra="pos", obrig=False),
        dict(row=10, label="Volume (V)", unit="m³", ex=1, fmt="#,##0.0000", regra="pos", obrig=False),
        dict(row=11, label="Massa (m)", unit="kg", ex=None, fmt="#,##0.0000", regra="pos", obrig=False),
        dict(row=12, label="Temperatura (T)", unit="°C", ex=20, fmt="#,##0.00", regra="tempC", obrig=False),
        dict(row=13, label="Constante específica do gás (R)", unit="J/(kg·K)", ex=287, fmt="#,##0.000", regra="pos", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Pressão absoluta (p)", unit="kPa",
             f=R(f"IF(E8={q(GP)},E11*E13*(E12+273.15)/(E10*1000),E9)"), fmt="#,##0.000"),
        dict(row=9, label="Volume (V)", unit="m³",
             f=R(f"IF(E8={q(GV)},E11*E13*(E12+273.15)/(E9*1000),E10)"), fmt="#,##0.0000"),
        dict(row=10, label="Massa (m)", unit="kg",
             f=R(f"IF(E8={q(GM)},E9*1000*E10/(E13*(E12+273.15)),E11)"), fmt="#,##0.0000"),
        dict(row=11, label="Temperatura (T)", unit="°C",
             f=R(f"IF(E8={q(GT)},E9*1000*E10/(E11*E13)-273.15,E12)"), fmt="#,##0.00"),
        dict(row=12, label="Temperatura absoluta (T)", unit="K", f=R("L11+273.15"), fmt="#,##0.00"),
    ],
    status="=" + chain(_st6),
    desativar=[(cel, f"$E$8={q(m)}") for m, (cel, _) in _inc.items()],
    msgs={},
    dica=("E13<100", "Atenção: R muito baixo. Use o R específico do gás em J/(kg·K) (ar ≈ 287), e não a constante universal 8,314."),
    aviso="Use pressão absoluta (manométrica + atmosférica). Utilize temperatura em °C neste campo. Deixe vazio (em cinza) o campo que será calculado.",
    expl=[
        ("Fórmula principal", "p·V = m·R·T"),
        ("Variáveis", "p: pressão absoluta  •  V: volume  •  m: massa  •  R: constante específica do gás (ar seco ≈ 287 J/(kg·K))  •  T: temperatura absoluta (K)."),
        ("Conversões", "p (kPa) × 1000 = Pa.  T (K) = T (°C) + 273,15. Com p em Pa, V em m³ e R em J/(kg·K), a massa sai em kg."),
        ("Como é feito", "A equação é isolada para a variável escolhida: m = pV/(RT), p = mRT/V, V = mRT/p ou T = pV/(mR). Os resultados das variáveis conhecidas repetem os valores informados."),
        ("Exemplo", "p = 101,325 kPa, V = 1 m³, T = 20 °C, R = 287 J/(kg·K)  →  m ≈ 1,2043 kg."),
    ],
    cuidados=[
        "• Modelo aproximado: vale para gases a pressões moderadas e temperaturas bem acima do ponto de condensação. Perto da saturação, use tabelas ou fator de compressibilidade.",
        "• Sempre use pressão absoluta e temperatura absoluta na equação. A planilha converte °C para K automaticamente.",
        "• R depende do gás: R = Ru / M, com Ru = 8314 J/(kmol·K) e M a massa molar (ex.: N₂ ≈ 297, O₂ ≈ 260, CO₂ ≈ 189 J/(kg·K)).",
    ],
))

# ---------------- 07 RENDIMENTO ----------------
CALCS.append(dict(
    sheet="07_RENDIMENTO", num="07", titulo="RENDIMENTO TÉRMICO DE CICLO MOTOR", nome="Rendimento Térmico",
    categoria="TERMODINÂMICA",
    card="Rendimento de ciclo motor e calor rejeitado.",
    desc="Calcula o rendimento térmico de um ciclo motor a partir do calor fornecido e do trabalho líquido, além do calor rejeitado.",
    entradas=[
        dict(row=8, label="Calor fornecido ao ciclo (Qent)", unit="kJ", ex=1000, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=9, label="Trabalho líquido produzido (Wlíq)", unit="kJ", ex=300, fmt="#,##0.000", regra="nonneg", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Rendimento térmico (η)", unit="%", f=R("E9/E8"), fmt="0.00%"),
        dict(row=9, label="Calor rejeitado (Qsai)", unit="kJ", f=R("E8-E9"), fmt="#,##0.000"),
    ],
    msgs={"E8": "Erro: o calor fornecido deve ser maior que zero.",
          "E9": "Erro: o trabalho líquido não pode ser negativo."},
    extras=[("E9>=E8", "Erro: o trabalho líquido deve ser menor que o calor fornecido (2ª lei).")],
    dica=None,
    aviso="Use a mesma unidade de energia (kJ) para calor e trabalho. Também funciona com potências (kW) nos dois campos. O rendimento sai em %.",
    expl=[
        ("Fórmula principal", "η = Wlíq / Qent        Qsai = Qent − Wlíq"),
        ("Variáveis", "η: rendimento térmico  •  Wlíq: trabalho líquido do ciclo  •  Qent: calor fornecido pela fonte quente  •  Qsai: calor rejeitado à fonte fria."),
        ("Conversões", "O rendimento é uma razão adimensional, exibida como porcentagem (0,30 = 30%). As duas energias devem estar na mesma unidade."),
        ("Como é feito", "O balanço de energia de um ciclo completo diz que Qent = Wlíq + Qsai. Assim o rendimento é a fração do calor fornecido que vira trabalho."),
        ("Exemplo", "Qent = 1000 kJ e Wlíq = 300 kJ  →  η = 30% e Qsai = 700 kJ."),
    ],
    cuidados=[
        "• Aplicável ao balanço de energia de um ciclo motor completo. O resultado não representa sozinho o desempenho de uma máquina real.",
        "• Pela 2ª lei (Kelvin-Planck), nenhum ciclo converte todo o calor em trabalho. Por isso a planilha não aceita Wlíq ≥ Qent.",
        "• O rendimento real também é limitado pelo de Carnot: ηCarnot = 1 − Tfria/Tquente (temperaturas em K).",
    ],
))

# ---------------- 08 HIDROSTÁTICA ----------------
CALCS.append(dict(
    sheet="08_HIDROSTATICA", num="08", titulo="PRESSÃO HIDROSTÁTICA", nome="Pressão Hidrostática",
    categoria="MECÂNICA DOS FLUIDOS",
    card="Pressão em função da profundidade em líquidos.",
    desc="Calcula o aumento de pressão com a profundidade em um líquido em repouso e, opcionalmente, a pressão absoluta no ponto.",
    entradas=[
        dict(row=8, label="Densidade do fluido (ρ)", unit="kg/m³", ex=1000, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=9, label="Aceleração da gravidade (g)", unit="m/s²", ex=9.81, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=10, label="Profundidade (h)", unit="m", ex=2, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=11, label="Pressão absoluta na superfície (p₀) (opcional)", unit="kPa", ex=101.325, fmt="#,##0.000", regra="pos", obrig=False),
    ],
    saidas=[
        dict(row=8, label="Variação de pressão (Δp)", unit="kPa", f=R("E8*E9*E10/1000"), fmt="#,##0.000"),
        dict(row=9, label="Variação de pressão (Δp)", unit="Pa", f=R("L8*1000"), fmt="#,##0.00"),
        dict(row=10, label="Pressão absoluta no ponto (p)", unit="kPa",
             f='=IF(OR($L$18<>"OK",E11=""),"",E11+L8)', fmt="#,##0.000"),
        dict(row=11, label="Variação de pressão (Δp)", unit="bar", f=R("L8/100"), fmt="0.00000"),
    ],
    msgs={"E8": "Erro: a densidade deve ser maior que zero.",
          "E9": "Erro: a gravidade deve ser maior que zero.",
          "E10": "Erro: a profundidade não pode ser negativa.",
          "E11": "Erro: a pressão na superfície deve ser maior que zero."},
    dica=("E8<100", "Atenção: densidade abaixo de 100 kg/m³. Verifique as unidades informadas (água ≈ 1000 kg/m³)."),
    aviso="Densidade em kg/m³ e profundidade em metros. A pressão na superfície é opcional e deve ser absoluta (ao ar livre ≈ 101,325 kPa).",
    expl=[
        ("Fórmula principal", "Δp = ρ·g·h        p = p₀ + ρ·g·h"),
        ("Variáveis", "Δp: aumento de pressão (pressão manométrica no ponto, se p₀ for a atmosférica)  •  ρ: densidade  •  g: gravidade  •  h: profundidade  •  p₀: pressão absoluta na superfície."),
        ("Conversões", "ρ·g·h resulta em Pa. Pa ÷ 1000 = kPa.  kPa ÷ 100 = bar."),
        ("Como é feito", "O peso da coluna de líquido acima do ponto, por unidade de área, gera o aumento de pressão. Somando a pressão da superfície, obtém-se a pressão absoluta."),
        ("Exemplo", "ρ = 1000 kg/m³, g = 9,81 m/s², h = 2 m, p₀ = 101,325 kPa  →  Δp = 19,62 kPa e p = 120,945 kPa."),
    ],
    cuidados=[
        "• Fluido homogêneo, em repouso, com densidade aproximadamente constante (líquido incompressível).",
        "• Para vários líquidos sobrepostos (manômetros), some as parcelas ρ·g·h de cada camada.",
        "• A profundidade é medida na vertical a partir da superfície livre, independentemente da forma do recipiente.",
    ],
))

# ---------------- 09 VAZÃO ----------------
CALCS.append(dict(
    sheet="09_VAZAO", num="09", titulo="VAZÃO EM TUBULAÇÕES", nome="Vazão",
    categoria="MECÂNICA DOS FLUIDOS",
    card="Área de passagem e vazão em tubos circulares.",
    desc="Calcula a área de passagem e a vazão volumétrica de um fluido em um tubo circular a partir do diâmetro interno e da velocidade média.",
    entradas=[
        dict(row=8, label="Diâmetro interno do tubo (D)", unit="mm", ex=50, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=9, label="Velocidade média (v)", unit="m/s", ex=2, fmt="#,##0.000", regra="nonneg", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Área da seção transversal (A)", unit="m²", f=R("PI()*(E8/1000)^2/4"), fmt="0.0000000"),
        dict(row=9, label="Vazão volumétrica (Q)", unit="m³/s", f=R("L8*E9"), fmt="0.000000"),
        dict(row=10, label="Vazão volumétrica (Q)", unit="L/s", f=R("L9*1000"), fmt="#,##0.000"),
        dict(row=11, label="Vazão volumétrica (Q)", unit="m³/h", f=R("L9*3600"), fmt="#,##0.000"),
    ],
    msgs={"E8": "Erro: informe um diâmetro positivo.", "E9": "Erro: a velocidade não pode ser negativa."},
    dica=("E8<1", "Atenção: diâmetro menor que 1 mm. Verifique as unidades informadas (diâmetro em milímetros)."),
    aviso="Diâmetro informado em milímetros (diâmetro interno, não o nominal). Velocidade média em m/s.",
    expl=[
        ("Fórmula principal", "A = π·D² / 4        Q = A·v"),
        ("Variáveis", "A: área interna da seção  •  D: diâmetro interno  •  v: velocidade média do escoamento  •  Q: vazão volumétrica."),
        ("Conversões", "D (mm) ÷ 1000 = m.  1 m³/s = 1000 L/s = 3600 m³/h."),
        ("Como é feito", "A área do círculo é calculada com o diâmetro em metros e multiplicada pela velocidade média, resultando em m³/s, que depois é convertida."),
        ("Exemplo", "D = 50 mm e v = 2 m/s  →  A ≈ 0,0019635 m², Q ≈ 0,003927 m³/s = 3,927 L/s = 14,137 m³/h."),
    ],
    cuidados=[
        "• Tubo circular completamente cheio (escoamento forçado), usando a velocidade média na seção.",
        "• Use o diâmetro interno real do tubo. O diâmetro nominal comercial pode ser bem diferente.",
        "• Para a vazão em massa, multiplique Q pela densidade do fluido (ṁ = ρ·Q).",
    ],
))

# ---------------- 10 REYNOLDS ----------------
CALCS.append(dict(
    sheet="10_REYNOLDS", num="10", titulo="NÚMERO DE REYNOLDS", nome="Número de Reynolds",
    categoria="MECÂNICA DOS FLUIDOS",
    card="Reynolds e regime de escoamento em tubos.",
    desc="Calcula o número de Reynolds e indica uma classificação aproximada do regime de escoamento interno em tubos circulares.",
    entradas=[
        dict(row=8, label="Densidade do fluido (ρ)", unit="kg/m³", ex=1000, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=9, label="Velocidade média (v)", unit="m/s", ex=0.1, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=10, label="Diâmetro interno (D)", unit="mm", ex=20, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=11, label="Viscosidade dinâmica (μ)", unit="Pa·s", ex=0.001, fmt="0.000000", regra="pos", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Número de Reynolds (Re)", unit="adim.", f=R("E8*E9*(E10/1000)/E11"), fmt="#,##0.00"),
        dict(row=9, label="Regime aproximado", unit="",
             f=R('IF(E9=0,"Sem escoamento",IF(ROUND(L8,6)<2300,"Laminar",IF(ROUND(L8,6)<4000,"Transição","Turbulento")))'),
             fmt="@", texto=True),
        dict(row=10, label="Viscosidade cinemática (ν)", unit="m²/s", f=R("E11/E8"), fmt="0.000E+00"),
    ],
    msgs={"E8": "Erro: a densidade deve ser maior que zero.",
          "E9": "Erro: a velocidade não pode ser negativa.",
          "E10": "Erro: informe um diâmetro positivo.",
          "E11": "Erro: a viscosidade dinâmica deve ser maior que zero."},
    dica=("E11>=1", "Atenção: viscosidade ≥ 1 Pa·s. Verifique as unidades informadas (água a 20 °C ≈ 0,001 Pa·s; 1 cP = 0,001 Pa·s)."),
    aviso="Diâmetro em mm e viscosidade dinâmica em Pa·s (água a 20 °C ≈ 0,001 Pa·s). Se tiver a viscosidade em cP, divida por 1000.",
    expl=[
        ("Fórmula principal", "Re = ρ·v·D / μ = v·D / ν"),
        ("Variáveis", "Re: número de Reynolds (adimensional)  •  ρ: densidade  •  v: velocidade média  •  D: diâmetro interno  •  μ: viscosidade dinâmica  •  ν = μ/ρ: viscosidade cinemática."),
        ("Conversões", "D (mm) ÷ 1000 = m. Com ρ em kg/m³, v em m/s e μ em Pa·s (= kg/(m·s)), todas as unidades se cancelam."),
        ("Como é feito", "Re compara forças de inércia e forças viscosas. Faixas usuais em tubos: Re < 2300 laminar; 2300 ≤ Re < 4000 transição; Re ≥ 4000 turbulento."),
        ("Exemplo", "ρ = 1000 kg/m³, v = 0,1 m/s, D = 20 mm, μ = 0,001 Pa·s  →  Re = 2000 (laminar), ν = 1,0 × 10⁻⁶ m²/s."),
    ],
    cuidados=[
        "• Os limites 2300 e 4000 são aproximações usuais para escoamento interno em tubos circulares e não substituem uma avaliação detalhada.",
        "• O Reynolds sozinho não garante o ponto exato de transição: rugosidade, vibrações e perturbações na entrada também influenciam.",
        "• A viscosidade varia muito com a temperatura. Use propriedades do fluido na temperatura de operação.",
    ],
))

# ---------------- 11 PERDA DE CARGA ----------------
CALCS.append(dict(
    sheet="11_PERDA_CARGA", num="11", titulo="PERDA DE CARGA DISTRIBUÍDA (DARCY-WEISBACH)", nome="Perda de Carga",
    categoria="MECÂNICA DOS FLUIDOS",
    card="Perda distribuída por Darcy-Weisbach.",
    desc="Calcula a perda de carga distribuída e a queda de pressão por atrito em um trecho reto de tubulação, a partir do fator de atrito de Darcy.",
    entradas=[
        dict(row=8, label="Fator de atrito de Darcy (f)", unit="adim.", ex=0.02, fmt="0.00000", regra="pos", obrig=True),
        dict(row=9, label="Comprimento da tubulação (L)", unit="m", ex=10, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=10, label="Diâmetro interno (D)", unit="mm", ex=50, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=11, label="Velocidade média (v)", unit="m/s", ex=2, fmt="#,##0.000", regra="nonneg", obrig=True),
        dict(row=12, label="Aceleração da gravidade (g)", unit="m/s²", ex=9.81, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=13, label="Densidade do fluido (ρ) (opcional)", unit="kg/m³", ex=1000, fmt="#,##0.000", regra="pos", obrig=False),
    ],
    saidas=[
        dict(row=8, label="Perda de carga distribuída (hf)", unit="m", f=R("E8*(E9/(E10/1000))*E11^2/(2*E12)"), fmt="#,##0.0000"),
        dict(row=9, label="Queda de pressão por atrito (Δp)", unit="kPa",
             f='=IF(OR($L$18<>"OK",E13=""),"",E13*E12*L8/1000)', fmt="#,##0.000"),
        dict(row=10, label="Queda de pressão por atrito (Δp)", unit="Pa",
             f='=IF(OR($L$18<>"OK",E13=""),"",L9*1000)', fmt="#,##0.00"),
    ],
    msgs={"E8": "Erro: o fator de atrito deve ser maior que zero.",
          "E9": "Erro: o comprimento deve ser maior que zero.",
          "E10": "Erro: informe um diâmetro positivo.",
          "E11": "Erro: a velocidade não pode ser negativa.",
          "E12": "Erro: a gravidade deve ser maior que zero.",
          "E13": "Erro: a densidade deve ser maior que zero."},
    dica=("E8>0.1", "Atenção: fator de Darcy acima de 0,1. Valores usuais ficam entre 0,008 e 0,1. Verifique as unidades informadas."),
    aviso="Informe o fator de atrito de Darcy (não o de Fanning: fDarcy = 4·fFanning). Diâmetro em mm. A densidade é opcional e só serve para a queda de pressão.",
    expl=[
        ("Fórmula principal", "hf = f·(L/D)·v² / (2·g)        Δp = ρ·g·hf"),
        ("Variáveis", "hf: perda de carga em metros de coluna do próprio fluido  •  f: fator de atrito de Darcy  •  L: comprimento  •  D: diâmetro interno  •  v: velocidade média  •  g: gravidade  •  ρ: densidade."),
        ("Conversões", "D (mm) ÷ 1000 = m.  ρ·g·hf resulta em Pa; Pa ÷ 1000 = kPa."),
        ("Como é feito", "A equação de Darcy-Weisbach relaciona o atrito na parede com a energia cinética do escoamento. O fator f deve vir do diagrama de Moody, de Colebrook ou de f = 64/Re (laminar)."),
        ("Exemplo", "f = 0,02, L = 10 m, D = 50 mm, v = 2 m/s, g = 9,81 m/s², ρ = 1000 kg/m³  →  hf ≈ 0,8155 m e Δp = 8,000 kPa."),
    ],
    cuidados=[
        "• O fator informado deve ser o fator de atrito de Darcy, e não o de Fanning. A planilha não estima f automaticamente.",
        "• Considera apenas perdas distribuídas em trecho reto. Perdas localizadas em válvulas, curvas e conexões não estão incluídas.",
        "• Escoamento permanente, incompressível, tubo cheio e de seção constante, compatível com as hipóteses de Darcy-Weisbach.",
    ],
))

# ---------------- 12 CONDUÇÃO ----------------
CALCS.append(dict(
    sheet="12_CONDUCAO", num="12", titulo="TRANSFERÊNCIA DE CALOR POR CONDUÇÃO", nome="Transferência de Calor",
    categoria="TRANSFERÊNCIA DE CALOR",
    card="Condução em parede plana (Lei de Fourier).",
    desc="Calcula a taxa de transferência de calor por condução através de uma parede plana, a resistência térmica e o fluxo de calor.",
    entradas=[
        dict(row=8, label="Condutividade térmica (k)", unit="W/(m·K)", ex=0.8, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=9, label="Área de transferência (A)", unit="m²", ex=2, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=10, label="Espessura da parede (L)", unit="mm", ex=100, fmt="#,##0.000", regra="pos", obrig=True),
        dict(row=11, label="Temperatura do lado 1 (T₁)", unit="°C", ex=50, fmt="#,##0.00", regra="tempC", obrig=True),
        dict(row=12, label="Temperatura do lado 2 (T₂)", unit="°C", ex=20, fmt="#,##0.00", regra="tempC", obrig=True),
    ],
    saidas=[
        dict(row=8, label="Taxa de calor com sinal (Q̇)", unit="W", f=R("E8*E9*(E11-E12)/(E10/1000)"), fmt="#,##0.00"),
        dict(row=9, label="Módulo da taxa de calor |Q̇|", unit="W", f=R("ABS(L8)"), fmt="#,##0.00"),
        dict(row=10, label="Resistência térmica (Rt)", unit="K/W", f=R("(E10/1000)/(E8*E9)"), fmt="0.000000"),
        dict(row=11, label="Fluxo de calor com sinal (q″)", unit="W/m²", f=R("L8/E9"), fmt="#,##0.00"),
        dict(row=12, label="Sentido da transferência", unit="",
             f=R('IF(L8>0,"Do lado 1 para o lado 2",IF(L8<0,"Do lado 2 para o lado 1","Sem transferência líquida"))'),
             fmt="@", texto=True),
    ],
    msgs={"E8": "Erro: a condutividade deve ser maior que zero.",
          "E9": "Erro: a área deve ser maior que zero.",
          "E10": "Erro: a espessura deve ser maior que zero.",
          "E11": "Erro: T₁ deve ser maior que -273,15 °C (zero absoluto).",
          "E12": "Erro: T₂ deve ser maior que -273,15 °C (zero absoluto)."},
    dica=None,
    aviso="Espessura em milímetros e temperaturas em °C (podem ser negativas). Uma diferença de temperatura em °C é igual à mesma diferença em K.",
    expl=[
        ("Fórmula principal", "Q̇ = k·A·(T₁ − T₂) / L        Rt = L / (k·A)        q″ = Q̇ / A"),
        ("Variáveis", "Q̇: taxa de calor (positiva do lado 1 para o lado 2)  •  k: condutividade térmica  •  A: área  •  L: espessura  •  T₁, T₂: temperaturas das faces  •  Rt: resistência térmica  •  q″: fluxo de calor."),
        ("Conversões", "L (mm) ÷ 1000 = m. Como ΔT em °C = ΔT em K, as temperaturas podem ser usadas em °C na diferença."),
        ("Como é feito", "A Lei de Fourier para regime permanente em parede plana fornece um perfil linear de temperatura. A taxa de calor é a diferença de temperatura dividida pela resistência térmica."),
        ("Exemplo", "k = 0,8 W/(m·K), A = 2 m², L = 100 mm, T₁ = 50 °C, T₂ = 20 °C  →  Q̇ = 480 W, Rt = 0,0625 K/W, q″ = 240 W/m²."),
    ],
    cuidados=[
        "• Condução unidimensional, em regime permanente, com condutividade constante e sem geração interna de calor.",
        "• Não inclui resistências de convecção ou radiação nas faces. T₁ e T₂ são as temperaturas das superfícies da parede.",
        "• Para paredes compostas, some as resistências térmicas das camadas em série.",
    ],
))

# --------------------------------------------------------------------------
# Valores de referência independentes (Python, precisão dupla)
# --------------------------------------------------------------------------
REF = {}
REF["01_R"] = math.hypot(100 + 100 * math.cos(math.radians(90)), 100 * math.sin(math.radians(90)))
REF["01_ang"] = 45.0
REF["02_MPa"] = 10 * 1000 / 100
REF["02_Pa"] = REF["02_MPa"] * 1e6
REF["03_dL"] = (10 * 1000 * 1000) / (100 * 200 * 1000)
REF["03_eps"] = REF["03_dL"] / 1000
REF["03_sig"] = 10 * 1000 / 100
REF["04_tau"] = 16 * 100 * 1000 / (math.pi * 20 ** 3)
REF["04_phi"] = 32 * 100 * 1000 * 1000 / (math.pi * 80 * 1000 * 20 ** 4)
REF["04_deg"] = math.degrees(REF["04_phi"])
REF["05_w"] = 2 * math.pi * 1500 / 60
REF["05_P"] = 100 * REF["05_w"] / 1000
REF["06_m"] = 101.325 * 1000 * 1 / (287 * (20 + 273.15))
REF["06_K"] = 293.15
REF["07_eta"] = 300 / 1000
REF["07_Q"] = 700.0
REF["08_dp"] = 1000 * 9.81 * 2 / 1000
REF["08_p"] = 101.325 + REF["08_dp"]
REF["09_A"] = math.pi * 0.05 ** 2 / 4
REF["09_Ls"] = REF["09_A"] * 2 * 1000
REF["09_m3h"] = REF["09_A"] * 2 * 3600
REF["10_Re"] = 1000 * 0.1 * 0.02 / 0.001
REF["10_nu"] = 0.001 / 1000
REF["11_hf"] = 0.02 * (10 / 0.05) * 2 ** 2 / (2 * 9.81)
REF["11_dp"] = 1000 * 9.81 * REF["11_hf"] / 1000
REF["12_Q"] = 0.8 * 2 * (50 - 20) / 0.1
REF["12_R"] = 0.1 / (0.8 * 2)
REF["12_q"] = REF["12_Q"] / 2

# (calc idx, grandeza, unidade, esperado, célula, principal)
TESTES = [
    (0, "Módulo da resultante R", "N", REF["01_R"], "L10", True),
    (0, "Ângulo da resultante", "graus", REF["01_ang"], "L11", False),
    (1, "Tensão normal", "MPa", REF["02_MPa"], "L8", True),
    (1, "Tensão normal", "Pa", REF["02_Pa"], "L9", False),
    (2, "Alongamento ΔL", "mm", REF["03_dL"], "L8", True),
    (2, "Deformação ε", "adim.", REF["03_eps"], "L9", False),
    (2, "Tensão axial", "MPa", REF["03_sig"], "L10", False),
    (3, "Tensão máxima τ", "MPa", REF["04_tau"], "L8", True),
    (3, "Ângulo de torção", "rad", REF["04_phi"], "L9", False),
    (3, "Ângulo de torção", "graus", REF["04_deg"], "L10", False),
    (4, "Potência", "kW", REF["05_P"], "L8", True),
    (4, "Velocidade angular", "rad/s", REF["05_w"], "L10", False),
    (5, "Massa de ar", "kg", REF["06_m"], "L10", True),
    (5, "Temperatura absoluta", "K", REF["06_K"], "L12", False),
    (6, "Rendimento térmico", "fração", REF["07_eta"], "L8", True),
    (6, "Calor rejeitado", "kJ", REF["07_Q"], "L9", False),
    (7, "Variação de pressão", "kPa", REF["08_dp"], "L8", True),
    (7, "Pressão absoluta no ponto", "kPa", REF["08_p"], "L10", False),
    (8, "Vazão", "L/s", REF["09_Ls"], "L10", True),
    (8, "Área da seção", "m²", REF["09_A"], "L8", False),
    (8, "Vazão", "m³/h", REF["09_m3h"], "L11", False),
    (9, "Número de Reynolds", "adim.", REF["10_Re"], "L8", True),
    (9, "Regime", "texto", "Laminar", "L9", False),
    (9, "Viscosidade cinemática", "m²/s", REF["10_nu"], "L10", False),
    (10, "Perda de carga hf", "m", REF["11_hf"], "L8", True),
    (10, "Queda de pressão", "kPa", REF["11_dp"], "L9", False),
    (11, "Taxa de calor", "W", REF["12_Q"], "L8", True),
    (11, "Resistência térmica", "K/W", REF["12_R"], "L10", False),
    (11, "Fluxo de calor", "W/m²", REF["12_q"], "L11", False),
    (11, "Sentido", "texto", "Do lado 1 para o lado 2", "L12", False),
]

TEXTO_ENTRADAS = [
    "F1 = 100 N a 0°; F2 = 100 N a 90°; F3 e F4 vazias",
    "F = 10 kN; A = 100 mm²",
    "F = 10 kN; L = 1000 mm; A = 100 mm²; E = 200 GPa",
    "T = 100 N·m; d = 20 mm; L = 1000 mm; G = 80 GPa",
    "Modo Torque para potência; n = 1500 RPM; T = 100 N·m",
    "Calcular massa; p = 101,325 kPa; V = 1 m³; T = 20 °C; R = 287",
    "Qent = 1000 kJ; Wlíq = 300 kJ",
    "ρ = 1000 kg/m³; g = 9,81 m/s²; h = 2 m; p₀ = 101,325 kPa",
    "D = 50 mm; v = 2 m/s",
    "ρ = 1000 kg/m³; v = 0,1 m/s; D = 20 mm; μ = 0,001 Pa·s",
    "f = 0,02; L = 10 m; D = 50 mm; v = 2 m/s; g = 9,81; ρ = 1000",
    "k = 0,8 W/(m·K); A = 2 m²; L = 100 mm; T₁ = 50 °C; T₂ = 20 °C",
]


def cond_exemplo(calc, prefixo=""):
    partes = []
    for e in calc["entradas"]:
        c = f"{prefixo}$E${e['row']}"
        if e["ex"] is None:
            partes.append(f'{c}=""')
        elif isinstance(e["ex"], str):
            partes.append(f"{c}={q(e['ex'])}")
        else:
            partes.append(f"{c}={e['ex']!r}")
    return "AND(" + ",".join(partes) + ")"


# --------------------------------------------------------------------------
# Construção das abas de calculadora
# --------------------------------------------------------------------------
LARGURAS = {"A": 8.5, "B": 8.5, "C": 8.5, "D": 8.5, "E": 10.5, "F": 10.5, "G": 12,
            "H": 8.5, "I": 8.5, "J": 8.5, "K": 8.5, "L": 11, "M": 11, "N": 12}


def config_folha(ws, area="A1:N35"):
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 100
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_area = area
    ws.page_margins.left = ws.page_margins.right = 0.4
    ws.page_margins.top = ws.page_margins.bottom = 0.5
    ws.print_options.horizontalCentered = True


def adicionar_cf(ws, rng, formula, bg=None, cor=None, bold=None, stop=True):
    dxf_font = Font(color=cor, bold=bold) if (cor or bold is not None) else None
    rule = FormulaRule(formula=[formula], stopIfTrue=stop,
                       fill=fill(bg) if bg else None, font=dxf_font)
    ws.conditional_formatting.add(rng, rule)


def construir_calculadora(wb, calc, idx):
    ws = wb.create_sheet(calc["sheet"])
    ws.sheet_properties.tabColor = AZUL_TEC
    fundo_planilha(ws)
    for col, w in LARGURAS.items():
        ws.column_dimensions[col].width = w
    for col in "OPQRSTUV":
        ws.column_dimensions[col].width = 9

    alturas = {1: 26, 2: 26, 3: 34, 4: 22, 5: 8, 6: 26, 7: 18, 16: 8, 17: 22, 18: 30, 19: 26,
               20: 24, 21: 30, 22: 42, 23: 34, 24: 42, 25: 30, 26: 8, 27: 24, 28: 30, 29: 30,
               30: 30, 31: 10, 32: 26, 33: 8, 34: 20}
    for r in range(8, 16):
        alturas[r] = 26
    for r, h in alturas.items():
        ws.row_dimensions[r].height = h

    # Cabeçalho
    box(ws, "A1:N2", f"CALCULADORA {calc['num']}  •  {calc['titulo']}", font(22, True, BRANCO), AZUL_ESCURO,
        al("left", "center", indent=1))
    box(ws, "A3:N3", calc["desc"], font(11, False, "334155"), BRANCO, al("left", "center", indent=1),
        Border(bottom=Side(style="medium", color=AZUL_TEC)))
    box(ws, "A4:G4", "Preencha apenas os campos azuis. Os resultados são atualizados automaticamente.",
        font(10, False, CINZA, italic=True), None, al("left", "center", indent=1))
    ex = box(ws, "H4:N4",
             f'=IF({cond_exemplo(calc)},"Exemplo demonstrativo preenchido.","Valores informados pelo usuário.")',
             font(10, True, AZUL_TEC, italic=True), None, al("right", "center", indent=1))

    # Cabeçalhos de seção
    box(ws, "A6:G6", "DADOS DE ENTRADA", font(14, True, BRANCO), AZUL_TEC, al("left", "center", indent=1))
    box(ws, "H6:N6", "RESULTADOS AUTOMÁTICOS", font(14, True, BRANCO), VERDE_ESC, al("left", "center", indent=1))
    sub = font(9, True, CINZA)
    box(ws, "A7:D7", "PARÂMETRO", sub, BRANCO, al("left", "center", indent=1))
    box(ws, "E7:F7", "VALOR", sub, BRANCO, al("center"))
    box(ws, "G7", "UNIDADE", sub, BRANCO, al("center"))
    box(ws, "H7:K7", "RESULTADO", sub, BRANCO, al("left", "center", indent=1))
    box(ws, "L7:M7", "VALOR", sub, BRANCO, al("center"))
    box(ws, "N7", "UNIDADE", sub, BRANCO, al("center"))

    linha_sep = Border(bottom=Side(style="thin", color=CINZA_CLARO))
    for r in range(8, 16):
        box(ws, f"A{r}:D{r}", None, font(11), BRANCO, al("left", "center", indent=1), linha_sep)
        box(ws, f"E{r}:F{r}", None, font(13), BRANCO, al("right", "center", shrink=True), linha_sep)
        box(ws, f"G{r}", None, font(10, False, CINZA), BRANCO, al("center"), linha_sep)
        box(ws, f"H{r}:K{r}", None, font(11), BRANCO, al("left", "center", indent=1), linha_sep)
        box(ws, f"L{r}:M{r}", None, font(16, True, VERDE_ESC), BRANCO, al("right", "center", shrink=True), linha_sep)
        box(ws, f"N{r}", None, font(10, False, CINZA), BRANCO, al("center"), linha_sep)

    # Entradas
    validacoes = []
    for e in calc["entradas"]:
        r = e["row"]
        ws[f"A{r}"].value = e["label"]
        ws[f"G{r}"].value = e["unit"]
        cel = ws[f"E{r}"]
        cel.value = e["ex"]
        for c in (ws[f"E{r}"], ws[f"F{r}"]):
            c.fill = fill(AZUL_CLARO)
            c.border = BORDA_AZUL
            c.number_format = e["fmt"]
            c.protection = Protection(locked=False)
            c.font = font(13, True, AZUL_ESCURO)
            if e["regra"] == "lista":
                c.alignment = al("center", "center", shrink=True)
                c.font = font(11, True, AZUL_ESCURO)
        if e["regra"] == "lista":
            dv = DataValidation(type="list", formula1='"' + ",".join(e["lista"]) + '"', allow_blank=False)
            dv.errorTitle = "Opção inválida"
            dv.error = "Escolha uma das opções da lista."
            dv.promptTitle = "Modo de cálculo"
            dv.prompt = "Clique na seta e escolha uma opção."
            dv.showErrorMessage = True
            dv.showInputMessage = True
        else:
            dv = dv_para(e["regra"], e["label"].split(" (")[0], e["unit"])
        dv.add(f"E{r}:F{r}")
        validacoes.append(dv)
    for dv in validacoes:
        ws.add_data_validation(dv)

    # Saídas
    for s in calc["saidas"]:
        r = s["row"]
        ws[f"H{r}"].value = s["label"]
        ws[f"N{r}"].value = s["unit"]
        ws[f"L{r}"].value = s["f"]
        for c in (ws[f"L{r}"], ws[f"M{r}"]):
            c.fill = fill(VERDE)
            c.border = BORDA_VERDE
            c.number_format = s["fmt"] if not s.get("texto") else "General"
            if s.get("texto"):
                c.font = font(12, True, VERDE_ESC)
                c.alignment = al("center", "center", shrink=True)

    # Status
    if "status" in calc:
        status = calc["status"]
    else:
        campos = []
        for e in calc["entradas"]:
            campos.append((f"E{e['row']}", e["obrig"], e["regra"], calc["msgs"].get(f"E{e['row']}", "")))
        status = status_generico(campos, calc.get("pares", ()), calc.get("extras", ()))
    box(ws, "H18:K18", "STATUS DOS DADOS", font(11, True, AZUL_ESCURO), BRANCO, al("left", "center", indent=1), BORDA)
    box(ws, "L18:N18", status, font(11, True, TEXTO), BRANCO, al("center", "center"), BORDA)
    dica = calc.get("dica")
    if dica:
        apres = (f'=IF($L$18<>"OK","Resultados ocultos até os dados serem corrigidos.",'
                 f'IF({dica[0]},{q("OK — cálculo realizado. " + dica[1])},"OK — cálculo realizado."))')
    else:
        apres = '=IF($L$18<>"OK","Resultados ocultos até os dados serem corrigidos.","OK — cálculo realizado.")'
    box(ws, "H19:N19", apres, font(10, True, TEXTO), BRANCO, al("center", "center"), BORDA)
    for rng, ref in (("L18:N18", "$L$18"), ("H19:N19", "$H$19")):
        adicionar_cf(ws, rng, f'ISNUMBER(SEARCH("Atenção",{ref}))', AMARELO, AMARELO_ESC, True)
        adicionar_cf(ws, rng, '$L$18="OK"', VERDE, VERDE_ESC, True)
        adicionar_cf(ws, rng, 'LEFT($L$18,4)="Erro"', VERMELHO_CLARO, VERMELHO, True)
        adicionar_cf(ws, rng, '$L$18<>"OK"', AMARELO, AMARELO_ESC, True)

    # Aviso rápido
    box(ws, "A17:G17", "⚠  AVISOS RÁPIDOS", font(11, True, AMARELO_ESC), AMARELO, al("left", "center", indent=1))
    box(ws, "A18:G19", calc["aviso"], font(10, False, AMARELO_ESC), AMARELO, al("left", "center", indent=1))

    # Explicação técnica
    box(ws, "A20:N20", "COMO O CÁLCULO É FEITO", font(13, True, BRANCO), AZUL_ESCURO, al("left", "center", indent=1))
    for i, (rot, txt) in enumerate(calc["expl"]):
        r = 21 + i
        destaque = i == 0
        box(ws, f"A{r}:C{r}", rot, font(10, True, AZUL_ESCURO), "F8FAFC", al("left", "center", indent=1), linha_sep)
        box(ws, f"D{r}:N{r}", txt,
            font(14 if destaque else 10, destaque, AZUL_ESCURO if destaque else "334155"),
            "F8FAFC", al("left", "center", indent=1), linha_sep)

    # Cuidados
    box(ws, "A27:N27", "CONDIÇÕES DE VALIDADE E CUIDADOS", font(13, True, AMARELO_ESC), AMARELO,
        al("left", "center", indent=1))
    for i, txt in enumerate(calc["cuidados"]):
        r = 28 + i
        box(ws, f"A{r}:N{r}", txt, font(10, False, "334155"), BRANCO, al("left", "center", indent=1), linha_sep)

    # Navegação
    prox = CALCS[(idx + 1) % len(CALCS)]["sheet"]
    nav_f = font(11, True, BRANCO)
    c = box(ws, "A32:D32", "◄  VOLTAR AO INÍCIO", nav_f, AZUL_ESCURO, al("center"))
    link(c, "INICIO")
    c = box(ws, "F32:I32", "?  COMO USAR", nav_f, CINZA, al("center"))
    link(c, "COMO_USAR")
    c = box(ws, "K32:N32", "PRÓXIMA CALCULADORA  ►", nav_f, AZUL_TEC, al("center"))
    link(c, prox)
    box(ws, "A34:N34", "Kit de 12 Calculadoras Automáticas de Engenharia Mecânica  •  Material didático de apoio. "
        "Os resultados dependem dos dados informados e das condições de validade de cada modelo.",
        font(9, False, CINZA, italic=True), None, al("center"))

    # Formatação condicional das entradas: desativado (cinza) e inválido (vermelho)
    for cel, cond in calc.get("desativar", ()):
        r = cel[1:]
        adicionar_cf(ws, f"E{r}:F{r}", f'AND({cond},$E${r}<>"")', VERMELHO_CLARO, VERMELHO, True)
        adicionar_cf(ws, f"E{r}:F{r}", cond, CINZA_CLARO, CINZA, False)
        adicionar_cf(ws, f"A{r}:D{r}", cond, None, "94A3B8", False)
    for e in calc["entradas"]:
        if e["regra"] == "lista":
            continue
        r = e["row"]
        adicionar_cf(ws, f"E{r}:F{r}", condicao_ruim(f"$E${r}", e["regra"]), VERMELHO_CLARO, VERMELHO, True)

    config_folha(ws)
    ws.page_setup.fitToHeight = 1
    ws.freeze_panes = "A3"
    ws.protection.sheet = True
    ws.protection.selectLockedCells = False
    ws.protection.selectUnlockedCells = False
    ws.protection.formatColumns = False
    return ws


# --------------------------------------------------------------------------
# INICIO
# --------------------------------------------------------------------------
def construir_inicio(wb):
    ws = wb.create_sheet("INICIO", 0)
    ws.sheet_properties.tabColor = AZUL_ESCURO
    fundo_planilha(ws, 22, 50)
    larg = {"A": 3, "B": 7, "C": 11, "D": 11, "E": 11, "F": 3, "G": 7, "H": 11, "I": 11, "J": 11,
            "K": 3, "L": 7, "M": 11, "N": 11, "O": 11, "P": 3}
    for col, w in larg.items():
        ws.column_dimensions[col].width = w
    for r in range(1, 6):
        for col in range(1, 17):
            ws.cell(r, col).fill = fill(AZUL_ESCURO)
    ws.row_dimensions[1].height = 14
    ws.row_dimensions[2].height = 36
    ws.row_dimensions[3].height = 24
    ws.row_dimensions[4].height = 22
    ws.row_dimensions[5].height = 12
    box(ws, "B2:O2", "KIT DE 12 CALCULADORAS AUTOMÁTICAS", font(26, True, BRANCO), AZUL_ESCURO, al("left", "center"))
    box(ws, "B3:O3", "ENGENHARIA MECÂNICA", font(14, True, "93C5FD"), AZUL_ESCURO, al("left", "center"))
    box(ws, "B4:O4", "Selecione uma ferramenta, insira os valores e confira seus resultados automaticamente.",
        font(11, False, "CBD5E1"), AZUL_ESCURO, al("left", "center"))

    ws.row_dimensions[6].height = 12
    ws.row_dimensions[7].height = 28
    c = box(ws, "B7:E7", "?  COMO USAR", font(11, True, BRANCO), CINZA, al("center"))
    link(c, "COMO_USAR")
    box(ws, "G7:J7", "Azul = você preenche   •   Verde = resultado automático", font(10, True, AZUL_ESCURO),
        BRANCO, al("center"), BORDA)
    c = box(ws, "L7:O7", "✔  CONFERIR TESTES", font(11, True, BRANCO), VERDE_ESC, al("center"))
    link(c, "TESTES")
    ws.row_dimensions[8].height = 14

    cols = [("B", "C", "E"), ("G", "H", "J"), ("L", "M", "O")]
    borda_card = Side(style="thin", color="CBD5E1")
    for i, calc in enumerate(CALCS):
        lin, col = divmod(i, 3)
        r0 = 9 + lin * 5
        c_num, c_ini, c_fim = cols[col]
        ws.row_dimensions[r0].height = 30
        ws.row_dimensions[r0 + 1].height = 16
        ws.row_dimensions[r0 + 2].height = 32
        ws.row_dimensions[r0 + 3].height = 24
        ws.row_dimensions[r0 + 4].height = 14
        box(ws, f"{c_num}{r0}", calc["num"], font(20, True, AZUL_TEC), BRANCO, al("center", "center"))
        box(ws, f"{c_ini}{r0}:{c_fim}{r0}", calc["nome"], font(13, True, AZUL_ESCURO), BRANCO, al("left", "center"))
        box(ws, f"{c_num}{r0 + 1}:{c_fim}{r0 + 1}", calc["categoria"], font(8, True, CINZA), BRANCO,
            al("left", "center", indent=1))
        box(ws, f"{c_num}{r0 + 2}:{c_fim}{r0 + 2}", calc["card"], font(10, False, "475569"), BRANCO,
            al("left", "top", indent=1))
        lk = box(ws, f"{c_num}{r0 + 3}:{c_fim}{r0 + 3}", "ABRIR CALCULADORA  ►", font(10, True, BRANCO), AZUL_TEC,
                 al("center", "center"))
        link(lk, calc["sheet"])
        # moldura do cartão
        letras = [chr(x) for x in range(ord(c_num), ord(c_fim) + 1)]
        for rr in range(r0, r0 + 4):
            for L in letras:
                cell = ws[f"{L}{rr}"]
                b = Border(left=borda_card if L == c_num else None, right=borda_card if L == c_fim else None,
                           top=Side(style="medium", color=AZUL_TEC) if rr == r0 else None,
                           bottom=borda_card if rr == r0 + 3 else None)
                cell.border = b

    rf = 9 + 4 * 5
    ws.row_dimensions[rf].height = 22
    ws.row_dimensions[rf + 1].height = 22
    box(ws, f"B{rf}:O{rf}", "Ferramentas didáticas de apoio aos estudos de Engenharia Mecânica.",
        font(11, True, AZUL_ESCURO), None, al("center"))
    box(ws, f"B{rf + 1}:O{rf + 1}",
        "Os resultados dependem dos dados informados e das condições de validade de cada modelo.",
        font(10, False, CINZA, italic=True), None, al("center"))
    config_folha(ws, f"A1:P{rf + 2}")
    ws.page_setup.orientation = "portrait"
    ws.protection.sheet = True
    return ws


# --------------------------------------------------------------------------
# COMO_USAR
# --------------------------------------------------------------------------
def construir_como_usar(wb):
    ws = wb.create_sheet("COMO_USAR", 1)
    ws.sheet_properties.tabColor = CINZA
    fundo_planilha(ws, 20, 80)
    larg = {"A": 3, "B": 6, "C": 14, "D": 14, "E": 14, "F": 14, "G": 14, "H": 14, "I": 14, "J": 3}
    for col, w in larg.items():
        ws.column_dimensions[col].width = w
    ws.row_dimensions[1].height = 14
    for col in range(1, 11):
        for r in (1, 2, 3):
            ws.cell(r, col).fill = fill(AZUL_ESCURO)
    ws.row_dimensions[2].height = 34
    ws.row_dimensions[3].height = 22
    box(ws, "B2:I2", "COMO USAR O KIT", font(22, True, BRANCO), AZUL_ESCURO, al("left", "center"))
    box(ws, "B3:I3", "Guia rápido para usar as 12 calculadoras sem precisar conhecer funções do Excel.",
        font(11, False, "CBD5E1"), AZUL_ESCURO, al("left", "center"))
    r = 5

    def secao(titulo, cor=AZUL_TEC):
        nonlocal r
        ws.row_dimensions[r].height = 24
        box(ws, f"B{r}:I{r}", titulo, font(13, True, BRANCO), cor, al("left", "center", indent=1))
        r += 1

    def linha(txt, num=None, h=22, bg=BRANCO, f=None):
        nonlocal r
        ws.row_dimensions[r].height = h
        if num is not None:
            box(ws, f"B{r}", num, font(12, True, AZUL_TEC), bg, al("center"), Border(bottom=Side(style="thin", color=CINZA_CLARO)))
            box(ws, f"C{r}:I{r}", txt, f or font(11), bg, al("left", "center", indent=1), Border(bottom=Side(style="thin", color=CINZA_CLARO)))
        else:
            box(ws, f"B{r}:I{r}", txt, f or font(11), bg, al("left", "center", indent=1), Border(bottom=Side(style="thin", color=CINZA_CLARO)))
        r += 1

    secao("COMO COMEÇAR")
    passos = [
        "Acesse a aba INICIO.",
        "Selecione uma calculadora clicando em ABRIR CALCULADORA.",
        "Leia as unidades exigidas ao lado de cada campo (coluna Unidade).",
        "Substitua os valores de exemplo dos campos azuis pelos dados do seu exercício.",
        "Confira o resultado calculado nos campos verdes e o STATUS DOS DADOS.",
        "Consulte a fórmula e as condições de aplicação na parte de baixo da calculadora.",
    ]
    for i, p in enumerate(passos, 1):
        linha(p, i)
    r += 1

    secao("LEGENDA DE CORES")
    legenda = [
        (AZUL_CLARO, AZUL_ESCURO, "AZUL", "Campo editável. Digite aqui os dados do exercício."),
        (VERDE, VERDE_ESC, "VERDE", "Resultado automático. É calculado por fórmula e não precisa ser digitado."),
        (AMARELO, AMARELO_ESC, "AMARELO", "Cuidado, aviso ou condição especial de uso do modelo."),
        (VERMELHO_CLARO, VERMELHO, "VERMELHO", "Erro de preenchimento. O campo ou o status indicam o que corrigir."),
        (CINZA_CLARO, CINZA, "CINZA", "Explicação, informação auxiliar ou campo que não é usado no modo escolhido."),
    ]
    for bg, cor, nome, txt in legenda:
        ws.row_dimensions[r].height = 24
        box(ws, f"B{r}:C{r}", nome, font(11, True, cor), bg, al("center"), BORDA)
        box(ws, f"D{r}:I{r}", txt, font(11), BRANCO, al("left", "center", indent=1), BORDA)
        r += 1
    r += 1

    secao("CUIDADOS COM UNIDADES")
    unidades = [
        ("1 kN = 1000 N", "Força: as calculadoras de tensão e deformação pedem kN."),
        ("1 GPa = 1000 MPa", "Módulos E e G são informados em GPa."),
        ("1 MPa = 1 N/mm²", "Por isso força em N dividida por área em mm² já dá MPa."),
        ("1 m = 1000 mm", "Diâmetros e espessuras são pedidos em mm na maioria das calculadoras."),
        ("1 m³ = 1000 litros", "1 m³/s = 1000 L/s = 3600 m³/h."),
        ("1 kPa = 1000 Pa", "Pressões são exibidas em kPa e em Pa."),
        ("1 bar = 100 kPa", "A pressão atmosférica padrão vale 101,325 kPa ≈ 1,013 bar."),
        ("K = °C + 273,15", "Equações de gases usam temperatura absoluta. Diferenças em °C e em K são iguais."),
        ("1 RPM = 2π/60 rad/s", "Rotação em RPM é convertida para rad/s antes de calcular a potência."),
    ]
    for rel, obs in unidades:
        ws.row_dimensions[r].height = 22
        box(ws, f"B{r}:D{r}", rel, font(12, True, AZUL_ESCURO), AZUL_CLARO, al("left", "center", indent=1), BORDA)
        box(ws, f"E{r}:I{r}", obs, font(10, False, "334155"), BRANCO, al("left", "center", indent=1), BORDA)
        r += 1
    linha("Você não precisa converter nada: digite no campo a unidade indicada e a planilha faz as conversões.",
          f=font(10, True, VERDE_ESC), bg=VERDE)
    r += 1

    secao("MENSAGENS DE STATUS")
    status = [
        (VERDE, VERDE_ESC, "OK", "Dados válidos. Os resultados aparecem nos campos verdes."),
        (AMARELO, AMARELO_ESC, "Preencha...", "Falta um campo obrigatório. Os resultados ficam vazios até você completar."),
        (VERMELHO_CLARO, VERMELHO, "Erro: ...", "Algum valor é inválido (texto, zero em divisor, negativo onde não pode). A mensagem diz qual."),
        (AMARELO, AMARELO_ESC, "Atenção: ...", "O cálculo foi feito, mas um valor parece estar em unidade errada. Confira."),
    ]
    for bg, cor, nome, txt in status:
        ws.row_dimensions[r].height = 24
        box(ws, f"B{r}:C{r}", nome, font(11, True, cor), bg, al("center"), BORDA)
        box(ws, f"D{r}:I{r}", txt, font(11), BRANCO, al("left", "center", indent=1), BORDA)
        r += 1
    linha("Campos opcionais podem ficar vazios. Quando um par de campos opcionais existir (ex.: comprimento e G na torção), preencha os dois ou nenhum.",
          h=34, f=font(10, False, "334155"))
    linha("Nas calculadoras 05 e 06 há uma lista suspensa: clique na célula azul do modo e escolha a opção na seta. O campo que não é usado fica cinza e deve ficar vazio.",
          h=34, f=font(10, False, "334155"))
    r += 1

    secao("AVISO IMPORTANTE", AMARELO_ESC)
    ws.row_dimensions[r].height = 58
    box(ws, f"B{r}:I{r}",
        "Este material foi desenvolvido para apoio didático e conferência de exercícios acadêmicos. Os cálculos "
        "utilizam modelos simplificados e hipóteses específicas, descritas em cada ferramenta. Não substitui "
        "projetos de engenharia, normas técnicas, avaliações profissionais ou verificações de segurança.",
        font(11, True, AMARELO_ESC), AMARELO, al("left", "center", indent=1), BORDA)
    r += 2

    secao("COMPATIBILIDADE", CINZA)
    comp = [
        "Arquivo desenvolvido para Microsoft Excel (Windows e Mac), versão 2016 ou superior. Não usa macros, VBA, internet ou complementos.",
        "As abas estão protegidas sem senha, só para evitar que uma fórmula seja apagada sem querer. Para editar tudo: Revisão > Desproteger Planilha.",
        "Excel Online, Google Sheets e LibreOffice podem abrir o arquivo, mas a compatibilidade total com eles não foi garantida (proteção, listas e formatação podem variar).",
    ]
    for t in comp:
        linha(t, h=34, f=font(10, False, "334155"))
    r += 1
    ws.row_dimensions[r].height = 26
    c = box(ws, f"B{r}:E{r}", "◄  VOLTAR AO INÍCIO", font(11, True, BRANCO), AZUL_ESCURO, al("center"))
    link(c, "INICIO")
    c = box(ws, f"F{r}:I{r}", "ABRIR CALCULADORA 01  ►", font(11, True, BRANCO), AZUL_TEC, al("center"))
    link(c, CALCS[0]["sheet"])
    config_folha(ws, f"A1:J{r + 1}")
    ws.page_setup.orientation = "portrait"
    ws.freeze_panes = "A4"
    ws.protection.sheet = True
    return ws


# --------------------------------------------------------------------------
# TESTES
# --------------------------------------------------------------------------
NAO_APLIC = "ENTRADAS ALTERADAS — TESTE PADRÃO NÃO APLICÁVEL"


def construir_testes(wb):
    ws = wb.create_sheet("TESTES")
    ws.sheet_properties.tabColor = VERDE_ESC
    fundo_planilha(ws, 16, 90)
    larg = {"A": 6, "B": 20, "C": 34, "D": 24, "E": 9, "F": 16, "G": 16, "H": 13, "I": 30, "J": 3}
    for col, w in larg.items():
        ws.column_dimensions[col].width = w
    for col in range(1, 11):
        for rr in (1, 2, 3):
            ws.cell(rr, col).fill = fill(AZUL_ESCURO)
    ws.row_dimensions[1].height = 10
    ws.row_dimensions[2].height = 32
    ws.row_dimensions[3].height = 22
    box(ws, "A2:I2", "  TESTES  •  CONFERÊNCIA E VALIDAÇÃO", font(20, True, BRANCO), AZUL_ESCURO, al("left", "center"))
    box(ws, "A3:I3", "  Compara os resultados das calculadoras com valores de referência calculados de forma independente.",
        font(11, False, "CBD5E1"), AZUL_ESCURO, al("left", "center"))

    # Tolerâncias
    ws.row_dimensions[5].height = 22
    ws.row_dimensions[6].height = 22
    box(ws, "A5:C5", "Tolerância absoluta", font(11, True, AZUL_ESCURO), BRANCO, al("left", "center", indent=1), BORDA)
    box(ws, "D5", 1e-9, font(11, True, AZUL_ESCURO), BRANCO, al("center"), BORDA, "0.0E+00")
    box(ws, "A6:C6", "Tolerância relativa", font(11, True, AZUL_ESCURO), BRANCO, al("left", "center", indent=1), BORDA)
    box(ws, "D6", 1e-9, font(11, True, AZUL_ESCURO), BRANCO, al("center"), BORDA, "0.0E+00")
    box(ws, "E5:I6", "Critério: |calculado − esperado| ≤ MÁXIMO(tol. absoluta; tol. relativa × |esperado|). "
        "Valores esperados calculados em Python (precisão dupla), a partir das mesmas equações e entradas dos exemplos.",
        font(9, False, CINZA, italic=True), None, al("left", "center", indent=1))

    # Tabela 1
    r = 8
    ws.row_dimensions[r].height = 24
    box(ws, f"A{r}:I{r}", "1. TESTES DAS CALCULADORAS (usam os exemplos originais de cada aba)", font(13, True, BRANCO),
        AZUL_TEC, al("left", "center", indent=1))
    r += 1
    cab = ["Nº", "Calculadora", "Entradas do caso de teste", "Grandeza verificada", "Unidade",
           "Resultado esperado", "Resultado calculado", "Diferença absoluta", "Status do teste"]
    ws.row_dimensions[r].height = 30
    for i, t in enumerate(cab):
        box(ws, f"{chr(65 + i)}{r}", t, font(10, True, BRANCO), AZUL_ESCURO, al("center", "center"), BORDA)
    r += 1
    inicio_t1 = r
    for idx, grand, uni, esp, cel, principal in TESTES:
        calc = CALCS[idx]
        sh = f"'{calc['sheet']}'!"
        ws.row_dimensions[r].height = 30
        bg = "F8FAFC" if principal else BRANCO
        box(ws, f"A{r}", calc["num"], font(10, True, AZUL_TEC), bg, al("center"), BORDA)
        box(ws, f"B{r}", calc["nome"] + (" (principal)" if principal else ""), font(10, principal), bg, al("left", "center"), BORDA)
        box(ws, f"C{r}", TEXTO_ENTRADAS[idx], font(9, False, "475569"), bg, al("left", "center"), BORDA)
        box(ws, f"D{r}", grand, font(10), bg, al("left", "center"), BORDA)
        box(ws, f"E{r}", uni, font(10, False, CINZA), bg, al("center"), BORDA)
        texto = isinstance(esp, str)
        fmt = "General" if texto else "#,##0.000000"
        if not texto and abs(esp) < 0.01:
            fmt = "0.000000E+00"
        if not texto and abs(esp) >= 1e6:
            fmt = "#,##0"
        box(ws, f"F{r}", esp, font(10, True, AZUL_ESCURO), bg, al("right", "center"), BORDA, fmt)
        cond = cond_exemplo(calc, sh)
        box(ws, f"G{r}", f'=IF({cond},{sh}{cel},"")', font(10, True, VERDE_ESC), bg, al("right", "center"), BORDA, fmt)
        box(ws, f"H{r}", f'=IF(AND(ISNUMBER(F{r}),ISNUMBER(G{r})),ABS(G{r}-F{r}),"")', font(9, False, CINZA), bg,
            al("right", "center"), BORDA, "0.0E+00")
        if texto:
            comp = f'G{r}=F{r}'
        else:
            comp = f'AND(ISNUMBER(G{r}),ABS(G{r}-F{r})<=MAX($D$5,$D$6*ABS(F{r})))'
        box(ws, f"I{r}", f'=IF(NOT({cond}),{q(NAO_APLIC)},IF({comp},"APROVADO","REPROVADO"))',
            font(9, True, TEXTO), bg, al("center", "center"), BORDA)
        r += 1
    fim_t1 = r - 1
    faixa = f"I{inicio_t1}:I{fim_t1}"
    adicionar_cf(ws, faixa, f'I{inicio_t1}="APROVADO"', VERDE, VERDE_ESC, True)
    adicionar_cf(ws, faixa, f'I{inicio_t1}="REPROVADO"', VERMELHO_CLARO, VERMELHO, True)
    adicionar_cf(ws, faixa, f'I{inicio_t1}={q(NAO_APLIC)}', AMARELO, AMARELO_ESC, True)

    # Resumo
    r += 1
    n1 = fim_t1 - inicio_t1 + 1
    ws.row_dimensions[r].height = 26
    box(ws, f"A{r}:D{r}", "RESUMO DA TABELA 1", font(12, True, AZUL_ESCURO), BRANCO, al("left", "center", indent=1), BORDA)
    box(ws, f"E{r}:I{r}",
        f'=COUNTIF({faixa},"APROVADO")&" aprovados  •  "&COUNTIF({faixa},"REPROVADO")&" reprovados  •  "'
        f'&COUNTIF({faixa},{q(NAO_APLIC)})&" não aplicáveis  (total: {n1})"',
        font(11, True, AZUL_ESCURO), BRANCO, al("center"), BORDA)
    r += 2

    # Tabela 2: referência independente
    ws.row_dimensions[r].height = 24
    box(ws, f"A{r}:I{r}", "2. VERIFICAÇÃO DE REFERÊNCIA (fórmulas com valores fixos, independentes dos campos editáveis)",
        font(13, True, BRANCO), AZUL_TEC, al("left", "center", indent=1))
    r += 1
    cab2 = ["Nº", "Calculadora", "Caso", "Expressão verificada", "Unidade", "Resultado esperado",
            "Valor de referência", "Diferença absoluta", "Status"]
    ws.row_dimensions[r].height = 30
    for i, t in enumerate(cab2):
        box(ws, f"{chr(65 + i)}{r}", t, font(10, True, BRANCO), AZUL_ESCURO, al("center", "center"), BORDA)
    r += 1
    classif = 'IF({v}=0,"Sem escoamento",IF(ROUND({re},6)<2300,"Laminar",IF(ROUND({re},6)<4000,"Transição","Turbulento")))'
    refs = [
        ("01", "Forças", "Exemplo", "√(ΣFx² + ΣFy²)", "N",
         "SQRT((100*COS(RADIANS(0))+100*COS(RADIANS(90)))^2+(100*SIN(RADIANS(0))+100*SIN(RADIANS(90)))^2)", REF["01_R"]),
        ("01", "Forças", "Quadrante III", "Ângulo de (−50; −50)", "graus", "MOD(DEGREES(ATAN2(-50,-50)),360)", 225.0),
        ("02", "Tensão Normal", "Exemplo", "F·1000/A", "MPa", "10*1000/100", REF["02_MPa"]),
        ("03", "Deformação Axial", "Exemplo", "F·1000·L/(A·E·1000)", "mm", "(10*1000*1000)/(100*200*1000)", REF["03_dL"]),
        ("04", "Torção de Eixos", "Exemplo", "16·T·1000/(π·d³)", "MPa", "16*(100*1000)/(PI()*20^3)", REF["04_tau"]),
        ("05", "Potência e Torque", "Exemplo", "T·(2πn/60)/1000", "kW", "100*(2*PI()*1500/60)/1000", REF["05_P"]),
        ("05", "Potência e Torque", "Modo inverso", "P·1000/(2πn/60)", "N·m", "15.707963267948966*1000/(2*PI()*1500/60)", 100.0),
        ("06", "Gases Ideais", "Exemplo", "p·1000·V/(R·(T+273,15))", "kg", "101.325*1000*1/(287*(20+273.15))", REF["06_m"]),
        ("06", "Gases Ideais", "Calcular temperatura", "p·1000·V/(m·R) − 273,15", "°C",
         "101.325*1000*1/(1.2043*287)-273.15", 101.325 * 1000 * 1 / (1.2043 * 287) - 273.15),
        ("07", "Rendimento Térmico", "Exemplo", "W/Q", "fração", "300/1000", REF["07_eta"]),
        ("08", "Pressão Hidrostática", "Exemplo", "ρ·g·h/1000", "kPa", "1000*9.81*2/1000", REF["08_dp"]),
        ("09", "Vazão", "Exemplo", "π·(D/1000)²/4·v·1000", "L/s", "PI()*(50/1000)^2/4*2*1000", REF["09_Ls"]),
        ("10", "Número de Reynolds", "Exemplo", "ρ·v·(D/1000)/μ", "adim.", "1000*0.1*(20/1000)/0.001", REF["10_Re"]),
        ("10", "Número de Reynolds", "Re = 2300", "Classificação", "texto",
         classif.format(v="0.115", re="1000*0.115*(20/1000)/0.001"), "Transição"),
        ("10", "Número de Reynolds", "Re = 4000", "Classificação", "texto",
         classif.format(v="0.2", re="1000*0.2*(20/1000)/0.001"), "Turbulento"),
        ("10", "Número de Reynolds", "Velocidade zero", "Classificação", "texto",
         classif.format(v="0", re="1000*0*(20/1000)/0.001"), "Sem escoamento"),
        ("11", "Perda de Carga", "Exemplo", "f·(L/D)·v²/(2g)", "m", "0.02*(10/(50/1000))*2^2/(2*9.81)", REF["11_hf"]),
        ("11", "Perda de Carga", "Exemplo", "ρ·g·hf/1000", "kPa", "1000*9.81*(0.02*(10/(50/1000))*2^2/(2*9.81))/1000", 8.0),
        ("12", "Transferência de Calor", "Exemplo", "k·A·(T₁−T₂)/(L/1000)", "W", "0.8*2*(50-20)/(100/1000)", REF["12_Q"]),
        ("12", "Transferência de Calor", "T₂ > T₁", "k·A·(T₁−T₂)/(L/1000)", "W", "0.8*2*(-10-20)/(100/1000)", -480.0),
    ]
    inicio_t2 = r
    for num, nome, caso, expr, uni, formula, esp in refs:
        ws.row_dimensions[r].height = 24
        box(ws, f"A{r}", num, font(10, True, AZUL_TEC), BRANCO, al("center"), BORDA)
        box(ws, f"B{r}", nome, font(10), BRANCO, al("left", "center"), BORDA)
        box(ws, f"C{r}", caso, font(9, False, "475569"), BRANCO, al("left", "center"), BORDA)
        box(ws, f"D{r}", expr, font(9), BRANCO, al("left", "center"), BORDA)
        box(ws, f"E{r}", uni, font(10, False, CINZA), BRANCO, al("center"), BORDA)
        texto = isinstance(esp, str)
        fmt = "General" if texto else "#,##0.000000"
        box(ws, f"F{r}", esp, font(10, True, AZUL_ESCURO), BRANCO, al("right", "center"), BORDA, fmt)
        box(ws, f"G{r}", "=" + formula, font(10, True, VERDE_ESC), BRANCO, al("right", "center"), BORDA, fmt)
        box(ws, f"H{r}", f'=IF(AND(ISNUMBER(F{r}),ISNUMBER(G{r})),ABS(G{r}-F{r}),"")', font(9, False, CINZA), BRANCO,
            al("right", "center"), BORDA, "0.0E+00")
        comp = f"G{r}=F{r}" if texto else f"ABS(G{r}-F{r})<=MAX($D$5,$D$6*ABS(F{r}))"
        box(ws, f"I{r}", f'=IF({comp},"APROVADO","REPROVADO")', font(9, True, TEXTO), BRANCO, al("center"), BORDA)
        r += 1
    fim_t2 = r - 1
    faixa2 = f"I{inicio_t2}:I{fim_t2}"
    adicionar_cf(ws, faixa2, f'I{inicio_t2}="APROVADO"', VERDE, VERDE_ESC, True)
    adicionar_cf(ws, faixa2, f'I{inicio_t2}="REPROVADO"', VERMELHO_CLARO, VERMELHO, True)
    r += 1
    ws.row_dimensions[r].height = 26
    box(ws, f"A{r}:D{r}", "RESUMO DA TABELA 2", font(12, True, AZUL_ESCURO), BRANCO, al("left", "center", indent=1), BORDA)
    box(ws, f"E{r}:I{r}",
        f'=COUNTIF({faixa2},"APROVADO")&" aprovados  •  "&COUNTIF({faixa2},"REPROVADO")&" reprovados  (total: {fim_t2 - inicio_t2 + 1})"',
        font(11, True, AZUL_ESCURO), BRANCO, al("center"), BORDA)
    r += 2
    ws.row_dimensions[r].height = 44
    box(ws, f"A{r}:I{r}",
        "Se você alterar os valores de uma calculadora, os testes dela mostram \"" + NAO_APLIC + "\". "
        "Isso é esperado: o teste só compara quando os exemplos originais estão preenchidos. "
        "Para refazer o teste, digite novamente os valores do exemplo (veja a coluna Entradas).",
        font(10, False, AMARELO_ESC), AMARELO, al("left", "center", indent=1), BORDA)
    r += 2
    ws.row_dimensions[r].height = 26
    c = box(ws, f"A{r}:D{r}", "◄  VOLTAR AO INÍCIO", font(11, True, BRANCO), AZUL_ESCURO, al("center"))
    link(c, "INICIO")
    c = box(ws, f"F{r}:I{r}", "?  COMO USAR", font(11, True, BRANCO), CINZA, al("center"))
    link(c, "COMO_USAR")
    config_folha(ws, f"A1:I{r}")
    ws.freeze_panes = "A4"
    ws.protection.sheet = True
    return ws


# --------------------------------------------------------------------------
def gerar(pasta="."):
    wb = Workbook()
    wb.remove(wb.active)
    for i, calc in enumerate(CALCS):
        construir_calculadora(wb, calc, i)
    construir_inicio(wb)
    construir_como_usar(wb)
    construir_testes(wb)
    wb.active = 0
    for ws in wb.worksheets:
        ws.sheet_view.tabSelected = ws.title == "INICIO"
    wb.calculation = CalcProperties(calcId=191029, calcMode="auto", fullCalcOnLoad=True, forceFullCalc=True)
    wb.properties.title = "Kit de 12 Calculadoras Automáticas de Engenharia Mecânica"
    wb.properties.subject = "Material didático de Engenharia Mecânica"
    wb.properties.creator = "Kit de Calculadoras"
    wb.properties.language = "pt-BR"
    destino = Path(pasta) / NOME_ARQUIVO
    wb.save(destino)
    return destino


if __name__ == "__main__":
    print(gerar(sys.argv[1] if len(sys.argv) > 1 else "."))
