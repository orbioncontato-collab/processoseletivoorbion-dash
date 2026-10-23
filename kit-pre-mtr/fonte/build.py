# -*- coding: utf-8 -*-
"""Gera o HTML interativo do Kit Pré-MTR a partir de formularios.py.

Uso:  python3 build.py
Saída: ../Kit_Pre_MTR_15_Formularios.html
Se existir paginas.json (gerado por gerar_pdfs.mjs), os números de página
do índice impresso são preenchidos.
"""
import base64
import html
import json
from pathlib import Path

from formularios import CATEGORIAS, DATALISTS, FORMULARIOS
from ilustracoes import cat_art, cover_art, icon

BASE = Path(__file__).resolve().parent
SAIDA = BASE.parent / "Kit_Pre_MTR_15_Formularios.html"
VERSAO = "1.0"
LETRAS = "ABCDEFGH"
AVISO = ("Os formulários deste kit são modelos internos de organização e registro. Não substituem documentos "
         "oficiais, avaliações técnicas ou procedimentos exigidos pelos órgãos competentes.")

# ------------------------------------------------------------ verificações
assert len(CATEGORIAS) == 3
assert len(FORMULARIOS) == 15
for c in CATEGORIAS:
    assert sum(1 for f in FORMULARIOS if f["cat"] == c["num"]) == 5
assert len({f["titulo"] for f in FORMULARIOS}) == 15
CAT = {c["num"]: c for c in CATEGORIAS}
for i, f in enumerate(FORMULARIOS, 1):
    f["n"] = i
    f["cod"] = f"F{i:02d}"
    f["id"] = f"f{i:02d}"

PAGINAS = {}
pj = BASE / "paginas.json"
if pj.exists():
    PAGINAS = json.loads(pj.read_text(encoding="utf-8"))


def esc(t):
    return html.escape(str(t), quote=True)


def pag(chave):
    v = PAGINAS.get(chave)
    return f"{v:02d}" if isinstance(v, int) else "--"


# ------------------------------------------------------------ campos

class Ids:
    """Garante identificadores únicos em todo o documento."""
    vistos = set()

    @classmethod
    def novo(cls, i):
        assert i not in cls.vistos, f"id repetido: {i}"
        cls.vistos.add(i)
        return i


def span(s):
    return f" s{s}"


def campo(fid, f):
    t = f["t"]
    if t == "nota":
        return f'<p class="nota s12">{esc(f["texto"])}</p>'
    if t == "sub":
        corpo = "".join(campo(fid, x) for x in f["campos"])
        return f'<div class="sub{span(f["s"])}"><div class="sub-h">{esc(f["titulo"])}</div><div class="grid">{corpo}</div></div>'
    if t == "tabela":
        return tabela(fid, f)
    if t == "checklist":
        return checklist(fid, f)
    if t == "calc":
        return calc(fid, f)
    k = f"{fid}-{f['k']}"
    Ids.novo(k)
    ph = f' placeholder="{esc(f["ph"])}"' if f.get("ph") else ""
    rot = esc(f["l"])
    if t in ("text", "date", "time", "num", "list"):
        tipo = {"text": "text", "date": "date", "time": "time", "num": "text", "list": "text"}[t]
        extra = ' inputmode="decimal" class="num"' if t == "num" else ""
        if t == "list":
            extra = f' list="{f["list"]}"'
        return (f'<div class="fld{span(f["s"])}"><label for="{k}">{rot}</label>'
                f'<input type="{tipo}" id="{k}" name="{k}"{extra}{ph} autocomplete="off"></div>')
    if t == "area":
        return (f'<div class="fld{span(f["s"])}"><label for="{k}">{rot}</label>'
                f'<textarea id="{k}" name="{k}" rows="{f["rows"]}"{ph}></textarea></div>')
    if t in ("radio", "checks"):
        tipo = "radio" if t == "radio" else "checkbox"
        ops = "".join(
            f'<label class="chip"><input type="{tipo}" name="{k}" value="{esc(o)}"><span class="box"></span><span>{esc(o)}</span></label>'
            for o in f["o"]
        )
        cls = "chips col" if t == "checks" else "chips"
        return f'<fieldset class="fld opts{span(f["s"])}"><legend>{rot}</legend><div class="{cls}">{ops}</div></fieldset>'
    if t == "check":
        return (f'<div class="fld one{span(f["s"])}"><label class="chip"><input type="checkbox" id="{k}" name="{k}" value="sim">'
                f'<span class="box"></span><span>{rot}</span></label></div>')
    raise ValueError(t)


SIGLAS = {"tri": [("Conferido", "C"), ("Pendente", "P"), ("Não aplicável", "NA")],
          "vnc": [("Verificado", "V"), ("Necessita conferência", "NC"), ("Não aplicável", "NA")]}


def celula(tid, rid, col, rotulo_linha, valor=""):
    key, rot, tipo, _ = col
    nome = f"{tid}-{rid}-{key}"
    aria = esc(f"{rot}, {rotulo_linha}")
    if tipo in SIGLAS:
        ops = "".join(
            f'<label class="tri-o" title="{esc(o)}"><input type="radio" name="{nome}" value="{esc(o)}" data-col="{key}" aria-label="{aria}: {esc(o)}"><span class="box"></span><span>{s}</span></label>'
            for o, s in SIGLAS[tipo]
        )
        return f'<td class="c-tri"><div class="tri">{ops}</div></td>'
    if tipo == "check":
        return (f'<td class="c-chk"><label class="chip solo"><input type="checkbox" name="{nome}" value="sim" data-col="{key}" aria-label="{aria}">'
                f'<span class="box"></span></label></td>')
    attrs = {"text": 'type="text"', "num": 'type="text" inputmode="decimal" class="num"', "unit": 'type="text" list="dl-unidades"',
             "date": 'type="date"'}
    if tipo.startswith("list:"):
        a = f'type="text" list="{tipo[5:]}"'
    else:
        a = attrs[tipo]
    v = f' value="{esc(valor)}"' if valor else ""
    return f'<td><input {a} name="{nome}" data-col="{key}" aria-label="{aria}"{v} autocomplete="off"></td>'


def tabela(fid, f):
    tid = f"{fid}-{f['k']}"
    Ids.novo(tid)
    cols = f["cols"]
    total = sum(c[3] for c in cols)
    cg = ('<col class="c-n">' if f["num"] else "") + "".join(f'<col style="width:{c[3] / total * 100:.1f}%">' for c in cols) + '<col class="c-del">'
    th = ('<th class="c-n">Nº</th>' if f["num"] else "") + "".join(f"<th>{esc(c[1])}</th>" for c in cols) + '<th class="c-del"><span class="sr">Remover</span></th>'
    linhas = []
    n = max(f["min"], len(f["pre"]))
    for i in range(n):
        pre = f["pre"][i] if i < len(f["pre"]) else ""
        linhas.append(linha(tid, f, f"r{i + 1}", i + 1, pre))
    tpl = linha(tid, f, "rNOVA", 0, "", template=True)
    nota = f'<p class="nota">{esc(f["nota"])}</p>' if f.get("nota") else ""
    return f'''<div class="tbl s12" id="{tid}" data-tabela="{f["k"]}" data-min="{f["min"]}" data-imp="{f["imp"]}" data-pre="{esc(json.dumps(f["pre"], ensure_ascii=False))}">
<table><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead><tbody>{"".join(linhas)}</tbody></table>
<template>{tpl}</template>
<div class="tbl-foot">{nota}<button type="button" class="btn-add no-print" data-add>{icon("plus")}Adicionar linha</button></div>
</div>'''


def linha(tid, f, rid, n, pre, template=False):
    rot = f"linha {n}" if n else "nova linha"
    tds = []
    if f["num"]:
        tds.append(f'<td class="c-n">{n if n else ""}</td>')
    for j, col in enumerate(f["cols"]):
        tds.append(celula(tid, rid, col, rot, pre if j == 0 else ""))
    tds.append(f'<td class="c-del no-print"><button type="button" class="btn-del" data-del aria-label="Remover {rot}" title="Remover linha">{icon("x")}</button></td>')
    return f'<tr data-row="{rid}">{"".join(tds)}</tr>'


def checklist(fid, f):
    tid = f"{fid}-{f['k']}"
    Ids.novo(tid)
    linhas = []
    for i, item in enumerate(f["itens"], 1):
        rid = f"i{i}"
        nome = f"{tid}-{rid}-situacao"
        ops = "".join(
            f'<td class="c-op"><label class="chip solo" title="{o}"><input type="radio" name="{nome}" value="{o}" data-col="situacao" aria-label="{esc(item)}: {o}"><span class="box"></span></label></td>'
            for o in ("Conferido", "Pendente", "Não aplicável")
        )
        linhas.append(f'<tr data-row="{rid}" data-fixo="1"><td class="c-n">{i}</td><td class="c-item">{esc(item)}</td>{ops}'
                      f'<td><input type="text" name="{tid}-{rid}-obs" data-col="obs" aria-label="Observação: {esc(item)}" autocomplete="off"></td>'
                      f'<td class="c-del no-print"></td></tr>')

    def extra(rid, n):
        nome = f"{tid}-{rid}-situacao"
        ops = "".join(
            f'<td class="c-op"><label class="chip solo" title="{o}"><input type="radio" name="{nome}" value="{o}" data-col="situacao" aria-label="Item adicional: {o}"><span class="box"></span></label></td>'
            for o in ("Conferido", "Pendente", "Não aplicável")
        )
        return (f'<tr data-row="{rid}"><td class="c-n">{n if n else ""}</td><td><input type="text" name="{tid}-{rid}-item" data-col="item" placeholder="Item adicional" aria-label="Item adicional" autocomplete="off"></td>{ops}'
                f'<td><input type="text" name="{tid}-{rid}-obs" data-col="obs" aria-label="Observação do item adicional" autocomplete="off"></td>'
                f'<td class="c-del no-print"><button type="button" class="btn-del" data-del aria-label="Remover item" title="Remover linha">{icon("x")}</button></td></tr>')
    base = len(f["itens"])
    for j in range(f["extras"]):
        linhas.append(extra(f"x{j + 1}", base + j + 1))
    return f'''<div class="tbl chk s12" id="{tid}" data-tabela="{f["k"]}" data-min="{f["extras"]}" data-imp="{f["extras"]}" data-fixos="{base}" data-pre="[]">
<table><colgroup><col class="c-n"><col style="width:44%"><col class="c-op"><col class="c-op"><col class="c-op"><col><col class="c-del"></colgroup>
<thead><tr><th class="c-n">Nº</th><th>Item de conferência</th><th class="c-op">Conferido</th><th class="c-op">Pendente</th><th class="c-op">Não aplicável</th><th>Observação</th><th class="c-del"><span class="sr">Remover</span></th></tr></thead>
<tbody>{"".join(linhas)}</tbody></table>
<template>{extra("rNOVA", 0)}</template>
<div class="tbl-foot"><p class="nota">Marque uma opção por item. Use as linhas finais para itens próprios da sua empresa.</p><button type="button" class="btn-add no-print" data-add>{icon("plus")}Adicionar item</button></div>
</div>'''


def calc(fid, f):
    k = f"{fid}-{f['k']}"
    Ids.novo(k)
    return f'''<div class="calc s12" data-calc="{fid}">
<div class="calc-box"><span class="calc-l">Diferença, quando as unidades forem comparáveis</span><output id="{k}" for="{fid}-q1 {fid}-q2" aria-live="polite"></output></div>
<p class="calc-r">{icon("info")}<span>Cálculo automático na versão digital: quantidade verificada menos quantidade informada, com o percentual sobre a quantidade informada. Só é feito quando as duas unidades de medida são iguais.</span></p>
</div>'''


# ------------------------------------------------------------ formulário

def formulario(f):
    c = CAT[f["cat"]]
    fid = f["id"]
    reg = f"{fid}-registro"
    Ids.novo(reg)
    blocos = []
    for i, bloco in enumerate(f["blocos"]):
        titulo, campos = bloco[0], bloco[-1]
        opc = bloco[1] if len(bloco) == 3 else {}
        corpo = "".join(campo(fid, x) for x in campos)
        cls = "blk quebra" if opc.get("quebra") else "blk"
        blocos.append(f'<section class="{cls}"><h3 class="blk-h"><span class="blk-l">{LETRAS[i]}</span>{esc(titulo)}</h3><div class="grid">{corpo}</div></section>')
    sub = f'<span class="fh-sub">{esc(f["subtitulo"])}</span>' if f.get("subtitulo") else ""
    aviso = f'<p class="fh-aviso">{icon("shield")}<span>{esc(f["aviso"])}</span></p>' if f.get("aviso") else ""
    return f'''
<section class="form" id="{fid}" data-form="{f["cod"]}" data-cat="{c["num"]}" style="--c:{c["cor"]};--t:{c["tint"]}" aria-labelledby="{fid}-t">
  <header class="fh">
    <div class="fh-band">
      <div class="fh-ic">{icon(f["icone"])}</div>
      <div class="fh-tt">
        <span class="fh-k">Formulário {f["n"]:02d} · Categoria: {esc(c["nome"])}</span>
        <h2 id="{fid}-t">{esc(f["titulo"])}</h2>{sub}
      </div>
      <div class="fh-id">
        <div><span>Código</span><b>{f["cod"]}</b></div>
        <div><span>Versão</span><b>{VERSAO}</b></div>
        <div class="fh-reg"><label for="{reg}">Registro nº</label><input type="text" id="{reg}" name="{reg}" autocomplete="off"></div>
      </div>
    </div>
    <div class="fh-info">
      <p class="fh-fin"><b>Finalidade de uso:</b> {esc(f["finalidade"])}</p>
      <p class="fh-ori">{icon("info")}<span>{esc(f["orientacao"])}</span></p>
      {aviso}
    </div>
  </header>
  {"".join(blocos)}
  <footer class="ff"><span>{f["cod"]} · {esc(f["titulo"])}</span><span>Modelo interno de organização e registro · Versão {VERSAO}</span></footer>
</section>'''


# ------------------------------------------------------------ partes comuns

PASSOS = [
    ("grid", "Escolha o formulário", "Encontre no índice o modelo que corresponde à situação: preparar a coleta, organizar dados ou acompanhar a movimentação."),
    ("edit", "Preencha as informações", "Digite ou escreva os dados disponíveis. Deixe em branco o que ainda não sabe e registre como pendente."),
    ("users", "Confira com os responsáveis", "Valide os dados com o setor, o transportador ou o destinador antes de usar as informações."),
    ("save", "Salve ou imprima", "Gere uma cópia em PDF ou imprima o formulário e guarde conforme a organização interna."),
]

ORIENTACOES = [
    ("check", "Confira os dados antes do uso", "Compare as informações registradas com os documentos e com os responsáveis por cada etapa antes de lançar dados em qualquer sistema."),
    ("edit", "Adapte os campos à sua empresa", "Use os campos de observação e as linhas adicionais para incluir o que for próprio dos seus procedimentos internos."),
    ("archive", "Guarde cópias de forma organizada", "Salve os PDFs e os arquivos de dados com nomes claros, por exemplo F08_2026-10_Unidade-A, conforme a organização interna."),
    ("shield", "Consulte os procedimentos oficiais", "Quando houver dúvida sobre documentos exigidos, prazos ou classificação, siga os procedimentos oficiais e o sistema aplicável."),
]


def lista_forms(cat, cls="fl", com_pag=False, com_desc=False):
    out = []
    for f in FORMULARIOS:
        if f["cat"] != cat["num"]:
            continue
        p = f'<span class="fl-p">pág. <b>{pag(f["cod"])}</b></span>' if com_pag else ""
        d = f'<small>{esc(f["curta"])}</small>' if com_desc else ""
        out.append(f'<li><a href="#{f["id"]}"><span class="fl-n">{f["cod"]}</span><span class="fl-t"><b>{esc(f["titulo"])}</b>{d}</span>{p}</a></li>')
    return f'<ol class="{cls}">{"".join(out)}</ol>'


# ------------------------------------------------------------ tela inicial

def tela_inicial():
    passos = "".join(
        f'<li class="step"><span class="step-n">{i}</span><span class="step-ic">{icon(ic)}</span><b>{t}</b><p>{d}</p></li>'
        for i, (ic, t, d) in enumerate(PASSOS, 1)
    )
    cats = []
    for c in CATEGORIAS:
        cards = []
        for f in FORMULARIOS:
            if f["cat"] != c["num"]:
                continue
            cards.append(f'''<article class="fcard">
  <div class="fcard-top"><span class="fcard-ic">{icon(f["icone"])}</span><span class="fcard-n">{f["cod"]}</span></div>
  <h4>{esc(f["titulo"])}</h4><p>{esc(f["curta"])}</p>
  <a class="btn-open" href="#{f["id"]}">Abrir formulário{icon("arrow")}</a>
</article>''')
        cats.append(f'''<section class="hcat" id="cat-{c["num"]}" style="--c:{c["cor"]};--t:{c["tint"]}">
  <div class="hcat-h">
    <div class="hcat-art">{cat_art(c["num"], c["cor"])}</div>
    <div class="hcat-tx"><span class="hcat-k">Categoria {c["num"]} · 5 formulários</span><h3>{esc(c["nome"])}</h3><p>{esc(c["resumo"])}</p></div>
  </div>
  <div class="fcards">{"".join(cards)}</div>
</section>''')
    cat_cards = "".join(
        f'<a class="ccard" href="#cat-{c["num"]}" style="--c:{c["cor"]};--t:{c["tint"]}"><span class="ccard-n">{c["num"]}</span>'
        f'<span class="ccard-ic">{icon(c["icone"])}</span><b>{esc(c["nome"])}</b><span>{esc(c["resumo"])}</span></a>'
        for c in CATEGORIAS
    )
    orient = "".join(f'<li><span class="or-ic">{icon(ic)}</span><div><b>{t}</b><p>{d}</p></div></li>' for ic, t, d in ORIENTACOES)
    return f'''
<div class="view view-home" id="inicio">
  <section class="hero">
    <div class="hero-in">
      <div class="hero-tx">
        <span class="hero-k">{icon("leaf")}Kit de formulários para a gestão de resíduos</span>
        <h1>KIT PRÉ-MTR</h1>
        <p class="hero-sub">15 Formulários Prontos para Coletas e Movimentação de Resíduos</p>
        <p class="hero-lead">Modelos editáveis para organizar, conferir, registrar e acompanhar informações da rotina ambiental.</p>
        <div class="hero-cta"><a class="btn-hero" href="#f01">Começar pelo F01{icon("arrow")}</a><a class="btn-hero ghost" href="#formularios">Ver os 15 formulários</a></div>
      </div>
      <div class="hero-art">{cover_art()}</div>
    </div>
    <ul class="kpis">
      <li><b>15</b><span>formulários</span></li>
      <li><b>3</b><span>categorias</span></li>
      <li>{icon("edit")}<span>preenchíveis no navegador</span></li>
      <li>{icon("print")}<span>impressão e cópia em PDF</span></li>
    </ul>
  </section>
  <div class="home-in">
    <p class="aviso">{icon("info")}<span>{esc(AVISO)}</span></p>
    <section class="hsec">
      <div class="hsec-h"><span class="hsec-k">Como utilizar</span><h2>Quatro passos para usar qualquer formulário</h2></div>
      <ol class="steps">{passos}</ol>
    </section>
    <section class="hsec" id="formularios">
      <div class="hsec-h"><span class="hsec-k">Índice</span><h2>Escolha a ferramenta</h2></div>
      <div class="ccards">{cat_cards}</div>
      {"".join(cats)}
    </section>
    <section class="hsec dados">
      <div class="dados-tx">
        <span class="hsec-k">Seus dados</span>
        <h2>O que você digita fica com você</h2>
        <p>Nada é enviado para a internet. O kit guarda um rascunho automático neste navegador, mas esse rascunho pode se perder se o histórico for apagado ou se você abrir o arquivo em outro computador.</p>
        <p>Para guardar com segurança, use <b>Exportar dados</b>: você recebe um arquivo .json com tudo o que foi preenchido. Depois, use <b>Importar dados</b> para continuar de onde parou.</p>
      </div>
      <div class="dados-act">
        <button type="button" class="btn-sec" data-acao="exportar-todos">{icon("download")}Exportar dados de todos os formulários</button>
        <button type="button" class="btn-sec ghost" data-acao="importar">{icon("upload")}Importar dados</button>
        <p class="draft-st" data-draft-status></p>
      </div>
    </section>
    <section class="hsec">
      <div class="hsec-h"><span class="hsec-k">Orientações finais</span><h2>Antes de usar as informações</h2></div>
      <ul class="orient">{orient}</ul>
    </section>
    <footer class="home-foot">Kit Pré-MTR · 15 formulários · Versão {VERSAO}. Complemento dos 70 Fluxos Visuais de MTR, CDF e Controle de Resíduos.</footer>
  </div>
</div>'''


# ------------------------------------------------------------ páginas impressas

def pg_capa():
    return f'''
<section class="pp pp-capa">
  <svg class="pp-grid" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="cg" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width=".25"/></pattern></defs><rect width="210" height="297" fill="url(#cg)"/><circle cx="196" cy="18" r="72" fill="#17806C" opacity=".22"/><circle cx="6" cy="250" r="56" fill="#17806C" opacity=".12"/></svg>
  <div class="capa-in">
    <div class="capa-top"><span class="capa-brand">{icon("leaf")}Kit de formulários para a gestão de resíduos</span><span>Versão {VERSAO}</span></div>
    <h1 class="capa-t">KIT PRÉ-MTR</h1>
    <p class="capa-sub">15 Formulários Prontos para Coletas e Movimentação de Resíduos</p>
    <p class="capa-lead">Modelos editáveis para organizar, conferir, registrar e acompanhar informações da rotina ambiental.</p>
    <div class="capa-pill"><span>15 formulários</span><i>|</i><span>3 categorias</span><i>|</i><span>Prontos para preencher</span></div>
    <div class="capa-art">{cover_art()}</div>
    <div class="capa-cats">{"".join(f'<span><i style="background:{c["cor"]}"></i>{c["num"]} {esc(c["nome"])}</span>' for c in CATEGORIAS)}</div>
  </div>
</section>'''


def pg_apresentacao():
    cats = "".join(
        f'<div class="ap-cat" style="--c:{c["cor"]};--t:{c["tint"]}"><span class="ap-ic">{icon(c["icone"])}</span><span class="ap-k">Categoria {c["num"]}</span><b>{esc(c["nome"])}</b><p>{esc(c["desc"])}</p></div>'
        for c in CATEGORIAS
    )
    return f'''
<section class="pp pp-ed">
  <span class="pp-k">Apresentação</span>
  <h1 class="pp-h1">Formulários prontos para organizar a rotina de resíduos</h1>
  <p class="pp-lead">Este kit reúne 15 formulários para as tarefas que acontecem em volta do MTR: pedir uma coleta, reunir os dados de um resíduo, conferir transportadores e destinadores, preparar as informações antes de lançar no sistema e registrar o que aconteceu depois da saída da carga.</p>
  <p class="pp-lead">Cada formulário já vem com campos organizados em blocos, espaço para observações e um campo de registro. Você escolhe o modelo, preenche, confere e guarda uma cópia.</p>
  <p class="aviso">{icon("info")}<span>{esc(AVISO)}</span></p>
  <div class="ap-cats">{cats}</div>
  <div class="ap-modos">
    <div class="ap-modo"><span class="ap-mic">{icon("edit")}</span><div><b>Versão digital</b><p>Abra o arquivo HTML no navegador, sem internet. Os campos são preenchíveis, as tabelas aceitam novas linhas e cada formulário pode ser impresso ou salvo em PDF com os dados digitados. Os dados também podem ser exportados e importados em arquivo .json.</p></div></div>
    <div class="ap-modo"><span class="ap-mic">{icon("print")}</span><div><b>Versão impressa</b><p>Este PDF traz os 15 formulários em branco, prontos para imprimir e preencher à mão. Ele é um documento para impressão e arquivamento, sem campos digitais.</p></div></div>
  </div>
</section>'''


def pg_como_usar():
    passos = "".join(
        f'<li class="pstep"><div class="pstep-top"><span class="pstep-n">{i}</span><span class="pstep-ic">{icon(ic)}</span></div><b>{t}</b><p>{d}</p></li>'
        for i, (ic, t, d) in enumerate(PASSOS, 1)
    )
    return f'''
<section class="pp pp-ed">
  <span class="pp-k">Como utilizar o kit</span>
  <h1 class="pp-h1">Quatro passos para cada formulário</h1>
  <ol class="psteps">{passos}</ol>
  <div class="leg">
    <h2 class="pp-h2">{icon("grid")}Como os formulários estão organizados</h2>
    <div class="leg-grid">
      <div class="leg-i"><div class="leg-demo"><span class="leg-badge">F08</span><span class="leg-badge g">v1.0</span></div><b>Código e versão</b><p>Cada modelo tem um código, de F01 a F15, e um campo de registro para a sua numeração interna.</p></div>
      <div class="leg-i"><div class="leg-demo"><span class="blk-l">A</span><span class="blk-l">B</span><span class="blk-l">C</span></div><b>Blocos de campos</b><p>Os campos ficam agrupados em blocos lógicos, na ordem em que as informações costumam aparecer.</p></div>
      <div class="leg-i"><div class="leg-demo"><span class="dchip r"><i></i>Única</span><span class="dchip on"><i></i>Várias</span></div><b>Opções para marcar</b><p>Círculos indicam escolha única. Quadrados permitem marcar mais de uma opção. No papel, marque com um X.</p></div>
      <div class="leg-i"><div class="leg-demo"><span class="dtri">C</span><span class="dtri">P</span><span class="dtri">NA</span></div><b>Siglas de conferência</b><p>C = Conferido · P = Pendente · NA = Não aplicável. Em acondicionamento: V = Verificado · NC = Necessita conferência.</p></div>
    </div>
  </div>
  <div class="dicas">
    <div><b>{icon("info")}Campos em branco</b><p>Deixe em branco o que ainda não foi informado e registre a pendência no próprio formulário. Isso evita dados presumidos.</p></div>
    <div><b>{icon("save")}Nome dos arquivos</b><p>Ao salvar em PDF, use o código do formulário no nome do arquivo. Fica mais fácil localizar depois.</p></div>
  </div>
</section>'''


def pg_indice():
    blocos = "".join(
        f'<div class="ix-cat" style="--c:{c["cor"]};--t:{c["tint"]}"><a class="ix-h" href="#div-{c["num"]}"><span class="ix-ic">{icon(c["icone"])}</span>'
        f'<span class="ix-ht"><span class="ix-k">Categoria {c["num"]}</span><b>{esc(c["nome"])}</b><small>{esc(c["resumo"])}</small></span></a>'
        f'{lista_forms(c, "fl ix-l", com_pag=True, com_desc=True)}</div>'
        for c in CATEGORIAS
    )
    return f'''
<section class="pp pp-ed">
  <span class="pp-k">Índice</span>
  <h1 class="pp-h1">Os 15 formulários do kit</h1>
  <div class="ix">{blocos}</div>
  <a class="ix-extra" href="#orientacoes">{icon("check")}<span><b>Orientações finais de utilização</b></span><span class="fl-p">pág. <b>{pag("orientacoes")}</b></span></a>
</section>'''


def pg_divisoria(c):
    return f'''
<section class="pp pp-div" id="div-{c["num"]}" style="--c:{c["cor"]};--t:{c["tint"]}">
  <div class="dv-in">
    <span class="dv-k">{icon(c["icone"])}Categoria {c["num"]} · 5 formulários</span>
    <div class="dv-num">{c["num"]}</div>
    <h1>{esc(c["nome"])}</h1>
    <p>{esc(c["desc"])}</p>
    <div class="dv-art">{cat_art(c["num"], c["cor"])}</div>
    <div class="dv-list">{lista_forms(c, "fl dv-l", com_pag=True, com_desc=True)}</div>
  </div>
</section>'''


FASES = [
    ("Antes da coleta", "Organizar o pedido, os dados do resíduo e os parceiros.", ["F01", "F02", "F03", "F04", "F05", "F06", "F07"]),
    ("Preparação da saída", "Reunir os dados do MTR, conferir os documentos e registrar a retirada.", ["F08", "F09", "F10"]),
    ("Depois da saída", "Acompanhar recebimento, divergências, ocorrências e pendências até o encerramento.", ["F11", "F12", "F13", "F14", "F15"]),
]


def linha_do_tempo():
    por_cod = {f["cod"]: f for f in FORMULARIOS}
    fases = []
    for i, (t, d, cods) in enumerate(FASES, 1):
        itens = "".join(
            f'<a class="lt-f" href="#{por_cod[c]["id"]}" style="--c:{CAT[por_cod[c]["cat"]]["cor"]}"><b>{c}</b><span>{esc(por_cod[c]["titulo"])}</span></a>'
            for c in cods
        )
        fases.append(f'<div class="lt-fase"><div class="lt-h"><span class="lt-n">{i}</span><div><b>{t}</b><p>{d}</p></div></div><div class="lt-fs">{itens}</div></div>')
    return f'<div class="lt"><h2 class="pp-h2">{icon("arrow")}Em que momento usar cada formulário</h2><div class="lt-g">{"".join(fases)}</div></div>'


def pg_orientacoes():
    orient = "".join(f'<li><span class="or-ic">{icon(ic)}</span><div><b>{t}</b><p>{d}</p></div></li>' for ic, t, d in ORIENTACOES)
    return f'''
<section class="pp pp-ed" id="orientacoes">
  <span class="pp-k">Orientações finais</span>
  <h1 class="pp-h1">Antes de usar as informações registradas</h1>
  <ul class="orient big">{orient}</ul>
  {linha_do_tempo()}
  <div class="fecho">
    <span class="fecho-ic">{icon("leaf")}</span>
    <div><b>Um complemento para a sua rotina</b><p>O Kit Pré-MTR foi pensado para ser usado junto com os <strong>70 Fluxos Visuais de MTR, CDF e Controle de Resíduos</strong>. Os fluxos ajudam a entender cada etapa, a planilha de controle acompanha os registros de MTR e CDF, e estes formulários organizam as informações de cada coleta e de cada situação específica.</p></div>
  </div>
</section>'''


# ------------------------------------------------------------ navegação

def menu_lateral():
    grupos = []
    for c in CATEGORIAS:
        itens = "".join(
            f'<li><a href="#{f["id"]}" data-nav="{f["id"]}" style="--c:{c["cor"]}"><span>{f["cod"]}</span>{esc(f["titulo"])}</a></li>'
            for f in FORMULARIOS if f["cat"] == c["num"]
        )
        grupos.append(f'<div class="side-g"><div class="side-gh" style="--c:{c["cor"]}">{c["num"]} · {esc(c["nome"])}</div><ul>{itens}</ul></div>')
    return f'<nav class="side no-print" aria-label="Formulários">{"".join(grupos)}</nav>'


def seletor():
    ops = "".join(
        f'<optgroup label="{c["num"]} · {esc(c["nome"])}">' +
        "".join(f'<option value="{f["id"]}">{f["cod"]} · {esc(f["titulo"])}</option>' for f in FORMULARIOS if f["cat"] == c["num"]) +
        "</optgroup>" for c in CATEGORIAS
    )
    return f'<label class="sr" for="ir-para">Ir para o formulário</label><select id="ir-para" class="ir-para"><option value="inicio">Início · índice</option>{ops}</select>'


def fontes_css():
    fs = [("Inter", 400, "normal", "Inter-Regular"), ("Inter", 400, "italic", "Inter-Italic"), ("Inter", 500, "normal", "Inter-Medium"),
          ("Inter", 600, "normal", "Inter-SemiBold"), ("Inter", 700, "normal", "Inter-Bold"),
          ("Inter Display", 700, "normal", "InterDisplay-Bold"), ("Inter Display", 800, "normal", "InterDisplay-ExtraBold")]
    out = []
    for fam, w, st, arq in fs:
        b64 = base64.b64encode((BASE / "fontes" / f"{arq}.woff2").read_bytes()).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
    return "\n".join(out)


def paginas_nomeadas():
    """Uma página nomeada por formulário: cada um começa em página nova e
    traz o próprio código no rodapé impresso."""
    out = []
    for f in FORMULARIOS:
        out.append(f'.form#{f["id"]}{{page:{f["id"]}}}\n@page {f["id"]}{{@bottom-left{{content:"{f["cod"]} · {f["titulo"]} · Modelo interno v{VERSAO}"}}}}')
    return "\n".join(out)


def main():
    css = (BASE / "estilo.css").read_text(encoding="utf-8")
    js = (BASE / "app.js").read_text(encoding="utf-8")
    forms_html = []
    for c in CATEGORIAS:
        forms_html.append(pg_divisoria(c))
        forms_html += [formulario(f) for f in FORMULARIOS if f["cat"] == c["num"]]
    datalists = "".join(f'<datalist id="{k}">{"".join(f"<option value=\"{esc(v)}\">" for v in vs)}</datalist>' for k, vs in DATALISTS.items())
    meta = json.dumps({f["id"]: {"cod": f["cod"], "titulo": f["titulo"], "cat": f["cat"]} for f in FORMULARIOS}, ensure_ascii=False)

    doc = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kit Pré-MTR · 15 Formulários Prontos para Coletas e Movimentação de Resíduos</title>
<meta name="description" content="Kit com 15 formulários editáveis para organizar coletas, reunir informações de resíduos, conferir documentos e registrar movimentações.">
<meta name="color-scheme" content="light">
<style>
{fontes_css()}
{css}
{paginas_nomeadas()}
</style>
</head>
<body>
<script>document.documentElement.classList.add('js');</script>
<header class="appbar no-print">
  <a class="ab-brand" href="#inicio">{icon("clipboard")}<span><b>Kit Pré-MTR</b><small>15 formulários</small></span></a>
  <div class="ab-go">{seletor()}</div>
  <div class="ab-act">
    <button type="button" class="ab-btn" data-acao="exportar-todos" title="Exportar dados de todos os formulários">{icon("download")}<span>Exportar dados</span></button>
    <button type="button" class="ab-btn" data-acao="importar" title="Importar dados de um arquivo .json">{icon("upload")}<span>Importar dados</span></button>
  </div>
</header>
<noscript><p class="noscript">Ative o JavaScript para usar as tabelas dinâmicas, a impressão individual e a exportação de dados. Os campos continuam preenchíveis.</p></noscript>
{tela_inicial()}
<div class="print-only pp-set" aria-hidden="true">{pg_capa()}{pg_apresentacao()}{pg_como_usar()}{pg_indice()}</div>
<div class="view view-form" id="area-form">
  {menu_lateral()}
  <div class="fmain">
    <div class="ftools no-print">
      <a class="ft-btn ghost" href="#inicio">{icon("grid")}<span>Índice</span></a>
      <div class="ft-nav"><a class="ft-ar" data-prev href="#inicio" aria-label="Formulário anterior">{icon("left")}</a><span class="ft-pos" data-pos></span><a class="ft-ar" data-next href="#inicio" aria-label="Próximo formulário">{icon("right")}</a></div>
      <div class="ft-act">
        <button type="button" class="ft-btn main" data-acao="imprimir">{icon("print")}<span>Imprimir ou salvar em PDF</span></button>
        <button type="button" class="ft-btn" data-acao="exportar-um">{icon("download")}<span>Exportar dados</span></button>
        <button type="button" class="ft-btn warn" data-acao="limpar">{icon("erase")}<span>Limpar formulário</span></button>
      </div>
      <p class="ft-hint">{icon("info")}<span>Para guardar uma cópia preenchida, clique em <b>Imprimir ou salvar em PDF</b> e escolha <b>Salvar como PDF</b> no destino da impressão.</span><span class="draft-st" data-draft-status></span></p>
    </div>
    <div class="forms">{"".join(forms_html)}{pg_orientacoes().replace('class="pp pp-ed"', 'class="pp pp-ed print-only"', 1)}</div>
  </div>
</div>
{datalists}
<input type="file" id="arquivo-json" accept=".json,application/json" hidden>
<div class="toast no-print" id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="kit-meta">{meta}</script>
<script>
{js}
</script>
</body>
</html>
'''
    SAIDA.write_text(doc, encoding="utf-8")
    print(f"HTML gerado: {SAIDA} ({SAIDA.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
