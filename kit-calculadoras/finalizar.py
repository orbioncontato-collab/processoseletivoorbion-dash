# -*- coding: utf-8 -*-
"""
Gera o XLSX final com valores em cache.

1. Gera o arquivo com gerar_kit.py (fórmulas sem valores salvos).
2. Recalcula uma CÓPIA no LibreOffice.
3. Copia os valores calculados para dentro do XML do arquivo original,
   ao lado de cada fórmula (<v>...</v>). As fórmulas, estilos, validações,
   links e proteção do arquivo original ficam intactos.

Assim, visualizadores que não calculam fórmulas (pré-visualização de e-mail,
celular, Drive) já mostram os resultados. O Excel recalcula tudo ao abrir.

Uso:
    python finalizar.py CAMINHO_DO_recalc.py [pasta_de_saida]
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from openpyxl import load_workbook

sys.path.insert(0, str(Path(__file__).parent))
import gerar_kit as gk  # noqa: E402

CELULA = re.compile(r'<c r="([A-Z]+\d+)"((?: s="\d+")?)(?: t="\w+")?><f>(.*?)</f><v></v></c>', re.S)


def main():
    recalc = sys.argv[1]
    saida = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).parent)
    tmp = Path(tempfile.mkdtemp(prefix="kit_final_"))
    original = gk.gerar(tmp)
    copia = tmp / "copia_recalc.xlsx"
    shutil.copy(original, copia)
    res = json.loads(subprocess.run([sys.executable, recalc, str(copia), "120"],
                                    capture_output=True, text=True).stdout)
    if res.get("status") != "success" or res.get("total_errors"):
        raise SystemExit(f"Recalculo falhou: {res}")
    valores = load_workbook(copia, data_only=True)
    nomes = valores.sheetnames

    destino = saida / gk.NOME_ARQUIVO
    n = 0
    with zipfile.ZipFile(original) as zin, zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            dados = zin.read(item.filename)
            m = re.fullmatch(r"xl/worksheets/sheet(\d+)\.xml", item.filename)
            if m:
                ws = valores[nomes[int(m.group(1)) - 1]]
                texto = dados.decode("utf-8")

                def troca(mt):
                    nonlocal n
                    ref, estilo, formula = mt.group(1), mt.group(2), mt.group(3)
                    v = ws[ref].value
                    n += 1
                    if isinstance(v, bool):
                        return f'<c r="{ref}"{estilo} t="b"><f>{formula}</f><v>{int(v)}</v></c>'
                    if isinstance(v, (int, float)):
                        return f'<c r="{ref}"{estilo}><f>{formula}</f><v>{repr(float(v))}</v></c>'
                    txt = "" if v is None else escape(str(v))
                    return f'<c r="{ref}"{estilo} t="str"><f>{formula}</f><v>{txt}</v></c>'

                dados = CELULA.sub(troca, texto).encode("utf-8")
            zout.writestr(item, dados)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"{destino}  ({n} fórmulas com valor em cache)")


if __name__ == "__main__":
    main()
