# -*- coding: utf-8 -*-
"""Ícones e ilustrações vetoriais (SVG embutido) do Kit de 10 Relatórios."""

_I = {
    "refresh": '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    "chat": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    "route": '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    "cert": '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 8h7M7 11h5"/><circle cx="16.5" cy="15.5" r="3"/><path d="M15 18.2V22l1.5-1 1.5 1v-3.8"/>',
    "compare": '<rect x="2.5" y="4" width="8" height="14" rx="1.5"/><rect x="13.5" y="4" width="8" height="14" rx="1.5"/><path d="M5 8h3M5 11h3M16 8h3M16 11h3"/><path d="M10.5 21h3M12 18v3"/>',
    "briefcase": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18M11 12.5v2h2v-2"/>',
    "chart": '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "image": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    "pdf": '<path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v4h4"/><path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-4.5M14 16.5V12h2"/>',
    "building": '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20"/><path d="M8 7h4M8 11h4M8 15h4"/>',
    "target": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    "star": '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
    "truck": '<path d="M2 6h11v10H2z"/><path d="M13 9h4.5l3.5 4v3h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    "drum": '<ellipse cx="12" cy="5" rx="6.5" ry="2.2"/><path d="M5.5 5v14c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V5"/><path d="M5.5 10c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2M5.5 15c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2"/>',
    "scale": '<path d="M12 3v18M7 21h10"/><path d="M4 7h16"/><path d="M6.5 7L3.5 13.5a3 3 0 0 0 6 0zM17.5 7l-3 6.5a3 3 0 0 0 6 0z"/>',
    "check": '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9l1.8 1.8L13 7.5M8 15l1.8 1.8L13 13.5"/><path d="M15.5 9.5H17M15.5 15.5H17"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 15.5l2 2 4-4"/>',
    "idcard": '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.5c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4"/><path d="M14.5 10h4M14.5 13.5h4"/>',
    "factory": '<path d="M3 21V10l5 3V10l5 3V7l8 3v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
    "doc": '<path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v4h4"/><path d="M8.5 11h6M8.5 14h6M8.5 17h3.5"/>',
    "clipboard": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10l1.5 1.5L13 8.5M8.5 15.5l1.5 1.5 3-3"/><path d="M15 10h1M15 15.5h1"/>',
    "inbox": '<path d="M3 13l2.5-8h13L21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M12 6v5M9.5 8.5L12 11l2.5-2.5"/>',
    "alert": '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v4M12 17h.01"/>',
    "archive": '<rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
    "box": '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    "print": '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    "download": '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    "upload": '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    "erase": '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "x": '<path d="M6 6l12 12M18 6L6 18"/>',
    "grid": '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    "left": '<path d="M15 5l-7 7 7 7"/>',
    "right": '<path d="M9 5l7 7-7 7"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    "edit": '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    "save": '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
    "leaf": '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l7-7"/>',
    "shield": '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M12 8v5M12 16h.01"/>',
    "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    "cloud-off": '<path d="M3 3l18 18"/><path d="M8.5 8.6A5 5 0 0 0 6 18h10.5M18.6 15.6A3.5 3.5 0 0 0 17 9h-1.2A6 6 0 0 0 10 5.2"/>',
}


def icon(name, cls="ic", sw=1.8):
    return (
        f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{_I[name]}</svg>'
    )


def _ic_svg(name, x, y, size, stroke, sw=1.8):
    s = size / 24
    return (f'<g transform="translate({x} {y}) scale({s})" fill="none" stroke="{stroke}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{_I[name]}</g>')


# --------------------------------------------------------- peças da cena

def _sheet(x, y, w, h, c, rot=0, title_w=60, rows=5, check=True, shadow=True):
    """Folha de formulário genérica: faixa de título, campos e caixas."""
    g = [f'<g transform="translate({x} {y}) rotate({rot} {w/2} {h/2})">']
    if shadow:
        g.append(f'<rect x="4" y="6" width="{w}" height="{h}" rx="7" fill="#06201E" opacity=".18"/>')
    g.append(f'<rect width="{w}" height="{h}" rx="7" fill="#fff"/>')
    g.append(f'<rect width="{w}" height="22" rx="7" fill="{c}"/><rect y="14" width="{w}" height="8" fill="{c}"/>')
    g.append(f'<rect x="10" y="8" width="{title_w}" height="6" rx="3" fill="#fff" opacity=".85"/>')
    yy = 34
    for i in range(rows):
        if check and i % 2 == 1:
            g.append(f'<rect x="10" y="{yy}" width="9" height="9" rx="2" fill="none" stroke="{c}" stroke-width="1.6"/>')
            if i < 4:
                g.append(f'<path d="M12 {yy+4.5} l2 2 3.5-4" stroke="{c}" stroke-width="1.6" fill="none" stroke-linecap="round"/>')
            g.append(f'<rect x="24" y="{yy+2.5}" width="{(w-36)*0.7:.0f}" height="4" rx="2" fill="#CFE0DA"/>')
            yy += 17
        else:
            g.append(f'<rect x="10" y="{yy}" width="{(w-20)*0.38:.0f}" height="3" rx="1.5" fill="#9DB8B0"/>')
            g.append(f'<rect x="10" y="{yy+6}" width="{w-20}" height="10" rx="2.5" fill="none" stroke="#CBDAD5" stroke-width="1.2"/>')
            yy += 22
    g.append("</g>")
    return "".join(g)


def _truck(x, y, body, cab, accent):
    return f'''<g transform="translate({x} {y})">
<rect x="0" y="0" width="104" height="58" rx="6" fill="{body}"/>
<rect x="12" y="12" width="26" height="34" rx="3" fill="#fff" opacity=".9"/>
<path d="M17 21h16M17 28h16M17 35h10" stroke="{body}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M108 14 h24 l20 22 v22 h-44z" fill="{cab}"/>
<path d="M114 20 h16 l12 14 h-28z" fill="#fff" opacity=".75"/>
<rect x="0" y="54" width="152" height="8" rx="3" fill="{accent}"/>
<circle cx="28" cy="66" r="11" fill="#0B2321"/><circle cx="28" cy="66" r="4.5" fill="#CFE0DB"/>
<circle cx="124" cy="66" r="11" fill="#0B2321"/><circle cx="124" cy="66" r="4.5" fill="#CFE0DB"/>
</g>'''


def _drum(x, y, c, h=46, w=34):
    return f'''<g transform="translate({x} {y})">
<rect x="0" y="5" width="{w}" height="{h}" rx="4" fill="{c}"/>
<ellipse cx="{w/2}" cy="5" rx="{w/2}" ry="5" fill="{c}"/><ellipse cx="{w/2}" cy="5" rx="{w/2-4}" ry="3" fill="#000" opacity=".15"/>
<rect x="0" y="{h*0.38}" width="{w}" height="3" fill="#000" opacity=".14"/><rect x="0" y="{h*0.74}" width="{w}" height="3" fill="#000" opacity=".14"/>
<rect x="{w*0.22}" y="{h*0.46}" width="{w*0.56}" height="{h*0.2}" rx="2" fill="#fff" opacity=".9"/>
</g>'''


def _bigbag(x, y, c, w=44, h=40):
    return f'''<g transform="translate({x} {y})">
<path d="M6 0 h{w-12} l6 8 v{h-12} a4 4 0 0 1 -4 4 h-{w-8} a4 4 0 0 1 -4 -4 v-{h-12}z" fill="{c}"/>
<path d="M8 0 v-6 M{w-8} 0 v-6" stroke="{c}" stroke-width="3" stroke-linecap="round"/>
<rect x="{w*0.25}" y="{h*0.35}" width="{w*0.5}" height="{h*0.25}" rx="2" fill="#fff" opacity=".85"/>
</g>'''


def _check_badge(cx, cy, r, fill, stroke):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>'
            f'<path d="M{cx-r*0.42} {cy+r*0.02} l{r*0.3} {r*0.3} l{r*0.55} -{r*0.6}" fill="none" stroke="{stroke}" '
            f'stroke-width="{max(2, r*0.22):.1f}" stroke-linecap="round" stroke-linejoin="round"/>')


# ------------------------------------------------------------------ capa

def cover_art_formularios():
    teal, deep, mid, gold, light = "#17806C", "#0A2C29", "#1D5D56", "#E6B566", "#BFDCD4"
    s = ['<svg class="cover-art" viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" '
         'aria-label="Ilustração: formulários, recipientes de resíduos e caminhão de coleta">']
    s.append(f'<ellipse cx="320" cy="372" rx="300" ry="26" fill="{deep}" opacity=".6"/>')
    # rota pontilhada
    s.append(f'<path d="M40 356 H600" stroke="{light}" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round" opacity=".6"/>')
    # recipientes à esquerda
    s.append(_drum(30, 300, "#2A9C84"))
    s.append(_drum(70, 296, gold, h=50))
    s.append(_bigbag(112, 312, "#2C6E66"))
    # caminhão
    s.append(_truck(214, 284, teal, "#2A9C84", gold))
    # unidade destinadora à direita
    s.append(f'''<g transform="translate(470 268)"><path d="M70 -6 a26 26 0 0 1 52 0 v94 h-52z" fill="{mid}"/>
<rect x="0" y="22" width="84" height="66" rx="3" fill="{teal}"/><path d="M-6 24 L42 2 L90 24z" fill="{teal}"/>
<rect x="12" y="36" width="16" height="12" rx="2" fill="#F1F7F5" opacity=".85"/><rect x="56" y="36" width="16" height="12" rx="2" fill="#F1F7F5" opacity=".85"/>
<rect x="32" y="58" width="20" height="30" rx="2" fill="{mid}"/></g>''')
    # pilha de formulários
    s.append(_sheet(150, 40, 150, 196, "#1E6E8C", rot=-8, rows=6))
    s.append(_sheet(250, 24, 160, 210, teal, rot=4, title_w=74, rows=7))
    # prancheta
    s.append(f'''<g transform="translate(418 54) rotate(7 70 90)">
<rect x="4" y="8" width="138" height="178" rx="10" fill="#06201E" opacity=".2"/>
<rect width="138" height="178" rx="10" fill="#8C6A3A"/>
<rect x="10" y="16" width="118" height="152" rx="5" fill="#fff"/>
<rect x="44" y="-6" width="50" height="20" rx="6" fill="{gold}"/>
<rect x="22" y="32" width="64" height="6" rx="3" fill="{teal}"/>''')
    for i in range(5):
        yy = 52 + i * 22
        done = i < 3
        s.append(f'<rect x="22" y="{yy}" width="12" height="12" rx="3" fill="{teal if done else "#fff"}" stroke="{teal}" stroke-width="1.6"/>')
        if done:
            s.append(f'<path d="M25 {yy+6} l2.5 2.5 4.5-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>')
        s.append(f'<rect x="42" y="{yy+4}" width="{70 - (i % 2) * 18}" height="4.5" rx="2.2" fill="#CFE0DA"/>')
    s.append("</g>")
    s.append(_check_badge(546, 238, 20, gold, "#103C39"))
    # ícones flutuantes
    s.append(f'<g transform="translate(36 150)"><rect width="62" height="62" rx="17" fill="{mid}"/>{_ic_svg("calendar", 15, 15, 32, "#F1F7F5")}</g>')
    s.append(f'<g transform="translate(70 60)"><rect width="52" height="52" rx="15" fill="{mid}" opacity=".85"/>{_ic_svg("scale", 12, 12, 28, gold)}</g>')
    s.append(f'<path d="M98 212 C 110 250, 90 270, 70 292" fill="none" stroke="{light}" stroke-width="1.6" stroke-dasharray="4 6" opacity=".55"/>')
    s.append("</svg>")
    return "".join(s)


# --------------------------------------------- ilustrações das categorias

def cat_art(num, c):
    gold = "#E6B566"
    s = ['<svg class="cat-art" viewBox="0 0 280 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">']
    s.append(f'<circle cx="150" cy="96" r="86" fill="{c}" opacity=".09"/>')
    if num == "01":
        s.append(f'<path d="M20 170 H260" stroke="#C9D9D4" stroke-width="3" stroke-linecap="round"/>')
        s.append(_drum(34, 112, c, h=52, w=38))
        s.append(_drum(78, 106, gold, h=58, w=38))
        s.append(_bigbag(124, 126, "#2C6E66", w=50, h=44))
        s.append(_sheet(160, 16, 96, 128, c, rot=6, title_w=44, rows=5, shadow=True))
        s.append(f'<g transform="translate(40 30)"><rect width="56" height="56" rx="15" fill="#fff" stroke="{c}" stroke-width="2"/>{_ic_svg("calendar", 12, 12, 32, c)}</g>')
    elif num == "02":
        s.append(f'<g transform="translate(24 46)"><rect x="3" y="5" width="112" height="72" rx="10" fill="#06201E" opacity=".12"/><rect width="112" height="72" rx="10" fill="#fff" stroke="#D2E0DC"/>'
                 f'<circle cx="28" cy="32" r="12" fill="{c}" opacity=".85"/><rect x="50" y="22" width="48" height="6" rx="3" fill="#CFE0DA"/><rect x="50" y="36" width="36" height="6" rx="3" fill="#CFE0DA"/>'
                 f'<rect x="14" y="54" width="84" height="6" rx="3" fill="{c}" opacity=".35"/></g>')
        s.append(_sheet(150, 18, 104, 140, c, rot=5, title_w=50, rows=6))
        s.append(f'<g transform="translate(118 128)"><circle r="18" fill="{gold}"/>{_ic_svg("arrow", -10, -10, 20, "#1E293B", 2.2)}</g>')
        s.append(_truck(16, 132, c, c, gold).replace('<g transform="translate(16 132)">', '<g transform="translate(16 132) scale(.62)">'))
    else:
        s.append(f'<g transform="translate(26 30)"><path d="M0 12 a8 8 0 0 1 8 -8 h40 l12 12 h84 a8 8 0 0 1 8 8 v100 a8 8 0 0 1 -8 8 h-136 a8 8 0 0 1 -8 -8z" fill="{c}"/></g>')
        s.append(_sheet(48, 14, 104, 118, "#1E293B", rot=-5, title_w=50, rows=5))
        s.append(f'<g transform="translate(26 92)"><rect width="152" height="70" rx="8" fill="{c}" opacity=".95"/>'
                 f'<rect x="16" y="20" width="70" height="7" rx="3.5" fill="#fff" opacity=".75"/><rect x="16" y="36" width="48" height="7" rx="3.5" fill="#fff" opacity=".45"/></g>')
        s.append(f'<g transform="translate(206 62)"><circle r="34" fill="#fff" stroke="{c}" stroke-width="3"/>{_ic_svg("scale", -18, -18, 36, c, 2)}</g>')
        s.append(_check_badge(232, 140, 20, gold, "#1E293B"))
    s.append("</svg>")
    return "".join(s)


def _report_sheet(x, y, w, h, c, rot=0, barras=(0.45, 0.8, 0.6, 0.95, 0.7)):
    """Página de relatório genérica: faixa de título, cartões de indicador e barras."""
    g = [f'<g transform="translate({x} {y}) rotate({rot} {w/2} {h/2})">']
    g.append(f'<rect x="4" y="6" width="{w}" height="{h}" rx="8" fill="#06201E" opacity=".2"/>')
    g.append(f'<rect width="{w}" height="{h}" rx="8" fill="#fff"/>')
    g.append(f'<rect x="12" y="12" width="{w*0.5:.0f}" height="7" rx="3.5" fill="{c}"/>')
    g.append(f'<rect x="12" y="24" width="{w*0.32:.0f}" height="4" rx="2" fill="#B9CFC8"/>')
    cw = (w - 24 - 8) / 3
    for i in range(3):
        g.append(f'<rect x="{12 + i*(cw+4):.1f}" y="36" width="{cw:.1f}" height="26" rx="4" fill="#E8F4EF"/>')
        g.append(f'<rect x="{18 + i*(cw+4):.1f}" y="42" width="{cw*0.4:.1f}" height="4" rx="2" fill="#9DB8B0"/>')
        g.append(f'<rect x="{18 + i*(cw+4):.1f}" y="50" width="{cw*0.6:.1f}" height="7" rx="2" fill="{c}"/>')
    base = h - 18
    bw = (w - 24) / (len(barras) * 1.6)
    for i, b in enumerate(barras):
        bh = (h - 92) * b
        g.append(f'<rect x="{14 + i*bw*1.6:.1f}" y="{base-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="2" fill="{c if i % 2 == 0 else "#E6B566"}"/>')
    g.append(f'<path d="M12 {base} H{w-12}" stroke="#CFDDD8" stroke-width="1.2"/>')
    g.append("</g>")
    return "".join(g)


def cover_art():
    teal, deep, mid, gold, light = "#17806C", "#0A2C29", "#1D5D56", "#E6B566", "#BFDCD4"
    s = ['<svg class="cover-art" viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" '
         'aria-label="Ilustração: páginas de relatório com indicadores e gráficos, caminhão de coleta e recipientes">']
    s.append(f'<ellipse cx="320" cy="376" rx="300" ry="24" fill="{deep}" opacity=".6"/>')
    s.append(f'<path d="M40 362 H600" stroke="{light}" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round" opacity=".6"/>')
    s.append(_drum(36, 306, "#2A9C84"))
    s.append(_drum(76, 300, gold, h=52))
    s.append(_truck(140, 292, teal, "#2A9C84", gold))
    s.append(f'''<g transform="translate(486 274)"><path d="M70 -6 a26 26 0 0 1 52 0 v94 h-52z" fill="{mid}"/>
<rect x="0" y="22" width="84" height="66" rx="3" fill="{teal}"/><path d="M-6 24 L42 2 L90 24z" fill="{teal}"/>
<rect x="12" y="36" width="16" height="12" rx="2" fill="#F1F7F5" opacity=".85"/><rect x="56" y="36" width="16" height="12" rx="2" fill="#F1F7F5" opacity=".85"/>
<rect x="32" y="58" width="20" height="30" rx="2" fill="{mid}"/></g>''')
    s.append(_report_sheet(178, 50, 150, 196, "#256B83", rot=-7, barras=(0.5, 0.7, 0.4, 0.85)))
    s.append(_report_sheet(300, 26, 172, 222, teal, rot=4))
    # quadro de indicador em destaque
    s.append(f'''<g transform="translate(470 92)"><rect x="3" y="5" width="132" height="92" rx="12" fill="#06201E" opacity=".2"/>
<rect width="132" height="92" rx="12" fill="#fff"/>
<rect x="14" y="16" width="54" height="5" rx="2.5" fill="#9DB8B0"/>
<text x="14" y="58" font-family="Inter Display, Inter, sans-serif" font-size="30" font-weight="800" fill="{teal}">10</text>
<path d="M70 66 l14-14 10 8 20-22" fill="none" stroke="{gold}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="14" y="72" width="70" height="5" rx="2.5" fill="#CFE0DA"/></g>''')
    s.append(f'<g transform="translate(40 150)"><rect width="62" height="62" rx="17" fill="{mid}"/>{_ic_svg("chart", 15, 15, 32, "#F1F7F5")}</g>')
    s.append(f'<g transform="translate(82 64)"><rect width="52" height="52" rx="15" fill="{mid}" opacity=".85"/>{_ic_svg("doc", 12, 12, 28, gold)}</g>')
    s.append(_check_badge(560, 236, 20, gold, "#103C39"))
    s.append(f'<path d="M100 214 C 116 250, 100 276, 80 300" fill="none" stroke="{light}" stroke-width="1.6" stroke-dasharray="4 6" opacity=".55"/>')
    s.append("</svg>")
    return "".join(s)


def mini_art(c):
    """Pequena ilustração de relatório para o cabeçalho das capas dos modelos."""
    s = ['<svg class="mini-art" viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">']
    s.append(f'<circle cx="120" cy="80" r="74" fill="{c}" opacity=".09"/>')
    s.append(_report_sheet(30, 18, 110, 136, "#256B83", rot=-6, barras=(0.5, 0.8, 0.4)))
    s.append(_report_sheet(84, 10, 116, 142, c, rot=4))
    s.append("</svg>")
    return "".join(s)
