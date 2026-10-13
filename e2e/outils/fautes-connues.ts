import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'

// Fautes d'accessibilité déjà décrites dans docs/conception/audit-etape-7.md (plan de l'étape 7,
// lot F2). Une faute connue ne fait pas rougir la CI, mais elle ne masque que ses propres lignes :
// chaque entrée nomme les lignes de `ciblesTropPetites` qu'elle produit (par leur début, par
// exemple « a « FIJ » »). Ces lignes sont retirées du contrôle des cibles et notées en annotation
// du test (« faute connue »). Tout le reste de l'écran (axe, structure, clavier, défilement, autres
// cibles) reste strict : une faute nouvelle sur le même écran fait échouer le test.
//
// Clé : le nom de l'écran dans le catalogue de e2e/accessibilite.spec.ts (aperçus), ou
// « profil | adresse » (audit avec la base, e2e/base/accessibilite.spec.ts).
// `projets` limite la faute à certains formats (ordinateur, tablette, telephone) ; sans lui, elle
// vaut pour les trois.
// `tantQue` retire la faute dès que le code visé porte une largeur minimale : le lot F3 corrige
// l'écran, la condition devient fausse, et le contrôle reste dans la suite pour garder la
// correction. La personne qui corrige retire ensuite l'entrée.

export type FauteConnue = {
  /** Identifiant de la ligne dans l'audit (colonne « Ligne » du tableau des fautes). */
  ligne: string
  projets?: readonly string[]
  /** Début des lignes de `ciblesTropPetites` que la faute produit. */
  cibles: readonly string[]
  tantQue?: () => boolean
}

/** Racine du dépôt, résolue depuis ce fichier : les tests peuvent se lancer de n'importe où. */
const RACINE = fileURLToPath(new URL('../../', import.meta.url))

const LARGEUR_MINIMALE = /min-w-cible|min-w-\[44px\]/

/**
 * Vrai tant que le texte visé du fichier (le premier groupe de `ancre`, une chaîne de classes) ne
 * porte pas de largeur minimale de 44 px. Fichier illisible ou ancre introuvable : l'écran a été
 * refait, la faute n'est plus masquée (faux), et la suite redevient stricte.
 */
export function classeSansLargeurMinimale(fichier: string, ancre: RegExp): boolean {
  let code: string
  try {
    code = readFileSync(join(RACINE, fichier), 'utf8')
  } catch {
    return false
  }
  const classes = ancre.exec(code)?.[1]
  return classes !== undefined && !LARGEUR_MINIMALE.test(classes)
}

/** Le lien du nom d'un ministère dans la liste des indicateurs : `to={ligne.href} className="..."`. */
const LIEN_LIGNE = /to=\{ligne\.href\}\s+className="([^"]*)"/

function lienIndicateursEnFaute(): boolean {
  return (
    classeSansLargeurMinimale(
      'src/features/indicateurs/configuration/TableauIndicateurs.tsx',
      LIEN_LIGNE,
    ) ||
    classeSansLargeurMinimale(
      'src/features/indicateurs/configuration/ListeIndicateursTelephone.tsx',
      LIEN_LIGNE,
    )
  )
}

// A-02 : le lien du nom d'un ministère court (« Kumi » dans les aperçus, « FIJ » dans le jeu
// d'exemple de la base) est plus étroit que 44 px dans la liste des indicateurs (tableau et liste du
// téléphone) : `min-h-cible` fixe la hauteur, pas la largeur. Écran du lot L3b, à corriger après sa
// fusion (A-03 et A-04, corrigées par le lot F3, n'ont plus d'entrée : ces écrans sont stricts).
const A02 = { ligne: 'A-02', tantQue: lienIndicateursEnFaute } as const

export const FAUTES_CONNUES: Readonly<Record<string, FauteConnue>> = {
  'indicateurs liste': { ...A02, cibles: ['a « Kumi »'] },
  'indicateurs liste ejp-tech': { ...A02, cibles: ['a « Kumi »'] },
  'admin_eglise | /indicateurs': { ...A02, cibles: ['a « FIJ »'] },
  'admin_plateforme | /indicateurs': { ...A02, cibles: ['a « FIJ »'] },
}

/** Sépare les lignes de cibles que la faute connue de l'écran explique de celles qui restent. */
export function separerCiblesConnues(
  cle: string,
  projet: string,
  lignes: readonly string[],
  fautes: Readonly<Record<string, FauteConnue>> = FAUTES_CONNUES,
): { restantes: string[]; connues: string[]; ligne: string | null } {
  const faute = fautes[cle]
  const concernee =
    faute !== undefined &&
    (faute.projets ?? [projet]).includes(projet) &&
    (faute.tantQue?.() ?? true)
  if (!concernee) return { restantes: [...lignes], connues: [], ligne: null }
  const expliquee = (texte: string) => faute.cibles.some((debut) => texte.startsWith(debut))
  return {
    restantes: lignes.filter((texte) => !expliquee(texte)),
    connues: lignes.filter(expliquee),
    ligne: faute.ligne,
  }
}

/**
 * Les cibles trop petites de l'écran, sans celles d'une faute connue. Dans un test : le projet
 * vient du test en cours, et les lignes retirées s'ajoutent à ses annotations.
 */
export function ciblesHorsFautesConnues(cle: string, lignes: readonly string[]): string[] {
  const info = test.info()
  const { restantes, connues, ligne } = separerCiblesConnues(cle, info.project.name, lignes)
  for (const texte of connues) {
    info.annotations.push({
      type: 'faute connue',
      description: `${ligne} (docs/conception/audit-etape-7.md) : ${texte}`,
    })
  }
  return restantes
}
