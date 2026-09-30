#!/bin/bash
# Bloque l'écriture dans les fichiers sensibles et dans les migrations déjà appliquées.
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
FILE_PATH="${FILE_PATH//\\//}"

PROTECTED=(".env" "package-lock.json" ".git/" "supabase/.temp/")
for p in "${PROTECTED[@]}"; do
  if [[ "$FILE_PATH" == *"$p"* ]]; then
    echo "Bloqué : $FILE_PATH est un fichier protégé ($p)." >&2
    exit 2
  fi
done

# Une migration existante ne se modifie pas : créer une nouvelle migration.
if [[ "$FILE_PATH" == *"supabase/migrations/"* && -f "$FILE_PATH" ]]; then
  echo "Bloqué : $FILE_PATH existe déjà. Crée une nouvelle migration avec 'supabase migration new'." >&2
  exit 2
fi
exit 0
