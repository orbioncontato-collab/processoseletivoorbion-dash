#!/usr/bin/env bash
# Cria a pasta Downloads/Kit_Pre_MTR_15_Formularios (macOS e Linux) e copia
# para ela os arquivos finais do Kit Pré-MTR.
# Não sobrescreve nada: se a pasta já existir, cria Kit_Pre_MTR_15_Formularios_2, _3...
# Uso: bash copiar_para_downloads.sh
set -euo pipefail

ORIGEM="$(cd "$(dirname "$0")" && pwd)"
NOME="Kit_Pre_MTR_15_Formularios"

# Pasta Downloads do usuário atual
DOWNLOADS=""
if command -v xdg-user-dir >/dev/null 2>&1; then
  DOWNLOADS="$(xdg-user-dir DOWNLOAD 2>/dev/null || true)"
fi
if [ -z "$DOWNLOADS" ] || [ "$DOWNLOADS" = "$HOME" ] || [ ! -d "$DOWNLOADS" ]; then
  for d in "$HOME/Downloads" "$HOME/Transferências" "$HOME/Download"; do
    if [ -d "$d" ]; then DOWNLOADS="$d"; break; fi
  done
fi
[ -n "$DOWNLOADS" ] || DOWNLOADS="$HOME/Downloads"
mkdir -p "$DOWNLOADS"

DESTINO="$DOWNLOADS/$NOME"; n=2
while [ -e "$DESTINO" ]; do DESTINO="$DOWNLOADS/${NOME}_${n}"; n=$((n + 1)); done
mkdir -p "$DESTINO"

for arq in Kit_Pre_MTR_15_Formularios.html Kit_Pre_MTR_15_Formularios.pdf Kit_Pre_MTR_Formularios_Impressao.pdf LEIA-ME.md; do
  cp "$ORIGEM/$arq" "$DESTINO/"
done
cp -R "$ORIGEM/formularios_individuais" "$DESTINO/"

# Confere se tudo chegou com tamanho maior que zero
falhou=0
for f in "$DESTINO"/* "$DESTINO"/formularios_individuais/*; do
  [ -f "$f" ] || continue
  if [ ! -s "$f" ]; then echo "ERRO: arquivo vazio: $f" >&2; falhou=1; fi
done
[ "$falhou" -eq 0 ] || exit 1
echo "Pasta criada: $DESTINO"
echo "$(find "$DESTINO" -type f | wc -l | tr -d ' ') arquivos copiados ($(du -sh "$DESTINO" | cut -f1))"
