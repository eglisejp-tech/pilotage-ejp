// Semaine affichée et dimanche de référence (BRIEF.md section 3, règle 11 ; docs/decisions.md, P14).
//
// L'interface lit la vue `v_semaine` (aujourdhui, dimanche, lundi, numero) au lieu de recalculer :
// `libelleSemaine` met en forme une ligne de cette vue. `dimancheDeReference` et
// `semaineDeReference` refont le calcul de `private.dimanche_reference_de` pour les tests et les
// cas où la vue n'est pas encore lue ; les deux doivent toujours donner le même résultat.

import {
  ajouterJours,
  formaterJourCourt,
  jourDeLaSemaine,
  joursEntre,
  partiesDeParis,
  type DateIso,
  type Instant,
} from './dates'

/** Semaine ISO 8601 (du lundi au dimanche), comme une ligne de `v_semaine`. */
export interface Semaine {
  numero: number
  lundi: DateIso
  dimanche: DateIso
}

/** Semaine de référence d'un instant, avec le jour de Paris (colonnes de `v_semaine`). */
export interface SemaineDeReference extends Semaine {
  aujourdhui: DateIso
}

/** Heure de Paris à partir de laquelle le dimanche devient le dimanche de référence. */
export const HEURE_DE_BASCULE = 12

/**
 * Dimanche de référence : le dernier dimanche dont midi (heure de Paris) est passé. Du lundi au
 * dimanche 11 h 59, c'est le dimanche précédent ; à partir du dimanche 12 h, c'est ce dimanche.
 */
export function dimancheDeReference(instant: Instant): DateIso {
  const { jour, heure } = partiesDeParis(instant)
  // Comme la base : heure de Paris moins 12 heures, puis le dimanche de ce jour ou d'avant.
  const decale = heure < HEURE_DE_BASCULE ? ajouterJours(jour, -1) : jour
  return ajouterJours(decale, -(jourDeLaSemaine(decale) % 7))
}

/** Numéro de la semaine ISO 8601 d'un jour (1 à 53), comme `extract(week from ...)`. */
export function numeroSemaineIso(date: DateIso): number {
  // La semaine ISO appartient à l'année de son jeudi.
  const jeudi = ajouterJours(date, 4 - jourDeLaSemaine(date))
  const premierJanvier = `${jeudi.slice(0, 4)}-01-01`
  return Math.floor(joursEntre(premierJanvier, jeudi) / 7) + 1
}

/** Semaine ISO (du lundi au dimanche) qui contient ce jour. */
export function semaineIso(date: DateIso): Semaine {
  const lundi = ajouterJours(date, 1 - jourDeLaSemaine(date))
  return { numero: numeroSemaineIso(date), lundi, dimanche: ajouterJours(lundi, 6) }
}

/** Jour de Paris, dimanche de référence et semaine affichée pour un instant. */
export function semaineDeReference(instant: Instant): SemaineDeReference {
  return {
    aujourdhui: partiesDeParis(instant).jour,
    ...semaineIso(dimancheDeReference(instant)),
  }
}

/** « du 21 au 27 sept. », « du 28 sept. au 4 oct. », « du 28 déc. au 3 janv. » */
export function libellePeriode(debut: DateIso, fin: DateIso): string {
  const debutCourt = formaterJourCourt(debut)
  const finCourt = formaterJourCourt(fin)
  // Même mois de la même année : le mois ne s'écrit qu'une fois.
  const memeMois = debut.slice(0, 7) === fin.slice(0, 7)
  return memeMois
    ? `du ${Number(debut.slice(8, 10))} au ${finCourt}`
    : `du ${debutCourt} au ${finCourt}`
}

/** « Semaine 39, du 21 au 27 sept. » (surtitre de l'accueil du ministère, règle 11). */
export function libelleSemaine(semaine: Semaine): string {
  return `Semaine ${semaine.numero}, ${libellePeriode(semaine.lundi, semaine.dimanche)}`
}

/** « Semaine du 21 au 27 sept. », quand le numéro s'affiche à part (maquettes 01 à 03). */
export function libelleSemaineSansNumero(semaine: Pick<Semaine, 'lundi' | 'dimanche'>): string {
  return `Semaine ${libellePeriode(semaine.lundi, semaine.dimanche)}`
}
