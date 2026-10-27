// Textes des plages d'un événement (T78, lot 2 ; docs/conception/calendrier-evenements.md,
// sections 8.1 à 8.3, textes « Proposé » validés avec la conception le 26 octobre 2026). Les textes
// nouveaux hors de la conception sont marqués « Proposé (lot 2) » : à faire valider.

import { formaterJourAbrege } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { formaterHeureEnMinutes } from '@/lib/metier/unites'

/** Les trois formes d'un ajout, dans l'ordre du choix « Quand ? ». */
export type Quand = 'un_jour' | 'plusieurs_jours' | 'repete'

export const CHOIX_QUAND: readonly { valeur: Quand; libelle: string }[] = [
  { valeur: 'un_jour', libelle: 'Un jour' },
  { valeur: 'plusieurs_jours', libelle: 'Plusieurs jours' },
  { valeur: 'repete', libelle: 'Se répète' },
]

/** Jours de la semaine ISO (1 : lundi), abrégés comme dans les dates, et en entier pour l'écoute. */
export const JOURS_SEMAINE: readonly { numero: number; court: string; long: string }[] = [
  { numero: 1, court: 'lun.', long: 'lundi' },
  { numero: 2, court: 'mar.', long: 'mardi' },
  { numero: 3, court: 'mer.', long: 'mercredi' },
  { numero: 4, court: 'jeu.', long: 'jeudi' },
  { numero: 5, court: 'ven.', long: 'vendredi' },
  { numero: 6, court: 'sam.', long: 'samedi' },
  { numero: 7, court: 'dim.', long: 'dimanche' },
]

export const TEXTES_PLAGES = {
  libelleQuand: 'Quand ?',
  notePlusieursJours: 'Un seul événement, du premier au dernier jour. Par exemple, un camp.',
  noteRepete:
    'Un événement par date, chacun avec son statut. Par exemple, une réunion chaque lundi.',
  libellePremierJour: 'Premier jour',
  libelleDernierJour: 'Dernier jour',
  libellePremiereDate: 'Première date',
  libelleDerniereDate: 'Dernière date',
  libelleJours: 'Jours de la semaine',
  libelleHeureFin: 'Heure de fin (facultatif)',
  erreurDernierJourVide: 'Choisissez le dernier jour.',
  erreurFinAvantDebut: 'Le dernier jour doit suivre le premier.',
  erreurTropLong:
    'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.',
  erreurAucunJour: 'Choisissez au moins un jour de la semaine.',
  erreurAucuneDate: 'Aucune date ne correspond. Changez les jours ou les dates.',
  erreurTropDeDates: 'Une série compte 31 dates au plus. Raccourcissez la période.',
  erreurDouzeMois: 'Une série tient sur 12 mois au plus.',
  /** Proposé (lot 2) : la dernière date d'une série manque. */
  erreurDerniereDateVide: 'Choisissez la dernière date.',
  /** Proposé (lot 2) : la dernière date d'une série précède la première. */
  erreurDerniereDateAvant: 'La dernière date doit suivre la première.',
  /** Proposé (lot 2) : une seule date trouvée (la base demande au moins deux dates). */
  erreurUneSeuleDate:
    'Une série compte au moins deux dates. Pour une seule date, choisissez Un jour.',
  /** Panneau d'une date d'une série (8.2). */
  porteeEvenement: 'Cet événement seulement',
  porteeSerie: 'Toute la série',
} as const

/** « lun. 2 nov. » : un jour abrégé dans une phrase. */
export function jourDansLaPhrase(date: DateIso): string {
  const abrege = formaterJourAbrege(date)
  return abrege.charAt(0).toLowerCase() + abrege.slice(1)
}

/**
 * « 7 dates : lun. 2 nov., lun. 9 nov., lun. 16 nov. » (aperçu d'une série, 8.1). Une date ne se
 * coupe pas en fin de ligne (espaces insécables dans chaque date).
 */
export function apercuSerie(dates: readonly DateIso[]): string {
  const premier = dates.length === 1 ? '1 date' : `${dates.length} dates`
  const insecable = (date: DateIso) => jourDansLaPhrase(date).replaceAll(' ', ' ')
  return `${premier} : ${dates.map(insecable).join(', ')}`
}

/** « Ajouter 7 événements au calendrier » (8.1). */
export function boutonSerie(nombre: number): string {
  return `Ajouter ${nombre} événements au calendrier`
}

/** « 7 événements ajoutés au calendrier. » (8.1). */
export function reussiteSerie(nombre: number): string {
  return `${nombre} événements ajoutés au calendrier.`
}

/** « Fait partie d'une série de 7 dates. » (8.2). */
export function ligneSerie(nombre: number): string {
  return `Fait partie d'une série de ${nombre} dates.`
}

/** « Toute la série (les 5 dates à venir) » (8.2), pour les mentions et le retrait. */
export function porteeSerieAVenir(nombre: number): string {
  return nombre === 1
    ? `${TEXTES_PLAGES.porteeSerie} (la date à venir)`
    : `${TEXTES_PLAGES.porteeSerie} (les ${nombre} dates à venir)`
}

/**
 * La date d'un événement au calendrier (8.3) : « Sam. 3 oct. » pour un jour, « Du sam. 31 oct.
 * au lun. 2 nov. » sur plusieurs jours.
 */
export function texteDesDates(date: DateIso, dateFin: DateIso | null): string {
  if (dateFin === null) return formaterJourAbrege(date)
  return `Du ${jourDansLaPhrase(date)} au ${jourDansLaPhrase(dateFin)}`
}

/**
 * Les heures d'un événement (8.3) : « 19 h », « 10 h à 17 h » ; sans heure prévue, « jusqu'à
 * 17 h » (Proposé, lot 2) ; null sans aucune heure.
 */
export function texteDesHeures(heurePrevue: number | null, heureFin: number | null): string | null {
  if (heurePrevue === null && heureFin === null) return null
  if (heureFin === null) return formaterHeureEnMinutes(heurePrevue ?? 0)
  if (heurePrevue === null) return `jusqu'à ${formaterHeureEnMinutes(heureFin)}`
  return `${formaterHeureEnMinutes(heurePrevue)} à ${formaterHeureEnMinutes(heureFin)}`
}
