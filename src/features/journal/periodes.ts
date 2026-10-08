// Périodes du filtre « Période » de l'écran 06 (BRIEF, section 9) : 7 derniers jours, 30 derniers
// jours (par défaut), 3 derniers mois, depuis le début. Toutes les bornes sont des jours de Paris,
// calculés depuis `v_semaine.aujourdhui` passé en paramètre : jamais la date du navigateur
// (BRIEF, section 3, règle 11). Une période commence à minuit, heure de Paris, de son premier
// jour, comme les « 30 derniers jours » de la base (`aujourd'hui - 30`, jour de Paris compris).

import { ajouterJours, partiesDeParis } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { ajouterMois, moisDe, premierJourDuMois } from '@/lib/metier/periodes'

export const PERIODES = ['7j', '30j', '3m', 'tout'] as const
export type Periode = (typeof PERIODES)[number]

export const PERIODE_PAR_DEFAUT: Periode = '30j'

export const LIBELLES_PERIODES: Readonly<Record<Periode, string>> = {
  '7j': '7 derniers jours',
  '30j': '30 derniers jours',
  '3m': '3 derniers mois',
  tout: 'Depuis le début',
}

export function estPeriode(valeur: string): valeur is Periode {
  return (PERIODES as readonly string[]).includes(valeur)
}

/** Période de l'adresse ; une valeur absente ou inconnue donne la période par défaut. */
export function lirePeriode(valeur: string | null): Periode {
  return valeur !== null && estPeriode(valeur) ? valeur : PERIODE_PAR_DEFAUT
}

/** Nombre de jours d'un mois (« 2026-02 » : 28). */
function joursDuMois(mois: string): number {
  const dernier = ajouterJours(premierJourDuMois(ajouterMois(mois, 1)), -1)
  return Number(dernier.slice(8))
}

/** Le même quantième trois mois plus tôt, ramené au dernier jour du mois s'il n'existe pas. */
function ilYATroisMois(aujourdhui: DateIso): DateIso {
  const mois = ajouterMois(moisDe(aujourdhui), -3)
  const quantieme = Math.min(Number(aujourdhui.slice(8)), joursDuMois(mois))
  return `${mois}-${String(quantieme).padStart(2, '0')}`
}

/**
 * Premier jour de Paris de la période, ou null pour « Depuis le début ». Le jour d'aujourd'hui est
 * toujours dedans : « 7 derniers jours » va d'il y a 7 jours à aujourd'hui.
 */
export function premierJourDePeriode(periode: Periode, aujourdhui: DateIso): DateIso | null {
  switch (periode) {
    case '7j':
      return ajouterJours(aujourdhui, -7)
    case '30j':
      return ajouterJours(aujourdhui, -30)
    case '3m':
      return ilYATroisMois(aujourdhui)
    case 'tout':
      return null
  }
}

/**
 * Instant ISO (UTC) de minuit, heure de Paris, au début d'un jour de Paris. Paris est à UTC+1 en
 * hiver et UTC+2 en été : minuit de Paris tombe à 22 h ou 23 h la veille en UTC, et le fuseau lui
 * même dit lequel des deux convient (le changement d'heure se fait à 2 h ou 3 h, jamais à minuit).
 */
export function debutDeJourParis(jour: DateIso): string {
  const [annee, mois, quantieme] = jour.split('-').map(Number)
  const minuitUtc = Date.UTC(annee ?? 0, (mois ?? 1) - 1, quantieme ?? 1)
  for (const decalageHeures of [2, 1]) {
    const instant = new Date(minuitUtc - decalageHeures * 3_600_000)
    const parties = partiesDeParis(instant)
    if (parties.jour === jour && parties.heure === 0 && parties.minute === 0) {
      return instant.toISOString()
    }
  }
  throw new RangeError(`Jour invalide : ${jour}`)
}

/** Début de la période en instant ISO, à envoyer à la base ; null pour « Depuis le début ». */
export function debutDePeriode(periode: Periode, aujourdhui: DateIso): string | null {
  const jour = premierJourDePeriode(periode, aujourdhui)
  return jour === null ? null : debutDeJourParis(jour)
}
