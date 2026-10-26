#!/usr/bin/env bash
# Essai de l'export chiffré et de sa restauration (T77), lancé par le job « base » de la CI sur la
# pile locale et le jeu d'exemple fictif, jamais ailleurs. Même code que l'action « export » de
# scripts/production.sh (scripts/export/commun.sh) : identifiants lus dans l'essai à blanc de la CLI
# (ici --local), pg_dump vers age en flux, fiche, purge, résumé. Seule la clé change : une paire
# d'essai créée ici et jetée avec le runner. Vérifie :
#   - la sortie : les sept lignes autorisées, rien d'autre (S7) ;
#   - le dossier des exports : l'export chiffré et sa fiche, aucun autre fichier (S7) ;
#   - la restauration exacte : nombre de lignes et md5 de chaque table, avant et après (S3, S11) ;
#   - le refus d'un export tronqué ou chiffré pour une autre clé, base inchangée (S6).
set -euo pipefail
export MSYS_NO_PATHCONV=1
ICI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$ICI/../.."
# shellcheck source=scripts/export/commun.sh
source "$ICI/commun.sh"

[ "${CI:-}" = "true" ] || export_arreter "essai réservé à la CI (pile locale, jeu d'exemple fictif)."
export EXPORT_SSLMODE=disable

travail=$(mktemp -d)
exports="$travail/exports"
mkdir -p "$exports"
age=$(export_trouver_outil age)
age_keygen=$(export_trouver_outil age-keygen)
pg_dump=$(export_trouver_outil pg_dump)
version_age=$(export_verifier_age "$age")
version_pg_dump=$(export_verifier_pg_dump "$pg_dump" "$(export_majeure_base .)")
echo "Outils : $version_age ; $version_pg_dump"

# Paire d'essai, lue comme le fichier des destinataires de main.
"$age_keygen" -o "$travail/cle-essai.txt" 2>/dev/null
cle=$(export_lire_cle "$(printf '# Paire d essai de la CI\n%s\n' "$("$age_keygen" -y "$travail/cle-essai.txt")")")
"$age_keygen" -o "$travail/autre-cle.txt" 2>/dev/null

# Empreintes de référence : le jeu d'exemple, tel que la CI l'a chargé.
bash "$ICI/empreintes.sh" >"$travail/avant.txt"
n_tables=$(wc -l <"$travail/avant.txt" | tr -d ' ')
[ "$n_tables" -ge 10 ] || export_arreter "trop peu de tables dans la base locale ($n_tables)."
echo "Référence : $n_tables tables dans public et private."

# Export, comme en production (option A), mais vers la base locale.
sortie=$(npx supabase db dump --local --dry-run --data-only -s public 2>&1)
export_lire_identifiants "$sortie"
sortie=""
nom="ejp-$(export_date_paris).dump.age"
export_flux "$exports" "$nom" "$cle" "$pg_dump" "$age"
export_effacer_identifiants
derniere=$(export_derniere_migration "$(npx supabase migration list --local 2>/dev/null || true)")
export_ecrire_fiche "$exports" "$nom" "$cle" "$(git rev-parse --short HEAD)" "$derniere" \
  "$version_pg_dump" "$version_age" "$(npx supabase --version 2>/dev/null | head -n 1)"
export_purger "$exports"
export_resume "$nom" "$cle" "$derniere" >"$travail/resume.txt"
cat "$travail/resume.txt"
export_verifier_resume <"$travail/resume.txt"
[ "$derniere" != inconnue ] || export_arreter "dernière migration illisible dans « migration list »."

presents=$(ls -A "$exports" | sort)
attendus=$(printf '%s\n' "$nom" "${nom%.dump.age}.json" | sort)
[ "$presents" = "$attendus" ] || export_arreter "fichiers inattendus dans le dossier des exports : $presents"
[ "$EXPORT_TABLES" -eq "$n_tables" ] ||
  export_arreter "le sommaire de l'export compte $EXPORT_TABLES tables, la base en a $n_tables."
echo "Contrôles de l'export : sortie autorisée, export chiffré et fiche seulement, $EXPORT_TABLES tables."

# Restauration sur une base remise à zéro, sans le jeu d'exemple (seules les données de référence
# des migrations y sont).
npx supabase db reset --no-seed
bash "$ICI/restaurer.sh" "$exports/$nom" "$travail/cle-essai.txt" >"$travail/restauration.txt"
bash "$ICI/empreintes.sh" >"$travail/apres.txt"
if ! diff -q "$travail/avant.txt" "$travail/apres.txt" >/dev/null; then
  diff "$travail/avant.txt" "$travail/apres.txt" | head -n 20 >&2 || true
  export_arreter "restauration inexacte : lignes ou empreintes différentes."
fi
echo "Restauration : $n_tables tables identiques (lignes et md5)."

# Export tronqué (S6) et export chiffré pour une autre clé : refusés, base inchangée.
head -c $((EXPORT_TAILLE - 100)) "$exports/$nom" >"$travail/tronque.dump.age"
if bash "$ICI/restaurer.sh" "$travail/tronque.dump.age" "$travail/cle-essai.txt" >/dev/null 2>&1; then
  export_arreter "un export tronqué a été accepté."
fi
if bash "$ICI/restaurer.sh" "$exports/$nom" "$travail/autre-cle.txt" >/dev/null 2>&1; then
  export_arreter "un export a été déchiffré avec une autre clé."
fi
bash "$ICI/empreintes.sh" >"$travail/apres-refus.txt"
diff -q "$travail/avant.txt" "$travail/apres-refus.txt" >/dev/null ||
  export_arreter "un export refusé a modifié la base."
echo "Refus : export tronqué et autre clé refusés, base inchangée."
rm -rf -- "$travail"
echo "Essai de l'export chiffré réussi."
