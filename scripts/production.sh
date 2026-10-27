#!/usr/bin/env bash
# Gestes de production confiés à Claude Code (accords de la personne du 26 octobre 2026, CLAUDE.md,
# docs/exploitation.md sections 7 et 9) : migrations, Edge Functions et export hebdomadaire chiffré
# (T79), depuis le clone réservé relié au projet de production. Rien d'autre : aucun secret, aucun
# lien, et aucune donnée lisible par Claude (l'export est chiffré pour une clé dont la partie
# privée est au coffre de la personne).
# Le hook .claude/hooks/garde-production.sh n'accepte que les formes ci-dessous, seules dans la
# commande, avec ce script identique à celui de main (SHA lu sur l'adresse officielle du dépôt),
# lance à la place une copie extraite de ce SHA, et demande la confirmation de la personne pour
# « migrer » et « fonction ».
#
#   bash scripts/production.sh etat                 clone, version de la CLI, migrations appliquées
#   bash scripts/production.sh preparer <branche>   clone sur la branche, puis essai à blanc
#   bash scripts/production.sh export               export chiffré de la base (section 9.2)
#   bash scripts/production.sh migrer               applique les migrations listées par l'essai,
#                                                   seulement après un export du jour (Paris)
#   bash scripts/production.sh fonction <nom>       déploie une Edge Function du clone
#   bash scripts/production.sh revenir              remet le clone sur main, à jour
#
# Le script se relance d'abord sous env -i (PATH fixé, sans ~/bin ; seules les variables de
# EXPORT_VARIABLES_GARDEES), par /usr/bin/bash --noprofile --norc : aucune trace héritée (-x,
# SHELLOPTS, BASH_ENV, profil) ne peut afficher le mot de passe temporaire de l'export.
# Chaque action vérifie ensuite le clone : projet relié attendu, aucune modification locale, CLI à
# la version du fichier package-lock.json. Les branches viennent de l'adresse officielle du dépôt,
# jamais du « origin » du clone. Au moindre écart, l'action s'arrête sans rien lancer.
set +xv

ICI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && { pwd -W 2>/dev/null || pwd; })
# shellcheck source=scripts/export/commun.sh
source "$ICI/export/commun.sh"
CHEMIN_PROPRE="/usr/bin:/mingw64/bin:/c/Program Files/nodejs:/c/WINDOWS/system32:/c/WINDOWS"
export_relancer_propre "$CHEMIN_PROPRE" "$ICI/production.sh" "$@"

set -euo pipefail
umask 077
export MSYS_NO_PATHCONV=1

CLONE="C:/Users/GraceManassePASSIDEM/dev/pilotage-ejp-deploiement"
PROJET="ugbitornbspatpcowlvg"
CLI="$CLONE/node_modules/.bin/supabase"
DEPOT_OFFICIEL="https://github.com/eglisejp-tech/pilotage-ejp.git"
# Exports chiffrés (28 jours) et binaires portables d'age et de pg_dump : hors de tout dépôt.
EXPORTS="C:/Users/GraceManassePASSIDEM/exports-ejp"
OUTILS="C:/Users/GraceManassePASSIDEM/outils"

arreter() {
  echo "Arrêt : $1" >&2
  exit 1
}

if [ -f "$ICI/../COPIE-DE-MAIN" ]; then
  echo "Script : copie de main $(head -c 12 "$ICI/../COPIE-DE-MAIN") extraite par le hook."
else
  echo "Script : $ICI/production.sh (lancé sans la copie du hook)."
fi

verifier_clone() {
  [ -d "$CLONE/.git" ] || arreter "clone réservé introuvable ($CLONE)."
  local relie
  relie=$(cat "$CLONE/supabase/.temp/project-ref" 2>/dev/null || true)
  [ "$relie" = "$PROJET" ] || arreter "le clone n'est pas relié au projet de production attendu."
  [ -z "$(git -C "$CLONE" status --porcelain)" ] ||
    arreter "le clone a des modifications locales, rien n'est lancé."
}

# Branche $1 récupérée depuis l'adresse officielle, jamais le « origin » du clone ; affiche son SHA.
recuperer() { export_recuperer "$CLONE" "$DEPOT_OFFICIEL" "$1"; }

# npm ci seulement si la CLI installée n'est pas celle du package-lock.json de la version visée.
mettre_cli_a_jour() {
  local attendue installee
  attendue=$(node -p "require('$CLONE/package-lock.json').packages['node_modules/supabase'].version")
  installee=$("$CLI" --version 2>/dev/null | head -n 1 || true)
  if [ "$installee" != "$attendue" ]; then
    echo "CLI Supabase ${installee:-absente}, attendue $attendue : npm ci dans le clone."
    (cd "$CLONE" && npm ci --no-audit --no-fund --loglevel=error)
  fi
  echo "CLI Supabase $("$CLI" --version 2>/dev/null | head -n 1)"
}

decrire_clone() {
  echo "Clone : $(git -C "$CLONE" rev-parse --abbrev-ref HEAD), $(git -C "$CLONE" log --oneline -1)"
}

action="${1:-}"
case "$action" in
  etat)
    [ $# -eq 1 ] || arreter "usage : etat"
    verifier_clone
    recuperer main >/dev/null
    decrire_clone
    mettre_cli_a_jour
    "$CLI" --workdir "$CLONE" migration list
    ;;
  preparer)
    [ $# -eq 2 ] || arreter "usage : preparer <branche>"
    [[ "$2" =~ ^(main|etape-[A-Za-z0-9][A-Za-z0-9._-]*)$ ]] || arreter "branche inattendue."
    verifier_clone
    sha=$(recuperer "$2")
    git -C "$CLONE" checkout --quiet --detach "$sha"
    decrire_clone
    mettre_cli_a_jour
    "$CLI" --workdir "$CLONE" db push --dry-run
    ;;
  migrer)
    [ $# -eq 1 ] || arreter "usage : migrer"
    verifier_clone
    # Règle 8 de la section 7.1 (T79, Q6) : un export complet du jour, heure de Paris (fiche,
    # taille, en-tête d'age et empreinte de la fiche contrôlés).
    export_existe_aujourdhui "$EXPORTS" ||
      arreter "aucun export complet aujourd'hui (heure de Paris) dans $EXPORTS : lancer d'abord l'action export. Une exception passe par la personne, à la main (docs/exploitation.md, 7.3)."
    decrire_clone
    mettre_cli_a_jour
    "$CLI" --workdir "$CLONE" db push --yes
    "$CLI" --workdir "$CLONE" migration list
    ;;
  fonction)
    [ $# -eq 2 ] || arreter "usage : fonction <nom>"
    [[ "$2" =~ ^[a-z][a-z0-9-]*$ ]] && [ -f "$CLONE/supabase/functions/$2/index.ts" ] ||
      arreter "fonction inconnue dans le clone."
    verifier_clone
    decrire_clone
    mettre_cli_a_jour
    "$CLI" --workdir "$CLONE" functions deploy "$2" --use-api
    ;;
  export)
    [ $# -eq 1 ] || arreter "usage : export"
    verifier_clone
    main_sha=$(recuperer main)
    mettre_cli_a_jour
    # 1. Option A (docs/conception/export-chiffre.md, 4.3) : l'essai à blanc de la CLI donne les
    #    identifiants temporaires du rôle de connexion. Sa sortie contient un mot de passe : elle
    #    reste dans une variable, jamais affichée, jamais écrite.
    set +e
    sortie=$("$CLI" --workdir "$CLONE" db dump --linked --dry-run --data-only -s public 2>&1)
    code=$?
    set -e
    if [ "$code" -ne 0 ]; then
      docker_demande=non
      if [[ ${sortie,,} == *docker* ]]; then docker_demande=oui; fi
      sortie=""
      [ "$docker_demande" = non ] ||
        arreter "la CLI demande Docker pour l'essai à blanc (sortie non affichée) : option B nécessaire (docs/conception/export-chiffre.md, 4.3)."
      arreter "l'essai à blanc de la CLI a échoué (code $code, sortie non affichée). Vérifier la connexion avec l'action etat ; si l'échec persiste : option B (docs/conception/export-chiffre.md, 4.3)."
    fi
    export_lire_identifiants "$sortie"
    sortie=""
    echo "Essai à blanc : identifiants temporaires lus (option A), jamais affichés."
    # 2. Clé publique du main officiel (jamais d'une branche), outils du poste aux empreintes
    #    épinglées, mode TLS, nom daté à l'heure de Paris.
    cle=$(export_lire_cle "$(git -C "$CLONE" show "$main_sha:scripts/export/destinataires.txt" 2>/dev/null || true)")
    export_outils_poste "$OUTILS"
    version_age=$(export_verifier_age "$EXPORT_AGE")
    version_pg_dump=$(export_verifier_pg_dump "$EXPORT_PG_DUMP" "$(export_majeure_base "$CLONE")")
    export_mode_ssl "$ICI/export/supabase-ca.crt"
    mkdir -p "$EXPORTS"
    export_nettoyer_partiels "$EXPORTS"
    nom="ejp-$(export_date_paris).dump.age"
    # 3. pg_dump vers age, en flux : le clair ne touche jamais le disque.
    export_flux "$EXPORTS" "$nom" "$cle" "$EXPORT_PG_DUMP" "$EXPORT_AGE"
    export_effacer_identifiants
    # 4. Fiche sans donnée, purge des exports de plus de 28 jours, résumé de sept lignes (clé
    #    publique entière).
    derniere=$(export_derniere_migration "$("$CLI" --workdir "$CLONE" migration list 2>&1 || true)")
    export_ecrire_fiche "$EXPORTS" "$nom" "$cle" "$(git -C "$CLONE" rev-parse --short "$main_sha")" \
      "$derniere" "$version_pg_dump" "$version_age" "$("$CLI" --version 2>/dev/null | head -n 1)"
    export_purger "$EXPORTS"
    export_resume "$nom" "$cle" "$derniere"
    ;;
  revenir)
    [ $# -eq 1 ] || arreter "usage : revenir"
    verifier_clone
    sha=$(recuperer main)
    git -C "$CLONE" checkout --quiet main
    git -C "$CLONE" merge --quiet --ff-only "$sha"
    decrire_clone
    mettre_cli_a_jour
    ;;
  *)
    arreter "action inconnue. Actions : etat, preparer <branche>, export, migrer, fonction <nom>, revenir."
    ;;
esac
