import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'

// Fautes d'accessibilité déjà décrites dans docs/conception/audit-etape-7.md (plan de l'étape 7,
// lot F2). Un contrôle qui échoue pour une faute connue ne fait pas rougir la CI : il est marqué
// `test.fail()` avec la ligne de l'audit. Quand le lot F3 corrige l'écran, le contrôle réussit,
// `test.fail()` le fait alors échouer (« attendu en échec, mais réussi »), et la personne qui
// corrige retire l'entrée ci-dessous : le contrôle reste dans la suite et garde la correction.
//
// Clé : « nom de l'écran | contrôle », avec le contrôle parmi `axe`, `structure`, `cibles`,
// `clavier`, `360` (aperçus), ou « profil | adresse » (audit avec la base). `projets` limite la
// faute à certains formats (ordinateur, tablette, telephone) ; sans lui, elle vaut pour les trois.
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

export const FAUTES_CONNUES: Readonly<Record<string, FauteConnue>> = {
  // A-01 : hors ligne, TanStack Query garde les lectures en pause et « Chargement » ne finit pas.
  // Le lot F1 règle `networkMode: 'always'` dans src/lib/requetes.ts : la faute tombe seule.
  'berger | sans réseau': {
    ligne: 'A-01',
    tantQue: () => !codeContient('src/lib/requetes.ts', "networkMode: 'always'"),
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
