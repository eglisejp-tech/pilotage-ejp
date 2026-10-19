// Lecture des champs des saisies des chiffres (lot E3) : un champ garde un texte (vide possible,
// jamais un 0 que la personne n'a pas écrit) ; une heure se saisit en heures et minutes. Les bornes
// sont celles des schémas partagés avec la base (`src/features/indicateurs/schemas.ts` pour la
// valeur et l'heure, `./schemas.ts` pour la précision et les catégories).

import { schemaHeure, schemaValeur } from '@/features/indicateurs/schemas'
import { lireChamp, MESSAGE_NOMBRE_ENTIER } from '@/features/saisie/chiffres'
import type { ChampChiffre } from '@/features/saisie-chiffres/champs'
import {
  MESSAGE_CATEGORIE,
  schemaPrecision,
  schemaValeurCategorie,
  sommeCategories,
} from '@/features/saisie-chiffres/schemas'
import {
  messageCategorieHorsBornes,
  messageSommeDepasse,
  TEXTES_CHIFFRES,
} from '@/features/saisie-chiffres/textes'
import type { UniteIndicateur } from '@/lib/base'
import { heureDepuisMinutes } from '@/lib/metier/unites'

/** Texte d'un champ : un nombre, ou des heures et des minutes pour l'unité « heure ». */
export type ValeurChamp = string | { heures: string; minutes: string }

export type Lecture<T> =
  { etat: 'vide' } | { etat: 'ok'; valeur: T } | { etat: 'erreur'; message: string }

/** Texte de départ d'un champ : vide, ou la valeur reprise (heures et minutes pour une heure). */
export function valeurDepart(champ: Pick<ChampChiffre, 'unite' | 'depart'>): ValeurChamp {
  if (champ.unite === 'heure') {
    if (champ.depart === null) return { heures: '', minutes: '' }
    const { heures, minutes } = heureDepuisMinutes(champ.depart)
    return { heures: String(heures), minutes: String(minutes).padStart(2, '0') }
  }
  return champ.depart === null ? '' : String(champ.depart)
}

/**
 * Valeur d'un champ : vide (rien n'est envoyé), un entier de 0 au plafond de l'unité, ou le
 * message de la borne (« Saisissez un nombre entre 0 et 9 999. »). Une heure partielle (heures sans minutes) est une
 * erreur, jamais une heure devinée. Un texte qui n'est pas un nombre entier (« 12,5 ») est une
 * erreur, jamais un nombre deviné (m100).
 */
export function lireValeur(unite: UniteIndicateur, valeur: ValeurChamp): Lecture<number> {
  if (typeof valeur !== 'string') {
    const heures = lireChamp(valeur.heures)
    const minutes = lireChamp(valeur.minutes)
    if (heures.etat === 'format' || minutes.etat === 'format') {
      return { etat: 'erreur', message: MESSAGE_NOMBRE_ENTIER }
    }
    if (heures.etat === 'vide' && minutes.etat === 'vide') return { etat: 'vide' }
    const resultat = schemaHeure.safeParse({
      heures: heures.etat === 'nombre' ? heures.valeur : undefined,
      minutes: minutes.etat === 'nombre' ? minutes.valeur : undefined,
    })
    return resultat.success
      ? { etat: 'ok', valeur: resultat.data }
      : { etat: 'erreur', message: resultat.error.issues[0]?.message ?? 'Saisissez une heure.' }
  }
  const lecture = lireChamp(valeur)
  if (lecture.etat === 'format') return { etat: 'erreur', message: MESSAGE_NOMBRE_ENTIER }
  if (lecture.etat === 'vide') return { etat: 'vide' }
  const resultat = schemaValeur(unite).safeParse(lecture.valeur)
  return resultat.success
    ? { etat: 'ok', valeur: resultat.data }
    : { etat: 'erreur', message: resultat.error.issues[0]?.message ?? 'Saisissez un nombre.' }
}

/** Précision : vide après `trim` (rien n'est envoyé), le texte retenu, ou le message de longueur. */
export function lirePrecision(texte: string): Lecture<string> {
  if (texte.trim() === '') return { etat: 'vide' }
  const resultat = schemaPrecision.safeParse(texte)
  return resultat.success
    ? { etat: 'ok', valeur: resultat.data }
    : {
        etat: 'erreur',
        message: resultat.error.issues[0]?.message ?? TEXTES_CHIFFRES.precisionTropCourte,
      }
}

/**
 * Grille de répartition : vide si aucune catégorie n'est remplie (pas de répartition), sinon la
 * valeur de chaque catégorie remplie. Une catégorie hors bornes donne son message, avec son nom
 * quand `libelles` le donne (« Catégorie « Malaise » : saisissez ... », T66, m094) ; une catégorie
 * qui n'est pas un nombre entier donne `MESSAGE_NOMBRE_ENTIER` (dit aussi sous son champ).
 */
export function lireRepartition(
  codes: readonly string[],
  saisie: Readonly<Record<string, string>>,
  libelles: Readonly<Record<string, string>> = {},
): Lecture<Record<string, number>> {
  const valeurs: Record<string, number> = {}
  for (const code of codes) {
    const lecture = lireChamp(saisie[code] ?? '')
    if (lecture.etat === 'format') return { etat: 'erreur', message: MESSAGE_NOMBRE_ENTIER }
    if (lecture.etat === 'vide') continue
    const resultat = schemaValeurCategorie.safeParse(lecture.valeur)
    if (!resultat.success) {
      const libelle = libelles[code]
      return {
        etat: 'erreur',
        message: libelle === undefined ? MESSAGE_CATEGORIE : messageCategorieHorsBornes(libelle),
      }
    }
    valeurs[code] = resultat.data
  }
  return Object.keys(valeurs).length === 0 ? { etat: 'vide' } : { etat: 'ok', valeur: valeurs }
}

/** Texte de la grille de départ (une catégorie absente vaut 0, comme dans la base). */
export function repartitionDepart(
  codes: readonly string[],
  depart: Readonly<Record<string, number>> | null,
): Record<string, string> {
  return Object.fromEntries(
    codes.map((code) => [code, depart === null ? '' : String(depart[code] ?? 0)] as const),
  )
}

export type EtatGrille =
  /** Aucune catégorie remplie : pas de ligne calculée. */
  | { etat: 'vide' }
  /** « Non réparti : 3 » (le total est connu). */
  | { etat: 'reste'; reste: number }
  /** La somme dépasse le total : le message de la base. */
  | { etat: 'depasse'; message: string }
  /** Des catégories sans total lisible : rien à calculer. */
  | { etat: 'sans_total' }
  | { etat: 'erreur'; message: string }

/** Ligne calculée en direct sous la grille (P47) : « Non réparti : 3 », ou la somme qui dépasse. */
export function etatGrille(
  total: Lecture<number>,
  grille: Lecture<Record<string, number>>,
): EtatGrille {
  if (grille.etat === 'vide') return { etat: 'vide' }
  if (grille.etat === 'erreur') return { etat: 'erreur', message: grille.message }
  if (total.etat !== 'ok') return { etat: 'sans_total' }
  const somme = sommeCategories(grille.valeur)
  return somme > total.valeur
    ? { etat: 'depasse', message: messageSommeDepasse(somme, total.valeur) }
    : { etat: 'reste', reste: total.valeur - somme }
}

/** Deux répartitions égales (une catégorie absente vaut 0). */
export function memeRepartition(
  a: Readonly<Record<string, number>> | null,
  b: Readonly<Record<string, number>> | null,
): boolean {
  if (a === null || b === null) return a === b
  const codes = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...codes].every((code) => (a[code] ?? 0) === (b[code] ?? 0))
}
