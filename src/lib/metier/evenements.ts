// Règles d'affichage des événements du calendrier (BRIEF, section 9 ; docs/conception/
// validation-metier.md, 4.4 et 4.5 ; lot E6). Fonctions pures : le nombre de jours vient de la
// vue `v_evenement` (`jours` = date moins `private.aujourdhui()`, heure de Paris). Rien ici ne lit
// l'horloge du navigateur : l'alerte ne peut pas se tromper la nuit ni sur un poste mal réglé.

import { comparerNoms } from './texte'

/** Un événement daté d'au plus 7 jours dans le passé reste au calendrier (BRIEF, section 9). */
export const FENETRE_PASSE_JOURS = 7

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
