// Dates et heures à l'heure de Paris (BRIEF.md section 3, règle 11, et section 9, « Formats »).
//
// Deux sortes de valeurs, à ne pas confondre :
// - un jour du calendrier (`DateIso`, « 2026-09-27 ») : colonnes `date` de la base, déjà
//   exprimées à l'heure de Paris. Le calcul sur ces jours ne dépend d'aucun fuseau ;
// - un instant (`Instant`) : colonnes `timestamptz` (chaîne ISO 8601) ou objet `Date`. Il se
//   convertit en jour et heure de Paris par `Intl.DateTimeFormat` avec le fuseau Europe/Paris,
//   jamais par le fuseau du navigateur ou du serveur.
//
// Les noms des jours et des mois suivent la liste du brief (« janv., févr., mars, avr., mai,
// juin, juil., août, sept., oct., nov., déc. ») et ne dépendent pas de la version d'ICU.

import { majusculeInitiale } from './texte'

/** Jour du calendrier au format AAAA-MM-JJ (colonne `date` de la base). */
export type DateIso = string

/** Instant précis : chaîne ISO 8601 avec fuseau (colonne `timestamptz`) ou objet `Date`. */
export type Instant = Date | string

export const FUSEAU_PARIS = 'Europe/Paris'

const formatParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU_PARIS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const MOIS_COURTS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]
const MOIS_LONGS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]
// Index : jour ISO moins 1 (lundi = 1, dimanche = 7).
const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

const MS_PAR_JOUR = 86_400_000

interface Jour {
  annee: number
  mois: number
  jour: number
}

function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0')
}

function lireDateIso(date: DateIso): Jour {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (morceaux) {
    const annee = Number(morceaux[1])
    const mois = Number(morceaux[2])
    const jour = Number(morceaux[3])
    const verif = new Date(Date.UTC(annee, mois - 1, jour))
    if (
      verif.getUTCFullYear() === annee &&
      verif.getUTCMonth() === mois - 1 &&
      verif.getUTCDate() === jour
    ) {
      return { annee, mois, jour }
    }
  }
  throw new RangeError(`Date invalide (format attendu AAAA-MM-JJ) : ${date}`)
}

function ecrireDateIso(annee: number, mois: number, jour: number): DateIso {
  return `${String(annee).padStart(4, '0')}-${deuxChiffres(mois)}-${deuxChiffres(jour)}`
}

// Numéro de jour depuis le 1er janvier 1970 : le calcul sur les jours ne connaît pas les
// changements d'heure.
function versNumeroDeJour(date: DateIso): number {
  const { annee, mois, jour } = lireDateIso(date)
  return Date.UTC(annee, mois - 1, jour) / MS_PAR_JOUR
}

function depuisNumeroDeJour(numero: number): DateIso {
  const d = new Date(numero * MS_PAR_JOUR)
  return ecrireDateIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

/** Vrai si la chaîne est un jour valide au format AAAA-MM-JJ. */
export function estDateIso(valeur: string): boolean {
  try {
    lireDateIso(valeur)
    return true
  } catch {
    return false
  }
}

/** Ajoute (ou retire, si négatif) des jours de calendrier. */
export function ajouterJours(date: DateIso, jours: number): DateIso {
  if (!Number.isInteger(jours)) throw new RangeError(`Nombre de jours invalide : ${jours}`)
  return depuisNumeroDeJour(versNumeroDeJour(date) + jours)
}

/** Nombre de jours de calendrier de `debut` à `fin` (négatif si `fin` est avant `debut`). */
export function joursEntre(debut: DateIso, fin: DateIso): number {
  return versNumeroDeJour(fin) - versNumeroDeJour(debut)
}

/** Jour de la semaine ISO : 1 pour lundi, 7 pour dimanche. */
export function jourDeLaSemaine(date: DateIso): number {
  const numero = versNumeroDeJour(date)
  // Le 1er janvier 1970 (numéro 0) était un jeudi (4).
  return ((((numero + 3) % 7) + 7) % 7) + 1
}

/** Lit un instant (chaîne `timestamptz` ou `Date`). Refuse un jour seul et une chaîne illisible. */
export function lireInstant(instant: Instant): Date {
  if (typeof instant === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(instant)) {
    throw new RangeError(`Un jour (${instant}) n'est pas un instant : utiliser une DateIso.`)
  }
  // Postgres donne des microsecondes : on garde les millisecondes, que tous les navigateurs lisent.
  const date =
    typeof instant === 'string' ? new Date(instant.replace(/(\.\d{3})\d+/, '$1')) : instant
  if (Number.isNaN(date.getTime())) throw new RangeError(`Instant invalide : ${String(instant)}`)
  return date
}

/** Jour et heure de Paris d'un instant. */
export interface PartiesDeParis {
  jour: DateIso
  heure: number
  minute: number
}

/** Jour, heure et minute d'un instant à l'heure de Paris (heure d'été comprise). */
export function partiesDeParis(instant: Instant): PartiesDeParis {
  const parties = formatParis.formatToParts(lireInstant(instant))
  const lire = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parties.find((partie) => partie.type === type)?.value)
  return {
    jour: ecrireDateIso(lire('year'), lire('month'), lire('day')),
    heure: lire('hour') % 24,
    minute: lire('minute'),
  }
}

/** Jour du calendrier de Paris d'un instant. */
export function jourDeParis(instant: Instant): DateIso {
  return partiesDeParis(instant).jour
}

/** Heure de Paris d'un instant, au format HH:MM de la base (« 12:41 »). */
export function heureDeParis(instant: Instant): string {
  const { heure, minute } = partiesDeParis(instant)
  return `${deuxChiffres(heure)}:${deuxChiffres(minute)}`
}

function moisCourt(mois: number): string {
  return MOIS_COURTS[mois - 1] ?? ''
}

function nomDuJour(date: DateIso): string {
  return JOURS_LONGS[jourDeLaSemaine(date) - 1] ?? ''
}

/** « 27 sept. » */
export function formaterJourCourt(date: DateIso): string {
  const { jour, mois } = lireDateIso(date)
  return `${jour} ${moisCourt(mois)}`
}

/** « dimanche 27 sept. », dans une phrase. */
export function formaterJourSemaine(date: DateIso): string {
  return `${nomDuJour(date)} ${formaterJourCourt(date)}`
}

/** « Dimanche 27 sept. », en tête de ligne ou de colonne. */
export function formaterJourSemaineTitre(date: DateIso): string {
  return majusculeInitiale(formaterJourSemaine(date))
}

/** « Sam. 3 oct. », jour abrégé. */
export function formaterJourAbrege(date: DateIso): string {
  const abrege = JOURS_COURTS[jourDeLaSemaine(date) - 1] ?? ''
  return `${majusculeInitiale(abrege)} ${formaterJourCourt(date)}`
}

/** « samedi 17 octobre », mois en entier (titre d'une session ou d'un rassemblement). */
export function formaterJourLong(date: DateIso): string {
  const { jour, mois } = lireDateIso(date)
  return `${nomDuJour(date)} ${jour} ${MOIS_LONGS[mois - 1] ?? ''}`
}

/** « 20 h », « 20 h 30 », « 8 h 05 », à partir d'une heure HH:MM ou HH:MM:SS (colonne `time`). */
export function formaterHeure(heure: string): string {
  const morceaux = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(heure)
  const h = Number(morceaux?.[1])
  const m = Number(morceaux?.[2])
  if (!morceaux || h > 23 || m > 59) throw new RangeError(`Heure invalide : ${heure}`)
  return m === 0 ? `${h} h` : `${h} h ${deuxChiffres(m)}`
}

/** « lundi 5 oct., 20 h », ou « lundi 5 oct. » sans heure (prochaine réunion). */
export function formaterRendezVous(date: DateIso, heure: string | null): string {
  const jour = formaterJourSemaine(date)
  return heure === null ? jour : `${jour}, ${formaterHeure(heure)}`
}

/** « 27 sept., 12 h 41 » : date et heure de Paris d'un instant (journal, dernières saisies). */
export function formaterHorodatage(instant: Instant): string {
  const { jour, heure, minute } = partiesDeParis(instant)
  return `${formaterJourCourt(jour)}, ${formaterHeure(`${heure}:${deuxChiffres(minute)}`)}`
}
