#!/usr/bin/env bash
# Hook PreToolUse (Edit, Write) : bloque l'écriture dans les fichiers sensibles.
# Protégés : fichiers .env (sauf .env.example), .git/, supabase/.temp/, package-lock.json
# et les migrations déjà suivies par git (git ls-files). Une migration neuve, créée par
# « npx supabase migration new nom » et pas encore commitée, reste modifiable.
# L'entrée JSON se lit avec node (jq n'est pas requis). Échec fermé : si le hook ne peut
# pas décider, il refuse l'écriture (code 2) avec un message clair.

bloquer() {
  echo "Bloqué : $1" >&2
  exit 2
}

command -v node >/dev/null 2>&1 ||
  bloquer "node est introuvable, impossible de vérifier le fichier. Écriture refusée par précaution."

# node lit l'entrée du hook sur stdin et écrit le chemin relatif à la racine du projet,
# avec des barres obliques. Code 3 : entrée illisible ou sans chemin de fichier.
LIRE_CHEMIN='
const path = require("node:path");
const versNatif = (p) =>
  process.platform === "win32" && /^\/[a-zA-Z]\//.test(p) ? p[1] + ":" + p.slice(2) : p;
let texte = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (morceau) => (texte += morceau));
process.stdin.on("end", () => {
  try {
    const entree = JSON.parse(texte);
    const brut = entree && entree.tool_input && entree.tool_input.file_path;
    if (typeof brut !== "string" || brut.trim() === "") process.exit(3);
    const racine = path.resolve(versNatif(process.env.CLAUDE_PROJECT_DIR || entree.cwd || process.cwd()));
    const relatif = path.relative(racine, path.resolve(racine, versNatif(brut)));
    process.stdout.write(relatif.split(path.sep).join("/"));
  } catch {
    process.exit(3);
  }
});
'

RELATIF=$(MSYS_NO_PATHCONV=1 node -e "$LIRE_CHEMIN") ||
  bloquer "entrée du hook illisible ou sans chemin de fichier. Écriture refusée par précaution."
[ -n "$RELATIF" ] || bloquer "chemin de fichier vide. Écriture refusée par précaution."

NOM="${RELATIF##*/}"

case "$NOM" in
  .env.example) ;;
  .env | .env.*) bloquer "$RELATIF contient des secrets (seul .env.example se modifie)." ;;
  package-lock.json) bloquer "package-lock.json se modifie seulement par npm install." ;;
esac

case "/$RELATIF/" in
  */.git/*) bloquer "$RELATIF est dans .git/, qui ne se modifie pas à la main." ;;
esac

case "$RELATIF" in
  supabase/.temp | supabase/.temp/*)
    bloquer "$RELATIF appartient à la CLI Supabase (supabase/.temp/)."
    ;;
  supabase/migrations/*)
    command -v git >/dev/null 2>&1 ||
      bloquer "git est introuvable, impossible de vérifier la migration $RELATIF."
    RACINE="${CLAUDE_PROJECT_DIR:-.}"
    git -C "$RACINE" rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
      bloquer "impossible de lire l'état git du projet, migration $RELATIF non vérifiée."
    if git -C "$RACINE" ls-files --error-unmatch -- "$RELATIF" >/dev/null 2>&1; then
      bloquer "$RELATIF est déjà suivie par git : une migration commitée ne se modifie pas. Crée une nouvelle migration avec « npx supabase migration new nom »."
    fi
    ;;
esac

exit 0
