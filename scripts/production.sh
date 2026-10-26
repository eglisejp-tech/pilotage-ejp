#!/usr/bin/env bash
# Gestes de production confiés à Claude Code (accord de la personne du 26 octobre 2026, CLAUDE.md,
# docs/exploitation.md section 7) : migrations et Edge Functions, depuis le clone réservé relié au
# projet de production. Rien d'autre : aucune lecture de données, aucun secret, aucun lien.
# Le hook .claude/hooks/garde-production.sh n'accepte que les formes ci-dessous, seules dans la
# commande, et demande la confirmation de la personne pour « migrer » et « fonction ».
#
#   bash scripts/production.sh etat                 clone, version de la CLI, migrations appliquées
#   bash scripts/production.sh preparer <branche>   clone sur origin/<branche>, puis essai à blanc
#   bash scripts/production.sh migrer               applique les migrations listées par l'essai
#   bash scripts/production.sh fonction <nom>       déploie une Edge Function du clone
#   bash scripts/production.sh revenir              remet le clone sur main, à jour
#
# Chaque action vérifie d'abord le clone : projet relié attendu, aucune modification locale, CLI à
# la version du fichier package-lock.json. Au moindre écart, elle s'arrête sans rien lancer.
set -euo pipefail
export MSYS_NO_PATHCONV=1

CLONE="C:/Users/GraceManassePASSIDEM/dev/pilotage-ejp-deploiement"
PROJET="ugbitornbspatpcowlvg"
CLI="$CLONE/node_modules/.bin/supabase"

arreter() {
  echo "Arrêt : $1" >&2
  exit 1
}

verifier_clone() {
  [ -d "$CLONE/.git" ] || arreter "clone réservé introuvable ($CLONE)."
  local relie
  relie=$(cat "$CLONE/supabase/.temp/project-ref" 2>/dev/null || true)
  [ "$relie" = "$PROJET" ] || arreter "le clone n'est pas relié au projet de production attendu."
  [ -z "$(git -C "$CLONE" status --porcelain)" ] ||
    arreter "le clone a des modifications locales, rien n'est lancé."
}

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
    git -C "$CLONE" fetch --quiet origin
    decrire_clone
    mettre_cli_a_jour
    "$CLI" --workdir "$CLONE" migration list
    ;;
  preparer)
    [ $# -eq 2 ] || arreter "usage : preparer <branche>"
    [[ "$2" =~ ^(main|etape-[A-Za-z0-9][A-Za-z0-9._-]*)$ ]] || arreter "branche inattendue."
    verifier_clone
    git -C "$CLONE" fetch --quiet origin
    git -C "$CLONE" checkout --quiet --detach "origin/$2"
    decrire_clone
    mettre_cli_a_jour
    "$CLI" --workdir "$CLONE" db push --dry-run
    ;;
  migrer)
    [ $# -eq 1 ] || arreter "usage : migrer"
    verifier_clone
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
  revenir)
    [ $# -eq 1 ] || arreter "usage : revenir"
    verifier_clone
    git -C "$CLONE" fetch --quiet origin
    git -C "$CLONE" checkout --quiet main
    git -C "$CLONE" merge --quiet --ff-only origin/main
    decrire_clone
    mettre_cli_a_jour
    ;;
  *)
    arreter "action inconnue. Actions : etat, preparer <branche>, migrer, fonction <nom>, revenir."
    ;;
esac
