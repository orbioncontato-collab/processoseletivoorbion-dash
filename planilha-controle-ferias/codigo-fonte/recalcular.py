"""Recalcula uma cópia do .xlsx com o LibreOffice (modo headless) para conferência.

O arquivo original não é alterado. A cópia recalculada é usada para ler os resultados
das fórmulas e comparar com o modelo independente (modelo.py).
"""
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

XCU = """<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="ODFRecalcMode" oor:op="fuse"><value>0</value></prop></item>
</oor:items>
"""


def recalcular(src, dst_dir, fmt="xlsx", timeout=1800):
    """Converte src para dst_dir/<nome>.<fmt> forçando o recálculo de todas as fórmulas. Retorna (caminho, segundos)."""
    src = Path(src).resolve()
    dst_dir = Path(dst_dir).resolve()
    dst_dir.mkdir(parents=True, exist_ok=True)
    prof = Path(tempfile.mkdtemp(prefix="lo-prof-"))
    (prof / "user").mkdir(parents=True)
    (prof / "user" / "registrymodifications.xcu").write_text(XCU)
    filt = {"xlsx": "xlsx:Calc MS Excel 2007 XML", "pdf": "pdf:calc_pdf_Export"}[fmt]
    t0 = time.time()
    subprocess.run(["soffice", f"-env:UserInstallation={prof.as_uri()}", "--headless", "--norestore",
                    "--convert-to", filt, "--outdir", str(dst_dir), str(src)],
                   check=True, capture_output=True, timeout=timeout)
    dt = time.time() - t0
    shutil.rmtree(prof, ignore_errors=True)
    out = dst_dir / (src.stem + "." + fmt)
    if not out.exists():
        raise RuntimeError("LibreOffice não gerou o arquivo " + str(out))
    return out, dt
