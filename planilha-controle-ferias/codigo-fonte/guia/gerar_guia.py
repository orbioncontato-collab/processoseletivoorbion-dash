"""Gera o Guia Rápido em PDF: renderiza a demonstração pelo LibreOffice, recorta imagens e imprime o HTML com o Chromium."""
import subprocess
import sys
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent))
import comum as K  # noqa: E402
import recalcular  # noqa: E402

ENTREGA = AQUI.parent.parent / "entregaveis"


def paginas_por_texto(pdf):
    n = int([l for l in subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout.splitlines()
             if l.startswith("Pages:")][0].split()[1])
    txt = {}
    for i in range(1, n + 1):
        txt[i] = subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), str(pdf), "-"], capture_output=True, text=True).stdout
    return txt


def achar(txt, *trechos):
    for i, t in txt.items():
        if all(x in t for x in trechos):
            return i
    raise RuntimeError(trechos)


def png(pdf, page, out, crop=None, dpi=170):
    base = AQUI / "img" / ("tmp_" + out)
    subprocess.run(["pdftoppm", "-r", str(dpi), "-png", "-singlefile", "-f", str(page), "-l", str(page), str(pdf), str(base)], check=True)
    im = Image.open(str(base) + ".png")
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    im.save(AQUI / "img" / (out + ".png"))
    Path(str(base) + ".png").unlink()


def main():
    (AQUI / "img").mkdir(exist_ok=True)
    pdf, _ = recalcular.recalcular(ENTREGA / "Controle_de_Ferias_Demonstracao.xlsx", AQUI / "render", "pdf")
    txt = paginas_por_texto(pdf)
    png(pdf, achar(txt, "Painel de controle de férias"), "painel", (0.02, 0.05, 0.98, 0.93))
    png(pdf, achar(txt, "Saldo não", "V0001-P1"), "periodos", (0.02, 0.05, 0.62, 0.40))
    png(pdf, achar(txt, "PG0001", "Retorno previsto"), "programacao", (0.02, 0.05, 0.62, 0.40))
    png(pdf, achar(txt, "Calendário de ausências"), "calendario", (0.02, 0.04, 0.98, 0.42))
    png(pdf, achar(txt, "Ficha individual de férias"), "ficha", (0.02, 0.03, 0.98, 0.62))
    html = (AQUI / "guia.html").read_text(encoding="utf8")
    html = html.replace("{{VERSAO}}", K.VERSAO).replace("{{DATA}}", f"{K.DATA_CRIACAO:%d/%m/%Y}").replace(
        "{{REVISAO}}", f"{K.DATA_REVISAO_REGRAS:%d/%m/%Y}")
    final_html = AQUI / "guia_final.html"
    final_html.write_text(html, encoding="utf8")
    subprocess.run(["node", str(AQUI / "pdf.js"), str(final_html), str(ENTREGA / "Guia_Rapido_Controle_de_Ferias.pdf")], check=True)
    print("guia ok")


if __name__ == "__main__":
    main()
