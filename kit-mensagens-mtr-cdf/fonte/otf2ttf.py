# -*- coding: utf-8 -*-
"""Converte as fontes Inter (OTF/CFF) em TrueType e gera subconjuntos WOFF2.

O Chromium embute fontes TrueType no PDF como fontes vetoriais comuns,
o que deixa o arquivo menor e o texto mais nítido em qualquer leitor.
Requer: pip install fonttools brotli
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools import subset

ORIGEM = Path("/usr/share/fonts/opentype/inter")
DESTINO = Path(__file__).resolve().parent / "fontes"
NOMES = ["Inter-Regular", "Inter-Italic", "Inter-Medium", "Inter-SemiBold", "Inter-Bold", "InterDisplay-Bold", "InterDisplay-ExtraBold"]
UNICODES = "U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2030,U+2039-203A,U+20AC,U+2116,U+2190-2193,U+2713"


def otf_para_ttf(font):
    gs = font.getGlyphSet()
    glyf = {}
    for nome in font.getGlyphOrder():
        pen = TTGlyphPen(gs)
        gs[nome].draw(Cu2QuPen(pen, max_err=1.0, reverse_direction=True))
        glyf[nome] = pen.glyph()
    font["loca"] = newTable("loca")
    tg = font["glyf"] = newTable("glyf")
    tg.glyphOrder = font.getGlyphOrder()
    tg.glyphs = glyf
    del font["CFF "]
    if "VORG" in font:
        del font["VORG"]
    font["maxp"] = mp = newTable("maxp")
    mp.tableVersion = 0x00010000
    for k in ("maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions", "maxComponentElements"):
        setattr(mp, k, 0)
    mp.maxZones = 1
    font["head"].indexToLocFormat = 0
    font["head"].glyphDataFormat = 0
    post = font["post"]
    post.formatType = 2.0
    post.extraNames = []
    post.mapping = {}
    font.sfntVersion = "\0\1\0\0"
    return font


for n in NOMES:
    f = TTFont(ORIGEM / f"{n}.otf")
    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "calt", "tnum"]
    opts.flavor = None
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(f)
    f = otf_para_ttf(f)
    f.flavor = "woff2"
    saida = DESTINO / f"{n}.woff2"
    f.save(saida)
    print(saida.name, saida.stat().st_size // 1024, "KB")
