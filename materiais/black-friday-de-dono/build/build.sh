#!/usr/bin/env bash
# Gera de novo o PDF preenchível e a versão editável (.docx).
# Precisa de: Node com Playwright (Chromium), Python com pymupdf e python-docx, fontes Inter instaladas.
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
node build/render.js black-friday-de-dono.html "$TMP/base.pdf" "$TMP/campos.json"
python3 build/fields.py "$TMP/base.pdf" "$TMP/campos.json" "Black-Friday-de-Dono_Marcelo-Alves.pdf"
python3 build/docx_build.py "Black-Friday-de-Dono_editavel.docx"
rm -rf "$TMP"
