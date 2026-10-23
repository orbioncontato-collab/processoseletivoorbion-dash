#!/usr/bin/env bash
# Cria a pasta Downloads/Kit_10_Relatorios_Gestao_Residuos (macOS e Linux) e copia
# para ela os arquivos finais do Kit de 10 Relatórios.
# Não sobrescreve nada: se a pasta já existir, cria Kit_10_Relatorios_Gestao_Residuos_2, _3...
# Uso: bash copiar_para_downloads.sh
set -euo pipefail

ORIGEM="$(cd "$(dirname "$0")" && pwd)"
NOME="Kit_10_Relatorios_Gestao_Residuos"

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

for arq in Kit_10_Relatorios_Gestao_Residuos.html Kit_10_Relatorios_Gestao_Residuos.pdf LEIA-ME.txt; do
  cp "$ORIGEM/$arq" "$DESTINO/"
done
cp -R "$ORIGEM/Relatorios_Individuais" "$DESTINO/"

# Confere se tudo chegou com tamanho maior que zero
falhou=0
for f in "$DESTINO"/* "$DESTINO"/Relatorios_Individuais/*; do
  [ -f "$f" ] || continue
  if [ ! -s "$f" ]; then echo "ERRO: arquivo vazio: $f" >&2; falhou=1; fi
done
[ "$falhou" -eq 0 ] || exit 1
echo "Pasta criada: $DESTINO"
echo "$(find "$DESTINO" -type f | wc -l | tr -d ' ') arquivos copiados ($(du -sh "$DESTINO" | cut -f1))"
