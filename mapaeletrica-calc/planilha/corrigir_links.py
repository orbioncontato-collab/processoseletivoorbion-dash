#!/usr/bin/env python3
"""
Transforma os links da planilha em links internos (para outra aba), do mesmo jeito que o Excel grava.

Por quê: ao recalcular as fórmulas, o LibreOffice regrava os links internos como links externos
apontando para o próprio arquivo. O Google Planilhas então abre o navegador em vez de ir para a aba.

Uso: python3 corrigir_links.py MapaEletrica-Calc.xlsx
O arquivo é alterado no lugar. Fórmulas e valores calculados não são tocados.
"""
import re
import sys
import zipfile
import shutil
import tempfile
import os
from urllib.parse import unquote

PATH = sys.argv[1]
HYPER_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'


def fix_sheet(xml, rels):
    """Remove o r:id dos links que têm destino interno (location) e limpa o endereço."""
    removed = set()

    def repl(m):
        tag = m.group(0)
        loc = re.search(r'location="([^"]*)"', tag)
        if not loc:
            return tag
        rid = re.search(r'r:id="([^"]*)"', tag)
        if rid:
            removed.add(rid.group(1))
        location = unquote(loc.group(1).replace('&apos;', "'")).replace("'", '&apos;')
        ref = re.search(r'ref="([^"]*)"', tag).group(1)
        disp = re.search(r'display="([^"]*)"', tag)
        out = '<hyperlink ref="{}" location="{}"'.format(ref, location)
        if disp:
            out += ' display="{}"'.format(disp.group(1))
        return out + '/>'

    xml = re.sub(r'<hyperlink\b[^>]*/>', repl, xml)
    if rels is not None and removed:
        for rid in removed:
            rels = re.sub(r'<Relationship\b[^>]*Id="{}"[^>]*/>'.format(re.escape(rid)), '', rels)
    return xml, rels, len(removed)


def main():
    tmpdir = tempfile.mkdtemp()
    out_path = os.path.join(tmpdir, 'out.xlsx')
    total = 0
    with zipfile.ZipFile(PATH) as zin:
        names = zin.namelist()
        data = {n: zin.read(n) for n in names}
        infos = {n: zin.getinfo(n) for n in names}
    for n in names:
        m = re.match(r'xl/worksheets/(sheet\d+)\.xml$', n)
        if not m:
            continue
        rel_name = 'xl/worksheets/_rels/{}.xml.rels'.format(m.group(1))
        xml = data[n].decode('utf-8')
        rels = data[rel_name].decode('utf-8') if rel_name in data else None
        xml, rels, count = fix_sheet(xml, rels)
        total += count
        data[n] = xml.encode('utf-8')
        if rels is not None:
            data[rel_name] = rels.encode('utf-8')
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for n in names:
            zout.writestr(infos[n], data[n])
    shutil.move(out_path, PATH)
    print('Links internos corrigidos: {}'.format(total))


if __name__ == '__main__':
    main()
