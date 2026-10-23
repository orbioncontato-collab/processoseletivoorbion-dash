# -*- coding: utf-8 -*-
"""Ícones e ilustrações vetoriais (SVG embutido) do kit."""

# ---------------------------------------------------------------- ícones
# Ícones de traço, 24x24, herdam a cor do texto (currentColor).
_I = {
    "docs": '<path d="M8 3h7l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v4h4"/><path d="M9 11h6M9 14.5h6"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/>',
    "truck": '<path d="M2 6h11v10H2z"/><path d="M13 9h4.5l3.5 4v3h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    "pending": '<path d="M7 3h7l4 4v4"/><path d="M14 3v4h4"/><path d="M11 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2"/><circle cx="16.5" cy="16.5" r="4.5"/><path d="M16.5 14.3v2.4l1.6 1"/>',
    "cert": '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 8h7M7 11h5"/><circle cx="16.5" cy="15.5" r="3"/><path d="M15 18.2V22l1.5-1 1.5 1v-3.8"/>',
    "compare": '<rect x="2.5" y="4" width="8" height="14" rx="1.5"/><rect x="13.5" y="4" width="8" height="14" rx="1.5"/><path d="M5 8h3M5 11h3M16 8h3M16 11h3"/><path d="M10.5 21h3M12 18v3"/>',
    "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8.5 13l2.2 2.2 4.8-4.7"/>',
    "chat": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    "print": '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    "bulb": '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "send": '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    "edit": '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    "list": '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
    "tag": '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
    "leaf": '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l7-7"/>',
    "route": '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
}


def icon(name, cls="ic", sw=1.8):
    return (
        f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        f"{_I[name]}</svg>"
    )


CAT_ICON = {
    "docs": "docs",
    "truck": "truck",
    "pending": "pending",
    "cert": "cert",
    "compare": "compare",
    "folder": "folder",
}

# ------------------------------------------------------------- elementos

INK = "#1E293B"
PAPER = "#FFFFFF"


def _doc(x, y, w, h, c, rot=0, label=None, lines=4, fold=True, op=1):
    """Documento genérico com linhas de texto."""
    r = 6
    g = [f'<g transform="translate({x} {y}) rotate({rot} {w/2} {h/2})" opacity="{op}">']
    g.append(f'<rect x="3" y="5" width="{w}" height="{h}" rx="{r}" fill="#0B2B29" opacity=".12"/>')
    g.append(f'<rect width="{w}" height="{h}" rx="{r}" fill="{PAPER}" stroke="#D6E3DF"/>')
    if fold:
        g.append(f'<path d="M{w-18} 0h12a6 6 0 0 1 6 6v12z" fill="#E4EEEB"/>')
    yy = 16
    if label:
        g.append(f'<rect x="12" y="12" width="{len(label)*9+14}" height="17" rx="4" fill="{c}"/>')
        g.append(
            f'<text x="19" y="24.5" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#fff" letter-spacing=".5">{label}</text>'
        )
        yy = 42
    for i in range(lines):
        lw = (w - 24) * (0.92 if i % 3 == 0 else (0.7 if i % 3 == 1 else 0.82))
        g.append(f'<rect x="12" y="{yy + i*11}" width="{lw:.0f}" height="4.5" rx="2.2" fill="#D3E1DD"/>')
    g.append("</g>")
    return "".join(g)


def _bubble(x, y, w, h, fill, tail="left", dots=False, lines=2, line_c="#FFFFFF", op=1):
    g = [f'<g transform="translate({x} {y})" opacity="{op}">']
    g.append(f'<rect width="{w}" height="{h}" rx="{min(h/2, 14)}" fill="{fill}"/>')
    if tail == "left":
        g.append(f'<path d="M14 {h-2} L6 {h+10} L28 {h-2}z" fill="{fill}"/>')
    else:
        g.append(f'<path d="M{w-14} {h-2} L{w-6} {h+10} L{w-28} {h-2}z" fill="{fill}"/>')
    if dots:
        for i in range(3):
            g.append(f'<circle cx="{w/2 - 12 + i*12}" cy="{h/2}" r="3.2" fill="{line_c}"/>')
    else:
        for i in range(lines):
            lw = (w - 30) * (1 if i == 0 else 0.62)
            g.append(f'<rect x="15" y="{h/2 - (lines-1)*5 + i*10 - 2}" width="{lw:.0f}" height="4" rx="2" fill="{line_c}" opacity=".9"/>')
    g.append("</g>")
    return "".join(g)


def _check_badge(cx, cy, r, fill, stroke="#fff"):
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>'
        f'<path d="M{cx-r*0.42} {cy+r*0.02} l{r*0.3} {r*0.3} l{r*0.55} -{r*0.6}" fill="none" '
        f'stroke="{stroke}" stroke-width="{max(2, r*0.22):.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
    )


def _factory(x, y, c1, c2, win="#F1F7F5"):
    return f'''<g transform="translate({x} {y})">
<rect x="58" y="-38" width="14" height="60" rx="2" fill="{c2}"/>
<path d="M0 22 L0 -6 L28 -22 L28 -6 L56 -22 L56 -6 L84 -22 L84 74 L0 74z" fill="{c1}"/>
<rect x="0" y="22" width="84" height="52" fill="{c1}"/>
<rect x="10" y="32" width="14" height="12" rx="2" fill="{win}" opacity=".85"/>
<rect x="35" y="32" width="14" height="12" rx="2" fill="{win}" opacity=".85"/>
<rect x="60" y="32" width="14" height="12" rx="2" fill="{win}" opacity=".85"/>
<rect x="33" y="52" width="18" height="22" rx="2" fill="{c2}"/>
</g>'''


def _truck(x, y, body, cab, accent, wheel="#0B2321"):
    return f'''<g transform="translate({x} {y})">
<rect x="0" y="0" width="104" height="58" rx="6" fill="{body}"/>
<rect x="10" y="10" width="34" height="38" rx="4" fill="#fff" opacity=".18"/>
<path d="M18 22h18M18 30h18M18 38h12" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>
<path d="M108 14 h24 l20 22 v22 h-44z" fill="{cab}"/>
<path d="M114 20 h16 l12 14 h-28z" fill="#fff" opacity=".75"/>
<rect x="0" y="54" width="152" height="8" rx="3" fill="{accent}"/>
<circle cx="28" cy="66" r="11" fill="{wheel}"/><circle cx="28" cy="66" r="4.5" fill="#CFE0DB"/>
<circle cx="124" cy="66" r="11" fill="{wheel}"/><circle cx="124" cy="66" r="4.5" fill="#CFE0DB"/>
</g>'''


def _facility(x, y, c1, c2, win="#F1F7F5"):
    return f'''<g transform="translate({x} {y})">
<path d="M64 -16 a26 26 0 0 1 52 0 v90 h-52z" fill="{c2}"/>
<rect x="72" y="-6" width="36" height="5" rx="2.5" fill="{win}" opacity=".45"/>
<rect x="72" y="6" width="36" height="5" rx="2.5" fill="{win}" opacity=".45"/>
<rect x="0" y="14" width="76" height="60" rx="3" fill="{c1}"/>
<path d="M-6 16 L38 -4 L82 16z" fill="{c1}"/>
<rect x="10" y="28" width="16" height="12" rx="2" fill="{win}" opacity=".85"/>
<rect x="50" y="28" width="16" height="12" rx="2" fill="{win}" opacity=".85"/>
<rect x="28" y="48" width="20" height="26" rx="2" fill="{c2}"/>
</g>'''


# ------------------------------------------------------------------ capa

def cover_art():
    teal = "#17806C"
    deep = "#0B2E2B"
    mid = "#1D5D56"
    gold = "#F1B763"
    light = "#BFDCD4"
    s = []
    s.append('<svg class="cover-art" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" role="img" '
             'aria-label="Ilustração: documentos e mensagens acompanhando a movimentação de resíduos do gerador ao destinador">')
    # base / plataforma
    s.append(f'<ellipse cx="320" cy="352" rx="300" ry="26" fill="{deep}" opacity=".55"/>')
    # rota
    s.append(f'<path d="M70 338 C 200 338, 230 338, 320 338 S 470 338, 575 338" fill="none" stroke="{light}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".7"/>')
    # nós da cadeia
    s.append(_factory(28, 262, teal, mid))
    s.append(_truck(240, 268, teal, "#2A9C84", gold))
    s.append(_facility(484, 262, teal, mid))
    # rótulos
    for x, t in ((70, "Gerador"), (316, "Transportador"), (562, "Destinador")):
        s.append(f'<text x="{x}" y="388" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="{light}" letter-spacing=".6">{t}</text>')
    # setas entre nós
    for x in (150, 426):
        s.append(f'<g transform="translate({x} 318)"><circle r="13" fill="{gold}"/><path d="M-5 0h10M1 -5l5 5-5 5" stroke="#103C39" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>')
    # documentos flutuantes
    s.append(_doc(116, 70, 112, 140, "#17806C", rot=-7, label="MTR", lines=6))
    s.append(_doc(404, 52, 116, 146, "#0E5E57", rot=6, label="CDF", lines=5))
    # selo genérico de conferência no CDF
    s.append(_check_badge(500, 182, 19, gold, "#103C39"))
    # balões de mensagem
    s.append(_bubble(236, 40, 150, 52, "#F1F7F5", tail="left", lines=2, line_c="#9FC3BA"))
    s.append(_bubble(256, 118, 128, 46, gold, tail="right", lines=2, line_c="#FFF6E6"))
    s.append(_bubble(246, 186, 96, 38, "#2A9C84", tail="left", dots=True, line_c="#E6F3EF"))
    # ícones de canal
    s.append(f'<g transform="translate(26 130)"><rect width="58" height="58" rx="16" fill="{mid}"/><g transform="translate(13 13) scale(1.35)" fill="none" stroke="#F1F7F5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{_I["chat"]}</g></g>')
    s.append(f'<g transform="translate(556 118)"><rect width="58" height="58" rx="16" fill="{mid}"/><g transform="translate(13 13) scale(1.35)" fill="none" stroke="#F1F7F5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{_I["mail"]}</g></g>')
    # linhas de conexão tracejadas
    s.append(f'<path d="M84 160 C 120 168, 116 215, 72 250" fill="none" stroke="{light}" stroke-width="1.6" stroke-dasharray="4 6" opacity=".55"/>')
    s.append(f'<path d="M584 176 C 600 210, 590 236, 560 252" fill="none" stroke="{light}" stroke-width="1.6" stroke-dasharray="4 6" opacity=".55"/>')
    s.append(f'<path d="M316 232 L316 262" fill="none" stroke="{light}" stroke-width="1.6" stroke-dasharray="4 6" opacity=".55"/>')
    # checklist pequena
    s.append(f'<g transform="translate(540 20)"><rect width="74" height="82" rx="10" fill="{mid}"/>')
    for i in range(3):
        yy = 18 + i * 22
        s.append(f'<rect x="12" y="{yy-7}" width="14" height="14" rx="4" fill="{gold if i < 2 else "none"}" stroke="{gold}" stroke-width="1.6"/>')
        if i < 2:
            s.append(f'<path d="M15.5 {yy} l3 3 5.5 -6" stroke="#103C39" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        s.append(f'<rect x="32" y="{yy-2}" width="30" height="4.5" rx="2.2" fill="#CFE5DF" opacity=".8"/>')
    s.append("</g>")
    s.append("</svg>")
    return "".join(s)


# --------------------------------------------------- ilustração das categorias

def cat_art(kind, c, tint):
    """Ilustração temática da abertura de categoria (viewBox 260x170)."""
    soft = "#FFFFFF"
    line = "#D3E1DD"
    s = [f'<svg class="cat-art" viewBox="0 0 260 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">']
    s.append(f'<circle cx="150" cy="88" r="78" fill="{c}" opacity=".08"/>')
    if kind == "docs":
        s.append(f'<g transform="translate(40 34)"><rect width="120" height="104" rx="10" fill="{c}" opacity=".9"/><path d="M0 22 h46 l10 -12 h64 v12" fill="{c}"/></g>')
        s.append(_doc(66, 14, 84, 108, c, rot=-6, label="MTR", lines=5))
        s.append(_doc(112, 26, 84, 108, c, rot=5, lines=7))
        s.append(f'<g transform="translate(40 92)"><rect width="140" height="58" rx="10" fill="{c}"/><rect x="14" y="16" width="70" height="6" rx="3" fill="#fff" opacity=".7"/><rect x="14" y="30" width="48" height="6" rx="3" fill="#fff" opacity=".45"/></g>')
        s.append(_bubble(176, 70, 72, 34, "#F1B763", tail="left", dots=True, line_c="#fff"))
    elif kind == "truck":
        s.append(f'<path d="M20 148 H240" stroke="{line}" stroke-width="3" stroke-linecap="round"/>')
        s.append(f'<path d="M34 120 C 90 60, 170 60, 226 120" fill="none" stroke="{c}" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round" opacity=".6"/>')
        s.append(f'<g transform="translate(18 92)"><rect x="0" y="12" width="44" height="44" rx="4" fill="{c}" opacity=".35"/><path d="M0 14 L22 0 L44 14z" fill="{c}" opacity=".35"/></g>')
        s.append(f'<g transform="translate(198 92)"><rect x="0" y="12" width="44" height="44" rx="4" fill="{c}" opacity=".35"/><path d="M8 12 a14 14 0 0 1 28 0z" fill="{c}" opacity=".35"/></g>')
        s.append(_truck(58, 70, c, c, "#F1B763").replace('fill="{}"'.format(c), f'fill="{c}"', 1))
        s.append(_check_badge(216, 50, 16, "#F1B763", "#1E293B"))
        s.append(f'<g transform="translate(26 36)"><circle r="16" fill="#fff" stroke="{c}" stroke-width="2"/><path d="M0 -8 V0 l6 4" stroke="{c}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>')
    elif kind == "pending":
        s.append(_doc(56, 18, 104, 132, c, rot=-4, label="MTR", lines=7))
        s.append(f'<g transform="translate(150 70)"><circle r="34" fill="#fff" stroke="{c}" stroke-width="3"/><path d="M0 -18 V0 l13 8" stroke="{c}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>')
        for i, (w, op) in enumerate(((72, 1), (50, .6), (30, .35))):
            s.append(f'<rect x="168" y="{118 + i*12}" width="{w}" height="7" rx="3.5" fill="{c}" opacity="{op}"/>')
        s.append(_bubble(18, 40, 54, 30, "#1E293B", tail="right", dots=True, line_c="#fff"))
    elif kind == "cert":
        s.append(f'<g transform="translate(36 30) rotate(-3)"><rect x="4" y="6" width="170" height="112" rx="10" fill="#0B2B29" opacity=".1"/><rect width="170" height="112" rx="10" fill="#fff" stroke="{line}"/>'
                 f'<rect x="10" y="10" width="150" height="92" rx="6" fill="none" stroke="{c}" stroke-width="1.5" opacity=".5"/>'
                 f'<rect x="24" y="24" width="38" height="16" rx="4" fill="{c}"/><text x="31" y="36" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#fff">CDF</text>'
                 f'<rect x="24" y="52" width="96" height="5" rx="2.5" fill="{line}"/><rect x="24" y="64" width="78" height="5" rx="2.5" fill="{line}"/><rect x="24" y="76" width="88" height="5" rx="2.5" fill="{line}"/></g>')
        s.append(f'<g transform="translate(182 112)"><path d="M-12 14 v30 l12 -8 12 8 v-30" fill="{c}"/><circle r="24" fill="#F1B763"/><circle r="17" fill="none" stroke="#fff" stroke-width="2"/>'
                 f'<path d="M-7 0 l5 5 9 -10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>')
        s.append(f'<g transform="translate(26 120)"><circle r="18" fill="#fff" stroke="{c}" stroke-width="3"/><path d="M13 13 l14 14" stroke="{c}" stroke-width="5" stroke-linecap="round"/></g>')
    elif kind == "compare":
        s.append(_doc(34, 24, 86, 116, c, lines=7))
        s.append(_doc(140, 24, 86, 116, c, lines=7))
        s.append(f'<rect x="44" y="83" width="66" height="12" rx="3" fill="{c}" opacity=".28"/>')
        s.append(f'<rect x="150" y="83" width="66" height="12" rx="3" fill="{c}" opacity=".28"/>')
        s.append(f'<g transform="translate(130 89)"><circle r="17" fill="{c}"/><path d="M-7 -3 h14 M-7 4 h14 M3 -9 l-6 18" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>')
        s.append(f'<g transform="translate(130 150)"><path d="M-44 0 H44" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/><path d="M0 0 V-10" stroke="#1E293B" stroke-width="3"/><path d="M-44 0 l-10 -16 h20z M44 0 l-10 -16 h20z" fill="#F1B763"/></g>')
    elif kind == "folder":
        s.append(f'<g transform="translate(30 40)"><path d="M0 12 a8 8 0 0 1 8 -8 h40 l12 12 h82 a8 8 0 0 1 8 8 v86 a8 8 0 0 1 -8 8 h-134 a8 8 0 0 1 -8 -8z" fill="{c}"/></g>')
        s.append(f'<g transform="translate(54 22) rotate(-4)"><rect width="104" height="92" rx="8" fill="#fff" stroke="{line}"/>')
        for i in range(4):
            yy = 20 + i * 18
            done = i < 3
            s.append(f'<rect x="12" y="{yy-6}" width="12" height="12" rx="3" fill="{c if done else "#fff"}" stroke="{c}" stroke-width="1.6"/>')
            if done:
                s.append(f'<path d="M15 {yy} l2.5 2.5 4.5 -5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>')
            s.append(f'<rect x="32" y="{yy-2}" width="{58 - (i%2)*16}" height="5" rx="2.5" fill="{line}"/>')
        s.append("</g>")
        s.append(f'<g transform="translate(30 88)"><rect width="150" height="68" rx="8" fill="{c}" opacity=".92"/></g>')
        s.append(_bubble(176, 30, 70, 34, "#F1B763", tail="left", dots=True, line_c="#fff"))
        s.append(_bubble(186, 84, 58, 28, "#1E293B", tail="left", lines=1, line_c="#fff"))
    s.append("</svg>")
    return "".join(s)
