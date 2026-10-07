// Alerte des événements à confirmer (T31 ; docs/conception/validation-metier.md, 4.4). Fonctions
// pures : le choix des lignes vient de `v_evenement.a_confirmer`, calculé par la base à l'heure de
// Paris. Rien ici ne compare une date.

import { trierEvenements } from './evenements'
import type { EvenementDatable } from './evenements'

/** Le bloc montre 5 lignes, puis « Voir les N événements à confirmer ». */
export const LIGNES_VISIBLES_ALERTE = 5

/** Les événements à confirmer, la date la plus ancienne d'abord (les dates passées en tête). */
export function evenementsAConfirmer<T extends EvenementDatable>(evenements: readonly T[]): T[] {
  return trierEvenements(evenements.filter((evenement) => evenement.a_confirmer))
}

/** Les lignes montrées : les 5 premières, ou toutes une fois la liste dépliée. */
export function lignesVisibles<T>(lignes: readonly T[], deplie: boolean): T[] {
  return deplie ? [...lignes] : lignes.slice(0, LIGNES_VISIBLES_ALERTE)
}

/** Le bouton de dépliage n'existe que s'il reste des lignes à montrer. */
export function aDesLignesCachees(nombreDeLignes: number): boolean {
  return nombreDeLignes > LIGNES_VISIBLES_ALERTE
}
