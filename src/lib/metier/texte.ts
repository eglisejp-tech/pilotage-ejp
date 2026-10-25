// Petits outils de texte partagés par les modules métier : nombres, accords, listes de noms.
// Règles : BRIEF.md section 9 (« nombres en lettres de un à dix en début de phrase, en chiffres
// ailleurs », listes de noms « A », « A et B », « A, B et C ») et CLAUDE.md (aucun tiret
// cadratin ni demi-cadratin : un nombre négatif prend le signe moins U+2212).

/** Signe moins typographique (U+2212), jamais un tiret. */
export const MOINS = '\u2212'

/**
 * Espace fine insécable (U+202F), celle qu'Intl écrit en français. Aucune des trois polices ne la
 * dessine : le navigateur la prenait dans une police système, de largeur variable (« 1250 € » à
 * côté de « 2 050€ » sur une même ligne de la fiche). L'outil ne l'affiche plus (T69,
 * proposition 8) : `sansEspaceFine` la remplace par l'espace insécable.
 */
export const ESPACE_FINE = '\u202f'

/**
 * Espace insécable (U+00A0) des nombres et des unités : « 1 234 », « 5 164 € », « 77 % ». Les
 * trois polices la dessinent.
 */
export const ESPACE_INSECABLE = '\xa0'

/** Remplace l'espace fine d'Intl (U+202F) par l'espace insécable des trois polices. */
export function sansEspaceFine(texte: string): string {
  return texte.replaceAll(ESPACE_FINE, ESPACE_INSECABLE)
}

const formatNombre = new Intl.NumberFormat('fr-FR')
const collateur = new Intl.Collator('fr')

const EN_LETTRES = ['Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix']

/** Nombre en chiffres, à la française (« 1 234 »), avec le signe moins U+2212 s'il est négatif. */
export function nombre(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`Nombre invalide : ${n}`)
  const absolu = sansEspaceFine(formatNombre.format(Math.abs(n)))
  return n < 0 ? `${MOINS}${absolu}` : absolu
}

/** Nombre qui ouvre une phrase : en lettres de un à dix (« Deux »), en chiffres ailleurs. */
export function nombreEnDebutDePhrase(n: number): string {
  return (Number.isInteger(n) && EN_LETTRES[n - 1]) || nombre(n)
}

// Liaisons de lierNombres, appliquées dans l'ordre. Un petit nombre écrit en lettres (« un
// point », « deux ministères ») se lie comme un nombre en chiffres.
const LIAISONS: ReadonlyArray<readonly [RegExp, string]> = [
  // « 2 ministères », « 27 sept. », « 1er oct. », « 80 % », « 20 h »
  [/(\d(?:er)?) (?=[\p{L}%€])/gu, `$1${ESPACE_INSECABLE}`],
  [
    new RegExp(`(^|[^\\p{L}\\d])(${[...EN_LETTRES, 'Une'].join('|')}) (?=\\p{L})`, 'giu'),
    `$1$2${ESPACE_INSECABLE}`,
  ],
  // « 20 h 30 », « 6 sur 8 »
  [/(\d\xa0(?:h|sur)) (?=\d)/gu, `$1${ESPACE_INSECABLE}`],
  // Ponctuation double et guillemets : « Août 2026 : 6 », « texte »
  [/ ([:;!?»])/g, `${ESPACE_INSECABLE}$1`],
  [/« /g, `«${ESPACE_INSECABLE}`],
  // Le nombre qui suit un deux-points reste avec lui : « Août 2026 : 6 »
  [/: (?=\d)/g, `:${ESPACE_INSECABLE}`],
]

/**
 * Lie un nombre au mot qui le suit, et la ponctuation double à ce qui l'entoure, par des espaces
 * insécables (T69, proposition 8) : « 2 ministères », « un point », « 27 sept. », « 6 sur 8 »,
 * « Août 2026 : 6 » ne se coupent plus en fin de ligne. Le texte se lit de la même façon.
 */
export function lierNombres(texte: string): string {
  return LIAISONS.reduce((lie, [motif, remplacement]) => lie.replace(motif, remplacement), texte)
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

/**
 * Longueur en caractères, comme `char_length` de la base : un émoji compte pour un, là où
 * `String.length` en compte deux (unités UTF-16). Sert aux compteurs et aux schémas des textes
 * libres (même règle que `longueurEnCaracteres` du signalement).
 */
export function longueurEnCaracteres(texte: string): number {
  return Array.from(texte).length
}
