"""Gera a planilha de controle de férias (.xlsx) com xlsxwriter.

Uso típico (ver gerar_tudo.py):
    construir(dataset, caminho, cache=None)
O parâmetro cache recebe valores calculados pelo LibreOffice, gravados como resultado
inicial das fórmulas (útil para pré-visualizações que não recalculam).
"""
import re
import datetime as dt
import xlsxwriter
from xlsxwriter.utility import xl_col_to_name, xl_rowcol_to_cell

import comum as K
from comum import q, conv, dtxt, s, STATUS
import tabelas
import textos

ROW_MODE = "a1"   # "a1": referência da própria linha em notação A1 ($K6); "struct": [#This Row]

_OWN_COL = re.compile(r"(?<![\w\]])\[([^\[\]@]+)\]")
_OWN_ROW = re.compile(r"\[@([^\[\]]+)\]")

STATIC_LISTS = [
    ("L_SitVinc", "Situação do vínculo", ["Ativo", "Afastado", "Desligado"]),
    ("L_Regime", "Regime contratual", ["CLT regra geral", "CLT tempo parcial", "CLT aprendiz", "Doméstico (LC 150/2015)",
                                       "Intermitente", "Outro regime especial"]),
    ("L_RegEsp", "Regimes com análise específica", ["Doméstico (LC 150/2015)", "Intermitente", "Outro regime especial"]),
    ("L_SitApur", "Situação da apuração", ["Pendente", "Conferido", "Conferido com ajuste", "Análise específica"]),
    ("L_SitProg", "Situação da programação", ["Rascunho", "Solicitada", "Aprovada", "Em gozo", "Concluída", "Cancelada"]),
    ("L_SitAbono", "Situação do abono", ["Solicitado", "Confirmado", "Cancelado"]),
    ("L_SimNao", "Sim ou não", ["Sim", "Não"]),
    ("L_Abrang", "Abrangência", ["Nacional", "Estadual", "Municipal"]),
    ("L_TipoEsc", "Tipo de escala", ["Fixa", "Variável"]),
    ("L_Dias", "Dias da semana", ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]),
    ("L_SitAnal", "Situação da análise", ["Pendente", "Em análise", "Concluída", "Não aplicável"]),
    ("L_Efeito", "Efeito confirmado", ["Sem efeito no direito", "Reduz o direito", "Perda do direito (art. 133)",
                                       "Altera datas do período", "Outro: ver justificativa"]),
    ("L_SitPag", "Situação do pagamento", ["Previsto", "Agendado", "Realizado", "Confirmado"]),
    ("L_Papel", "Papel do responsável", ["DP", "Conferência", "Pagamento", "Gestão"]),
    ("L_TipoRem", "Tipo de remuneração", ["Mensalista", "Horista", "Outro"]),
    ("L_Meses", "Meses", ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro",
                          "Outubro", "Novembro", "Dezembro"]),
    ("L_UF", "UF", ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE",
                    "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]),
]

# Fontes da lista de prioridades do painel: id -> (tabela, coluna de pontuação, campos)
PAINEL_SRC = {
    1: ("T_Per", "Téc pontuação", ["Empresa", "Nome", "ID do período", "Períodos", "Situação do período", "Prazo da ação", "Próxima ação", "Téc resp"]),
    2: ("T_Prog", "Téc pontuação", ["Empresa", "Nome", "ID da programação", "Programação", "Téc pendência", "Prazo da ação", "Próxima ação", "Téc resp"]),
    3: ("T_Prov", "Téc pont aviso", ["Empresa", "Nome", "ID da programação", "Aviso", "Alerta do aviso", "Téc prazo aviso", "Téc ação aviso", "Téc resp aviso"]),
    4: ("T_Prov", "Téc pont pag", ["Empresa", "Nome", "ID da programação", "Pagamento", "Alerta do pagamento", "Téc prazo pag", "Téc ação pag", "Téc resp pag"]),
    5: ("T_Prov", "Téc pont demais", ["Empresa", "Nome", "ID da programação", "Demais etapas", "Alerta das demais etapas", "Téc prazo demais", "Téc ação demais", "Téc resp demais"]),
    6: ("T_Oc", "Téc pontuação", ["Empresa", "Nome", "ID da ocorrência", "Ocorrências", "Alerta da ocorrência", None, "Próxima ação", "Téc resp"]),
    7: ("T_Func", "Téc pontuação", ["ID da empresa", "Nome", "ID do vínculo", "Funcionários", "Alerta do cadastro", None, "Téc ação", "Téc resp"]),
}
N_PAINEL = 40
N_CAL = 60
N_FICHA_PER, N_FICHA_PROG, N_FICHA_OC = 12, 20, 10


class Builder:
    def __init__(self, path, data, cache=None):
        self.data = data
        self.cache = cache or {}
        self.wb = xlsxwriter.Workbook(path, {"use_future_functions": False, "strings_to_formulas": False,
                                              "strings_to_urls": False})
        self.fcache = {}
        self.tabs, self.cfg_order = tabelas.build_tables()
        self.names = {}

    # ------------------------------------------------------------------ formatos
    def F(self, **kw):
        key = tuple(sorted(kw.items()))
        if key not in self.fcache:
            base = {"font_name": "Arial", "font_size": 10, "valign": "vcenter"}
            base.update(kw)
            self.fcache[key] = self.wb.add_format(base)
        return self.fcache[key]

    NUM = {"date": "dd/mm/yyyy", "int": "0", "money": '"R$" #,##0.00', "textfmt": "@", "text": None}

    def cell_fmt(self, col):
        nf = self.NUM.get(col.fmt)
        kw = {"border": 1, "border_color": K.BORDER}
        if nf:
            kw["num_format"] = nf
        if col.fmt in ("date", "int"):
            kw["align"] = "center"
        if col.kind == "in":
            kw.update(locked=False, bg_color="#FFFFFF", font_color="#1A1A1A")
        elif col.kind == "calc":
            kw.update(locked=True, bg_color=K.CALC_BG, font_color="#262626")
        else:
            kw.update(locked=True, bg_color=K.TEC_BG, font_color="#808080", font_size=8)
        return self.F(**kw)

    def hdr_fmt(self, col):
        bg = {"in": K.NAVY, "calc": K.CALC_HDR, "tec": K.TEC_HDR}[col.kind]
        return self.F(bold=True, font_color="#FFFFFF", bg_color=bg, text_wrap=True, align="center",
                      border=1, border_color="#FFFFFF", font_size=9 if col.kind != "tec" else 8)

    # ------------------------------------------------------------------ fórmulas
    def conv_row(self, f, t, r):
        """Converte a notação curta para a linha r (base 0) da tabela t."""
        f = _OWN_COL.sub(lambda m: f"{t.name}[{m.group(1)}]", f)
        if ROW_MODE == "struct":
            return _OWN_ROW.sub(lambda m: f"{t.name}[[#This Row],[{m.group(1)}]]", f)
        return _OWN_ROW.sub(lambda m: f"${t.L(m.group(1))}{r + 1}", f)

    def wf(self, ws, sheet, r, c, formula, fmt):
        v = self.cache.get((sheet, r, c), "")
        if v is None:
            v = ""
        ws.write_formula(r, c, formula, fmt, v)

    def wv(self, ws, r, c, v, fmt):
        if v is None or v == "":
            ws.write_blank(r, c, None, fmt)
        elif isinstance(v, (dt.date, dt.datetime)):
            ws.write_datetime(r, c, v, fmt)
        elif isinstance(v, (int, float)):
            ws.write_number(r, c, v, fmt)
        else:
            ws.write_string(r, c, str(v), fmt)

    # ------------------------------------------------------------------ tabelas
    def write_table(self, ws, t, rows):
        rows = rows or []
        assert len(rows) <= t.n, (t.name, len(rows), t.n)
        cols = []
        for c in t.cols:
            d = {"header": c.h, "header_format": self.hdr_fmt(c)}
            if c.f:
                d["formula"] = self.conv_row(c.f, t, t.r0)
            cols.append(d)
        ws.add_table(t.hdr, t.c0, t.r1, t.last_col(), {"name": t.name, "columns": cols, "style": "Table Style Light 1",
                                                       "banded_rows": False, "autofilter": True})
        fmts = [self.cell_fmt(c) for c in t.cols]
        tpl = {}
        for j, c in enumerate(t.cols):
            if c.f:
                # modelo com marcador de linha: converte uma vez e troca só o número da linha
                mark = self.conv_row(c.f, t, 999998)
                tpl[j] = mark.split("999999")
        for i in range(t.n):
            r = t.r0 + i
            rec = rows[i] if i < len(rows) else {}
            rs = str(r + 1)
            for j, c in enumerate(t.cols):
                cc = t.c0 + j
                if c.kind == "in":
                    self.wv(ws, r, cc, rec.get(c.h), fmts[j])
                else:
                    self.wf(ws, t.sheet, r, cc, rs.join(tpl[j]), fmts[j])
        for j, c in enumerate(t.cols):
            ws.set_column(t.c0 + j, t.c0 + j, c.w if c.kind != "tec" else 7)
            if c.note:
                ws.write_comment(t.hdr, t.c0 + j, c.note, {"x_scale": 2.2, "y_scale": 1.6, "font_name": "Arial", "font_size": 9})
            if c.dv:
                self.add_dv(ws, t, c)
            if c.cor:
                self.add_status_cf(ws, t, c.h, c.cor)
        # colunas técnicas recolhidas em grupo (podem ser expandidas pelo botão +)
        tec = [t.c0 + j for j, c in enumerate(t.cols) if c.kind == "tec"]
        if tec:
            ws.set_column(min(tec), max(tec), 7, None, {"level": 1, "hidden": True})

    def add_dv(self, ws, t, c):
        kind = c.dv[0]
        rng = (t.r0, t.col(c.h), t.r1, t.col(c.h))
        if kind == "list":
            opt = {"validate": "list", "source": "=" + c.dv[1], "error_type": "stop" if c.dv[2] == "stop" else "warning",
                   "error_title": "Valor fora da lista",
                   "error_message": "Escolha um item da lista. Cadastre novos itens na aba 02 Configurações."}
        elif kind == "date":
            opt = {"validate": "date", "criteria": "between", "minimum": dt.date(1950, 1, 1), "maximum": dt.date(2100, 12, 31),
                   "error_title": "Data inválida", "error_message": "Digite uma data no formato DD/MM/AAAA."}
        elif kind == "int":
            opt = {"validate": "integer", "criteria": "between", "minimum": c.dv[1], "maximum": c.dv[2],
                   "error_type": "stop" if c.dv[3] == "stop" else "warning", "error_title": "Número fora do esperado",
                   "error_message": f"O valor esperado fica entre {c.dv[1]} e {c.dv[2]}. Confira antes de continuar."}
        elif kind == "money":
            opt = {"validate": "decimal", "criteria": ">=", "value": 0, "error_title": "Valor inválido",
                   "error_message": "Digite um valor em reais, maior ou igual a zero."}
        ws.data_validation(*rng, opt)

    def status_formats(self):
        return {k: self.F(bg_color=bg, font_color=fc) for k, (bg, fc) in STATUS.items()}

    def add_status_cf(self, ws, t, h, corcol, r0=None, r1=None):
        sf = self.status_formats()
        c = t.col(h)
        ref = f"${t.L(corcol)}{t.r0 + 1}"
        for k, f in sf.items():
            ws.conditional_format(t.r0, c, t.r1, c, {"type": "formula", "criteria": f"={ref}={k}", "format": f})

    # ------------------------------------------------------------------ cabeçalho comum das abas
    def sheet_header(self, ws, title, subtitle, width_cols=10, links=True, c0=0):
        ws.hide_gridlines(2)
        ws.set_row(0, 30)
        ws.write(0, c0, title, self.F(bold=True, font_size=16, font_color=K.NAVY))
        ws.merge_range(1, c0, 1, width_cols, subtitle,
                       self.F(bg_color=K.LIGHT_BLUE, font_color="#1F3864", text_wrap=True, italic=False, font_size=9))
        ws.set_row(1, 32)
        if links:
            ws.write_url(2, c0, f"internal:{q(K.S_INICIO)}!A1", self.F(font_color="#1F4E79", underline=1, font_size=9),
                         "← Comece aqui")
            ws.write_url(2, c0 + 1, f"internal:{q(K.S_PAINEL)}!A1", self.F(font_color="#1F4E79", underline=1, font_size=9),
                         "Painel →")

    def legend_chips(self, ws, r, c):
        ws.write(r, c, "Você preenche", self.F(bg_color="#FFFFFF", border=1, border_color=K.NAVY, font_size=8, align="center"))
        ws.write(r, c + 1, "Calculado", self.F(bg_color=K.CALC_BG, border=1, border_color=K.CALC_HDR, font_size=8, align="center"))
        ws.write(r, c + 2, "Técnico (oculto)", self.F(bg_color=K.TEC_BG, font_color="#808080", border=1, border_color=K.TEC_HDR,
                                               font_size=8, align="center"))

    def protect(self, ws):
        ws.protect(K.SENHA, {"autofilter": True, "format_columns": True, "format_rows": True,
                             "select_locked_cells": True, "select_unlocked_cells": True, "sort": False,
                             "insert_rows": False, "delete_rows": False})

    def name(self, nm, ref):
        self.wb.define_name(nm, "=" + ref)
        self.names[nm] = ref

    # ------------------------------------------------------------------ construção
    def build(self):
        d = self.data
        self.ws = {}
        order = [K.S_INICIO, K.S_CONFIG, K.S_FUNC, K.S_PER, K.S_PROG, K.S_OC, K.S_PROV, K.S_CAL, K.S_PAINEL,
                 K.S_FICHA, K.S_EST, K.S_APOIO]
        for nm in order:
            self.ws[nm] = self.wb.add_worksheet(nm)
        self.ws[K.S_INICIO].activate()
        self.build_apoio_lists()
        self.build_config()
        self.build_data_sheets()
        self.build_dynamic_names()
        self.build_calendario()
        self.build_painel()
        self.build_ficha()
        textos.comece_aqui(self, self.ws[K.S_INICIO])
        self.build_apoio_engine()
        for nm, ws in self.ws.items():
            self.protect(ws)
        self.wb.set_properties({"title": "Planilha Pronta de Controle de Férias", "subject": "Controle de férias individuais CLT",
                                "author": "160 Mapas Visuais de Departamento Pessoal", "company": "",
                                "comments": f"Versão {K.VERSAO}. Sem macros."})
        self.wb.set_calc_mode("auto")
        self.wb.close()

    # ------------------------------------------------------------------ apoio: listas fixas
    def build_apoio_lists(self):
        ws = self.ws[K.S_APOIO]
        ws.set_tab_color("#808080")
        self.sheet_header(ws, "Apoio técnico",
                          "Aba técnica protegida. Guarda as listas fixas e o cálculo da lista de prioridades do Painel. "
                          "Não é preciso preencher nada aqui.", 12)
        hf = self.F(bold=True, font_color="#FFFFFF", bg_color=K.TEC_HDR, text_wrap=True, align="center", font_size=8)
        cf = self.F(font_size=9, border=1, border_color=K.BORDER, bg_color=K.CALC_BG)
        for j, (nm, title, items) in enumerate(STATIC_LISTS):
            ws.set_column(j, j, 18)
            ws.write(4, j, title, hf)
            for i, it in enumerate(items):
                ws.write_string(5 + i, j, it, cf)
            col = xl_col_to_name(j)
            self.name(nm, f"{q(K.S_APOIO)}!${col}$6:${col}${5 + len(items)}")
        # mensagens centrais (texto, próxima ação, gravidade, cor) usadas pelas fórmulas de alerta
        j = len(STATIC_LISTS) + 1
        nf = self.F(font_size=9, border=1, border_color=K.BORDER, bg_color=K.CALC_BG, num_format="0")
        for nome, itens in tabelas.MSGS.items():
            for k, (suf, titulo) in enumerate([("T", "texto"), ("A", "ação"), ("G", "gravidade"), ("C", "cor")]):
                c = j + k
                ws.set_column(c, c, 30 if suf in "TA" else 7)
                ws.write(4, c, f"Mensagens {nome}: {titulo}", hf)
                for i, it in enumerate(itens):
                    v = it[k]
                    if isinstance(v, str):
                        ws.write_string(5 + i, c, v, cf)
                    else:
                        ws.write_number(5 + i, c, v, nf)
                col = xl_col_to_name(c)
                self.name(f"M_{nome}_{suf}", f"{q(K.S_APOIO)}!${col}$6:${col}${5 + len(itens)}")
            j += 5
        self.apoio_next_col = j
        ws.print_area(0, 0, 2, 8)
        ws.fit_to_pages(1, 1)

    # ------------------------------------------------------------------ configurações
    def build_config(self):
        ws = self.ws[K.S_CONFIG]
        d = self.data
        ws.set_tab_color(K.NAVY2)
        self.sheet_header(ws, "Configurações",
                          "Cadastre aqui empresas, estrutura, escalas, feriados e parâmetros. Faça isso antes de cadastrar "
                          "funcionários. Células brancas são de preenchimento. As demais são calculadas.", 3)
        ws.set_column(0, 0, 46)
        ws.set_column(1, 1, 16)
        ws.set_column(2, 2, 52)
        ws.set_column(3, 4, 2)
        ws.freeze_panes(K.HDR_ROW + 3, 0)
        lab = self.F(font_size=10, text_wrap=True, border=1, border_color=K.BORDER)
        lab_b = self.F(font_size=10, bold=True, font_color="#FFFFFF", bg_color=K.NAVY, border=1, border_color="#FFFFFF")
        note = self.F(font_size=9, font_color="#404040", text_wrap=True, border=1, border_color=K.BORDER)
        inp_d = self.F(locked=False, num_format="dd/mm/yyyy", border=1, border_color=K.NAVY, align="center")
        inp_i = self.F(locked=False, num_format="0", border=1, border_color=K.NAVY, align="center")
        inp_t = self.F(locked=False, border=1, border_color=K.NAVY, text_wrap=True)
        calc_d = self.F(num_format="dd/mm/yyyy", bg_color=K.CALC_BG, border=1, border_color=K.BORDER, align="center", bold=True)
        calc_i = self.F(num_format="0", bg_color=K.CALC_BG, border=1, border_color=K.BORDER, align="center")
        sec = self.F(bold=True, font_color=K.NAVY, font_size=11, bottom=2, bottom_color=K.NAVY)
        S = K.S_CONFIG
        r = K.HDR_ROW + 1   # linha 6 (base 0): títulos de bloco
        ws.write(r, 0, "PARÂMETROS GERAIS", sec)
        ws.write(r + 1, 0, "Parâmetro", lab_b)
        ws.write(r + 1, 1, "Valor", lab_b)
        ws.write(r + 1, 2, "Explicação", lab_b)
        p = d.get("params", {})
        r0 = r + 2
        rows = [
            ("Data de referência automática (hoje)", "f:=TODAY()", calc_d, "Atualiza sozinha quando a planilha é aberta ou recalculada."),
            ("Data de referência manual (opcional)", p.get("data_manual"), inp_d, "Preencha só para simular outra data. No uso diário deixe vazio."),
            ("Data efetiva usada nos cálculos", f"f:=IF(ISNUMBER(B{r0 + 2}),B{r0 + 2},B{r0 + 1})", calc_d, "É esta data que todos os alertas usam."),
            (None, None, None, None),
            ("LIMITES INTERNOS DE GESTÃO", "sec", None, None),
            ("Alerta interno 1 (dias antes do fim do concessivo)", p.get("alerta1", 90), inp_i, "Parâmetro interno, sem previsão legal. Sugestão: 90."),
            ("Alerta interno 2 (dias antes do fim do concessivo)", p.get("alerta2", 60), inp_i, "Parâmetro interno, sem previsão legal. Sugestão: 60."),
            ("Alerta interno 3 (dias antes do fim do concessivo)", p.get("alerta3", 30), inp_i, "Parâmetro interno, sem previsão legal. Sugestão: 30."),
            ("Limite padrão de ausências simultâneas por equipe", p.get("limite"), inp_i,
             "Usado quando a equipe não tem limite próprio. Vazio: o calendário mostra Limite não definido."),
            ("Alerta 1 considerado", f"f:=IF(ISNUMBER(B{r0 + 6}),B{r0 + 6},90)", calc_i, "Valor usado nos cálculos (90 se o campo acima estiver vazio)."),
            ("Alerta 2 considerado", f"f:=IF(ISNUMBER(B{r0 + 7}),B{r0 + 7},60)", calc_i, "Valor usado nos cálculos (60 se vazio)."),
            ("Alerta 3 considerado", f"f:=IF(ISNUMBER(B{r0 + 8}),B{r0 + 8},30)", calc_i, "Valor usado nos cálculos (30 se vazio)."),
            (None, None, None, None),
            ("NORMA COLETIVA E REGRAS ESPECÍFICAS", "sec", None, None),
            ("Referência da convenção ou acordo coletivo", p.get("norma"), inp_t, "Exemplo: CCT 2026/2027 do sindicato da categoria. Cadastre as normas também na tabela Normas."),
            ("Observações de regras específicas", p.get("obs_regras"), inp_t, "Regras coletivas não são processadas automaticamente. Registre aqui e confira caso a caso."),
        ]
        for i, (a, b, f, c) in enumerate(rows):
            rr = r0 + i
            if a is None:
                continue
            if b == "sec":
                ws.write(rr, 0, a, sec)
                continue
            ws.write(rr, 0, a, lab)
            if isinstance(b, str) and b.startswith("f:"):
                self.wf(ws, S, rr, 1, b[2:], f)
            elif f is inp_t:
                ws.merge_range(rr, 1, rr, 2, "", f)
                self.wv(ws, rr, 1, b, f)
                ws.write_comment(rr, 1, c, {"x_scale": 2, "font_name": "Arial", "font_size": 9})
                ws.set_row(rr, 34)
                continue
            else:
                self.wv(ws, rr, 1, b, f)
            ws.write(rr, 2, c, note)
            ws.set_row(rr, 28)
        self.name("DataRef", f"{q(S)}!$B${r0 + 3}")
        self.name("Alerta1", f"{q(S)}!$B${r0 + 10}")
        self.name("Alerta2", f"{q(S)}!$B${r0 + 11}")
        self.name("Alerta3", f"{q(S)}!$B${r0 + 12}")
        self.name("LimitePadrao", f"{q(S)}!$B${r0 + 9}")
        ws.data_validation(r0 + 1, 1, r0 + 1, 1, {"validate": "date", "criteria": "between", "minimum": dt.date(2000, 1, 1),
                                                   "maximum": dt.date(2100, 12, 31)})
        ws.data_validation(r0 + 6, 1, r0 + 9, 1, {"validate": "integer", "criteria": "between", "minimum": 0, "maximum": 999})
        rr = r0 + len(rows) + 1
        ws.merge_range(rr, 0, rr, 2, "Os alertas dependem da abertura e do recálculo da planilha. A planilha não envia e-mail, "
                       "WhatsApp nem qualquer notificação. Abra o arquivo com frequência e confira o Painel.",
                       self.F(bg_color=STATUS[2][0], font_color=STATUS[2][1], bold=True, text_wrap=True, border=1, border_color="#BF9000"))
        ws.set_row(rr, 34)
        rr += 2
        ws.write(rr, 0, "PRAZOS DA REGRA GERAL DA CLT (referência)", sec)
        rr += 1
        ws.write(rr, 0, "Regra", lab_b)
        ws.write(rr, 1, "Fonte", lab_b)
        ws.write(rr, 2, "Como a planilha usa", lab_b)
        for a, b, c in textos.REGRAS_REF:
            rr += 1
            ws.write(rr, 0, a, lab)
            ws.write(rr, 1, b, note)
            ws.write(rr, 2, c, note)
            ws.set_row(rr, 40)
        rr += 1
        ws.merge_range(rr, 0, rr, 2, textos.FONTE_REGRAS, self.F(font_size=8, italic=True, text_wrap=True, font_color="#404040"))
        ws.set_row(rr, 48)
        ws.print_area(0, 0, rr, 2)
        ws.set_paper(9)
        ws.fit_to_pages(1, 0)
        ws.set_footer("&L&8Controle de Férias  ·  Configurações (parâmetros)&R&8Página &P de &N")
        rr += 2
        ws.write(rr, 0, "IR PARA AS TABELAS DESTA ABA", sec)
        for name in self.cfg_order:
            t = self.tabs[name]
            rr += 1
            ws.write_url(rr, 0, f"internal:{q(S)}!{xl_col_to_name(t.c0)}{t.hdr}", self.F(font_color="#1F4E79", underline=1),
                         textos.CFG_TITULOS[name][0])
            ws.write(rr, 2, textos.CFG_TITULOS[name][1], note)
        # tabelas lado a lado
        for name in self.cfg_order:
            t = self.tabs[name]
            ws.write(t.hdr - 1, t.c0, textos.CFG_TITULOS[name][0].upper(), sec)
            ws.write(t.hdr - 2, t.c0, textos.CFG_TITULOS[name][1], self.F(font_size=8, italic=True, font_color="#404040"))
            self.write_table(ws, t, d.get(name, []))
        ws.set_row(K.HDR_ROW + 2, 42)

    # ------------------------------------------------------------------ abas de dados
    def build_data_sheets(self):
        info = textos.ABAS_DADOS
        for name, sheet in [("T_Func", K.S_FUNC), ("T_Per", K.S_PER), ("T_Prog", K.S_PROG), ("T_Oc", K.S_OC),
                            ("T_Prov", K.S_PROV), ("T_Est", K.S_EST)]:
            ws = self.ws[sheet]
            t = self.tabs[name]
            title, sub = info[name]
            self.sheet_header(ws, title, sub, 12)
            self.legend_chips(ws, 2, 3)
            ws.set_tab_color(K.NAVY if name != "T_Est" else "#5F7391")
            ws.freeze_panes(t.r0, 2 if name != "T_Prov" else 2)
            ws.set_row(t.hdr, 48)
            # faixa de grupos (Providências)
            groups = {}
            for c in t.cols:
                if c.group:
                    groups.setdefault(c.group, []).append(t.col(c.h))
            gcolors = ["#D6E6F7", "#E2EFDA", "#FFF2CC", "#EDE7F6", "#FCE4D6", "#E7E6E6"]
            for gi, (g, cs) in enumerate(groups.items()):
                gf = self.F(bold=True, font_size=9, bg_color=gcolors[gi % len(gcolors)], font_color=K.NAVY, border=1,
                            border_color="#FFFFFF")
                if len(cs) > 1:
                    ws.merge_range(t.hdr - 1, min(cs), t.hdr - 1, max(cs), g, gf)
                else:
                    ws.write(t.hdr - 1, cs[0], g, gf)
            self.write_table(ws, t, self.data.get(name, []))
            self.sugestao_id(ws, name, t)
            ws.set_landscape()
            ws.set_paper(9)
            ws.set_print_scale(70)
            ws.repeat_rows(t.hdr)
            ws.repeat_columns(0, 1)
            ws.set_margins(left=0.4, right=0.4, top=0.5, bottom=0.6)
            ws.set_footer("&L&8Controle de Férias  ·  &A&R&8Página &P de &N")
            last_vis = max(t.col(c.h) for c in t.cols if c.kind != "tec")
            self.print_areas = getattr(self, "print_areas", {})
            self.print_areas[sheet] = (t, last_vis)
            ws.print_area(t.hdr, 0, t.r1, last_vis)

    def sugestao_id(self, ws, name, t):
        pref = {"T_Func": ("ID do vínculo", "V"), "T_Prog": ("ID da programação", "PG"), "T_Oc": ("ID da ocorrência", "OC")}
        if name not in pref:
            return
        col, p = pref[name]
        ws.write(2, 7, "Próximo ID sugerido:", self.F(font_size=9, bold=True, align="right"))
        f = f'="{p}"&TEXT(COUNTA({t.rng_abs(col)})+1,"0000")'
        self.wf(ws, t.sheet, 2, 8, f, self.F(font_size=10, bold=True, font_color=K.NAVY, bg_color=K.CALC_BG, align="center"))

    # ------------------------------------------------------------------ nomes dinâmicos
    def build_dynamic_names(self):
        T = self.tabs

        def dyn(nm, t, col, counter="COUNTA"):
            first = t.first_abs(col)
            rng = t.rng_abs(col)
            cnt = f'COUNTIF({rng},"?*")' if counter == "text" else f"COUNTA({rng})"
            self.name(nm, f"OFFSET({first},0,0,MAX(1,{cnt}),1)")

        dyn("lst_Empresas", T["T_Empresas"], "ID da empresa")
        dyn("lst_Estab", T["T_Estab"], "ID do estabelecimento")
        dyn("lst_Local", T["T_Local"], "Código da localidade")
        dyn("lst_Setores", T["T_Setores"], "Setor")
        dyn("lst_Equipes", T["T_Equipes"], "Equipe")
        dyn("lst_Cargos", T["T_Cargos"], "Cargo")
        dyn("lst_Gestores", T["T_Gestores"], "Gestor")
        dyn("lst_Resp", T["T_Resp"], "Responsável")
        dyn("lst_Escalas", T["T_Escalas"], "Código da escala")
        dyn("lst_Normas", T["T_Normas"], "Referência da norma coletiva")
        dyn("lst_TiposOc", T["T_TiposOc"], "Tipo de ocorrência")
        dyn("lst_Vinculos", T["T_Func"], "ID do vínculo")
        dyn("lst_Periodos", T["T_Per"], "ID do período", "text")
        dyn("lst_Prog", T["T_Prog"], "ID da programação")
        # listas com opção "todas" para o calendário
        ws = self.ws[K.S_APOIO]
        c = self.apoio_next_col
        hf = self.F(bold=True, font_color="#FFFFFF", bg_color=K.TEC_HDR, text_wrap=True, align="center", font_size=8)
        cf = self.F(font_size=9, border=1, border_color=K.BORDER, bg_color=K.CALC_BG)
        for nm, title, todas, t, col in [("lcal_Emp", "Filtro empresa", "(Todas)", T["T_Empresas"], "ID da empresa"),
                                         ("lcal_Est", "Filtro estabelecimento", "(Todos)", T["T_Estab"], "ID do estabelecimento"),
                                         ("lcal_Setor", "Filtro setor", "(Todos)", T["T_Setores"], "Setor"),
                                         ("lcal_Equipe", "Filtro equipe", "(Todas)", T["T_Equipes"], "Equipe")]:
            ws.set_column(c, c, 18)
            ws.write(4, c, title, hf)
            ws.write_string(5, c, todas, cf)
            for i in range(t.n):
                self.wf(ws, K.S_APOIO, 6 + i, c, f'=IF(INDEX({t.name}[{col}],{i + 1})="","",INDEX({t.name}[{col}],{i + 1})&"")', cf)
            L = xl_col_to_name(c)
            self.name(nm, f'OFFSET({q(K.S_APOIO)}!${L}$6,0,0,COUNTIF({q(K.S_APOIO)}!${L}$6:${L}${6 + t.n},"?*"),1)')
            c += 1
        self.apoio_next_col = c + 1

    # ------------------------------------------------------------------ calendário
    def build_calendario(self):
        ws = self.ws[K.S_CAL]
        S = K.S_CAL
        cd = self.data.get("calendario", {})
        ws.set_tab_color("#2F75B5")
        self.sheet_header(ws, "Calendário de ausências",
                          "Escolha mês, ano e filtros nas células brancas. A grade mostra cada programação ativa que toca o mês. "
                          "Canceladas e rascunhos não aparecem e não ocupam a capacidade da equipe.", 40, c0=1)
        ws.set_column(0, 0, 4, None, {"hidden": True})
        widths = [24, 8, 13, 11, 10, 10, 11, 7, 20]
        for i, w in enumerate(widths):
            ws.set_column(1 + i, 1 + i, w)
        DC0 = 10
        ws.set_column(DC0, DC0 + 30, 3.4)
        lab = self.F(bold=True, font_size=9, align="right", font_color=K.NAVY)
        inp = self.F(locked=False, border=1, border_color=K.NAVY, font_size=10, bold=True, align="center")
        tec = self.F(font_size=8, font_color="#808080")
        ctrl = [("Mês", cd.get("mes", "Novembro"), "L_Meses"), ("Ano", cd.get("ano", 2026), None),
                ("Empresa", cd.get("empresa", "(Todas)"), "lcal_Emp"), ("Estabelecimento", cd.get("estab", "(Todos)"), "lcal_Est"),
                ("Setor", cd.get("setor", "(Todos)"), "lcal_Setor"), ("Equipe", cd.get("equipe", "(Todas)"), "lcal_Equipe"),
                ("Mostrar solicitadas", cd.get("solic", "Sim"), "L_SimNao")]
        for i, (a, v, lst) in enumerate(ctrl):
            r = 3 + i
            ws.write(r, 1, a, lab)
            ws.merge_range(r, 2, r, 3, "", inp)
            self.wv(ws, r, 2, v, inp)
            if lst:
                ws.data_validation(r, 2, r, 3, {"validate": "list", "source": "=" + lst})
            else:
                ws.data_validation(r, 2, r, 3, {"validate": "integer", "criteria": "between", "minimum": 2000, "maximum": 2100})
        # nomes
        ws.write(3, 5, "Mês nº", tec)
        self.wf(ws, S, 3, 6, "=IFERROR(MATCH(C4,L_Meses,0),0)", tec)
        ws.write(4, 5, "1º dia", tec)
        self.wf(ws, S, 4, 6, '=IF(AND(G4>0,ISNUMBER(C5)),DATE(C5,G4,1),"")', self.F(font_size=8, font_color="#808080", num_format="dd/mm/yyyy"))
        ws.write(5, 5, "Último dia", tec)
        self.wf(ws, S, 5, 6, '=IF(ISNUMBER(G5),EOMONTH(G5,0),"")', self.F(font_size=8, font_color="#808080", num_format="dd/mm/yyyy"))
        self.name("CalM1", f"{q(S)}!$G$5")
        self.name("CalM2", f"{q(S)}!$G$6")
        self.name("CalEmp", f"{q(S)}!$C$6")
        self.name("CalEst", f"{q(S)}!$C$7")
        self.name("CalSetor", f"{q(S)}!$C$8")
        self.name("CalEquipe", f"{q(S)}!$C$9")
        self.name("CalSolic", f"{q(S)}!$C$10")
        # legenda
        lg = [("S", "Solicitada (aguarda análise)", "#FFEB9C", "#7F6000"), ("A", "Aprovada", "#BDD7EE", "#1F4E79"),
              ("G", "Em gozo", "#1F3864", "#FFFFFF"), ("C", "Concluída", "#C6EFCE", "#006100")]
        for i, (code, txt, bg, fc) in enumerate(lg):
            ws.write(3 + i, 8, code, self.F(bg_color=bg, font_color=fc, bold=True, align="center", border=1, border_color="#FFFFFF"))
            ws.write(3 + i, 9, txt, self.F(font_size=9))
        ws.write(7, 8, "!", self.F(bg_color=STATUS[1][0], font_color=STATUS[1][1], bold=True, align="center"))
        ws.write(7, 9, "Acima do limite interno da equipe filtrada", self.F(font_size=9))
        T = self.tabs["T_Prog"]
        self.wf(ws, S, 8, 9, f'="Exibindo "&MIN({N_CAL},COUNTIF(T_Prog[Téc cal],1))&" de "&COUNTIF(T_Prog[Téc cal],1)&" programações do filtro"',
                self.F(font_size=9, bold=True, font_color=K.NAVY))
        lim_f = ('=IF(CalEquipe="(Todas)","Escolha uma equipe para comparar com o limite interno",'
                 'IF(CalLimite="","Limite não definido para a equipe","Limite interno da equipe: "&CalLimite&" ausência(s) ao mesmo tempo"))')
        self.wf(ws, S, 9, 9, lim_f, self.F(font_size=9, bold=True, font_color="#7F6000"))
        lim_calc = ('=IF(CalEquipe="(Todas)","",IFERROR(IF(CalEmp="(Todas)",'
                    'IF(INDEX(T_Equipes[Limite interno de ausências simultâneas],MATCH(CalEquipe,T_Equipes[Equipe],0))="",IF(ISNUMBER(LimitePadrao),LimitePadrao,""),INDEX(T_Equipes[Limite interno de ausências simultâneas],MATCH(CalEquipe,T_Equipes[Equipe],0))),'
                    'IF(INDEX(T_Equipes[Limite interno de ausências simultâneas],MATCH(CalEmp&"|"&CalEquipe,T_Equipes[Téc chave],0))="",IF(ISNUMBER(LimitePadrao),LimitePadrao,""),INDEX(T_Equipes[Limite interno de ausências simultâneas],MATCH(CalEmp&"|"&CalEquipe,T_Equipes[Téc chave],0)))),IF(ISNUMBER(LimitePadrao),LimitePadrao,"")))')
        ws.write(6, 5, "Limite", tec)
        self.wf(ws, S, 6, 6, lim_calc, tec)
        self.name("CalLimite", f"{q(S)}!$G$7")
        # cabeçalho da grade
        HR = 11
        hdr = self.F(bold=True, font_color="#FFFFFF", bg_color=K.NAVY, text_wrap=True, align="center", font_size=9,
                     border=1, border_color="#FFFFFF")
        dayh = self.F(bold=True, font_color="#FFFFFF", bg_color=K.NAVY, align="center", font_size=8, num_format="d",
                      border=1, border_color="#FFFFFF")
        wdh = self.F(font_color=K.NAVY, bg_color="#D6E6F7", align="center", font_size=7, border=1, border_color="#FFFFFF")
        for i, h in enumerate(["Funcionário", "Empresa", "Equipe", "Programação", "Início", "Término", "Situação", "Dias no mês",
                               "Conflito de equipe"]):
            ws.merge_range(HR, 1 + i, HR + 1, 1 + i, h, hdr)
        for k in range(31):
            c = DC0 + k
            self.wf(ws, S, HR, c, f'=IF(NOT(ISNUMBER(CalM1)),"",IF({k + 1}<=DAY(CalM2),CalM1+{k},""))', dayh)
            L = xl_col_to_name(c)
            self.wf(ws, S, HR + 1, c, f'=IF(ISNUMBER({L}{HR + 1}),CHOOSE(WEEKDAY({L}{HR + 1}),"D","S","T","Q","Q","S","S"),"")', wdh)
        ws.set_row(HR, 18)
        ws.set_row(HR + 1, 14)
        R0 = HR + 2
        txt = self.F(font_size=9, border=1, border_color=K.BORDER)
        txtd = self.F(font_size=9, border=1, border_color=K.BORDER, num_format="dd/mm/yyyy", align="center")
        txti = self.F(font_size=9, border=1, border_color=K.BORDER, align="center")
        dayc = self.F(font_size=8, border=1, border_color="#E0E0E0", align="center", bold=True)
        idx = lambda col, r: f'IF($A{r + 1}="","",INDEX(T_Prog[{col}],$A{r + 1})&"")'
        idxn = lambda col, r: f'IF($A{r + 1}="","",INDEX(T_Prog[{col}],$A{r + 1}))'
        for k in range(N_CAL):
            r = R0 + k
            self.wf(ws, S, r, 0, f'=IFERROR(MATCH({k + 1},T_Prog[Téc cal seq],0),"")', tec)
            self.wf(ws, S, r, 1, "=" + idx("Nome", r), txt)
            self.wf(ws, S, r, 2, "=" + idx("Empresa", r), txti)
            self.wf(ws, S, r, 3, "=" + idx("Equipe", r), txt)
            self.wf(ws, S, r, 4, "=" + idx("ID da programação", r), txti)
            self.wf(ws, S, r, 5, "=" + idxn("Data de início", r), txtd)
            self.wf(ws, S, r, 6, "=" + idxn("Término", r), txtd)
            self.wf(ws, S, r, 7, "=" + idx("Situação da programação", r), txti)
            self.wf(ws, S, r, 8, f'=IF($A{r + 1}="","",MAX(0,MIN($G{r + 1},CalM2)-MAX($F{r + 1},CalM1)+1))', txti)
            self.wf(ws, S, r, 9, "=" + idx("Conflito de equipe", r), txt)
            for d in range(31):
                c = DC0 + d
                L = xl_col_to_name(c)
                f = (f'=IF(OR($A{r + 1}="",NOT(ISNUMBER({L}${HR + 1}))),"",IF(AND({L}${HR + 1}>=$F{r + 1},{L}${HR + 1}<=$G{r + 1}),'
                     f'CHOOSE(INDEX(T_Prog[Téc S],$A{r + 1}),"","S","A","G","C",""),""))')
                self.wf(ws, S, r, c, f, dayc)
        rng = (R0, DC0, R0 + N_CAL - 1, DC0 + 30)
        for code, bg, fc in [("S", "#FFEB9C", "#7F6000"), ("A", "#BDD7EE", "#1F4E79"), ("G", "#1F3864", "#FFFFFF"),
                             ("C", "#C6EFCE", "#006100")]:
            ws.conditional_format(*rng, {"type": "cell", "criteria": "==", "value": f'"{code}"',
                                         "format": self.F(bg_color=bg, font_color=fc)})
        sf = self.status_formats()
        for k, cor in [("Acima", 2), ("Conflito", 2), ("Limite não", 2), ("Dentro", 4), ("Equipe não", 2)]:
            ws.conditional_format(R0, 9, R0 + N_CAL - 1, 9, {"type": "text", "criteria": "begins with", "value": k, "format": sf[cor]})
        # linhas de totais por dia
        RT = R0 + N_CAL + 1
        tl = self.F(bold=True, font_size=9, align="right", font_color=K.NAVY, text_wrap=True)
        totf = self.F(font_size=8, align="center", border=1, border_color=K.BORDER, bg_color=K.CALC_BG)
        labels = ["Ausências aprovadas, em gozo ou concluídas no dia", "Solicitações no dia (ainda sem aprovação)",
                  "Comparação com o limite interno da equipe filtrada"]
        for i, a in enumerate(labels):
            ws.merge_range(RT + i, 1, RT + i, 9, a, tl)
        for d in range(31):
            c = DC0 + d
            L = xl_col_to_name(c)
            day = f"{L}${HR + 1}"
            self.wf(ws, S, RT, c, f'=IF(NOT(ISNUMBER({day})),"",COUNTIFS(T_Prog[Téc cal],1,T_Prog[Téc cap],1,T_Prog[Data de início],"<="&{day},T_Prog[Término],">="&{day}))', totf)
            self.wf(ws, S, RT + 1, c, f'=IF(NOT(ISNUMBER({day})),"",COUNTIFS(T_Prog[Téc cal],1,T_Prog[Téc S],2,T_Prog[Data de início],"<="&{day},T_Prog[Término],">="&{day}))', totf)
            self.wf(ws, S, RT + 2, c, f'=IF(OR(NOT(ISNUMBER({day})),NOT(ISNUMBER(CalLimite))),"",IF({L}{RT + 1}>CalLimite,"!",""))', totf)
        ws.conditional_format(RT + 2, DC0, RT + 2, DC0 + 30, {"type": "cell", "criteria": "==", "value": '"!"', "format": sf[1]})
        ws.write(RT + 4, 1, "Conflitos usam as datas reais de cada programação, inclusive quando atravessam meses ou anos. "
                 "O limite por equipe é um parâmetro interno, sem previsão legal.", self.F(font_size=8, italic=True, font_color="#404040"))
        ws.freeze_panes(R0, 2)
        ws.set_landscape()
        ws.set_paper(9)
        ws.fit_to_pages(1, 0)
        ws.print_area(0, 1, RT + 4, DC0 + 30)
        ws.repeat_rows(HR, HR + 1)
        ws.set_margins(left=0.4, right=0.4, top=0.5, bottom=0.6)
        ws.set_footer("&L&8Controle de Férias  ·  Calendário&R&8Página &P de &N")

    # ------------------------------------------------------------------ painel
    def build_painel(self):
        ws = self.ws[K.S_PAINEL]
        S = K.S_PAINEL
        ws.set_tab_color("#C00000")
        ws.hide_gridlines(2)
        widths = [2, 12, 9, 24, 14, 13, 34, 11, 34, 16]
        for i, w in enumerate(widths):
            ws.set_column(i, i, w)
        ws.set_row(0, 30)
        ws.write(0, 1, "Painel de controle de férias", self.F(bold=True, font_size=18, font_color=K.NAVY))
        self.wf(ws, S, 1, 1, '="Data de referência usada nos cálculos: "&' + dtxt("DataRef"),
                self.F(bold=True, font_size=10, font_color=K.NAVY))
        ws.merge_range(2, 1, 2, 9, "Os números mudam quando a planilha é aberta ou recalculada. Não há envio de avisos por e-mail "
                       "ou WhatsApp. Programar não significa gozar. Prever um pagamento não significa que ele foi realizado.",
                       self.F(bg_color=K.LIGHT_BLUE, font_size=9, text_wrap=True, font_color=K.NAVY))
        ws.set_row(2, 28)
        ws.write_url(1, 6, f"internal:{q(K.S_INICIO)}!A1", self.F(font_color="#1F4E79", underline=1, font_size=9), "← Comece aqui")
        ws.write_url(1, 8, f"internal:{q(K.S_CAL)}!A1", self.F(font_color="#1F4E79", underline=1, font_size=9), "Calendário →")
        cards = textos.painel_cards()
        spans = [(1, 3), (4, 6), (7, 9)]
        r = 4
        for i, (titulo, f_val, fmt_val, f_det, cor) in enumerate(cards):
            row = r + (i // 3) * 4
            c0, c1 = spans[i % 3]
            accent = {"azul": "#2F75B5", "amarelo": "#BF9000", "vermelho": "#C00000", "verde": "#548235"}[cor]
            tf = self.F(bold=True, font_size=9, font_color="#FFFFFF", bg_color=accent, text_wrap=True)
            vf = self.F(bold=True, font_size=20, font_color=K.NAVY, align="left", num_format=fmt_val, bg_color="#FFFFFF",
                        left=2, left_color=accent)
            df = self.F(font_size=9, font_color="#404040", bg_color="#FFFFFF", left=2, left_color=accent, bottom=1,
                        bottom_color=K.BORDER, text_wrap=True)
            ws.merge_range(row, c0, row, c1, titulo, tf)
            ws.merge_range(row + 1, c0, row + 1, c1, "", vf)
            self.wf(ws, S, row + 1, c0, f_val, vf)
            ws.merge_range(row + 2, c0, row + 2, c1, "", df)
            self.wf(ws, S, row + 2, c0, f_det, df)
            ws.set_row(row + 1, 30)
        RL = r + 4 * 4 + 1
        ws.write(RL - 1, 1, "PRÓXIMAS AÇÕES POR PRIORIDADE", self.F(bold=True, font_size=12, font_color=K.NAVY))
        self.wf(ws, S, RL - 1, 6, '="Mostrando até ' + str(N_PAINEL) + ' de "&' + self.painel_total_formula() + '&" pendências encontradas"',
                self.F(font_size=9, italic=True, font_color="#404040"))
        hdr = self.F(bold=True, font_color="#FFFFFF", bg_color=K.NAVY, text_wrap=True, align="center", font_size=9,
                     border=1, border_color="#FFFFFF")
        heads = ["Prioridade", "Empresa", "Funcionário", "Período ou programação", "Origem", "Pendência", "Prazo", "Próxima ação", "Responsável"]
        for i, h in enumerate(heads):
            ws.write(RL, 1 + i, h, hdr)
        ws.set_row(RL, 30)
        self.painel_rows = (RL + 1, RL + N_PAINEL)
        self.painel_hdr = RL
        ws.repeat_rows(RL)
        ws.freeze_panes(RL + 1, 0)
        ws.set_landscape()
        ws.set_paper(9)
        ws.fit_to_pages(1, 0)
        ws.print_area(0, 1, RL + N_PAINEL + 3, 9)
        ws.set_margins(left=0.4, right=0.4, top=0.5, bottom=0.6)
        ws.set_footer("&L&8Controle de Férias  ·  Painel&R&8Página &P de &N")

    def painel_total_formula(self):
        parts = []
        for tid, (tn, sc, _) in PAINEL_SRC.items():
            parts.append(f'COUNTIF({tn}[{sc}],">0")')
        return "(" + "+".join(parts) + ")"

    def build_apoio_engine(self):
        """Motor da lista de prioridades: k-ésima maior pontuação entre as tabelas, sem fórmulas matriciais."""
        ws = self.ws[K.S_APOIO]
        S = K.S_APOIO
        c0 = self.apoio_next_col
        hf = self.F(bold=True, font_color="#FFFFFF", bg_color=K.TEC_HDR, text_wrap=True, align="center", font_size=8)
        cf = self.F(font_size=8, border=1, border_color=K.BORDER, bg_color=K.CALC_BG, num_format="0")
        for i, h in enumerate(["Ordem", "Pontuação", "Origem", "Linha", "Gravidade"]):
            ws.write(4, c0 + i, h, hf)
            ws.set_column(c0 + i, c0 + i, 13 if i == 1 else 8)
        Lsc, Ltid, Lrow, Lg = (xl_col_to_name(c0 + 1), xl_col_to_name(c0 + 2), xl_col_to_name(c0 + 3), xl_col_to_name(c0 + 4))
        for k in range(N_PAINEL):
            r = 5 + k
            ws.write_number(r, c0, k + 1, cf)
            prev = "99999999999" if k == 0 else f"{Lsc}{r}"
            terms = []
            for tid, (tn, sc, _) in PAINEL_SRC.items():
                col = f"{tn}[{sc}]"
                terms.append(f'IFERROR(LARGE({col},COUNTIF({col},">="&{prev})+1),0)')
            f = f"=MAX({','.join(terms)})" if k == 0 else f"=IF(N({prev})<=0,0,MAX({','.join(terms)}))"
            self.wf(ws, S, r, c0 + 1, f, cf)
            self.wf(ws, S, r, c0 + 2, f"=IF({Lsc}{r + 1}>0,INT(MOD({Lsc}{r + 1},100000)/10000),0)", cf)
            self.wf(ws, S, r, c0 + 3, f"=IF({Lsc}{r + 1}>0,MOD({Lsc}{r + 1},10000),0)", cf)
            self.wf(ws, S, r, c0 + 4, f"=IF({Lsc}{r + 1}>0,5-INT({Lsc}{r + 1}/10000000000),0)", cf)
        # exibição no painel
        wp = self.ws[K.S_PAINEL]
        P = K.S_PAINEL
        r0, r1 = self.painel_rows
        txt = self.F(font_size=9, border=1, border_color=K.BORDER, text_wrap=True)
        txtc = self.F(font_size=9, border=1, border_color=K.BORDER, align="center")
        txtd = self.F(font_size=9, border=1, border_color=K.BORDER, align="center", num_format="dd/mm/yyyy")
        pri = self.F(font_size=9, border=1, border_color=K.BORDER, align="center", bold=True)
        for k in range(N_PAINEL):
            r = r0 + k
            ar = 5 + k + 1
            tid, rown, g = f"{q(S)}!${Ltid}${ar}", f"{q(S)}!${Lrow}${ar}", f"{q(S)}!${Lg}${ar}"
            self.wf(wp, P, r, 1, f'=IF({g}=0,"",CHOOSE({g},"1 Crítica","2 Alta","3 Média","4 Acompanhar"))', pri)
            for fi in range(8):
                expr = '""'
                for t_id in sorted(PAINEL_SRC, reverse=True):
                    tn, _, fields = PAINEL_SRC[t_id]
                    fld = fields[fi]
                    t = self.tabs[tn]
                    if fld is None:
                        val = '""'
                    elif fi == 3:
                        val = f'"{fld}"'
                    else:
                        val = f'INDEX({q(t.sheet)}!${t.L(fld)}:${t.L(fld)},{rown})' + ('' if fi == 5 else '&""')
                    expr = f"IF({tid}={t_id},{val},{expr})"
                fmt = txtd if fi == 5 else (txtc if fi in (0, 2, 3) else txt)
                self.wf(wp, P, r, 2 + fi, f'=IF({g}=0,"",{expr})', fmt)
            wp.set_row(r, 26)
        sf = self.status_formats()
        for gval, cor in [(1, 1), (2, 2), (3, 2), (4, 3)]:
            wp.conditional_format(r0, 1, r1, 1, {"type": "formula", "criteria": f"={q(S)}!${Lg}{6}={gval}", "format": sf[cor]})
        lr = r1 + 2
        wp.write(lr, 1, "Prioridade: 1 Crítica (prazo encerrado ou inconsistência), 2 Alta, 3 Média, 4 Acompanhar. "
                 "Dentro de cada nível, o prazo mais próximo aparece primeiro.", self.F(font_size=8, italic=True, font_color="#404040"))

    # ------------------------------------------------------------------ ficha
    def build_ficha(self):
        ws = self.ws[K.S_FICHA]
        S = K.S_FICHA
        ws.set_tab_color("#548235")
        ws.hide_gridlines(2)
        ws.set_column(0, 0, 3, None, {"hidden": True})
        widths = [17, 12, 12, 12, 10, 10, 10, 19, 19, 20, 30, 22]
        for i, w in enumerate(widths):
            ws.set_column(1 + i, 1 + i, w)
        ws.set_row(0, 28)
        ws.write(0, 1, "Ficha individual de férias", self.F(bold=True, font_size=16, font_color=K.NAVY))
        lab = self.F(bold=True, font_size=9, font_color=K.NAVY, align="right")
        val = self.F(font_size=10, border=1, border_color=K.BORDER, bg_color=K.CALC_BG)
        vald = self.F(font_size=10, border=1, border_color=K.BORDER, bg_color=K.CALC_BG, num_format="dd/mm/yyyy", align="left")
        inp = self.F(locked=False, border=2, border_color=K.NAVY, bold=True, font_size=11, align="center")
        ws.write(2, 1, "Vínculo:", lab)
        self.wv(ws, 2, 2, self.data.get("ficha_vinculo", ""), inp)
        ws.data_validation(2, 2, 2, 2, {"validate": "list", "source": "=lst_Vinculos"})
        self.name("FichaVinc", f"{q(S)}!$C$3")
        ws.merge_range(2, 3, 2, 8, "Escolha o ID do vínculo na lista. Para imprimir: Arquivo > Imprimir (A4 paisagem já configurado).",
                       self.F(font_size=8, italic=True, font_color="#404040", text_wrap=True))
        ws.write_url(2, 11, f"internal:{q(K.S_INICIO)}!A1", self.F(font_color="#1F4E79", underline=1, font_size=9), "← Comece aqui")
        fl = "IFERROR(MATCH(FichaVinc,T_Func[ID do vínculo],0),0)"
        self.wf(ws, S, 2, 0, "=" + fl, self.F(font_size=8, font_color="#808080"))
        fr = f"{q(S)}!$A$3"
        g = lambda col: f'=IF(OR(FichaVinc="",{fr}=0),"",INDEX(T_Func[{col}],{fr})&"")'
        gd = lambda col: f'=IF(OR(FichaVinc="",{fr}=0),"",IF(INDEX(T_Func[{col}],{fr})="","",INDEX(T_Func[{col}],{fr})))'
        info = [("Nome", g("Nome"), val), ("Empresa", f'=IF(OR(FichaVinc="",{fr}=0),"",INDEX(T_Func[ID da empresa],{fr})&" · "&INDEX(T_Func[Nome da empresa],{fr}))', val),
                ("Matrícula", g("Matrícula"), val), ("Admissão", gd("Data de admissão"), vald),
                ("Setor e equipe", f'=IF(OR(FichaVinc="",{fr}=0),"",INDEX(T_Func[Setor],{fr})&" · "&INDEX(T_Func[Equipe],{fr}))', val),
                ("Situação do vínculo", g("Situação do vínculo"), val)]
        info2 = [("Escala", g("Escala ou jornada"), val), ("Localidade", g("Localidade de trabalho"), val),
                 ("Regime", g("Regime contratual"), val), ("Data de referência", "=DataRef", vald),
                 ("Data de emissão", "=TODAY()", vald), ("Alerta do cadastro", g("Alerta do cadastro"), val)]
        for i, (a, f, fm) in enumerate(info):
            ws.write(4 + i, 1, a, lab)
            ws.merge_range(4 + i, 2, 4 + i, 5, "", fm)
            self.wf(ws, S, 4 + i, 2, f, fm)
        for i, (a, f, fm) in enumerate(info2):
            ws.merge_range(4 + i, 6, 4 + i, 7, a, lab)
            ws.merge_range(4 + i, 8, 4 + i, 12, "", fm)
            self.wf(ws, S, 4 + i, 8, f, fm)
        if not self.data.get("ficha_vinculo"):
            pass
        sec = self.F(bold=True, font_size=11, font_color="#FFFFFF", bg_color=K.NAVY)
        hdr = self.F(bold=True, font_color=K.NAVY, bg_color="#D6E6F7", text_wrap=True, align="center", font_size=8, border=1,
                     border_color="#FFFFFF")
        txt = self.F(font_size=8, border=1, border_color=K.BORDER, text_wrap=True)
        txtc = self.F(font_size=8, border=1, border_color=K.BORDER, align="center")
        txtd = self.F(font_size=8, border=1, border_color=K.BORDER, align="center", num_format="dd/mm/yyyy")
        sf = self.status_formats()

        def section(r, title, tname, n, cols, corcol=None, corpos=None):
            ws.merge_range(r, 1, r, 12, title, sec)
            for i, (h, _, _) in enumerate(cols):
                ws.write(r + 1, 1 + i, h, hdr)
            ws.set_row(r + 1, 30)
            t = self.tabs[tname]
            for k in range(n):
                rr = r + 2 + k
                self.wf(ws, S, rr, 0, f'=IFERROR(MATCH({k + 1},{tname}[Téc ficha],0),"")', self.F(font_size=8, font_color="#808080"))
                for i, (h, col, kind) in enumerate(cols):
                    if col is None:
                        continue
                    if isinstance(col, tuple):
                        a, b = col
                        f = f'=IF($A{rr + 1}="","",N(INDEX({tname}[{a}],$A{rr + 1}))+N(INDEX({tname}[{b}],$A{rr + 1})))'
                    elif kind in ("d", "n"):
                        f = f'=IF($A{rr + 1}="","",INDEX({tname}[{col}],$A{rr + 1}))'
                    else:
                        f = f'=IF($A{rr + 1}="","",INDEX({tname}[{col}],$A{rr + 1})&"")'
                    fm = txtd if kind == "d" else (txtc if kind == "n" or kind == "c" else txt)
                    self.wf(ws, S, rr, 1 + i, f, fm)
                ws.set_row(rr, 30)
            if corcol:
                cr = f"{q(t.sheet)}!${t.L(corcol)}${t.r0 + 1}:${t.L(corcol)}${t.r1 + 1}"
                for kc, ff in sf.items():
                    ws.conditional_format(r + 2, 1 + corpos, r + 1 + n, 1 + corpos,
                                          {"type": "formula", "criteria": f'=IF($A{r + 3}="",FALSE,INDEX({cr},$A{r + 3})={kc})',
                                           "format": ff})
            self.wf(ws, S, r + 2 + n, 1, f'=IF(COUNTIF({tname}[Téc ficha],">"&{n})>0,"Há mais registros do que as {n} linhas desta seção. Consulte a aba {t.sheet}.","")',
                    self.F(font_size=8, italic=True, font_color="#C00000"))
            return r + 3 + n

        r = 11
        r = section(r, "PERÍODOS AQUISITIVOS E SALDOS", "T_Per", N_FICHA_PER, [
            ("Período", "ID do período", "c"), ("Início do aquisitivo", "Início do aquisitivo", "d"),
            ("Término do aquisitivo", "Término do aquisitivo", "d"), ("Fim do concessivo", "Término do concessivo", "d"),
            ("Direito (dias)", "Dias de direito", "n"), ("Gozo confirmado", "Gozo confirmado", "n"),
            ("Abono confirmado", "Abono confirmado", "n"), ("Reservado (gozo + abono)", ("Gozo reservado", "Abono reservado"), "n"),
            ("Saldo não gozado", "Saldo não gozado", "n"), ("Saldo disponível", "Saldo disponível", "n"),
            ("Situação do período", "Situação do período", "t"), ("Referência documental", "Referência documental", "t")],
            "Téc cor", 10)
        r = section(r, "PROGRAMAÇÕES (PARCELAS)", "T_Prog", N_FICHA_PROG, [
            ("Programação", "ID da programação", "c"), ("Período", "ID do período", "c"), ("Situação", "Situação da programação", "c"),
            ("Início", "Data de início", "d"), ("Término", "Término", "d"), ("Dias de gozo", "Dias de gozo", "n"),
            ("Abono", "Téc abono dias", "n"), ("Aviso", "Aviso", "t"), ("Pagamento", "Pagamento", "t"),
            ("Validação", "Validação do conjunto", "t"), ("Próxima ação", "Próxima ação", "t"),
            ("Referência do documento", "Referência do documento", "t")], "Téc cor valid", 9)
        r = section(r, "OCORRÊNCIAS", "T_Oc", N_FICHA_OC, [
            ("Ocorrência", "ID da ocorrência", "c"), ("Tipo", "Tipo", "t"), ("Início", "Início", "d"), ("Término", "Término", "d"),
            ("Período afetado", "ID do período afetado", "c"), ("Análise", "Situação da análise", "c"),
            ("Efeito", "Efeito confirmado", "t"), ("Direito ajustado", "Direito ajustado", "n"), ("Responsável", "Responsável", "t"),
            ("Conclusão", "Data da conclusão", "d"), ("Alerta", "Alerta da ocorrência", "t"),
            ("Referência do documento", "Referência do documento", "t")], "Téc cor", 10)
        # resumo de pendências
        ws.merge_range(r, 1, r, 12, "RESUMO DE PENDÊNCIAS DO VÍNCULO", sec)
        items = [("Períodos com ação pendente", 'COUNTIFS(T_Per[ID do vínculo],FichaVinc,T_Per[Téc G],">0")'),
                 ("Programações com ação pendente", 'COUNTIFS(T_Prog[ID do vínculo],FichaVinc,T_Prog[Téc G],">0")'),
                 ("Avisos pendentes", 'SUMIFS(T_Prog[Téc aviso pend],T_Prog[ID do vínculo],FichaVinc)'),
                 ("Pagamentos não confirmados", 'SUMIFS(T_Prog[Téc pag pend],T_Prog[ID do vínculo],FichaVinc)'),
                 ("Ocorrências aguardando análise", 'SUMIFS(T_Oc[Téc pendente],T_Oc[ID do vínculo],FichaVinc)')]
        for i, (a, f) in enumerate(items):
            rr = r + 1 + i
            ws.merge_range(rr, 1, rr, 4, a, self.F(font_size=9, border=1, border_color=K.BORDER))
            self.wf(ws, S, rr, 5, f'=IF(FichaVinc="","",{f})', self.F(font_size=10, bold=True, border=1, border_color=K.BORDER, align="center"))
        rr = r + 1 + len(items) + 1
        ws.merge_range(rr, 1, rr, 12, "Legenda: vermelho = pendência crítica; amarelo = atenção; azul = em acompanhamento; verde = conferido "
                       "ou concluído segundo os registros; cinza = cancelado ou não aplicável. A ficha mostra o que está registrado na planilha "
                       "e não substitui o sistema de folha.", self.F(font_size=8, italic=True, text_wrap=True, font_color="#404040"))
        ws.set_row(rr, 30)
        ws.set_landscape()
        ws.set_paper(9)
        ws.fit_to_pages(1, 0)
        ws.print_area(0, 1, rr, 12)
        ws.repeat_rows(0, 9)
        ws.set_margins(left=0.4, right=0.4, top=0.6, bottom=0.6)
        ws.set_header("&L&8Controle de Férias&R&8Ficha individual")
        ws.set_footer("&L&8Emitida a partir dos registros da planilha&R&8Página &P de &N")


def construir(data, path, cache=None):
    b = Builder(path, data, cache)
    b.build()
    return b
