# -*- coding: utf-8 -*-
"""Recalcula arquivos .xlsx no LibreOffice (idioma pt-BR) e salva no próprio arquivo.

Uso: python lo_recalc.py arquivo1.xlsx [arquivo2.xlsx ...]
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

MACRO = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
    Sub RecalculateAndSave()
      ThisComponent.calculateAll()
      ThisComponent.store()
      ThisComponent.close(True)
    End Sub
</script:module>"""

XCU = """<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooSetupSystemLocale" oor:op="fuse"><value>pt-BR</value></prop></item>
<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooLocale" oor:op="fuse"><value>pt-BR</value></prop></item>
</oor:items>"""


def env():
    sys.path.insert(0, str(next(Path("/root/.claude/skills/synced").glob("*/xlsx/scripts"))))
    from office.soffice import get_soffice_env
    return get_soffice_env()


def main(files):
    e = env()
    with tempfile.TemporaryDirectory() as prof:
        url = Path(prof).as_uri()
        subprocess.run(["soffice", "--headless", "--terminate_after_init", f"-env:UserInstallation={url}"],
                       env=e, capture_output=True, timeout=120)
        mdir = Path(prof) / "user" / "basic" / "Standard"
        (mdir / "Module1.xba").write_text(MACRO)
        reg = Path(prof) / "user" / "registrymodifications.xcu"
        txt = reg.read_text() if reg.exists() else ""
        if "</oor:items>" in txt:
            txt = txt.replace("</oor:items>",
                              XCU.split("xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">")[1])
        else:
            txt = XCU
        reg.write_text(txt)
        for f in files:
            before = os.stat(f).st_mtime_ns
            subprocess.run(["soffice", "--headless", "--norestore", f"-env:UserInstallation={url}",
                            "vnd.sun.star.script:Standard.Module1.RecalculateAndSave?language=Basic&location=application",
                            os.path.abspath(f)], env=e, capture_output=True, timeout=300)
            print(f, "ok" if os.stat(f).st_mtime_ns != before else "NÃO RECALCULADO")


if __name__ == "__main__":
    main(sys.argv[1:])
