#!/usr/bin/env bash
# Hook PreToolUse (Bash) : les gestes de production de Claude passent par scripts/production.sh.
# Accepté, seul dans la commande : bash scripts/production.sh etat | revenir | export
#   | preparer <branche>
# Soumis à confirmation de la personne, seul dans la commande (en plus de son accord écrit pour la
# mise en ligne, exigé par CLAUDE.md) : bash scripts/production.sh migrer | fonction <nom>
# Ces formes ne passent que si scripts/production.sh et scripts/export/ sont, dans le dossier de la
# commande, identiques à origin/main (aucune différence, aucun fichier nouveau) : le script lancé
# est celui de main (T77).
# Refusé : toute autre forme du script ; tout appel direct de la CLI Supabase vers un projet
# distant (db push, db dump, functions deploy, link, secrets, --workdir, --linked...), quel que
# soit le chemin de la CLI (npx, node_modules/.bin, supabase.exe) ; déchiffrer un export
# (age -d, age --decrypt) ou créer une paire de clés (age-keygen), réservés à la personne (T77).
# Les commandes locales passent.
# L'entrée JSON se lit avec node (jq n'est pas requis). Échec fermé : si le hook ne peut pas
# lire la commande, il la refuse (code 2) avec un message clair.

bloquer() {
  echo "Bloqué : $1" >&2
  exit 2
}

command -v node >/dev/null 2>&1 ||
  bloquer "node est introuvable, impossible de vérifier la commande. Refusée par précaution."

# Code 0 : commande sans geste de production, ou lecture acceptée. Code 5 : écriture en production,
# à confirmer. Code 4 : refusée. Code 3 : entrée illisible. Code 6 : script différent de
# origin/main. Code 7 : déchiffrement ou création de clé age.
VERIFIER='
const { execFileSync } = require("node:child_process");
let texte = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (morceau) => (texte += morceau));
process.stdin.on("end", () => {
  let entree;
  try {
    entree = JSON.parse(texte);
  } catch {
    process.exit(3);
  }
  const commande = entree && entree.tool_input && entree.tool_input.command;
  if (typeof commande !== "string") process.exit(3);
  const dossier =
    (typeof entree.cwd === "string" && entree.cwd) || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  // Le script et ses fonctions doivent être ceux de origin/main, dans le dossier de la commande.
  const identiqueAMain = () => {
    try {
      execFileSync(
        "git",
        ["-C", dossier, "diff", "--quiet", "origin/main", "--", "scripts/production.sh", "scripts/export"],
        { stdio: "ignore" },
      );
      const nouveaux = execFileSync(
        "git",
        ["-C", dossier, "ls-files", "--others", "--exclude-standard", "--", "scripts/export"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      return nouveaux.trim() === "";
    } catch {
      return false;
    }
  };
  const brute = commande.trim();
  const lecture =
    /^bash scripts\/production\.sh (etat|revenir|export|preparer (main|etape-[A-Za-z0-9][A-Za-z0-9._-]*))$/;
  const ecriture = /^bash scripts\/production\.sh (migrer|fonction [a-z][a-z0-9-]*)$/;
  if (lecture.test(brute) || ecriture.test(brute)) {
    if (!identiqueAMain()) process.exit(6);
    process.exit(lecture.test(brute) ? 0 : 5);
  }
  // Le script cité sans action (git add, git diff, bash -n) passe ; lancé autrement, il est refusé.
  if (/production\.sh/.test(commande) && /\b(etat|preparer|migrer|fonction|revenir)\b/.test(commande))
    process.exit(4);
  // « export » compte seulement juste après le nom du script : le dossier scripts/export/ et la
  // commande export du shell ne sont pas des gestes de production.
  if (/production\.sh["\x27]?\s+["\x27]?export\b/.test(commande)) process.exit(4);
  // Déchiffrer un export ou créer une paire de clés age : réservé à la personne (T77).
  const dechiffrer = /(^|[\s;&|(\/\\"\x27])age(\.exe)?["\x27]?\s+([^;&|]*\s)?(-d|--decrypt)\b/;
  const creerCle = /(^|[\s;&|(\/\\"\x27])age-keygen(\.exe)?\b/;
  if (dechiffrer.test(commande) || creerCle.test(commande)) process.exit(7);
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
  4) bloquer "les gestes de production passent par « bash scripts/production.sh <action> », seul dans la commande (etat, preparer <branche>, export, migrer, fonction <nom>, revenir). Les appels directs de la CLI Supabase vers un projet distant restent refusés." ;;
  6) bloquer "scripts/production.sh ou scripts/export/ diffère de origin/main dans ce dossier (ou origin/main est introuvable). Le script lancé doit être celui de main : travailler depuis un dossier à jour de origin/main (T77)." ;;
  7) bloquer "déchiffrer un export ou créer une paire de clés age est réservé à la personne responsable (T77) : la clé privée ne vient jamais sur ce poste." ;;
  *) bloquer "entrée du hook illisible, impossible de vérifier la commande. Refusée par précaution." ;;
esac
