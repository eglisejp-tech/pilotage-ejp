#!/usr/bin/env bash
# Hook PreToolUse (Bash) : Claude pousse les branches d'étape, et main seulement avec accord.
# Accepté, seul dans la commande : git push [-u|--set-upstream] origin etape-<nom>
# Soumis à confirmation de la personne, seul dans la commande : git push origin main
# (en plus de son accord écrit dans la conversation, exigé par CLAUDE.md).
# Tout autre push est refusé : push forcé, refspec détourné (etape-2:main), plusieurs
# branches, --all, --mirror, --tags, --delete, git -C ... push, push enchaîné après une autre
# commande.
# L'entrée JSON se lit avec node (jq n'est pas requis). Échec fermé : si le hook ne peut pas
# lire la commande, il la refuse (code 2) avec un message clair.

bloquer() {
  echo "Bloqué : $1" >&2
  exit 2
}

command -v node >/dev/null 2>&1 ||
  bloquer "node est introuvable, impossible de vérifier la commande. Refusée par précaution."

# Code 0 : pas de git push dans la commande, ou push d'une branche d'étape accepté.
# Code 5 : push de main, à confirmer. Code 4 : git push refusé. Code 3 : entrée illisible.
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
  const contientPush =
    /(^|[\s;&|(`$])git(\.exe)?(\s+(-C|-c|--git-dir|--work-tree|--namespace)(\s+|=)\S+|\s+--?[A-Za-z][A-Za-z-]*)*\s+push(\s|$|[;&|)])/.test(
      commande,
    );
  if (!contientPush) process.exit(0);
  if (/^git push origin main$/.test(commande.trim())) process.exit(5);
  const accepte = /^git push( -u| --set-upstream)? origin etape-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(
    commande.trim(),
  );
  process.exit(accepte ? 0 : 4);
});
'

MSYS_NO_PATHCONV=1 node -e "$VERIFIER"
case $? in
  0) exit 0 ;;
  5)
    # Confirmation demandée à la personne, même si une règle autorise la commande.
    printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Push de main : à confirmer, seulement après votre accord écrit dans la conversation."}}'
    exit 0
    ;;
  4) bloquer "seuls « git push -u origin etape-<nom> » et, après accord écrit de la personne, « git push origin main » sont permis, seuls dans la commande. Push forcé, refspec (a:b), plusieurs branches, --all, --tags et --delete restent refusés." ;;
  *) bloquer "entrée du hook illisible, impossible de vérifier la commande. Refusée par précaution." ;;
esac
