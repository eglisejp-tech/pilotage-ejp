#!/bin/bash
# Formate le fichier modifié et signale les tirets cadratin / demi-cadratin dans les textes.
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json|*.md)
    npx prettier --write "$FILE_PATH" >/dev/null 2>&1 ;;
esac

case "$FILE_PATH" in
  *.tsx|*.ts|*.md)
    if grep -nP '[\x{2013}\x{2014}]' "$FILE_PATH" >/dev/null 2>&1 || grep -n $'\xe2\x80\x93\|\xe2\x80\x94' "$FILE_PATH" >/dev/null 2>&1; then
      echo "Règle de style : $FILE_PATH contient un tiret cadratin ou demi-cadratin. Remplace-le par une virgule, deux-points, parenthèses ou un point." >&2
      exit 2
    fi ;;
esac
exit 0
