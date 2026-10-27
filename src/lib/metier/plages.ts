// Plages des événements (T78, lot 2 ; docs/conception/calendrier-evenements.md, sections 5 et 8).
// Fonctions pures sur des dates AAAA-MM-JJ, sans heure ni fuseau : jamais la date du navigateur.
// La base refait chaque contrôle (`ajouter_evenement` à huit arguments, `ajouter_evenements_serie`).

import { ajouterJours, jourDeLaSemaine, joursEntre } from './dates'
import type { DateIso } from './dates'

/** Un événement sur plusieurs jours dure 31 jours au plus : le dernier, 30 jours après le premier. */
export const ECART_MAX_JOURS = 30

/** Une série compte 2 à 31 dates (Q2). */
export const DATES_MIN_SERIE = 2
export const DATES_MAX_SERIE = 31

/**
 * Le même jour un an plus tard, la limite d'une série (12 mois au plus entre la première et la
 * dernière date), comme `date + interval '1 year'` dans la base : un 29 février donne le 28.
 */
export function unAnApres(date: DateIso): DateIso {
  const annee = Number(date.slice(0, 4)) + 1
  const mois = date.slice(5, 7)
  const jour = date.slice(8, 10)
  if (mois === '02' && jour === '29') {
    const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0
    return `${String(annee).padStart(4, '0')}-02-${bissextile ? '29' : '28'}`
  }
  return `${String(annee).padStart(4, '0')}-${mois}-${jour}`
}

/**
 * Dates d'une série : chaque jour de `premiere` à `derniere` comprises dont le jour de la semaine
 * (ISO : 1 pour lundi, 7 pour dimanche) est coché. Le calcul s'arrête à `DATES_MAX_SERIE + 1`
 * dates (assez pour dire « 31 au plus ») et à un an et un jour, pour qu'une date mal tapée
 * (an 9999) ne bloque pas l'écran. Vide si la dernière date précède la première.
 */
export function datesDeSerie(
  premiere: DateIso,
  derniere: DateIso,
  jours: readonly number[],
): DateIso[] {
  const coches = new Set(jours)
  const ecart = Math.min(joursEntre(premiere, derniere), 367)
  const dates: DateIso[] = []
  for (let decalage = 0; decalage <= ecart && dates.length <= DATES_MAX_SERIE; decalage++) {
    const date = ajouterJours(premiere, decalage)
    if (coches.has(jourDeLaSemaine(date))) dates.push(date)
  }
  return dates
}
