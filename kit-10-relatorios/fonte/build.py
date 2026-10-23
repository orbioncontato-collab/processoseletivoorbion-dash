# -*- coding: utf-8 -*-
"""Gera a Central de Relatórios (HTML) a partir de relatorios.py.

Uso:  python3 build.py
Saída: ../Kit_10_Relatorios_Gestao_Residuos.html
Se existir paginas.json (gravado por gerar_pdfs.mjs), o índice impresso
recebe os números de página reais.
"""
import base64
import html
import json
from pathlib import Path

from ilustracoes import cover_art, icon, mini_art
from relatorios import ATENCAO, DATALISTS, GRUPOS, RELATORIOS, TOM

BASE = Path(__file__).resolve().parent
SAIDA = BASE.parent / "Kit_10_Relatorios_Gestao_Residuos.html"
VERSAO = "1.0"
COR = "#17806C"
AVISO = ("Os relatórios deste kit são modelos gerenciais editáveis. As informações devem ser preenchidas e conferidas "
         "pelo responsável, conforme a documentação disponível e os procedimentos aplicáveis.")
CORES_GRUPO = {"rotina": "#17806C", "docs": "#256B83", "apres": "#103C39"}

assert len(RELATORIOS) == 10
assert [r["num"] for r in RELATORIOS] == [f"{i:02d}" for i in range(1, 11)]
assert len({r["titulo"] for r in RELATORIOS}) == 10
assert sorted(sum((g["rels"] for g in GRUPOS), [])) == [r["num"] for r in RELATORIOS]
REL = {r["num"]: r for r in RELATORIOS}
for r in RELATORIOS:
    r["id"] = "r" + r["num"]
    r["grupo"] = next(g["k"] for g in GRUPOS if r["num"] in g["rels"])
    r["cor"] = CORES_GRUPO[r["grupo"]]

PAGINAS = {}
if (BASE / "paginas.json").exists():
    PAGINAS = json.loads((BASE / "paginas.json").read_text(encoding="utf-8"))


def esc(t):
    return html.escape(str(t), quote=True)


def pag(chave):
    v = PAGINAS.get(chave)
    return f"{v:02d}" if isinstance(v, int) else "--"


def js(obj):
    return esc(json.dumps(obj, ensure_ascii=False))


IDS = set()


def novo_id(i):
    assert i not in IDS, f"id repetido: {i}"
    IDS.add(i)
    return i


# ------------------------------------------------------------ campos simples

def campo(rid, k, rotulo, tipo="text", span=6, ph="", extra=""):
    i = novo_id(f"{rid}-{k}")
    attrs = {"text": 'type="text"', "date": 'type="date"', "num": 'type="text" inputmode="decimal" class="num"'}[tipo]
    p = f' placeholder="{esc(ph)}"' if ph else ""
    return (f'<div class="fld s{span}"><label for="{i}">{esc(rotulo)}</label>'
            f'<input {attrs} id="{i}" name="{i}"{p}{extra} autocomplete="off"></div>')


def area(rid, k, rotulo, texto="", rows=4, span=12, oculto=False):
    i = novo_id(f"{rid}-{k}")
    lab = f'<label for="{i}" class="{"sr" if oculto else ""}">{esc(rotulo)}</label>'
    base = f' data-base="{esc(texto)}"' if texto else ""
    restaurar = (f'<button type="button" class="btn-base no-print" data-restaurar="{i}" title="Voltar ao texto-base original">{icon("refresh")}Restaurar texto-base</button>'
                 if texto else "")
    return (f'<div class="fld s{span} fld-area">{lab}<textarea id="{i}" name="{i}" rows="{rows}"{base}>{esc(texto)}</textarea>{restaurar}</div>')


# ------------------------------------------------------------ seções

def sec_ident(rid, s, r):
    cli = "Empresa ou cliente"
    corpo = [
        campo(rid, "empresa", cli, span=7),
        campo(rid, "unidade", "Unidade", span=5),
        campo(rid, "per_ini", "Período: início", "date", 3),
        campo(rid, "per_fim", "Período: fim", "date", 3),
        campo(rid, "elaborado", "Elaborado por", span=6),
        campo(rid, "emissao", "Data de emissão", "date", 3),
        campo(rid, "ref", "Código ou referência interna", span=3),
        f'<div class="fld s6 fld-acao no-print"><button type="button" class="btn-perfil" data-acao="perfil">{icon("building")}Usar dados salvos da empresa</button></div>',
    ]
    if s.get("objetivo"):
        corpo.append(area(rid, "objetivo", "Objetivo do relatório", s["objetivo"], 3))
    return "".join(corpo)


def sec_texto(rid, s, r):
    dica = f'<p class="nota">{esc(s["dica"])}</p>' if s.get("dica") else ""
    return area(rid, s["k"], s["titulo"], s["texto"], s["rows"], oculto=True) + dica


def sec_kpis(rid, s, r):
    cards = []
    for j, k in enumerate(s["cards"]):
        tom = k.get("tom", "")
        if k["tipo"] == "manual":
            i = novo_id(f"{rid}-{k['k']}")
            corpo = (f'<input type="text" inputmode="decimal" class="kpi-in num" id="{i}" name="{i}" aria-label="{esc(k["l"])}" placeholder="Informe">'
                     f'<span class="kpi-n">{esc(k.get("ajuda", ""))}</span>')
        else:
            d = {kk: vv for kk, vv in k.items() if kk not in ("l", "icone", "tom")}
            if "chave" in d:
                d["valores"] = ATENCAO[d.pop("chave")]
            corpo = f'<output class="kpi-v" data-kpi="{js(d)}">Sem registros</output><span class="kpi-n"></span>'
        cards.append(f'<div class="kpi {"t-" + tom if tom else ""}"><span class="kpi-ic">{icon(k["icone"])}</span><span class="kpi-l">{esc(k["l"])}</span>{corpo}</div>')
    nota = f'<p class="nota">{esc(s["nota"])}</p>' if s.get("nota") else ""
    return f'<div class="kpis n{len(cards)}">{"".join(cards)}</div>{nota}'


SIGLA_TOM = TOM


def celula(tid, rec, col, n):
    k, rot, t = col["k"], col["l"], col["t"]
    nome = f"{tid}-{rec}-{k}"
    aria = esc(f"{rot}, registro {n}" if n else rot)
    if t == "sel":
        ops = '<option value="">Selecione</option>' + "".join(f'<option value="{esc(o)}">{esc(o)}</option>' for o in col["o"])
        return f'<select name="{nome}" data-col="{k}" aria-label="{aria}">{ops}</select>'
    if t == "var":
        return f'<output data-col="{k}" data-var="1" aria-label="{aria}"></output>'
    tipo = {"text": 'type="text"', "num": 'type="text" inputmode="decimal" class="num"', "unit": 'type="text" list="dl-unidades"',
            "date": 'type="date"', "list": f'type="text" list="{col.get("list") or ""}"'}[t]
    return f'<input {tipo} name="{nome}" data-col="{k}" aria-label="{aria}" autocomplete="off">'


def registro(tid, s, rec, n, pre=""):
    tds = [f'<td class="c-n">{n or ""}</td>']
    for j, col in enumerate(s["cols"]):
        html_c = celula(tid, rec, col, n)
        if j == 0 and pre:
            html_c = html_c.replace("autocomplete=\"off\">", f'autocomplete="off" value="{esc(pre)}">')
        cls = f' class="c-{col["t"]}"' if col["t"] in ("num", "date", "sel", "var", "unit") else ""
        tds.append(f"<td{cls}>{html_c}</td>")
    tds.append(f'<td class="c-del no-print"><button type="button" class="btn-del" data-del aria-label="Remover registro {n or "novo"}" title="Remover registro">{icon("x")}</button></td>')
    linhas = [f'<tr class="r-main">{"".join(tds)}</tr>']
    if s["extra"]:
        tot = len(s["cols"]) + 2
        itens = "".join(
            f'<label class="xf" style="--w:{c["w"]}"><span>{esc(c["l"])}</span>{celula(tid, rec, c, n)}</label>' for c in s["extra"])
        linhas.append(f'<tr class="r-extra"><td class="c-n"></td><td colspan="{tot - 2}"><div class="xfs">{itens}</div></td><td class="c-del no-print"></td></tr>')
    return f'<tbody class="reg" data-reg="{rec}">{"".join(linhas)}</tbody>'


def sec_tabela(rid, s, r):
    tid = novo_id(f"{rid}-{s['k']}")
    cols = s["cols"]
    total = sum(c["w"] for c in cols)
    cg = '<col class="c-n">' + "".join(f'<col style="width:{c["w"] / total * 100:.1f}%">' for c in cols) + '<col class="c-del">'
    th = '<th class="c-n">Nº</th>' + "".join(f'<th class="h-{c["t"]}">{esc(c["l"])}</th>' for c in cols) + '<th class="c-del"><span class="sr">Remover</span></th>'
    n = max(s["min"], len(s["pre"]))
    regs = "".join(registro(tid, s, f"r{i + 1}", i + 1, s["pre"][i] if i < len(s["pre"]) else "") for i in range(n))
    tpl = registro(tid, s, "rNOVA", 0)
    atencao = ""
    if s.get("atencao"):
        col, chave = s["atencao"]
        atencao = f' data-atencao="{js({"col": col, "valores": ATENCAO[chave]})}"'
    intro = f'<p class="sec-intro">{esc(s["texto"])}</p>' if s.get("texto") else ""
    sub = ""
    if s.get("sub"):
        sub = '<div class="grid tsub">' + "".join(campo(rid, k, rot, span=6, ph="Ex.: mês ou ano de referência") for k, rot in s["sub"]) + "</div>"
    nota = f'<p class="nota">{esc(s["nota"])}</p>' if s.get("nota") else ""
    return f'''{intro}{sub}<div class="tbl" id="{tid}" data-tabela="{s["k"]}" data-min="{s["min"]}" data-imp="{s["imp"]}" data-pre="{js(s["pre"])}"{atencao}>
<div class="tbl-sc"><table><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead>{regs}</table></div>
<template>{tpl}</template>
<div class="tbl-foot">{nota}<button type="button" class="btn-add no-print" data-add>{icon("plus")}Adicionar registro</button></div></div>'''


def sec_grafico(rid, s, r):
    d = {k: v for k, v in s.items() if k not in ("t", "titulo")}
    vazio = s.get("vazio") or "O gráfico aparece quando a tabela tiver dados suficientes."
    return (f'<figure class="graf" data-graf="{js(d)}"><figcaption>{icon("chart")}{esc(s["titulo"])}</figcaption>'
            f'<div class="graf-c" aria-live="polite"></div>'
            f'<div class="vazio"><span class="vazio-ic">{icon("chart")}</span><p>{esc(vazio)}</p><p class="vazio-p">Na versão impressa em branco, este espaço fica reservado. O gráfico é gerado automaticamente na versão digital a partir dos dados da tabela.</p></div></figure>')


def sec_resumo(rid, s, r):
    d = {k: v for k, v in s.items() if k not in ("t", "titulo", "nota")}
    nota = f'<p class="nota">{esc(s["nota"])}</p>' if s.get("nota") else ""
    return (f'<div class="calc-tab" data-resumo="{js(d)}"></div>'
            f'<div class="vazio"><span class="vazio-ic">{icon("grid")}</span><p>O resumo é montado automaticamente a partir da tabela anterior.</p></div>{nota}')


def sec_lista(rid, s, r):
    d = {"tabela": s["tabela"], "colunas": s["colunas"], "valores": ATENCAO[s["chave"]], "sit": s["sit"]}
    nota = f'<p class="nota">{esc(s["nota"])}</p>' if s.get("nota") else ""
    return (f'<div class="calc-tab" data-lista="{js(d)}"></div>'
            f'<div class="vazio"><span class="vazio-ic">{icon("check")}</span><p>Nenhum registro aguardando verificação na tabela de certificados.</p></div>{nota}'
            + area(rid, "obs_lista", "Observações sobre os certificados pendentes", "[REGISTRE AQUI A PROVIDÊNCIA PREVISTA PARA CADA CERTIFICADO PENDENTE.]", 3))


def sec_cards(rid, s, r):
    d = {k: v for k, v in s.items() if k not in ("t", "titulo")}
    return (f'<div class="dcards" data-cards="{js(d)}"></div>'
            f'<div class="vazio"><span class="vazio-ic">{icon("factory")}</span><p>Os cartões de cada destinador aparecem quando a tabela de informações for preenchida.</p></div>')


def sec_destaques(rid, s, r):
    blocos = "".join(
        f'<div class="dq t-{tom}">{area(rid, k, t, base, 3)}</div>' for k, t, tom, base in s["blocos"])
    extra = area(rid, s["texto"][0], "Análise geral", s["texto"][1], 4) if s.get("texto") else ""
    return f'<div class="dqs">{blocos}</div>{extra}'


def sec_checks(rid, s, r):
    k = novo_id(f"{rid}-{s['k']}")
    ops = "".join(
        f'<label class="chip"><input type="checkbox" name="{k}" value="{esc(o)}"><span class="box"></span><span>{esc(o)}</span></label>' for o in s["o"])
    return (f'<p class="sec-intro">{esc(s["intro"])}</p><fieldset class="chks"><legend class="sr">{esc(s["titulo"])}</legend>{ops}</fieldset>'
            + campo(rid, s["k"] + "_outras", "Outras atividades realizadas no período", span=12))


def sec_manchetes(rid, s, r):
    itens = "".join(
        f'<div class="mch"><span class="mch-n">{i}</span>{area(rid, f"{s["k"]}{i}", f"Destaque {i}", "", 2, oculto=False)}</div>' for i in range(1, s["n"] + 1))
    return f'<div class="mchs">{itens}</div>'


def sec_resp(rid, s, r):
    corpo = [campo(rid, "resp_nome", "Nome", span=6), campo(rid, "resp_cargo", "Cargo ou função", span=6)]
    if s.get("consultoria"):
        corpo.append(campo(rid, "resp_empresa", "Consultoria ou empresa responsável", span=6))
        corpo.append(campo(rid, "resp_contato", "Contato profissional", span=6))
    else:
        corpo.append(campo(rid, "resp_contato", "Contato profissional", span=6))
        corpo.append(campo(rid, "resp_registro", "Registro profissional, se aplicável", span=6))
    corpo.append(campo(rid, "resp_local", "Local", span=6))
    corpo.append(campo(rid, "resp_data", "Data", "date", 3))
    corpo.append('<div class="assin s12 print-only"><span></span><b>Assinatura do responsável</b></div>')
    return "".join(corpo)


def sec_capa(rid, s, r):
    if s["tipo"] == "cliente":
        campos = [campo(rid, "consultoria", "Consultoria ou responsável", span=12), campo(rid, "empresa", "Empresa cliente", span=7),
                  campo(rid, "unidade", "Unidade", span=5)]
        kick, titulo, sub = "Relatório ao cliente", "Relatório de Acompanhamento", "Gestão de resíduos"
    else:
        campos = [campo(rid, "empresa", "Empresa", span=7), campo(rid, "unidade", "Unidade", span=5)]
        kick, titulo, sub = "Relatório executivo", "Relatório Executivo", "Gestão de resíduos"
    campos += [campo(rid, "per_ini", "Período: início", "date", 3), campo(rid, "per_fim", "Período: fim", "date", 3),
               campo(rid, "elaborado", "Responsável", span=6), campo(rid, "emissao", "Data", "date", 3), campo(rid, "ref", "Referência interna", span=3),
               f'<div class="fld s6 fld-acao no-print"><button type="button" class="btn-perfil" data-acao="perfil">{icon("building")}Usar dados salvos da empresa</button></div>']
    return f'''<div class="capa-rel">
  <div class="cr-top"><span class="cr-k">{icon(r["icone"])}{kick} · Modelo {r["num"]}</span><span class="logo-slot"><img class="logo-img" alt="Logotipo" hidden><span class="logo-ph no-print">{icon("image")}Seu logotipo</span></span></div>
  <div class="cr-tt"><h2>{titulo}</h2><p>{sub}</p><p class="cr-emp" data-vivo="{rid}"></p></div>
  <div class="cr-art">{mini_art(r["cor"])}</div>
  <div class="grid cr-campos">{"".join(campos)}</div>
  <p class="cr-aviso">Documento gerencial elaborado a partir das informações disponíveis na data de emissão.</p>
</div>'''


SECOES = {"ident": sec_ident, "texto": sec_texto, "kpis": sec_kpis, "tabela": sec_tabela, "grafico": sec_grafico,
          "resumo": sec_resumo, "lista": sec_lista, "cards": sec_cards, "destaques": sec_destaques, "checks": sec_checks,
          "manchetes": sec_manchetes, "resp": sec_resp, "capa": sec_capa}


def relatorio(r):
    rid = r["id"]
    partes = []
    n = 0
    capa = ""
    for s in r["secoes"]:
        if s["t"] == "capa":
            capa = sec_capa(rid, s, r)
            continue
        corpo = SECOES[s["t"]](rid, s, r)
        if s["t"] in ("grafico", "resumo", "lista", "cards") or (s["t"] == "kpis" and r["num"] in ("09",)):
            titulo = f'<h4 class="sub-h">{esc(s["titulo"])}</h4>' if s["t"] not in ("grafico",) else ""
            partes.append(f'<div class="sec sec-{s["t"]} anexa">{titulo}{corpo}</div>')
            continue
        n += 1
        cls = "sec sec-" + s["t"]
        partes.append(f'<section class="{cls}"><h3 class="sec-h"><span class="sec-n">{n}</span>{esc(s["titulo"])}</h3>{corpo}</section>')
    return f'''
<article class="rel{" com-capa" if capa else ""}" id="{rid}" data-rel="R{r["num"]}" data-grupo="{r["grupo"]}" style="--c:{r["cor"]}" aria-labelledby="{rid}-t">
  {capa}
  <header class="rh">
    <div class="rh-tx">
      <span class="rh-k">Relatório {r["num"]}</span>
      <h2 id="{rid}-t">{esc(r["titulo"])}</h2>
      <span class="rh-s">Gestão de Resíduos | Modelo Gerencial Editável</span>
    </div>
    <div class="rh-side">
      <span class="logo-slot"><img class="logo-img" alt="Logotipo" hidden><span class="logo-ph no-print">{icon("image")}Seu logotipo</span></span>
      <span class="rh-vivo" data-vivo="{rid}"></span>
    </div>
  </header>
  {"".join(partes)}
  <footer class="rf"><span>Relatório {r["num"]} · {esc(r["titulo"])}</span><span>Modelo gerencial editável · Versão {VERSAO}</span></footer>
</article>'''


# ------------------------------------------------------------ central (tela)

PASSOS = [
    ("grid", "Escolha o relatório", "Selecione o modelo que atende à sua necessidade."),
    ("edit", "Insira os dados", "Preencha informações da empresa, documentos e período."),
    ("check", "Revise as informações", "Confira dados, quantidades e conclusões."),
    ("pdf", "Exporte e apresente", "Salve o relatório em PDF e compartilhe conforme os procedimentos da empresa."),
]
ORIENT = [
    ("check", "Use somente dados conferidos", "Preencha os relatórios com informações que constam nos registros e documentos disponíveis. Quando algo ainda depender de confirmação, registre como pendente."),
    ("edit", "Revise os textos-base", "Os textos já vêm redigidos. Substitua os trechos entre colchetes e ajuste a redação aos fatos do período antes de apresentar."),
    ("scale", "Mantenha as unidades de medida", "Os relatórios somam quantidades apenas dentro da mesma unidade. Informe sempre a unidade em que o dado foi registrado."),
    ("shield", "Relatório gerencial não substitui documento oficial", "MTR, CDF e demais documentos exigidos continuam sendo emitidos e guardados nos sistemas aplicáveis."),
]


def central():
    passos = "".join(f'<li class="step"><span class="step-n">{i}</span><span class="step-ic">{icon(ic)}</span><b>{t}</b><p>{d}</p></li>'
                     for i, (ic, t, d) in enumerate(PASSOS, 1))
    grupos = []
    for g in GRUPOS:
        cards = []
        for n in g["rels"]:
            r = REL[n]
            cards.append(f'''<article class="rcard" style="--c:{r["cor"]}">
  <div class="rcard-top"><span class="rcard-ic">{icon(r["icone"])}</span><span class="rcard-n">{r["num"]}</span></div>
  <h4>{esc(r["titulo"])}</h4><p>{esc(r["desc"])}</p>
  <a class="btn-open" href="#{r["id"]}">Abrir relatório{icon("arrow")}</a>
</article>''')
        grupos.append(f'<section class="grp" style="--c:{CORES_GRUPO[g["k"]]}"><div class="grp-h"><h3>{esc(g["nome"])}</h3><p>{esc(g["desc"])}</p></div><div class="rcards">{"".join(cards)}</div></section>')
    orient = "".join(f'<li><span class="or-ic">{icon(ic)}</span><div><b>{t}</b><p>{d}</p></div></li>' for ic, t, d in ORIENT)
    perfil = "".join([
        campo("perfil", "empresa", "Empresa", span=6), campo("perfil", "unidade", "Unidade", span=6),
        campo("perfil", "cliente", "Empresa cliente (para o relatório 09)", span=6), campo("perfil", "consultoria", "Consultoria ou responsável (para o relatório 09)", span=6),
        campo("perfil", "responsavel", "Responsável pela elaboração", span=6), campo("perfil", "cargo", "Cargo ou função", span=6),
    ])
    return f'''
<div class="view view-home" id="inicio">
  <section class="hero">
    <div class="hero-in">
      <div class="hero-tx">
        <span class="hero-k">{icon("leaf")}Kit de 10 relatórios prontos de gestão de resíduos</span>
        <h1>CENTRAL DE RELATÓRIOS AMBIENTAIS</h1>
        <p class="hero-sub">10 Modelos Editáveis de Gestão de Resíduos</p>
        <p class="hero-lead">Modelos profissionais editáveis para organizar informações, apresentar resultados e comunicar o acompanhamento da gestão de resíduos.</p>
        <div class="hero-cta"><a class="btn-hero" href="#modelos">Ver os 10 modelos{icon("arrow")}</a><a class="btn-hero ghost" href="#perfil">Cadastrar dados da empresa</a></div>
      </div>
      <div class="hero-art">{cover_art()}</div>
    </div>
    <ul class="kpis-hero">
      <li><b>10</b><span>relatórios disponíveis</span></li>
      <li>{icon("edit")}<span>modelos profissionais editáveis</span></li>
      <li>{icon("pdf")}<span>exportação para PDF</span></li>
    </ul>
  </section>
  <div class="home-in">
    <p class="aviso">{icon("info")}<span>{esc(AVISO)}</span></p>
    <section class="hsec">
      <div class="hsec-h"><span class="hsec-k">Como utilizar</span><h2>Do modelo ao relatório apresentado</h2></div>
      <ol class="steps">{passos}</ol>
    </section>
    <section class="hsec perfil" id="perfil">
      <div class="perfil-tx">
        <span class="hsec-k">Dados da empresa</span>
        <h2>Personalize uma vez, use em todos os relatórios</h2>
        <p>Os dados ficam guardados no arquivo de dados que você exporta. Em cada relatório, o botão <b>Usar dados salvos da empresa</b> preenche apenas os campos de identificação que estiverem vazios. O logotipo aparece no cabeçalho de todos os relatórios.</p>
      </div>
      <div class="perfil-f">
        <div class="grid">{perfil}</div>
        <div class="logo-up">
          <div class="logo-prev"><img class="logo-img" alt="Logotipo carregado" hidden><span class="logo-ph">{icon("image")}Nenhum logotipo</span></div>
          <div class="logo-act">
            <label class="btn-sec" for="logo-arquivo">{icon("upload")}Inserir logotipo</label>
            <input type="file" id="logo-arquivo" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
            <button type="button" class="btn-sec ghost" data-acao="logo-remover">{icon("x")}Remover logotipo</button>
            <p class="nota">PNG, JPG, SVG ou WEBP de até 1 MB. A imagem fica no seu computador e não é enviada para nenhum servidor.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="hsec" id="modelos">
      <div class="hsec-h"><span class="hsec-k">Índice</span><h2>Os 10 modelos</h2></div>
      {"".join(grupos)}
    </section>
    <section class="hsec dados">
      <div class="dados-tx">
        <span class="hsec-k">Seus dados</span>
        <h2>O que você digita fica com você</h2>
        <p>Nada é enviado para a internet. O kit guarda um rascunho automático neste navegador, mas ele pode se perder se o histórico for apagado ou se o arquivo for aberto em outro computador.</p>
        <p>Para guardar com segurança, use <b>Exportar dados</b>: você recebe um arquivo .json com os relatórios, os dados da empresa e o logotipo. Depois, use <b>Importar dados</b> para continuar de onde parou.</p>
      </div>
      <div class="dados-act">
        <button type="button" class="btn-sec" data-acao="exportar-todos">{icon("download")}Exportar dados de todos os relatórios</button>
        <button type="button" class="btn-sec ghost" data-acao="importar">{icon("upload")}Importar dados</button>
        <p class="draft-st" data-draft-status></p>
      </div>
    </section>
    <section class="hsec">
      <div class="hsec-h"><span class="hsec-k">Orientações finais</span><h2>Antes de apresentar um relatório</h2></div>
      <ul class="orient">{orient}</ul>
    </section>
    <footer class="home-foot">Kit de 10 Relatórios Prontos de Gestão de Resíduos · Versão {VERSAO}. Complemento dos 70 Fluxos Visuais de MTR, CDF e Controle de Resíduos.</footer>
  </div>
</div>'''


# ------------------------------------------------------------ páginas impressas do kit

def pg_capa():
    return f'''
<section class="pp pp-capa">
  <svg class="pp-grid" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="cg" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width=".25"/></pattern></defs><rect width="210" height="297" fill="url(#cg)"/><circle cx="196" cy="18" r="72" fill="#17806C" opacity=".22"/><circle cx="6" cy="250" r="56" fill="#17806C" opacity=".12"/></svg>
  <div class="capa-in">
    <div class="capa-top"><span class="capa-brand">{icon("leaf")}Kit de relatórios ambientais</span><span>Versão {VERSAO}</span></div>
    <h1 class="capa-t"><span>10 RELATÓRIOS PRONTOS</span><span class="capa-t2">DE GESTÃO DE RESÍDUOS</span></h1>
    <p class="capa-lead">Modelos profissionais editáveis para apresentar informações, resultados e acompanhamentos ambientais.</p>
    <div class="capa-pill"><span>10 Modelos</span><i>•</i><span>Editáveis</span><i>•</i><span>Prontos para Apresentar</span></div>
    <div class="capa-art">{cover_art()}</div>
    <div class="capa-cats">{"".join(f'<span><i style="background:{CORES_GRUPO[g["k"]]}"></i>{esc(g["nome"])}</span>' for g in GRUPOS)}</div>
  </div>
</section>'''


def pg_apresentacao():
    funcoes = [("route", "Os fluxos ajudam a entender", "os procedimentos, documentos e responsabilidades."),
               ("chat", "As mensagens ajudam a solicitar", "e cobrar documentos dos parceiros."),
               ("clipboard", "Os formulários ajudam a organizar", "e registrar as informações de cada coleta."),
               ("chart", "Os relatórios ajudam a consolidar", "e apresentar os resultados do período.")]
    fn = "".join(f'<div class="fn{" on" if i == 3 else ""}"><span class="fn-ic">{icon(ic)}</span><b>{t}</b><p>{d}</p></div>' for i, (ic, t, d) in enumerate(funcoes))
    grupos = "".join(
        f'<div class="ap-g" style="--c:{CORES_GRUPO[g["k"]]}"><b>{esc(g["nome"])}</b><p>{esc(g["desc"])}</p><ul>' +
        "".join(f'<li><span>{n}</span>{esc(REL[n]["titulo"])}</li>' for n in g["rels"]) + "</ul></div>" for g in GRUPOS)
    return f'''
<section class="pp pp-ed">
  <span class="pp-k">Apresentação</span>
  <h1 class="pp-h1">Relatórios prontos para apresentar a gestão de resíduos</h1>
  <p class="pp-lead">Este kit reúne 10 modelos de relatórios gerenciais para consolidar as informações do período e apresentá-las ao gestor ou ao cliente. Cada modelo já traz a estrutura de seções, os textos-base redigidos, as tabelas e os indicadores. Você completa com os dados reais, revisa e apresenta.</p>
  <p class="pp-lead">Os textos-base usam termos entre colchetes, como [UNIDADE] ou [DESCREVA OS PRINCIPAIS RESULTADOS], para indicar o que precisa ser completado com os fatos do período.</p>
  <p class="aviso">{icon("info")}<span>{esc(AVISO)}</span></p>
  <h2 class="pp-h2">{icon("grid")}Onde este kit entra na sua rotina</h2>
  <div class="fns">{fn}</div>
  <h2 class="pp-h2">{icon("doc")}Os 10 modelos, por finalidade</h2>
  <div class="ap-gs">{grupos}</div>
  <div class="dicas">
    <div><b>{icon("pdf")}Versão digital e versão impressa</b><p>No arquivo HTML, os campos são editáveis e cada relatório pode ser salvo em PDF com os dados preenchidos. Este PDF traz os modelos em branco, para consulta e impressão, sem campos digitais.</p></div>
    <div><b>{icon("scale")}Quantidades e unidades</b><p>Os relatórios somam quantidades apenas dentro da mesma unidade de medida e não fazem conversões entre peso, volume e número de volumes.</p></div>
  </div>
</section>'''


SITUACOES = [
    ("Fechar o mês e prestar contas ao gestor", ["01"]),
    ("Apresentar as movimentações e as referências de MTR", ["02"]),
    ("Mostrar quais certificados de destinação estão disponíveis", ["03"]),
    ("Acompanhar documentos que ainda dependem de envio ou conferência", ["04"]),
    ("Consolidar as coletas e retiradas do período", ["05"]),
    ("Registrar diferenças entre documentos e verificações", ["06"]),
    ("Dar visibilidade aos destinadores e aos documentos de cada um", ["07"]),
    ("Comparar quantidades por resíduo entre períodos", ["08"]),
    ("Prestar contas a um cliente de consultoria", ["09"]),
    ("Levar o panorama e as decisões necessárias à reunião de gestão", ["10"]),
]


def guia_uso():
    return "".join(
        f'<div class="gu"><span class="gu-n" style="--c:{REL[n[0]]["cor"]}">{n[0]}</span><span>{esc(t)}<small>{esc(REL[n[0]]["titulo"])}</small></span></div>'
        for t, n in SITUACOES)


def pg_como_usar():
    passos = "".join(f'<li class="pstep"><div class="pstep-top"><span class="pstep-n">{i}</span><span class="pstep-ic">{icon(ic)}</span></div><b>{t}</b><p>{d}</p></li>'
                     for i, (ic, t, d) in enumerate(PASSOS, 1))
    return f'''
<section class="pp pp-ed">
  <span class="pp-k">Como utilizar</span>
  <h1 class="pp-h1">Quatro etapas para cada relatório</h1>
  <ol class="psteps">{passos}</ol>
  <div class="leg">
    <h2 class="pp-h2">{icon("edit")}Como cada modelo está organizado</h2>
    <div class="leg-grid">
      <div><b>Identificação</b><p>Empresa ou cliente, unidade, período, responsável, data de emissão e referência interna.</p></div>
      <div><b>Textos-base</b><p>Objetivo, resumo, análise e conclusão já redigidos em linguagem profissional e neutra, prontos para ajustar.</p></div>
      <div><b>Tabelas e indicadores</b><p>Na versão digital, os indicadores e gráficos são calculados a partir das tabelas preenchidas.</p></div>
      <div><b>Responsável e referências</b><p>Identificação de quem elaborou o relatório e lista dos documentos consultados.</p></div>
    </div>
  </div>
  <div class="guia-uso">
    <h2 class="pp-h2">{icon("target")}Qual relatório usar em cada situação</h2>
    <div class="gu-grid">{guia_uso()}</div>
  </div>
</section>'''


def pg_indice():
    itens = "".join(
        f'<li style="--c:{r["cor"]}"><a href="#{r["id"]}"><span class="ix-n">{r["num"]}</span><span class="ix-ic">{icon(r["icone"])}</span>'
        f'<span class="ix-t"><b>{esc(r["titulo"])}</b><small>{esc(r["desc"])}</small></span><span class="ix-p">pág. <b>{pag("R" + r["num"])}</b></span></a></li>'
        for r in RELATORIOS)
    return f'''
<section class="pp pp-ed">
  <span class="pp-k">Índice</span>
  <h1 class="pp-h1">Os 10 relatórios do kit</h1>
  <ol class="ix">{itens}</ol>
  <a class="ix-extra" href="#orientacoes">{icon("check")}<span><b>Orientações finais</b></span><span class="ix-p">pág. <b>{pag("orientacoes")}</b></span></a>
</section>'''


def pg_orientacoes():
    orient = "".join(f'<li><span class="or-ic">{icon(ic)}</span><div><b>{t}</b><p>{d}</p></div></li>' for ic, t, d in ORIENT)
    return f'''
<section class="pp pp-ed print-only" id="orientacoes">
  <span class="pp-k">Orientações finais</span>
  <h1 class="pp-h1">Antes de apresentar um relatório</h1>
  <ul class="orient big">{orient}</ul>
  <div class="checklist-final">
    <h2 class="pp-h2">{icon("check")}Revisão rápida antes de enviar</h2>
    <ul>
      <li>Os trechos entre colchetes foram substituídos ou removidos.</li>
      <li>Empresa, unidade, período e data de emissão estão corretos.</li>
      <li>As quantidades estão acompanhadas da unidade de medida.</li>
      <li>As situações informadas correspondem aos documentos consultados.</li>
      <li>As conclusões descrevem apenas fatos registrados e conferidos.</li>
      <li>O responsável e as referências documentais estão identificados.</li>
    </ul>
  </div>
  <div class="fecho"><span class="fecho-ic">{icon("leaf")}</span><div><b>Um complemento para a sua rotina</b><p>Este kit foi pensado para ser usado com os <strong>70 Fluxos Visuais de MTR, CDF e Controle de Resíduos</strong>. Os fluxos ajudam a entender os procedimentos, as mensagens prontas ajudam a solicitar documentos, os formulários organizam os registros e estes relatórios consolidam e apresentam os resultados.</p></div></div>
</section>'''


# ------------------------------------------------------------ navegação e montagem

def menu_lateral():
    grupos = []
    for g in GRUPOS:
        itens = "".join(f'<li><a href="#{REL[n]["id"]}" data-nav="{REL[n]["id"]}" style="--c:{REL[n]["cor"]}"><span>{n}</span>{esc(REL[n]["curto"])}</a></li>' for n in g["rels"])
        grupos.append(f'<div class="side-g"><div class="side-gh" style="--c:{CORES_GRUPO[g["k"]]}">{esc(g["nome"])}</div><ul>{itens}</ul></div>')
    return f'<nav class="side no-print" aria-label="Relatórios">{"".join(grupos)}</nav>'


def seletor():
    ops = "".join(f'<option value="{r["id"]}">{r["num"]} · {esc(r["titulo"])}</option>' for r in RELATORIOS)
    return f'<label class="sr" for="ir-para">Ir para o relatório</label><select id="ir-para" class="ir-para"><option value="inicio">Central de relatórios</option>{ops}</select>'


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
    out = []
    for r in RELATORIOS:
        out.append(f'.rel#{r["id"]}{{page:{r["id"]}}}\n@page {r["id"]}{{@bottom-left{{content:"Relatório {r["num"]} · {r["curto"]} · Modelo gerencial editável"}}}}')
    return "\n".join(out)


def main():
    css = (BASE / "estilo.css").read_text(encoding="utf-8")
    app = (BASE / "app.js").read_text(encoding="utf-8")
    rels = "".join(relatorio(r) for r in RELATORIOS)
    datalists = "".join(f'<datalist id="{k}">' + "".join(f'<option value="{esc(v)}">' for v in vs) + "</datalist>" for k, vs in DATALISTS.items())
    meta = {r["id"]: {"cod": "R" + r["num"], "num": r["num"], "titulo": r["titulo"], "curto": r["curto"], "arquivo": r["arquivo"]} for r in RELATORIOS}
    doc = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Central de Relatórios Ambientais · Kit de 10 Relatórios Prontos de Gestão de Resíduos</title>
<meta name="description" content="Kit de 10 relatórios prontos de gestão de resíduos: modelos profissionais editáveis para organizar informações, apresentar resultados e comunicar o acompanhamento.">
<meta name="color-scheme" content="light">
<style>
{fontes_css()}
{css}
{paginas_nomeadas()}
</style>
<style id="rodapes-dinamicos"></style>
</head>
<body>
<script>document.documentElement.classList.add('js');</script>
<header class="appbar no-print">
  <a class="ab-brand" href="#inicio">{icon("chart")}<span><b>Central de Relatórios</b><small>10 modelos de gestão de resíduos</small></span></a>
  <div class="ab-go">{seletor()}</div>
  <div class="ab-act">
    <button type="button" class="ab-btn" data-acao="exportar-todos" title="Exportar dados de todos os relatórios">{icon("download")}<span>Exportar dados</span></button>
    <button type="button" class="ab-btn" data-acao="importar" title="Importar dados de um arquivo .json">{icon("upload")}<span>Importar dados</span></button>
  </div>
</header>
<noscript><p class="noscript">Ative o JavaScript para usar indicadores, gráficos, tabelas dinâmicas, impressão individual e exportação de dados.</p></noscript>
{central()}
<div class="print-only pp-set" aria-hidden="true">{pg_capa()}{pg_apresentacao()}{pg_como_usar()}{pg_indice()}</div>
<div class="view view-rel" id="area-rel">
  {menu_lateral()}
  <div class="rmain">
    <div class="rtools no-print">
      <a class="rt-btn ghost" href="#inicio">{icon("grid")}<span>Central</span></a>
      <div class="rt-nav"><a class="rt-ar" data-prev href="#inicio" aria-label="Relatório anterior">{icon("left")}</a><span class="rt-pos" data-pos></span><a class="rt-ar" data-next href="#inicio" aria-label="Próximo relatório">{icon("right")}</a></div>
      <div class="rt-act">
        <button type="button" class="rt-btn main" data-acao="pdf">{icon("pdf")}<span>Salvar relatório em PDF</span></button>
        <button type="button" class="rt-btn" data-acao="imprimir">{icon("print")}<span>Imprimir</span></button>
        <button type="button" class="rt-btn" data-acao="exportar-um">{icon("download")}<span>Exportar dados</span></button>
        <button type="button" class="rt-btn warn" data-acao="limpar">{icon("erase")}<span>Limpar relatório</span></button>
      </div>
      <p class="rt-hint">{icon("info")}<span>Em <b>Salvar relatório em PDF</b>, escolha <b>Salvar como PDF</b> no destino da janela de impressão.</span><span class="draft-st" data-draft-status></span></p>
    </div>
    <div class="rels">{rels}{pg_orientacoes()}</div>
  </div>
</div>
{datalists}
<input type="file" id="arquivo-json" accept=".json,application/json" hidden>
<div class="toast no-print" id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="kit-meta">{json.dumps(meta, ensure_ascii=False)}</script>
<script type="application/json" id="kit-tons">{json.dumps(TOM, ensure_ascii=False)}</script>
<script>
{app}
</script>
</body>
</html>
'''
    SAIDA.write_text(doc, encoding="utf-8")
    print(f"HTML gerado: {SAIDA} ({SAIDA.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
