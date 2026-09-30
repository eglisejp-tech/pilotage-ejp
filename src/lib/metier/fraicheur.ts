// Fraîcheur d'un ministère (BRIEF.md section 3, règle 6 ; tokens `--bien`, `--attention`, `--alerte`).
//
// La date vient de `v_tableau_ministeres.derniere_saisie` (dernière ligne de journal écrite par un
// compte du ministère) et le jour de `v_semaine.aujourdhui`. Jours de calendrier, heure de Paris.
// Vert jusqu'à 7 jours, orange de 8 à 30 jours, rouge au-delà, toujours avec un libellé.

import { jourDeParis, joursEntre, type DateIso, type Instant } from './dates'
import { comparerNoms, nombre } from './texte'

/** Jusqu'à ce nombre de jours, la fraîcheur est bonne (vert). */
export const SEUIL_BIEN_JOURS = 7
/** Jusqu'à ce nombre de jours, la fraîcheur demande attention (orange) ; au-delà, alerte (rouge). */
export const SEUIL_ATTENTION_JOURS = 30

export type EtatFraicheur = 'bien' | 'attention' | 'alerte'

export interface Fraicheur {
  /** Jours de calendrier depuis la dernière saisie, `null` si aucune saisie. */
  jours: number | null
  etat: EtatFraicheur
  /** Toujours présent : la couleur ne dit jamais seule la fraîcheur. */
  libelle: string
}

/**
 * Jours de calendrier (heure de Paris) entre un instant et aujourd'hui. Un instant situé après
 * aujourd'hui (horloges décalées) compte pour aujourd'hui.
 */
export function joursDepuis(instant: Instant | null, aujourdhui: DateIso): number | null {
  if (instant === null) return null
  return Math.max(0, joursEntre(jourDeParis(instant), aujourdhui))
}

/** Aucune saisie : alerte, comme une saisie de plus de 30 jours. */
export function etatFraicheur(jours: number | null): EtatFraicheur {
  if (jours === null || jours > SEUIL_ATTENTION_JOURS) return 'alerte'
  return jours > SEUIL_BIEN_JOURS ? 'attention' : 'bien'
}

/** « Aujourd'hui », « Hier », « Il y a 12 jours », « Aucune saisie ». */
export function libelleFraicheur(jours: number | null): string {
  if (jours === null) return 'Aucune saisie'
  if (jours <= 0) return "Aujourd'hui"
  if (jours === 1) return 'Hier'
  return `Il y a ${nombre(jours)} jours`
}

/** « Mis à jour il y a 3 jours », « Mis à jour hier », ou « Aucune saisie » (fiche d'un ministère). */
export function libelleMiseAJour(jours: number | null): string {
  if (jours === null) return libelleFraicheur(null)
  const libelle = libelleFraicheur(jours)
  return `Mis à jour ${libelle.charAt(0).toLowerCase()}${libelle.slice(1)}`
}

/** Fraîcheur complète d'un ministère : jours, état et libellé. */
export function fraicheur(derniereSaisie: Instant | null, aujourdhui: DateIso): Fraicheur {
  const jours = joursDepuis(derniereSaisie, aujourdhui)
  return { jours, etat: etatFraicheur(jours), libelle: libelleFraicheur(jours) }
}

/** Ligne de `v_tableau_ministeres` utile au tri. */
export interface MinistereDate {
  nom: string
  derniere_saisie: Instant | null
}

/**
 * « Les ministères » : du moins récent au plus récent, « Aucune saisie » d'abord, puis par nom.
 * Le rang est celui du libellé affiché (jours de calendrier) : deux ministères « Il y a 3 jours »
 * se suivent par ordre alphabétique.
 */
export function trierParFraicheur<T extends MinistereDate>(
  ministeres: readonly T[],
  aujourdhui: DateIso,
): T[] {
  const rang = (ministere: T): number =>
    joursDepuis(ministere.derniere_saisie, aujourdhui) ?? Number.POSITIVE_INFINITY
  return ministeres
    .map((ministere) => ({ ministere, rang: rang(ministere) }))
    .sort((a, b) =>
      a.rang === b.rang ? comparerNoms(a.ministere.nom, b.ministere.nom) : b.rang - a.rang,
    )
    .map(({ ministere }) => ministere)
}
