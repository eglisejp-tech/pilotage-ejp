#!/usr/bin/env bash
# Restaure un export chiffré (T79) dans la pile Supabase LOCALE (Docker) : jamais en production,
# jamais dans une session de Claude Code (Q8). Réservé à la personne qui détient la clé privée
# (docs/exploitation.md, section 9.3) et à l'essai de la CI (paire d'essai, jeu d'exemple).
#
#   bash scripts/export/restaurer.sh <export.dump.age> <fichier de la clé privée>
#
# Avant : dépôt au commit indiqué par la fiche (<export>.json, dernière migration),
# npx supabase start (ou db start), puis npx supabase db reset --no-seed. Le script :
#   1. vérifie l'empreinte SHA-256 si la fiche est à côté de l'export ;
#   2. déchiffre une première fois sans rien écrire : un fichier tronqué, modifié ou chiffré pour
#      une autre clé s'arrête là, rien n'est chargé ;
#   3. dans une seule transaction, déclencheurs coupés (mode réplique : saisi_le et saisi_par
#      gardent leurs valeurs, les tables en ajout seulement se vident) : vide les tables de public
#      et private, puis charge les données ; au moindre échec, la transaction est annulée ;
#   4. affiche, table par table, le nombre de lignes et une empreinte md5 (empreintes.sh).
set -euo pipefail
export MSYS_NO_PATHCONV=1
ICI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/export/commun.sh
source "$ICI/commun.sh"

[ -z "${CLAUDECODE:-}" ] ||
  export_arreter "la restauration ne se fait jamais dans une session de Claude Code (T79, Q8)."
[ $# -eq 2 ] ||
  export_arreter "usage : bash scripts/export/restaurer.sh <export.dump.age> <fichier de la clé privée>"
fichier=$1
cle=$2
[ -f "$fichier" ] || export_arreter "export introuvable : $fichier"
[ -f "$cle" ] || export_arreter "fichier de la clé privée introuvable."
age=$(export_trouver_outil age)
export_verifier_age "$age" >/dev/null
base=$(export_conteneur_base)

fiche="${fichier%.dump.age}.json"
if [ -f "$fiche" ]; then
  attendue=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).sha256 || "")' "$fiche")
  reelle=$(sha256sum "$fichier" | cut -d ' ' -f 1)
  [ "$attendue" = "$reelle" ] ||
    export_arreter "l'empreinte de l'export ne correspond pas à sa fiche : rien n'est chargé."
  echo "Empreinte : conforme à la fiche."
else
  echo "Fiche absente : empreinte non vérifiée."
fi

"$age" -d -i "$cle" "$fichier" >/dev/null 2>&1 ||
  export_arreter "déchiffrement impossible (autre clé, fichier tronqué ou modifié) : rien n'est chargé."
echo "Déchiffrement : export complet et intact."

tables=$(export_psql_local "$base" -At -c "select string_agg(format('%I.%I', schemaname, tablename), ', ' order by schemaname, tablename) from pg_tables where schemaname in ('public', 'private')")
[ -n "$tables" ] ||
  export_arreter "aucune table dans public et private : appliquer d'abord les migrations (npx supabase db reset --no-seed)."

if ! {
  echo "SET session_replication_role = replica;"
  echo "TRUNCATE $tables;"
  if ! "$age" -d -i "$cle" "$fichier" | docker exec -i "$base" pg_restore --data-only --no-owner --file=-; then
    echo "DO \$\$ BEGIN RAISE EXCEPTION 'restauration incomplète, rien n''est gardé'; END \$\$;"
  fi
} | docker exec -i -e PGPASSWORD=postgres "$base" \
  psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres --single-transaction -v ON_ERROR_STOP=1 -q -o /dev/null; then
  export_arreter "chargement refusé : la transaction est annulée, la base locale est inchangée."
fi
echo "Chargement : terminé, dans une seule transaction."
echo "Tables (nom, lignes, empreinte md5) :"
bash "$ICI/empreintes.sh"
