# -*- coding: utf-8 -*-
"""Gera o arquivo HTML final do kit a partir de mensagens.py.

Uso:  python3 build.py
Saída: ../Kit_30_Mensagens_Prontas_MTR_CDF.html
"""
import base64
import html
import json
import re
import unicodedata
from pathlib import Path

from ilustracoes import CAT_ICON, cat_art, cover_art, icon
from mensagens import CATEGORIAS, MENSAGENS, PALAVRAS_BUSCA, RELACIONADAS

BASE = Path(__file__).resolve().parent
SAIDA = BASE.parent / "Kit_30_Mensagens_Prontas_MTR_CDF.html"

KIT = "30 Mensagens Prontas para MTR, CDF e Pendências Ambientais"
ASSINATURA = {"SEU NOME", "SUA EMPRESA", "CARGO"}

# ------------------------------------------------------------ verificações
assert len(CATEGORIAS) == 6, "o kit precisa de 6 categorias"
assert len(MENSAGENS) == 30, "o kit precisa de 30 mensagens"
for c in CATEGORIAS:
    n = sum(1 for m in MENSAGENS if m["cat"] == c["num"])
    assert n == 5, f"categoria {c['num']} com {n} mensagens"
assert len({m["titulo"] for m in MENSAGENS}) == 30, "títulos repetidos"
assert len({m["texto"] for m in MENSAGENS}) == 30, "textos repetidos"

CAT = {c["num"]: c for c in CATEGORIAS}
for i, m in enumerate(MENSAGENS, 1):
    m["n"] = i
    m["id"] = f"msg-{i:02d}"
    m["rel"] = RELACIONADAS[i]
    assert i not in m["rel"] and all(1 <= r <= 30 for r in m["rel"])

# --------------------------------------------------------------- paginação
# Página 1 capa | 2 boas-vindas | 3 como usar | 4 sumário
# Cada categoria abre com uma página própria; depois, uma mensagem por página.
# Última página: sequências de acompanhamento
PLANO = []
pagina = 5
for c in CATEGORIAS:
    ms = [m for m in MENSAGENS if m["cat"] == c["num"]]
    c["pagina"] = pagina
    PLANO.append({"cat": c, "abertura": True, "msgs": [], "pagina": pagina})
    pagina += 1
    for m in ms:
        m["pagina"] = pagina
        PLANO.append({"cat": c, "abertura": False, "msgs": [m], "pagina": pagina})
        pagina += 1
PAG_FINAL = pagina
TOTAL = PAG_FINAL


# ------------------------------------------------------------------ utilidades

def esc(t):
    return html.escape(t, quote=True)


def com_campos(t):
    """Escapa o texto e destaca os campos entre colchetes."""
    return re.sub(r"\[([^\]]+)\]", r'<span class="ph">[\1]</span>', esc(t))


def normaliza(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", t)


def campos_de(m):
    vistos, campos, assin = set(), [], []
    for p in re.findall(r"\[([^\]]+)\]", m["assunto"] + "\n" + m["texto"]):
        if p in vistos:
            continue
        vistos.add(p)
        (assin if p in ASSINATURA else campos).append(p)
    return campos, assin


def render_texto(t):
    partes = []
    for bloco in t.split("\n\n"):
        linhas = []
        for ln in bloco.split("\n"):
            if ln.startswith("• "):
                linhas.append(f'<span class="ln li">{com_campos(ln[2:])}</span>')
            elif re.match(r"\d+\. ", ln):
                linhas.append(f'<span class="ln nli">{com_campos(ln)}</span>')
            else:
                linhas.append(f'<span class="ln">{com_campos(ln)}</span>')
        partes.append('<div class="para">' + "".join(linhas) + "</div>")
    return "".join(partes)


def run_head(direita, cor=None):
    dot = f'<i class="dot" style="background:{cor}"></i>' if cor else ""
    return (
        '<header class="run">'
        f'<span class="run-kit">{icon("leaf", "ic run-ic")}{esc(KIT)}</span>'
        f'<span class="run-sec">{dot}{direita}</span>'
        "</header>"
    )


def run_foot(n):
    return (
        '<footer class="foot">'
        '<span>Modelos de comunicação profissional para a gestão documental de resíduos</span>'
        f'<span class="pg">{n:02d}<em> / {TOTAL:02d}</em></span>'
        "</footer>"
    )


def page(n, inner, cls="", head=None, cor=None, pid=None):
    idattr = f' id="{pid}"' if pid else ""
    h = run_head(head, cor) if head else ""
    return (
        f'<section class="page {cls}"{idattr} data-page="{n}">'
        f"{h}<div class=\"content\">{inner}</div>{run_foot(n)}</section>"
    )


# ------------------------------------------------------------- componentes

def canal_icons(m):
    out = []
    for c in m["canais"]:
        nome = "WhatsApp" if c == "whats" else "E-mail"
        out.append(f'<span class="ch" title="{nome}">{icon("chat" if c == "whats" else "mail")}<span>{nome}</span></span>')
    return "".join(out)


def relacionadas(m):
    out = []
    for n in m["rel"]:
        r = MENSAGENS[n - 1]
        cor = CAT[r["cat"]]["cor"]
        out.append(
            f'<a class="rel-i" href="#{r["id"]}" style="--rc:{cor}"><span class="rel-n">{n:02d}</span>'
            f'<span class="rel-t">{esc(r["titulo"])}<small>pág. {r["pagina"]:02d}</small></span></a>'
        )
    return "".join(out)


def card(m):
    c = CAT[m["cat"]]
    campos, assin = campos_de(m)
    chips = "".join(f'<span class="campo">[{esc(p)}]</span>' for p in campos)
    if assin:
        ordem = [p for p in ("SEU NOME", "CARGO", "SUA EMPRESA") if p in assin]
        rot = ", ".join(p.lower() for p in ordem)
        chips += f'<span class="campo campo-ass">Sua assinatura ({esc(rot)})</span>'
    return f'''
<article class="card" id="{m["id"]}" style="--c:{c["cor"]};--t:{c["tint"]}" data-n="{m["n"]}">
  <div class="card-head">
    <div class="num" aria-hidden="true"><small>Nº</small>{m["n"]:02d}</div>
    <div class="ttl">
      <span class="kick">Mensagem {m["n"]:02d} · Categoria {c["num"]} · {esc(c["curto"])}</span>
      <h3>{esc(m["titulo"])}</h3>
    </div>
    <div class="chs">{canal_icons(m)}</div>
  </div>
  <div class="card-body">
    <aside class="side">
      <div class="side-top">
        <div><h4>{icon("clock")}Quando utilizar</h4><p>{esc(m["quando"])}</p></div>
        <div><h4>{icon("user")}Para quem enviar</h4><p>{esc(m["para"])}</p></div>
        <div><h4>{icon("send")}Canal sugerido</h4><p>{esc(m["canal"])}</p></div>
      </div>
      <div class="side-bot">
        <div class="rel"><h4>{icon("route")}Mensagens relacionadas</h4>{relacionadas(m)}</div>
        <div class="dica"><h4>{icon("bulb")}Dica</h4><p>{com_campos(m["dica"])}</p></div>
      </div>
    </aside>
    <div class="main">
      <div class="subject">
        <div class="subject-l"><b>{icon("mail")}Assunto do e-mail</b><span class="subject-t">{com_campos(m["assunto"])}</span></div>
        <button class="btn-mini js-only no-print" type="button" data-copy="{m["id"]}" data-kind="assunto" aria-label="Copiar assunto da mensagem {m["n"]:02d}">{icon("copy")}<span>Copiar assunto</span></button>
      </div>
      <div class="msg-win">
        <div class="msg-bar"><span>{icon("chat" if m["canais"][0] == "whats" else "mail")}Mensagem pronta</span><i></i><i></i><i></i></div>
        <div class="msg" id="{m["id"]}-texto">{render_texto(m["texto"])}</div>
        <div class="msg-end">
          <div class="campos-box"><h4>{icon("edit")}Campos para personalizar</h4><div class="campos">{chips}</div></div>
          <button class="btn-copy js-only no-print" type="button" data-copy="{m["id"]}" data-kind="texto" aria-label="Copiar mensagem {m["n"]:02d}">{icon("copy")}<span>Copiar mensagem</span></button>
        </div>
      </div>
    </div>
  </div>
</article>'''


def abertura(c):
    ms = [m for m in MENSAGENS if m["cat"] == c["num"]]
    itens = "".join(
        f'<li><a href="#{m["id"]}"><span class="op-n">{m["n"]:02d}</span>'
        f'<span class="op-t"><b>{esc(m["titulo"])}</b><small>{esc(m["quando"])}</small></span>'
        f'<span class="op-p">pág.<b>{m["pagina"]:02d}</b></span></a></li>'
        for m in ms
    )
    return f'''
<div class="op" id="cat-{c["num"]}" style="--c:{c["cor"]};--t:{c["tint"]}">
  <div class="op-hero">
    <div class="op-txt">
      <div class="cat-kick"><span class="cat-ic">{icon(CAT_ICON[c["ilustra"]])}</span>Categoria {c["num"]} · 5 mensagens</div>
      <div class="op-num">{c["num"]}</div>
      <h2>{esc(c["nome"])}</h2>
      <p>{esc(c["desc"])}</p>
    </div>
    <div class="op-fig">{cat_art(c["ilustra"], c["cor"], c["tint"])}</div>
  </div>
  <div class="op-list">
    <div class="op-list-h">{icon("list")}Mensagens desta categoria</div>
    <ol>{itens}</ol>
  </div>
</div>'''


# ------------------------------------------------------------------ páginas

def pg_capa():
    dots = "".join(
        f'<span><i style="background:{c["cor"]}"></i>{esc(c["curto"])}</span>' for c in CATEGORIAS
    )
    return f'''
<section class="page cover" id="capa" data-page="1">
  <svg class="cover-grid" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#FFFFFF" stroke-opacity=".05" stroke-width=".25"/></pattern></defs>
    <rect width="210" height="297" fill="url(#g)"/>
    <circle cx="190" cy="20" r="70" fill="#17806C" opacity=".22"/>
    <circle cx="10" cy="210" r="60" fill="#17806C" opacity=".12"/>
  </svg>
  <div class="cover-in">
    <div class="cover-top">
      <span class="brand">{icon("leaf")}Kit de comunicação profissional</span>
      <span class="ed">Gestão documental de resíduos</span>
    </div>
    <div class="cover-title">
      <h1><span class="big">30 Mensagens Prontas</span><span class="sub">Para MTR, CDF e Pendências Ambientais</span></h1>
      <p class="lead">Modelos profissionais para copiar, personalizar e enviar por WhatsApp ou e-mail.</p>
      <div class="pill-row"><span>30 modelos prontos</span><i>•</i><span>6 categorias</span><i>•</i><span>Uso imediato</span></div>
    </div>
    <div class="cover-fig">{cover_art()}</div>
    <div class="cover-cats">{dots}</div>
  </div>
</section>'''


def pg_boas_vindas():
    nos = [
        ("Sua empresa e equipe interna", "folder", ["06"], "Colegas de outros setores, portaria, compras e gestão ambiental."),
        ("Transportador", "truck", ["01", "02", "03", "05"], "Agendamento, retirada, status da carga e documentos do transporte."),
        ("Destinador", "cert", ["01", "02", "03", "04", "05"], "Recebimento, quantidades, CDF e eventuais recusas de carga."),
    ]
    blocos = []
    for nome, ic, cats, desc in nos:
        chips = "".join(
            f'<a class="mini-cat" href="#cat-{n}" style="--c:{CAT[n]["cor"]}">{n}</a>' for n in cats
        )
        blocos.append(
            f'<div class="node"><div class="node-ic">{icon(ic)}</div><h4>{nome}</h4><p>{desc}</p>'
            f'<div class="node-cats"><span>Categorias</span>{chips}</div></div>'
        )
    seta = f'<div class="node-arrow" aria-hidden="true">{icon("arrow")}</div>'
    cadeia = seta.join(blocos)
    recursos = [
        ("search", "Busca rápida", "Digite MTR, CDF, peso ou recebimento e veja as mensagens correspondentes."),
        ("copy", "Copiar com um clique", "Cada mensagem e cada assunto têm o seu botão de cópia."),
        ("list", "Navegação clicável", "Sumário, categorias e mensagens relacionadas levam direto à página."),
        ("print", "Salvar ou imprimir", "Gere a sua própria versão em PDF quando precisar."),
    ]
    rec = "".join(f'<div class="rec"><span class="rec-ic">{icon(i)}</span><b>{t}</b><p>{d}</p></div>' for i, t, d in recursos)
    inner = f'''
<div class="intro">
  <span class="kicker">Boas-vindas</span>
  <h1 class="h1">Uma mensagem pronta para cada situação da sua rotina</h1>
  <p class="lead-p">Este kit reúne 30 modelos de mensagens para as conversas mais comuns no controle documental de resíduos: pedir um MTR, confirmar uma coleta, cobrar um CDF, apontar uma divergência ou avisar a gestão sobre uma pendência.</p>
  <p class="lead-p">Cada modelo já traz saudação, contexto, pedido e encerramento. Você só troca os campos entre colchetes pelos dados reais da movimentação e envia por WhatsApp ou e-mail.</p>
</div>
<div class="chain-box">
  <div class="sec-h"><span class="sec-ic">{icon("route")}</span><div><h2>Com quem você vai conversar</h2><p>A carga segue do gerador ao destinador, e os documentos precisam acompanhar cada etapa. Veja quais categorias ajudam em cada contato.</p></div></div>
  <div class="chain">{cadeia}</div>
</div>
<div class="recursos">
  <div class="rec-h"><b>Versão digital interativa</b><span>Se o seu kit incluir o arquivo HTML, abra no navegador do computador ou do celular. Ele funciona sem internet e traz estes recursos:</span></div>
  <div class="rec-grid">{rec}</div>
</div>
<div class="note">
  <span class="note-ic">{icon("info")}</span>
  <div><b>Observação importante</b><p>Os modelos deste kit são sugestões de comunicação profissional. As informações devem ser conferidas e adaptadas às características da movimentação e às exigências aplicáveis.</p></div>
</div>'''
    return page(2, inner, "p-intro", head="Boas-vindas", pid="boas-vindas")


def pg_como_usar():
    passos = [
        ("1", "Encontre a situação", "Localize no sumário o tipo de mensagem que precisa enviar. Na versão digital, você também pode usar a busca.", "search"),
        ("2", "Personalize os campos", "Substitua os termos entre colchetes pelas informações reais, como número do MTR, nome da empresa e data.", "edit"),
        ("3", "Copie e envie", "Use a mensagem por WhatsApp ou e-mail, conferindo as informações antes do envio.", "send"),
    ]
    cards = []
    for n, t, d, ic in passos:
        cards.append(
            f'<div class="step"><div class="step-top"><span class="step-n">{n}</span><span class="step-ic">{icon(ic)}</span></div>'
            f'<span class="step-k">Passo {n}</span><h3>{t}</h3><p>{d}</p></div>'
        )
    fluxo = f'<div class="step-arrow" aria-hidden="true">{icon("arrow")}</div>'.join(cards)

    anat = [
        ("Número e título", "Identificam a situação. Use o número para localizar o modelo."),
        ("Quando utilizar", "Em que momento da rotina aquele modelo funciona melhor."),
        ("Para quem enviar", "O destinatário mais adequado para tratar o assunto."),
        ("Canal sugerido", "Se o modelo combina mais com WhatsApp, e-mail ou ambos."),
        ("Mensagens relacionadas", "Os próximos passos mais comuns, com o número da página."),
        ("Dica", "Um cuidado prático para a mensagem funcionar melhor."),
        ("Assunto do e-mail", "Uma linha pronta para o campo de assunto."),
        ("Mensagem pronta", "O texto completo. Os trechos destacados são os campos que você troca."),
        ("Campos para personalizar", "A lista dos dados que mudam a cada envio, para conferir antes de mandar."),
    ]
    legenda = "".join(
        f'<li><span class="mk">{i}</span><p><b>{t}.</b> {d}</p></li>' for i, (t, d) in enumerate(anat, 1)
    )
    mock = f'''
<div class="mock" aria-hidden="true">
  <div class="mock-h"><span class="mock-num">16</span><div><span class="mock-k">Mensagem 16 · CDF</span><b>Solicitar CDF ao destinador</b></div><span class="mk mk-a">1</span></div>
  <div class="mock-b">
    <div class="mock-s">
      <div class="mock-row"><span class="mk">2</span><i></i><i class="s"></i></div>
      <div class="mock-row"><span class="mk">3</span><i class="s"></i></div>
      <div class="mock-row"><span class="mk">4</span><i class="s"></i></div>
      <div class="mock-sp"></div>
      <div class="mock-row"><span class="mk">5</span><i class="s"></i></div>
      <div class="mock-row mock-dica"><span class="mk">6</span><i></i></div>
    </div>
    <div class="mock-m">
      <div class="mock-row mock-subj"><span class="mk">7</span><i></i></div>
      <div class="mock-win">
        <div class="mock-msg"><span class="mk">8</span>
          <p>Olá, bom dia!</p>
          <p>Poderiam verificar a situação do CDF referente ao MTR nº <span class="ph">[NÚMERO DO MTR]</span>?</p>
          <p class="fade">A movimentação foi realizada em <span class="ph">[DATA DA COLETA]</span>...</p>
        </div>
        <div class="mock-f"><span class="mk">9</span><span class="campo">[NÚMERO DO MTR]</span><span class="campo">[DATA DA COLETA]</span></div>
      </div>
    </div>
  </div>
</div>'''
    checks = [
        "Todos os campos entre colchetes foram trocados pelos dados reais.",
        "Número do MTR, datas e quantidades conferem com os documentos.",
        "O destinatário é a pessoa certa para tratar aquele assunto.",
        "O tom combina com o momento: primeiro contato, cobrança ou encerramento.",
    ]
    lista = "".join(f'<li>{icon("check")}<span>{c}</span></li>' for c in checks)
    inner = f'''
<div class="intro">
  <span class="kicker">Como utilizar</span>
  <h1 class="h1">Como utilizar em 3 passos</h1>
</div>
<div class="steps">{fluxo}</div>
<div class="anat">
  <div class="sec-h"><span class="sec-ic">{icon("list")}</span><div><h2>Como ler cada modelo</h2><p>Todas as mensagens seguem o mesmo formato, então você encontra cada informação em segundos.</p></div></div>
  <div class="anat-grid">{mock}<ol class="legend">{legenda}</ol></div>
</div>
<div class="checkbox">
  <div class="sec-h"><span class="sec-ic">{icon("check")}</span><div><h2>Antes de enviar, confira</h2></div></div>
  <ul class="checks">{lista}</ul>
</div>'''
    return page(3, inner, "p-intro", head="Como utilizar", pid="como-usar")


def pg_sumario():
    blocos = []
    for c in CATEGORIAS:
        ms = [m for m in MENSAGENS if m["cat"] == c["num"]]
        itens = "".join(
            f'<li><a href="#{m["id"]}"><span class="li-n">{m["n"]:02d}</span><span class="li-t">{esc(m["titulo"])}</span>'
            f'<span class="li-lead"></span><span class="li-p">{m["pagina"]:02d}</span></a></li>'
            for m in ms
        )
        blocos.append(f'''
<div class="toc-cat" style="--c:{c["cor"]};--t:{c["tint"]}">
  <a class="toc-h" href="#cat-{c["num"]}">
    <span class="toc-ic">{icon(CAT_ICON[c["ilustra"]])}</span>
    <span class="toc-ht"><span class="toc-k">Categoria {c["num"]} · 5 mensagens</span><b>{esc(c["nome"])}</b></span>
    <span class="toc-pg">pág. {c["pagina"]:02d}</span>
  </a>
  <ol>{itens}</ol>
</div>''')
    inner = f'''
<div class="intro intro-row">
  <div><span class="kicker">Sumário</span><h1 class="h1">Encontre a mensagem certa</h1></div>
  <p class="toc-hint">Cada categoria tem uma cor. Procure pela situação, anote o número e vá direto à página. Na versão digital, clique no título.</p>
</div>
<div class="toc">{"".join(blocos)}</div>
<a class="toc-extra" href="#sequencias">{icon("route")}<span><b>Sequências de acompanhamento</b> · quando uma mensagem leva à outra</span><span class="li-lead"></span><span class="li-p">pág. {PAG_FINAL:02d}</span></a>'''
    return page(4, inner, "p-toc", head="Sumário", pid="sumario")


def pg_categoria(p):
    c = p["cat"]
    if p["abertura"]:
        partes, cls = [abertura(c)], "p-open"
    else:
        partes, cls = [card(m) for m in p["msgs"]], "p-cat"
    return page(
        p["pagina"],
        "".join(partes),
        cls,
        head=f'Categoria {c["num"]} · {esc(c["nome"])}',
        cor=c["cor"],
    )


def pg_final():
    M = {m["n"]: m for m in MENSAGENS}
    seqs = [
        ("Da coleta ao recebimento", "Para acompanhar uma movimentação do agendamento até a conferência no destino.", [6, 7, 8, 10]),
        ("Carga sem notícia", "Quando a carga saiu e a confirmação de chegada não aparece.", [8, 9, 12, 15]),
        ("Certificado de destinação", "Do primeiro pedido do CDF até o encerramento da solicitação.", [16, 18, 17, 19, 20]),
        ("Divergência até a regularização", "Quando algo não confere e precisa ser verificado antes de qualquer ajuste.", [13, 14, 24, 15, 30]),
        ("Rotina interna", "Para manter o controle atualizado e a gestão informada.", [26, 27, 29, 28, 30]),
    ]
    linhas = []
    for t, d, ns in seqs:
        nos = []
        for n in ns:
            m = M[n]
            cor = CAT[m["cat"]]["cor"]
            nos.append(f'<a class="sq" href="#{m["id"]}" style="--c:{cor}"><span class="sq-n">{n:02d}</span><span class="sq-t">{esc(m["titulo"])}</span></a>')
        seta = f'<span class="sq-arrow" aria-hidden="true">{icon("arrow")}</span>'
        linhas.append(
            f'<div class="seq"><div class="seq-h"><h3>{t}</h3><p>{d}</p></div><div class="seq-row n{len(ns)}">{seta.join(nos)}</div></div>'
        )
    inner = f'''
<div class="intro">
  <span class="kicker">Sequências de acompanhamento</span>
  <h1 class="h1">Quando uma mensagem leva à outra</h1>
  <p class="lead-p">Algumas situações pedem mais de um contato. Estas sequências mostram uma ordem prática para usar os modelos. Siga para o próximo passo apenas quando o anterior não resolver.</p>
</div>
<div class="seqs">{"".join(linhas)}</div>
<div class="closing">
  <div class="closing-ic">{icon("leaf")}</div>
  <div>
    <b>Um complemento para a sua rotina</b>
    <p>Este kit foi pensado para ser usado junto com os <strong>70 Fluxos Visuais de MTR, CDF e Controle de Resíduos</strong>. Os fluxos ajudam a entender cada etapa do processo, e as mensagens ajudam você a pedir as providências de cada etapa com clareza.</p>
  </div>
</div>'''
    return page(PAG_FINAL, inner, "p-final", head="Sequências de acompanhamento", pid="sequencias")


# ---------------------------------------------------------------- dados JS

def dados_js():
    d = {}
    for m in MENSAGENS:
        c = CAT[m["cat"]]
        idx = " ".join(
            [m["titulo"], c["nome"], c["curto"], m["quando"], m["para"], m["canal"], m["assunto"], m["texto"], m["dica"], PALAVRAS_BUSCA[m["n"]]]
        )
        d[m["id"]] = {
            "n": m["n"],
            "titulo": m["titulo"],
            "cat": c["nome"],
            "cor": c["cor"],
            "pagina": m["pagina"],
            "texto": m["texto"],
            "assunto": m["assunto"],
            "idx": normaliza(idx),
            "tn": normaliza(m["titulo"]),
            "tidx": normaliza(m["titulo"] + " " + PALAVRAS_BUSCA[m["n"]]),
        }
    return json.dumps(d, ensure_ascii=False).replace("</", "<\\/")


def fontes_css():
    fs = [
        ("Inter", 400, "normal", "Inter-Regular"),
        ("Inter", 400, "italic", "Inter-Italic"),
        ("Inter", 500, "normal", "Inter-Medium"),
        ("Inter", 600, "normal", "Inter-SemiBold"),
        ("Inter", 700, "normal", "Inter-Bold"),
        ("Inter Display", 700, "normal", "InterDisplay-Bold"),
        ("Inter Display", 800, "normal", "InterDisplay-ExtraBold"),
    ]
    out = []
    for fam, w, st, arq in fs:
        b64 = base64.b64encode((BASE / "fontes" / f"{arq}.woff2").read_bytes()).decode()
        out.append(
            f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};font-display:block;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
        )
    return "\n".join(out)


def main():
    css = (BASE / "estilo.css").read_text(encoding="utf-8")
    js = (BASE / "app.js").read_text(encoding="utf-8")
    paginas = [pg_capa(), pg_boas_vindas(), pg_como_usar(), pg_sumario()]
    paginas += [pg_categoria(p) for p in PLANO]
    paginas.append(pg_final())
    assert len(paginas) == TOTAL

    toolbar = f'''
<div class="toolbar no-print" role="banner">
  <a class="tb-brand" href="#capa">{icon("leaf")}<span><b>30 Mensagens Prontas</b><small>MTR, CDF e Pendências Ambientais</small></span></a>
  <div class="tb-search js-only" role="search">
    <label class="sr" for="busca">Buscar mensagem</label>
    {icon("search", "ic tb-sic")}
    <input id="busca" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar: MTR, CDF, peso, recebimento..." aria-controls="resultados" aria-expanded="false">
    <div class="results" id="resultados" role="listbox" hidden></div>
  </div>
  <nav class="tb-actions">
    <a class="tb-btn ghost" href="#sumario">{icon("list")}<span>Sumário</span></a>
    <button class="tb-btn js-only" type="button" id="btn-print">{icon("print")}<span>Salvar ou imprimir PDF</span></button>
  </nav>
</div>'''

    extras = f'''
<a class="to-top no-print" href="#sumario" aria-label="Voltar ao sumário">{icon("up")}<span>Sumário</span></a>
<div class="toast no-print" id="toast" role="status" aria-live="polite"></div>
<div class="modal no-print" id="modal" hidden>
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-t">
    <h3 id="modal-t">Copie a mensagem</h3>
    <p>Seu navegador não permitiu a cópia automática. O texto abaixo já está selecionado: use <kbd>Ctrl</kbd> + <kbd>C</kbd> (ou <kbd>Cmd</kbd> + <kbd>C</kbd> no Mac). No celular, toque e segure sobre o texto e escolha Copiar.</p>
    <textarea id="modal-txt" rows="12" readonly></textarea>
    <div class="modal-act"><button type="button" class="tb-btn ghost" id="modal-sel">Selecionar tudo</button><button type="button" class="tb-btn" id="modal-close">Fechar</button></div>
  </div>
</div>'''

    doc = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>30 Mensagens Prontas para MTR, CDF e Pendências Ambientais</title>
<meta name="description" content="Kit com 30 modelos profissionais editáveis para solicitar documentos, acompanhar movimentações, cobrar certificados e resolver pendências por WhatsApp ou e-mail.">
<meta name="color-scheme" content="light">
<style>
{fontes_css()}
{css}
</style>
</head>
<body>
<script>document.documentElement.classList.add('js');</script>
{toolbar}
<main class="book">
{"".join(paginas)}
</main>
{extras}
<script type="application/json" id="kit-data">{dados_js()}</script>
<script>
{js}
</script>
</body>
</html>
'''
    SAIDA.write_text(doc, encoding="utf-8")
    print(f"HTML gerado: {SAIDA} ({SAIDA.stat().st_size/1024:.0f} KB, {TOTAL} páginas)")


if __name__ == "__main__":
    main()
