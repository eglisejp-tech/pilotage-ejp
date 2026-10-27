#!/usr/bin/env bash
# Affiche, pour chaque table de public et private de la base Supabase LOCALE (Docker), le nombre
# de lignes et une empreinte md5 des lignes triées (T79). Sert à comparer une base avant l'export et
# après la restauration : essai de la CI, restauration d'essai de la personne. Jamais la production.
#
#   bash scripts/export/empreintes.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1
ICI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/export/commun.sh
source "$ICI/commun.sh"

base=$(export_conteneur_base)
docker exec -i -e PGPASSWORD=postgres "$base" \
  psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -At -F ' ' <"$ICI/empreintes.sql"
