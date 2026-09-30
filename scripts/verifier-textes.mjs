// Vérifie qu'aucun tiret cadratin (U+2014) ni demi-cadratin (U+2013) n'apparaît dans le code et
// les documents du projet (CLAUDE.md, « Textes de l'interface »). Lancé par `npm run lint` et en CI.
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const racine = process.cwd()
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.md', '.sql'])
const dossiersIgnores = new Set([
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.git',
  '.temp',
])
// Références figées : elles ne sont pas réécrites.
const cheminsIgnores = [join('docs', 'reference')]
const tirets = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

function parcourir(dossier, fichiers) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name)
    const relatif = relative(racine, chemin)
    if (cheminsIgnores.some((ignore) => relatif.startsWith(ignore))) continue
    if (entree.isDirectory()) {
      if (!dossiersIgnores.has(entree.name)) parcourir(chemin, fichiers)
    } else if (extensions.has(extname(entree.name))) {
      fichiers.push(chemin)
    }
  }
  return fichiers
}

const erreurs = []
for (const fichier of parcourir(racine, [])) {
  readFileSync(fichier, 'utf8')
    .split('\n')
    .forEach((ligne, index) => {
      if (tirets.test(ligne)) erreurs.push(`${relative(racine, fichier)}:${index + 1}`)
    })
}

if (erreurs.length > 0) {
  console.error(
    'Tiret cadratin ou demi-cadratin trouvé (utiliser virgule, deux-points, parenthèses ou point) :',
  )
  for (const erreur of erreurs) console.error(`  ${erreur}`)
  process.exit(1)
}
console.log('Textes : aucun tiret cadratin ni demi-cadratin.')
