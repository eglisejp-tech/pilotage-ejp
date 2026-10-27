#!/usr/bin/env bash
# Hook PreToolUse (Bash) : les gestes de production de Claude passent par scripts/production.sh.
# La vérification est dans garde-production.mjs (même dossier), lancé ici par node.
#
# Accepté, seul dans la commande : bash scripts/production.sh etat | revenir | export
#   | preparer <branche>
# Soumis à confirmation de la personne, seul dans la commande (en plus de son accord écrit pour la
# mise en ligne, exigé par CLAUDE.md) : bash scripts/production.sh migrer | fonction <nom>
# Ces formes ne passent que si, dans le dossier de la commande, scripts/production.sh et chaque
# fichier de scripts/export/ sont, octet pour octet, les blobs de main (SHA lu par git ls-remote sur
# l'adresse officielle du dépôt, jamais dans les références locales), sans fichier en plus (suivi,
# ignoré ou non). Le hook réécrit alors la commande (updatedInput) : elle lance une copie extraite
# de ce SHA dans un dossier temporaire neuf, par /usr/bin/bash --noprofile --norc (T79).
# Accepté aussi : bash -n scripts/<fichier>.sh (contrôle de syntaxe, rien ne s'exécute).
# Refusé, après normalisation (guillemets et barres obliques inverses retirés) : toute autre forme
# qui cite le script avec une action ; bash, sh, source, . ou env qui vise un fichier de scripts/ ;
# un interpréteur ou un fichier .sh suivi d'une action (copie renommée, motif *, variable) ; une
# copie du script ; tout appel direct de la CLI Supabase vers un projet distant (db push, db dump,
# functions deploy, link, secrets, --workdir, --linked...), quel que soit son chemin ; déchiffrer
# un export (age -d, age --decrypt) ou créer une paire de clés (age-keygen), réservés à la
# personne. Les commandes locales passent.
# Ces gardes protègent contre une erreur, pas contre un agent qui chercherait à les contourner
# (docs/conception/export-chiffre.md, section 6).
# Échec fermé : si la vérification ne peut pas se faire, la commande est refusée (code 2).

bloquer() {
  echo "Bloqué : $1" >&2
  exit 2
}

command -v node >/dev/null 2>&1 ||
  bloquer "node est introuvable, impossible de vérifier la commande. Refusée par précaution."

# Dossier du hook, même appelé avec un chemin Windows (c:\...\garde-production.sh).
oblique='\'
source_hook=${BASH_SOURCE[0]//"$oblique"/\/}
case $source_hook in
  */*) ICI=${source_hook%/*} ;;
  *) ICI=. ;;
esac

MSYS_NO_PATHCONV=1 node "$ICI/garde-production.mjs"
code=$?
case $code in
  0 | 2) exit "$code" ;;
  *) bloquer "vérification impossible (code $code), commande refusée par précaution." ;;
esac
