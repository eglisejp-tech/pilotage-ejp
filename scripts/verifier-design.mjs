// Garde-fous du design (proposition 19, décision T69 du 24 octobre 2026). Lancé par `npm run lint`
// après le contrôle des textes, donc en CI. Il refuse, dans le code de l'application (src, hors
// tests), ce que les fondations remplacent : tailles de texte et largeurs d'écran écrites à la
// main, phrase sous le titre trop large, survol presque invisible, listes et fenêtres recopiées,
// barres sur le bord d'un bloc, animations hors décision, arrondis.
//
// Le code d'avant les fondations en contient encore : scripts/design-plafonds.json fixe, fichier
// par fichier, le nombre qu'il contenait le 24 octobre 2026. Ce nombre peut baisser, jamais
// monter, et un nouveau fichier part de zéro. Quand un écran passe aux fondations, on baisse (ou
// on retire) sa ligne dans le fichier des plafonds. `node scripts/verifier-design.mjs --plafonds`
// affiche les nombres du moment, au format du fichier, sans rien écrire.
//
// Il vérifie aussi que les largeurs nommées de src/lib/largeurs.ts sont celles de src/index.css.
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REGLES = [
  {
    code: 'taille-ecrite',
    motif: /\btext-\[\d+(?:\.\d+)?px\]|\btext-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g,
    conseil:
      'une taille nommée par rôle : text-note, text-detail, text-interface, text-texte, text-citation, text-titre-point... (src/styles/fondations.css)',
  },
  {
    code: 'palier-ecrit',
    motif: /\b(?:min|max)-\[\d+px\]:|(?<![\w-])(?:max-)?(?:sm|md|lg|xl|2xl):/g,
    conseil:
      'une largeur nommée : tablette:, tablette-large:, ordinateur:, ordinateur-large:, grand-ecran: (et max-tablette:...), ou LARGEURS en JavaScript',
  },
  {
    code: 'largeur-phrase',
    motif: /\bmax-w-(?:\[720px\]|prose)(?![\w-])/g,
    conseil: 'max-w-lecture (environ 75 caractères), ou EnTetePage pour la phrase sous le titre',
  },
  {
    code: 'survol-pale',
    motif: /\bhover:bg-fond\b/g,
    conseil:
      'le Bouton commun (src/components/ui/Bouton.tsx) : retour visible au survol et à l’appui',
  },
  {
    code: 'liste-native',
    motif: /<select\b/g,
    conseil: 'ListeDeroulante (src/components/ui/ListeDeroulante.tsx)',
    permis: ['src/components/ui/ListeDeroulante.tsx'],
  },
  {
    code: 'fenetre-recopiee',
    motif: /role="(?:alert)?dialog"|<dialog\b/g,
    conseil:
      'FenetreConfirmation, ou useFenetreModale pour une fenêtre à champs (src/components/ui) ; PanneauSaisie pour un panneau',
    permis: ['src/components/ui/FenetreConfirmation.tsx'],
    fondation: /\buseFenetreModale\(/,
  },
  {
    code: 'barre-bord',
    motif: /\bborder-l-(?:\d|\[)/g,
    conseil: 'aucune barre de couleur sur le bord d’un bloc (BRIEF, section 10)',
  },
  {
    code: 'animation-ecrite',
    motif:
      /(?<![\w-])(?:transition(?:-[a-z]+)?|duration-\d+|delay-\d+|ease-(?:in|out|in-out|linear)|animate-[\w-]+|(?:[\w-]+:)*-?scale-[\w[\].]+)(?![\w-])/g,
    conseil:
      'seules les animations décidées existent (T50, T65, T69), dans src/index.css et src/styles/fondations.css',
    // T50 : le remplissage des cases du bandeau d'avancement et l'ouverture de son panneau.
    permis: [
      'src/features/avancement/BandeauAvancement.tsx',
      'src/features/avancement/SegmentsAvancement.tsx',
    ],
  },
  {
    code: 'arrondi',
    motif: /(?<![\w-])rounded(?:-[\w[\]]+)?(?![\w-])/g,
    conseil: 'angles droits partout (seul le bouton d’aide est rond, classe aide-forme)',
  },
]

/** Fichiers analysés : le code de l'application, sans les tests. */
export function estAnalyse(chemin) {
  const normalise = chemin.split(sep).join('/')
  if (!normalise.startsWith('src/')) return false
  if (!['.ts', '.tsx'].includes(extname(normalise))) return false
  if (/\.test\.tsx?$/.test(normalise) || normalise.startsWith('src/test/')) return false
  return true
}

/** Ligne de commentaire (`//`, `/*`, ` *`, `{/*`) : elle peut citer une ancienne valeur. */
function estCommentaire(ligne) {
  return /^\s*(?:\/\/|\/\*|\*|\{\/\*)/.test(ligne)
}

/** La ligne sans ses commentaires sur une ligne (`/* … *\/`, `{/* … *\/}`). */
function sansCommentaires(ligne) {
  return ligne.replace(/\{?\/\*.*?\*\/\}?/g, '')
}

/**
 * Nombre de motifs de chaque règle dans un fichier, et leurs lignes. Le composant de fondation
 * d'une règle (`permis`) en est exempté : c'est lui qui porte l'élément natif ; de même un fichier
 * qui se sert de la fondation (`fondation`, par exemple une fenêtre à champs sur useFenetreModale).
 */
export function compter(texte, fichier = '') {
  const resultat = {}
  const lignes = texte.split('\n')
  for (const regle of REGLES) {
    if (regle.permis?.includes(fichier)) continue
    if (regle.fondation?.test(texte)) continue
    const trouvees = []
    lignes.forEach((ligne, index) => {
      if (estCommentaire(ligne)) return
      const trouves = sansCommentaires(ligne).match(regle.motif)
      if (trouves) for (let i = 0; i < trouves.length; i++) trouvees.push(index + 1)
    })
    if (trouvees.length > 0) resultat[regle.code] = trouvees
  }
  return resultat
}

/**
 * Compare les nombres aux plafonds : un dépassement est une erreur. Les plafonds trop hauts (le
 * fichier a été migré) sont rendus à part, pour qu'on les baisse.
 */
export function comparer(comptes, plafonds) {
  const erreurs = []
  const aBaisser = []
  for (const regle of REGLES) {
    const limites = plafonds[regle.code] ?? {}
    for (const [fichier, lignes] of Object.entries(comptes)) {
      const trouves = lignes[regle.code] ?? []
      const limite = limites[fichier] ?? 0
      if (trouves.length > limite) {
        erreurs.push({ regle, fichier, nombre: trouves.length, limite, lignes: trouves })
      }
    }
    for (const [fichier, limite] of Object.entries(limites)) {
      const nombre = comptes[fichier]?.[regle.code]?.length ?? 0
      if (nombre < limite) aBaisser.push({ regle: regle.code, fichier, nombre, limite })
    }
  }
  return { erreurs, aBaisser }
}

/** Les largeurs de src/lib/largeurs.ts doivent être les variantes de src/index.css. */
export function verifierLargeurs(css, largeursTs) {
  const erreurs = []
  const ts = Array.from(largeursTs.matchAll(/^\s*([a-zA-Z]+): (\d+),$/gm), ([, nom, valeur]) => [
    nom.replace(/[A-Z]/g, (lettre) => `-${lettre.toLowerCase()}`),
    Number(valeur),
  ])
  if (ts.length === 0) erreurs.push('src/lib/largeurs.ts : aucune largeur lue.')
  for (const [nom, valeur] of ts) {
    if (!css.includes(`--breakpoint-${nom}: ${valeur}px;`)) {
      erreurs.push(`src/index.css : --breakpoint-${nom} devrait valoir ${valeur}px (LARGEURS).`)
    }
  }
  return erreurs
}

function parcourir(racine, dossier, fichiers) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name)
    if (entree.isDirectory()) parcourir(racine, chemin, fichiers)
    else {
      const relatif = relative(racine, chemin).split(sep).join('/')
      if (estAnalyse(relatif)) fichiers.push(relatif)
    }
  }
  return fichiers
}

export function lireComptes(racine) {
  const comptes = {}
  for (const fichier of parcourir(racine, join(racine, 'src'), []).sort()) {
    const trouves = compter(readFileSync(join(racine, fichier), 'utf8'), fichier)
    if (Object.keys(trouves).length > 0) comptes[fichier] = trouves
  }
  return comptes
}

function principal() {
  const racine = process.cwd()
  const comptes = lireComptes(racine)

  if (process.argv.includes('--plafonds')) {
    const regles = {}
    for (const regle of REGLES) {
      const parFichier = {}
      for (const [fichier, lignes] of Object.entries(comptes)) {
        if (lignes[regle.code]) parFichier[fichier] = lignes[regle.code].length
      }
      regles[regle.code] = parFichier
    }
    console.log(JSON.stringify(regles, null, 2))
    return
  }

  const plafonds = JSON.parse(readFileSync(join(racine, 'scripts', 'design-plafonds.json'), 'utf8'))
  const { erreurs, aBaisser } = comparer(comptes, plafonds.regles)
  const largeurs = verifierLargeurs(
    readFileSync(join(racine, 'src', 'index.css'), 'utf8'),
    readFileSync(join(racine, 'src', 'lib', 'largeurs.ts'), 'utf8'),
  )

  if (erreurs.length > 0 || largeurs.length > 0) {
    console.error(
      `Design : ce que les fondations remplacent revient (plafonds du ${plafonds.date}).`,
    )
    for (const { regle, fichier, nombre, limite, lignes } of erreurs) {
      console.error(
        `  ${fichier} (lignes ${lignes.join(', ')}) : ${regle.code}, ${nombre} au lieu de ${limite} au plus. Utilisez ${regle.conseil}.`,
      )
    }
    for (const erreur of largeurs) console.error(`  ${erreur}`)
    process.exit(1)
  }

  const restants = Object.values(comptes).reduce(
    (total, lignes) => total + Object.values(lignes).reduce((somme, l) => somme + l.length, 0),
    0,
  )
  console.log(
    `Design : rien de nouveau hors des fondations ; ${restants} anciennes valeurs restent à migrer (plafonds du ${plafonds.date}).`,
  )
  if (aBaisser.length > 0) {
    console.log('  Plafonds à baisser dans scripts/design-plafonds.json :')
    for (const { regle, fichier, nombre, limite } of aBaisser) {
      console.log(`  ${fichier} : ${regle}, ${limite} vers ${nombre}`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal()

export const CHEMIN_SCRIPT = fileURLToPath(import.meta.url)
