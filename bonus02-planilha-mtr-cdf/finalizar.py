# -*- coding: utf-8 -*-
"""
Gera os dois arquivos finais com os valores já calculados gravados dentro do XLSX.

1. Monta o arquivo com openpyxl (fórmulas, estilos, validações, gráficos).
2. Recalcula uma cópia no LibreOffice.
3. Copia os resultados calculados para dentro do arquivo original, sem mexer em mais nada.

Assim o arquivo abre mostrando números mesmo em visualizadores e no Modo de Exibição Protegido.
O Excel recalcula tudo ao abrir (fullCalcOnLoad), então datas como HOJE() ficam sempre atualizadas.

Uso: python finalizar.py <pasta_de_saida>
"""
import os
import sys
import shutil
import zipfile
import tempfile
from lxml import etree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar_planilha import build, demo_data  # noqa: E402

RECALC_DIR = os.environ.get(
    "RECALC_DIR",
    "/root/.claude/skills/synced/db866081-af29-49f9-8a50-2c9b1be0228c_e98eb667-8c8e-48d5-ac14-4f0d54e4e53c/xlsx/scripts")
sys.path.insert(0, RECALC_DIR)

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PNS = "http://schemas.openxmlformats.org/package/2006/relationships"
q = lambda t: f"{{{NS}}}{t}"


def sheet_paths(z):
    wb = etree.fromstring(z.read("xl/workbook.xml"))
    rels = etree.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = {r.get("Id"): r.get("Target") for r in rels.iter(f"{{{PNS}}}Relationship")}
    out = {}
    for s in wb.iter(q("sheet")):
        t = target[s.get(f"{{{RNS}}}id")].lstrip("/")
        out[s.get("name")] = t if t.startswith("xl/") else "xl/" + t
    return out


def shared_strings(z):
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root = etree.fromstring(z.read("xl/sharedStrings.xml"))
    return ["".join(si.itertext()) for si in root.iter(q("si"))]


def calc_values(path):
    """Lê os valores calculados pelo LibreOffice: {aba: {célula: (tipo, valor)}}."""
    out = {}
    with zipfile.ZipFile(path) as z:
        sst = shared_strings(z)
        for name, sp in sheet_paths(z).items():
            vals = {}
            root = etree.fromstring(z.read(sp))
            for c in root.iter(q("c")):
                if c.find(q("f")) is None:
                    continue
                v = c.find(q("v"))
                t = c.get("t")
                txt = v.text if v is not None else None
                if t == "s" and txt is not None:
                    t, txt = "str", sst[int(txt)]
                vals[c.get("r")] = (t, txt)
            out[name] = vals
    return out


def inject(src, calc, dst):
    vals = calc_values(calc)
    filled = 0
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        paths = {v: k for k, v in sheet_paths(zin).items()}
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename in paths:
                sv = vals.get(paths[item.filename], {})
                root = etree.fromstring(data)
                for c in root.iter(q("c")):
                    f = c.find(q("f"))
                    if f is None:
                        continue
                    for old in c.findall(q("v")):
                        c.remove(old)
                    t, txt = sv.get(c.get("r"), (None, None))
                    if t in ("str", "b", "e"):
                        c.set("t", t)
                    elif "t" in c.attrib:
                        del c.attrib["t"]
                    if txt is None and t != "str":
                        continue
                    v = etree.SubElement(c, q("v"))
                    v.text = txt or ""
                    filled += 1
                data = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
            zout.writestr(item, data)
    return filled


def finalize(path, data=None):
    from recalc import recalc
    build(path, data)
    with tempfile.TemporaryDirectory() as tmp:
        calc = os.path.join(tmp, "calc.xlsx")
        shutil.copy(path, calc)
        res = recalc(calc, 600)
        if res.get("status") != "success" or res.get("total_errors"):
            raise SystemExit(f"Recalculo com problema em {path}: {res}")
        out = os.path.join(tmp, "out.xlsx")
        n = inject(path, calc, out)
        shutil.copy(out, path)
    return res, n


if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(folder, exist_ok=True)
    for name, data in (("Bonus02_Planilha_Controle_MTR_CDF.xlsx", None),
                       ("Bonus02_Planilha_MTR_CDF_Exemplo.xlsx", demo_data())):
        p = os.path.join(folder, name)
        res, n = finalize(p, data)
        print(name, res["total_formulas"], "fórmulas,", res["total_errors"], "erros,", n, "valores gravados")
