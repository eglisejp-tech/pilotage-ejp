// Lecture du champ numérique (ChampNombre, ChampHeure) : le champ garde exactement ce que la
// personne a écrit. Une saisie en cours (champ vide) ne devient jamais un 0 qu'elle n'a pas écrit,
// et un texte qui n'est pas un nombre entier n'est jamais réécrit en silence (« 12,5 » ne devient
// pas 125) : il reste visible et le champ explique quoi corriger (m100). Toutes les valeurs de la
// base sont des entiers (`mesure`, `participation`, `fij_departement`, `fij_statistique`,
// `ventilation_sensible` : colonnes `integer`, euros compris ; les fonctions d'écriture refusent
// un nombre à virgule), le champ n'accepte donc que des entiers.

/** Sous un champ qui contient autre chose qu'un nombre entier écrit en chiffres (m100). */
export const MESSAGE_NOMBRE_ENTIER = 'Saisissez un nombre entier, sans virgule ni lettre.'

export type LectureChamp =
  /** Rien d'écrit (ou seulement des espaces). */
  | { etat: 'vide' }
  | { etat: 'nombre'; valeur: number }
  /** Une virgule, un point, une lettre, un signe ou une espace mal placée : à corriger. */
  | { etat: 'format' }

/** Un signe moins est lu : « -3 » est un nombre, que la borne du formulaire refuse en le disant. */
const ENTIER = /^-?\d+$/
/**
 * « 1 000 », « 12 345 678 » : groupes de trois chiffres séparés par une espace (`\s` : ordinaire,
 * insécable ou fine insécable, celles d'un nombre copié depuis l'outil).
 */
const ENTIER_GROUPE = /^\d{1,3}(?:\s\d{3})+$/

/**
 * Ce que contient le champ. Les espaces autour sont ignorées ; « 1 000 » vaut 1000 ; « 007 » vaut
 * 7 ; « -3 » vaut -3 (hors bornes). « 12,5 », « 12.5 », « 1 2 » ou « 12a » ne sont pas lus : le
 * champ le dit.
 */
export function lireChamp(texte: string): LectureChamp {
  const net = texte.trim()
  if (net === '') return { etat: 'vide' }
  if (ENTIER.test(net)) return { etat: 'nombre', valeur: Number(net) }
  if (ENTIER_GROUPE.test(net)) return { etat: 'nombre', valeur: Number(net.replace(/\D/g, '')) }
  return { etat: 'format' }
}

/** Le champ contient un texte à corriger (ni vide, ni un nombre entier). */
export function formatAReprendre(texte: string): boolean {
  return lireChamp(texte).etat === 'format'
}

/** Nombre du champ, ou null s'il est vide ou à corriger (à lire après le contrôle du formulaire). */
export function valeurDuChamp(texte: string): number | null {
  const lecture = lireChamp(texte)
  return lecture.etat === 'nombre' ? lecture.valeur : null
}

/**
 * Nombre qu'un calcul en direct peut compter (total d'une carte, « Comptés dans le total ») : un
 * entier de 0 ou plus. Un champ vide, un texte à corriger ou un nombre négatif (que l'envoi
 * refuse) donne null : une ligne calculée ne montre jamais un nombre faux (m100).
 */
export function nombreACompter(texte: string): number | null {
  const valeur = valeurDuChamp(texte)
  return valeur !== null && valeur >= 0 ? valeur : null
}

/**
 * Forme comparable d'un champ (« 05 », « 5 » et « 5 » avec une espace sont la même saisie) : sert
 * à reconnaître un second envoi identique. Un texte à corriger reste tel quel.
 */
export function normaliserChamp(texte: string): string {
  const lecture = lireChamp(texte)
  if (lecture.etat === 'nombre') return String(lecture.valeur)
  return lecture.etat === 'vide' ? '' : texte.trim()
}

/**
 * « Ajouter un » ou « Retirer un » a un effet : jamais au-delà du plafond ni sous 0, et jamais sur
 * un texte à corriger. Un champ vide compte pour 0 (« Retirer un » y écrit 0).
 */
export function peutAjuster(texte: string, delta: 1 | -1, max: number): boolean {
  const lecture = lireChamp(texte)
  if (lecture.etat === 'format') return false
  if (lecture.etat === 'vide') return delta === 1 ? max > 0 : true
  return delta === 1 ? lecture.valeur < max : lecture.valeur > 0
}

/** Plus ou moins un, entre 0 et `max` : un champ vide compte pour 0 ; un texte à corriger reste. */
export function ajusterNombre(texte: string, delta: 1 | -1, max: number): string {
  const lecture = lireChamp(texte)
  if (lecture.etat === 'format') return texte
  const actuel = lecture.etat === 'vide' ? 0 : lecture.valeur
  return String(Math.min(Math.max(actuel + delta, 0), max))
}
