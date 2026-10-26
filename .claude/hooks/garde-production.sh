#!/usr/bin/env bash
# Hook PreToolUse (Bash) : les gestes de production de Claude passent par scripts/production.sh.
# Accepté, seul dans la commande : bash scripts/production.sh etat | revenir | preparer <branche>
# Soumis à confirmation de la personne, seul dans la commande (en plus de son accord écrit pour la
# mise en ligne, exigé par CLAUDE.md) : bash scripts/production.sh migrer | fonction <nom>
# Refusé : toute autre forme du script, et tout appel direct de la CLI Supabase vers un projet
# distant (db push, functions deploy, link, secrets, --workdir, --linked...), quel que soit le
# chemin de la CLI (npx, node_modules/.bin, supabase.exe). Les commandes locales passent.
# L'entrée JSON se lit avec node (jq n'est pas requis). Échec fermé : si le hook ne peut pas
# lire la commande, il la refuse (code 2) avec un message clair.

bloquer() {
  echo "Bloqué : $1" >&2
  exit 2
}

command -v node >/dev/null 2>&1 ||
  bloquer "node est introuvable, impossible de vérifier la commande. Refusée par précaution."

# Code 0 : commande sans geste de production, ou lecture acceptée. Code 5 : écriture en production,
# à confirmer. Code 4 : refusée. Code 3 : entrée illisible.
VERIFIER='
let texte = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (morceau) => (texte += morceau));
process.stdin.on("end", () => {
  let commande;
  try {
    commande = JSON.parse(texte).tool_input.command;
  } catch {
    process.exit(3);
  }
  if (typeof commande !== "string") process.exit(3);
  const brute = commande.trim();
  const lecture =
    /^bash scripts\/production\.sh (etat|revenir|preparer (main|etape-[A-Za-z0-9][A-Za-z0-9._-]*))$/;
  const ecriture = /^bash scripts\/production\.sh (migrer|fonction [a-z][a-z0-9-]*)$/;
  if (lecture.test(brute)) process.exit(0);
  if (ecriture.test(brute)) process.exit(5);
  // Le script cité sans action (git add, git diff, bash -n) passe ; lancé autrement, il est refusé.
  if (/production\.sh/.test(commande) && /\b(etat|preparer|migrer|fonction|revenir)\b/.test(commande))
    process.exit(4);
  const appelCli = /(^|[\s;&|(\/\\])supabase(\.exe|\.cmd)?\s/;
  const distant =
    /\b(db\s+(push|pull|dump)|functions\s+(deploy|delete|download)|link|unlink|login|secrets|config\s+push|migration\s+(repair|fetch|list|squash)|projects|orgs|branches|inspect|storage|backups|sso|domains)\b|--(workdir|linked|db-url|project-ref|project-id)\b/;
  if (appelCli.test(commande) && distant.test(commande)) process.exit(4);
  process.exit(0);
});
'

MSYS_NO_PATHCONV=1 node -e "$VERIFIER"
case $? in
  0) exit 0 ;;
  5)
    # Confirmation demandée à la personne, même si une règle autorise la commande.
    printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Écriture en production (migration ou Edge Function) : à confirmer, seulement après votre accord écrit pour cette mise en ligne."}}'
    exit 0
    ;;
  4) bloquer "les gestes de production passent par « bash scripts/production.sh <action> », seul dans la commande (etat, preparer <branche>, migrer, fonction <nom>, revenir). Les appels directs de la CLI Supabase vers un projet distant restent refusés." ;;
  *) bloquer "entrée du hook illisible, impossible de vérifier la commande. Refusée par précaution." ;;
esac
