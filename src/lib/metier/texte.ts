// Petits outils de texte partagés par les modules métier : nombres, accords, listes de noms.
// Règles : BRIEF.md section 9 (« nombres en lettres de un à dix en début de phrase, en chiffres
// ailleurs », listes de noms « A », « A et B », « A, B et C ») et CLAUDE.md (aucun tiret
// cadratin ni demi-cadratin : un nombre négatif prend le signe moins U+2212).

/** Signe moins typographique (U+2212), jamais un tiret. */
export const MOINS = '\u2212'

/** Espace fine insécable (U+202F), celle d'Intl en français : « 77 % », « 1 234 ». */
export const ESPACE_FINE = '\u202f'

const formatNombre = new Intl.NumberFormat('fr-FR')
const collateur = new Intl.Collator('fr')

const EN_LETTRES = ['Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix']

/** Nombre en chiffres, à la française (« 1 234 »), avec le signe moins U+2212 s'il est négatif. */
export function nombre(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`Nombre invalide : ${n}`)
  const absolu = formatNombre.format(Math.abs(n))
  return n < 0 ? `${MOINS}${absolu}` : absolu
}

/** Nombre qui ouvre une phrase : en lettres de un à dix (« Deux »), en chiffres ailleurs. */
export function nombreEnDebutDePhrase(n: number): string {
  return (Number.isInteger(n) && EN_LETTRES[n - 1]) || nombre(n)
}

/** Accord en nombre : singulier pour 0 et 1 (« 1 présent », « 3 présents »). */
export function accorder(n: number, singulier: string, pluriel: string): string {
  return Math.abs(n) < 2 ? singulier : pluriel
}

/** Liste de noms : « A », « A et B », « A, B et C ». Chaîne vide si la liste est vide. */
export function listeNoms(noms: readonly string[]): string {
  const dernier = noms.at(-1)
  if (dernier === undefined) return ''
  if (noms.length === 1) return dernier
  return `${noms.slice(0, -1).join(', ')} et ${dernier}`
}

/** Comparaison de noms dans l'ordre alphabétique français (accents compris). */
export function comparerNoms(a: string, b: string): number {
  return collateur.compare(a, b)
}

/** Copie triée dans l'ordre alphabétique français. */
export function trierNoms(noms: readonly string[]): string[] {
  return [...noms].sort(comparerNoms)
}

/** Première lettre en majuscule (« dimanche 27 sept. » devient « Dimanche 27 sept. »). */
export function majusculeInitiale(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/**
 * Termine une phrase par un point, sans doubler celui d'une abréviation finale
 * (« ... du dimanche 4 oct. » reste tel quel, jamais « oct.. »).
 */
export function terminerPhrase(texte: string): string {
  return /[.!?]$/.test(texte) ? texte : `${texte}.`
}
