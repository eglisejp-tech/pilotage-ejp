#!/usr/bin/env bash
# Hook PostToolUse (Edit, Write) : formate le fichier modifié avec le Prettier du projet
# (jamais une version téléchargée), puis refuse les tirets cadratin et demi-cadratin.
# L'entrée JSON se lit avec node (jq n'est pas requis). Échec fermé : si l'entrée est
# illisible, le hook le signale à Claude (code 2) au lieu de laisser passer en silence.

signaler() {
  echo "$1" >&2
  exit 2
}

command -v node >/dev/null 2>&1 || signaler "Hook de format : node est introuvable, fichier non vérifié."

# node lit l'entrée du hook sur stdin et écrit le chemin absolu du fichier, avec des
# barres obliques. Code 3 : entrée illisible ou sans chemin de fichier.
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
    process.stdout.write(path.resolve(racine, versNatif(brut)).split(path.sep).join("/"));
  } catch {
    process.exit(3);
  }
});
'

# Écrit les numéros des lignes qui contiennent un tiret cadratin (U+2014) ou demi-cadratin (U+2013).
CHERCHER_TIRETS='
const fs = require("node:fs");
const tirets = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
const fautives = [];
fs.readFileSync(process.argv[1], "utf8")
  .split(/\r?\n/)
  .forEach((ligne, i) => {
    if (tirets.test(ligne)) fautives.push(i + 1);
  });
process.stdout.write(fautives.join(", "));
'

FICHIER=$(MSYS_NO_PATHCONV=1 node -e "$LIRE_CHEMIN") ||
  signaler "Hook de format : entrée du hook illisible ou sans chemin de fichier, fichier non vérifié."

# Fichier supprimé ou déplacé entre-temps : rien à vérifier.
[ -f "$FICHIER" ] || exit 0

RACINE="${CLAUDE_PROJECT_DIR:-.}"
PRETTIER="$RACINE/node_modules/prettier/bin/prettier.cjs"

case "$FICHIER" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.css | *.json | *.md | *.yml | *.yaml | *.html)
    # Prettier respecte .prettierignore : un fichier ignoré (docs/reference) reste tel quel.
    # Sans node_modules (avant npm ci), rien n'est téléchargé : le format se vérifie en CI.
    if [ -f "$PRETTIER" ]; then
      SORTIE=$(MSYS_NO_PATHCONV=1 node "$PRETTIER" --write --log-level warn "$FICHIER" 2>&1) ||
        signaler "Prettier n'a pas pu formater $FICHIER : $SORTIE"
    fi
    ;;
esac

case "$FICHIER" in
  *.ts | *.tsx | *.js | *.mjs | *.css | *.md | *.sql | *.html)
    FAUTIVES=$(MSYS_NO_PATHCONV=1 node -e "$CHERCHER_TIRETS" "$FICHIER") ||
      signaler "Hook de format : lecture impossible de $FICHIER, tirets non vérifiés."
    if [ -n "$FAUTIVES" ]; then
      signaler "Règle de style : $FICHIER contient un tiret cadratin ou demi-cadratin (lignes $FAUTIVES). Remplace-le par une virgule, deux-points, parenthèses ou un point."
    fi
    ;;
esac

exit 0
