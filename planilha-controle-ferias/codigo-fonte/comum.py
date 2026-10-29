"""Constantes, estruturas de tabela e utilitários de fórmula usados pelo gerador."""
import re
import datetime as dt
from xlsxwriter.utility import xl_col_to_name

VERSAO = "1.0"
DATA_CRIACAO = dt.date(2026, 10, 29)
DATA_REVISAO_REGRAS = dt.date(2026, 10, 29)
SENHA = "FERIAS"
DATA_REF_DEMO = dt.date(2026, 10, 15)

# Cores da identidade
NAVY = "#1F3864"
NAVY2 = "#2E4A7D"
CALC_HDR = "#5F7391"
TEC_HDR = "#A6A6A6"
LIGHT_BLUE = "#E8F1FB"
CALC_BG = "#F2F2F2"
TEC_BG = "#EDEDED"
BORDER = "#D0D7E2"
PAGE_BG = "#FFFFFF"

STATUS = {  # código de cor -> (fundo, fonte)
    1: ("#FFC7CE", "#9C0006"),   # vermelho
    2: ("#FFEB9C", "#7F6000"),   # amarelo
    3: ("#D6E6F7", "#1F4E79"),   # azul
    4: ("#C6EFCE", "#006100"),   # verde
    5: ("#E7E6E6", "#595959"),   # cinza
}

HDR_ROW = 4        # linha (base 0) do cabeçalho das tabelas de dados
CAP = {            # capacidade pré-configurada de linhas
    "T_Func": 600, "T_Per": 1500, "T_Prog": 2000, "T_Prov": 2000, "T_Oc": 500,
    "T_Est": 300, "T_Empresas": 30, "T_Estab": 60, "T_Local": 60, "T_Setores": 60,
    "T_Equipes": 120, "T_Cargos": 120, "T_Gestores": 80, "T_Resp": 40, "T_Escalas": 30,
    "T_Desc": 1500, "T_Feriados": 400, "T_CalRev": 120, "T_TiposOc": 30, "T_Normas": 30,
}

S_CONFIG = "02 Configurações"
S_FUNC = "03 Funcionários"
S_PER = "04 Períodos e saldos"
S_PROG = "05 Programação"
S_OC = "06 Ocorrências"
S_PROV = "07 Providências"
S_CAL = "08 Calendário"
S_PAINEL = "09 Painel"
S_FICHA = "10 Ficha individual"
S_EST = "11 Estimativa de valores"
S_APOIO = "12 Apoio técnico"
S_INICIO = "01 Comece aqui"


def q(sheet):
    return "'" + sheet + "'"


class Col:
    """kind: 'in' (entrada), 'calc' (calculado visível), 'tec' (técnico)."""

    def __init__(self, h, kind="in", f=None, w=12, fmt="text", dv=None, note=None, cor=None, group=None):
        self.h, self.kind, self.f, self.w, self.fmt = h, kind, f, w, fmt
        self.dv, self.note, self.cor, self.group = dv, note, cor, group


class Table:
    def __init__(self, name, sheet, cols, nrows, hdr=HDR_ROW, c0=0):
        self.name, self.sheet, self.cols, self.n, self.hdr, self.c0 = name, sheet, cols, nrows, hdr, c0
        self.idx = {}
        for i, c in enumerate(cols):
            assert c.h not in self.idx, (name, c.h)
            assert not re.search(r"[\[\]#']", c.h), c.h
            self.idx[c.h] = i

    def col(self, h):
        return self.c0 + self.idx[h]

    def L(self, h):
        return xl_col_to_name(self.col(h))

    @property
    def r0(self):          # primeira linha de dados (base 0)
        return self.hdr + 1

    @property
    def r1(self):          # última linha de dados (base 0)
        return self.hdr + self.n

    def first_abs(self, h):
        return f"{q(self.sheet)}!${self.L(h)}${self.r0 + 1}"

    def rng_abs(self, h):
        return f"{q(self.sheet)}!${self.L(h)}${self.r0 + 1}:${self.L(h)}${self.r1 + 1}"

    def rng_local(self, h, abs_col=True):
        d = "$" if abs_col else ""
        return f"{d}{self.L(h)}{self.r0 + 1}:{d}{self.L(h)}{self.r1 + 1}"

    def cell_local(self, h):
        """Referência da primeira linha com coluna absoluta (para formatação condicional)."""
        return f"${self.L(h)}{self.r0 + 1}"

    def last_col(self):
        return self.c0 + len(self.cols) - 1


_OWN_COL = re.compile(r"(?<![\w\]])\[([^\[\]@]+)\]")
_OWN_ROW = re.compile(r"\[@([^\[\]]+)\]")


def conv(formula, tname):
    """Converte a notação curta [@Col] e [Col] em referências estruturadas completas."""
    f = _OWN_COL.sub(lambda m: f"{tname}[{m.group(1)}]", formula)
    f = _OWN_ROW.sub(lambda m: f"{tname}[[#This Row],[{m.group(1)}]]", f)
    return f


def aniv(b, m):
    """Aniversário contratual: EDATE com ajuste de 29/02 para 01/03 (dia imediato)."""
    return f"(EDATE({b},{m})+(DAY(EDATE({b},{m}))<DAY({b})))"


def dtxt(d):
    """Data em texto DD/MM/AAAA sem depender do idioma do Excel."""
    return f'TEXT(DAY({d}),"00")&"/"&TEXT(MONTH({d}),"00")&"/"&YEAR({d})'


def idxv(tbl_col, row):
    """INDEX que devolve "" quando a célula de origem está vazia (evita 0 falso)."""
    return f'IF(INDEX({tbl_col},{row})="","",INDEX({tbl_col},{row}))'


def idxt(tbl_col, row):
    return f'INDEX({tbl_col},{row})&""'


def hol(a, b, uf, loc):
    """Quantidade de feriados cadastrados aplicáveis entre as datas a e b."""
    base = f'T_Feriados[Data],">="&({a}),T_Feriados[Data],"<="&({b})'
    return (f'(COUNTIFS({base},T_Feriados[Abrangência],"Nacional")'
            f'+IF({uf}="",0,COUNTIFS({base},T_Feriados[Abrangência],"Estadual",T_Feriados[UF],{uf}))'
            f'+IF({loc}="",0,COUNTIFS({base},T_Feriados[Abrangência],"Municipal",T_Feriados[Código da localidade],{loc})))')


def score(g, prazo, tid):
    """Pontuação inteira e única para a lista de prioridades do painel."""
    return (f'IF({g}=0,0,(5-{g})*10000000000+IF(ISNUMBER({prazo}),MAX(0,MIN(99999,50000-({prazo}-DataRef))),0)*100000'
            f'+{tid}*10000+ROW())')


def choose(code, items):
    return f"CHOOSE({code}," + ",".join(str(i) for i in items) + ")"


def s(txt):
    """Literal de texto para fórmula."""
    return '"' + txt.replace('"', '""') + '"'
