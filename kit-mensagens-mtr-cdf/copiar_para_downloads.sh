#!/usr/bin/env bash
# Copia o PDF e o HTML do kit para a pasta Downloads (macOS e Linux).
# Não sobrescreve nada: se o arquivo já existir, cria uma cópia com sufixo _2, _3...
# Uso: bash copiar_para_downloads.sh
set -euo pipefail

ORIGEM="$(cd "$(dirname "$0")" && pwd)"

# Pasta Downloads do usuário atual
DESTINO=""
if command -v xdg-user-dir >/dev/null 2>&1; then
  DESTINO="$(xdg-user-dir DOWNLOAD 2>/dev/null || true)"
fi
if [ -z "$DESTINO" ] || [ "$DESTINO" = "$HOME" ] || [ ! -d "$DESTINO" ]; then
  for d in "$HOME/Downloads" "$HOME/Transferências" "$HOME/Download"; do
    if [ -d "$d" ]; then DESTINO="$d"; break; fi
  done
fi
if [ -z "$DESTINO" ]; then
  DESTINO="$HOME/Downloads"
  mkdir -p "$DESTINO"
fi

copia() {
  local arq="$1" base ext alvo n
  base="${arq%.*}"; ext="${arq##*.}"
  alvo="$DESTINO/$arq"; n=2
  while [ -e "$alvo" ]; do alvo="$DESTINO/${base}_${n}.${ext}"; n=$((n + 1)); done
  cp "$ORIGEM/$arq" "$alvo"
  if [ -s "$alvo" ]; then
    echo "Copiado: $alvo ($(wc -c < "$alvo" | tr -d ' ') bytes)"
  else
    echo "ERRO: a cópia de $arq ficou vazia" >&2; exit 1
  fi
}

copia "Kit_30_Mensagens_Prontas_MTR_CDF.pdf"
copia "Kit_30_Mensagens_Prontas_MTR_CDF.html"
