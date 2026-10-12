import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'

// Fautes d'accessibilité déjà décrites dans docs/conception/audit-etape-7.md (plan de l'étape 7,
// lot F2). Un contrôle qui échoue pour une faute connue ne fait pas rougir la CI : il est marqué
// `test.fail()` avec la ligne de l'audit. Quand le lot F3 corrige l'écran, le contrôle réussit,
// `test.fail()` le fait alors échouer (« attendu en échec, mais réussi »), et la personne qui
// corrige retire l'entrée ci-dessous : le contrôle reste dans la suite et garde la correction.
//
// Clé : le nom de l'écran dans le catalogue de e2e/accessibilite.spec.ts (aperçus), ou
// « profil | adresse » (audit avec la base, e2e/base/accessibilite.spec.ts). Un test couvre tous
// les contrôles d'un écran : la faute marque l'écran entier, la ligne de l'audit dit lequel.
// `projets` limite la faute à certains formats (ordinateur, tablette, telephone) ; sans lui, elle
// vaut pour les trois.
// `tantQue` retire la faute dès qu'une condition sur le code n'est plus vraie, sans intervention.

export type FauteConnue = {
  /** Identifiant de la ligne dans l'audit (colonne « Ligne » du tableau des fautes). */
  ligne: string
  projets?: readonly string[]
  tantQue?: () => boolean
}

/** Le code source contient ce texte (les tests tournent à la racine du dépôt). */
function codeContient(fichier: string, texte: string): boolean {
  try {
    return readFileSync(fichier, 'utf8').includes(texte)
  } catch {
    return false
  }
}

/** Le fichier fixe une largeur minimale de 44 px (classe `min-w-cible` ou `min-w-[44px]`). */
function aUneLargeurMinimale(fichier: string): boolean {
  return codeContient(fichier, 'min-w-cible') || codeContient(fichier, 'min-w-[44px]')
}

function ciblesIndicateursEnFaute(): boolean {
  return !(
    aUneLargeurMinimale('src/features/indicateurs/configuration/TableauIndicateurs.tsx') &&
    aUneLargeurMinimale('src/features/indicateurs/configuration/ListeIndicateursTelephone.tsx')
  )
}

function bandeauEnFaute(): boolean {
  return !aUneLargeurMinimale('src/features/avancement/BandeauAvancement.tsx')
}

export const FAUTES_CONNUES: Readonly<Record<string, FauteConnue>> = {
  // A-01 : hors ligne, TanStack Query garde les lectures en pause et « Chargement » ne finit pas.
  // Le lot F1 règle `networkMode: 'always'` dans src/lib/requetes.ts : la faute tombe seule.
  'berger | sans réseau': {
    ligne: 'A-01',
    tantQue: () => !codeContient('src/lib/requetes.ts', "networkMode: 'always'"),
  },
  // A-02 : le lien du nom d'un ministère court (« Kumi ») fait 36 px de large dans la liste des
  // indicateurs (tableau et liste du téléphone) : `min-h-cible` fixe la hauteur, pas la largeur.
  // Tombe seule dès que les deux liens portent une largeur minimale.
  'indicateurs liste': { ligne: 'A-02', tantQue: ciblesIndicateursEnFaute },
  'indicateurs liste ejp-tech': { ligne: 'A-02', tantQue: ciblesIndicateursEnFaute },
  // A-03 : à 390 px, le bouton « Voir les étapes » du bandeau d'avancement ne montre que « Voir »
  // (26 px de large). Tombe seule dès que `BOUTON` porte une largeur minimale.
  'avancement berger': {
    ligne: 'A-03',
    projets: ['telephone'],
    tantQue: bandeauEnFaute,
  },
  'avancement ministère': {
    ligne: 'A-03',
    projets: ['telephone'],
    tantQue: bandeauEnFaute,
  },
}

/** Marque le test en cours comme échec attendu si la faute est connue pour ce format. */
export function marquerFauteConnue(cle: string, projet: string): void {
  const faute = FAUTES_CONNUES[cle]
  const concernee =
    faute !== undefined &&
    (faute.projets ?? [projet]).includes(projet) &&
    (faute.tantQue?.() ?? true)
  test.fail(
    concernee,
    concernee ? `Faute connue, ligne ${faute.ligne} de docs/conception/audit-etape-7.md` : '',
  )
}
