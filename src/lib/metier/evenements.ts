// Règles d'affichage des événements du calendrier (BRIEF, section 9 ; docs/conception/
// validation-metier.md, 4.4 et 4.5 ; lot E6). Fonctions pures : le nombre de jours vient de la
// vue `v_evenement` (`jours` = date moins `private.aujourdhui()`, heure de Paris). Rien ici ne lit
// l'horloge du navigateur : l'alerte ne peut pas se tromper la nuit ni sur un poste mal réglé.

import type { StatutEvenement } from '@/lib/base'
import { comparerNoms, nombre } from './texte'
import { formaterHeureEnMinutes, valeurPermise } from './unites'

/** Un événement daté d'au plus 7 jours dans le passé reste au calendrier (BRIEF, section 9). */
export const FENETRE_PASSE_JOURS = 7

/**
 * « Vos saisies » rappelle un événement du ministère daté d'au plus 30 jours avant aujourd'hui
 * qui attend son état final ou son heure de début (T68).
 */
export const FENETRE_A_RENSEIGNER_JOURS = 30

/** Terminé et Annulé sont les états finals d'un événement (K10). */
export function estEtatFinal(statut: StatutEvenement): boolean {
  return statut === 'termine' || statut === 'annule'
}

/** Ce que « Vos saisies » lit d'un événement du ministère (T68). */
export interface EvenementARenseigner {
  statut: StatutEvenement
  jours: number
  heure_debut: number | null
}

/**
 * Ce qui reste à saisir pour un événement du ministère (T68), d'après `jours` (heure de Paris) :
 * `statut` pour un événement passé depuis 30 jours au plus sans état final ; `heure_debut` pour un
 * Terminé du jour ou des 30 derniers jours sans heure de début ; null sinon. Un événement du jour
 * qui n'est pas terminé n'est pas en retard.
 */
export function resteARenseigner(evenement: EvenementARenseigner): 'statut' | 'heure_debut' | null {
  const { statut, jours } = evenement
  if (jours > 0 || jours < -FENETRE_A_RENSEIGNER_JOURS) return null
  if (statut === 'termine') return evenement.heure_debut === null ? 'heure_debut' : null
  if (!estEtatFinal(statut) && jours < 0) return 'statut'
  return null
}

/** Ce que la phrase du début lit d'un événement terminé : les valeurs de `v_evenement`. */
export interface DebutEvenement {
  heure_debut: number | null
  retard: number | null
  a_l_heure: boolean | null
}

/**
 * « Commencé à 19 h 12, 12 min de retard », « Commencé à 19 h 03, à l'heure », ou « Commencé à
 * 19 h 12 » sans heure prévue ; null sans heure de début. Le retard et « à l'heure » viennent de
 * la base (`v_evenement`, tolérance de 5 minutes, avance comprise) : rien n'est recalculé ici.
 */
export function texteDuDebut(evenement: DebutEvenement): string | null {
  if (evenement.heure_debut === null) return null
  const commence = `Commencé à ${formaterHeureEnMinutes(evenement.heure_debut)}`
  if (evenement.a_l_heure === true) return `${commence}, à l'heure`
  if (evenement.a_l_heure === false && evenement.retard !== null && evenement.retard > 0) {
    return `${commence}, ${nombre(evenement.retard)} min de retard`
  }
  return commence
}

/**
 * Une heure du détail du journal (`heure_prevue`, `heure_debut` : minutes depuis minuit) en
 * « 19 h 12 » ; null si la valeur manque ou n'est pas une heure (la ligne reste lisible).
 */
export function heureDuJournal(valeur: unknown): string | null {
  return typeof valeur === 'number' && valeurPermise(valeur, 'heure')
    ? formaterHeureEnMinutes(valeur)
    : null
}

/** « commencé à 19 h 12 » (journal, « Dernières saisies »), ou null sans heure de début lisible. */
export function commenceA(valeur: unknown): string | null {
  const heure = heureDuJournal(valeur)
  return heure === null ? null : `commencé à ${heure}`
}

/** Ce que les règles lisent d'un événement de `v_evenement`. */
export interface EvenementDatable {
  titre: string
  date: string
  jours: number
  a_confirmer: boolean
}

/**
 * Texte de la date d'un événement, d'après `jours` : « aujourd'hui », « demain », « dans 3 jours »,
 * « date passée (hier) », « date passée depuis 10 jours ».
 */
export function texteDesJours(jours: number): string {
  if (!Number.isInteger(jours)) throw new RangeError(`Nombre de jours invalide : ${jours}`)
  if (jours === 0) return "aujourd'hui"
  if (jours === 1) return 'demain'
  if (jours > 1) return `dans ${jours} jours`
  if (jours === -1) return 'date passée (hier)'
  return `date passée depuis ${-jours} jours`
}

/** Une date passée s'écrit en `--alerte`, les autres en `--attention`, toujours avec les mots. */
export function tonDesJours(jours: number): 'attention' | 'alerte' {
  return jours < 0 ? 'alerte' : 'attention'
}

/**
 * Un événement figure au calendrier de la fiche s'il est daté d'au plus 7 jours dans le passé,
 * ou s'il est à confirmer, même plus ancien (exception de l'alerte, 4.4). La lecture de la base
 * applique déjà ce filtre ; cette fonction le redit pour les lignes d'exemple et les tests.
 */
export function dansLeCalendrier(evenement: Pick<EvenementDatable, 'jours' | 'a_confirmer'>) {
  return evenement.a_confirmer || evenement.jours >= -FENETRE_PASSE_JOURS
}

/** Tri par date, puis par nom (ordre alphabétique français). Rend une copie. */
export function trierEvenements<T extends Pick<EvenementDatable, 'date' | 'titre'>>(
  evenements: readonly T[],
): T[] {
  return [...evenements].sort((a, b) =>
    a.date === b.date ? comparerNoms(a.titre, b.titre) : a.date < b.date ? -1 : 1,
  )
}
