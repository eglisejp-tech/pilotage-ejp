// Périodes des indicateurs : mois, départ d'une somme, mois proposés à la saisie (plan de
// l'étape 4, E1 et E3 ; docs/conception/configuration-indicateurs.md, 3.1 et 3.4).
//
// Aucune fonction ne lit la date du navigateur : « aujourd'hui » est le jour de Paris de
// `v_semaine.aujourdhui` (BRIEF section 3, règle 11), passé en paramètre. Un mois s'écrit
// « AAAA-MM » ; son jour de saisie est le 1er, posé par la base.

import { nomDuMois } from './dates'
import type { DateIso } from './dates'
import { majusculeInitiale } from './texte'

/** Mois au format AAAA-MM. */
export type Mois = string

/** Un mois proposé à la saisie. */
export interface MoisPropose {
  mois: Mois
  /** « Septembre 2026 ». */
  libelle: string
  /** Vrai pour le mois de « aujourd'hui » : il s'affiche à part (« Octobre en cours »). */
  enCours: boolean
}

// Décision de la personne responsable du 6 octobre 2026 : un indicateur sensible se saisit aussi
// pour le mois en cours. Les mois saisissables sont donc les mêmes pour tout indicateur ; il n'y a
// plus d'option « sensible ». Les protections des sensibles (« moins de 3 », lecteurs) sont celles
// de la base (lot B2), pas celles de la période.

const FORMAT_MOIS = /^(\d{4})-(0[1-9]|1[0-2])$/

function lireMois(mois: Mois): { annee: number; numero: number } {
  const morceaux = FORMAT_MOIS.exec(mois)
  if (!morceaux) throw new RangeError(`Mois invalide (format attendu AAAA-MM) : ${mois}`)
  return { annee: Number(morceaux[1]), numero: Number(morceaux[2]) }
}

function ecrireMois(annee: number, numero: number): Mois {
  return `${String(annee).padStart(4, '0')}-${String(numero).padStart(2, '0')}`
}

/** Vrai si la chaîne est un mois valide au format AAAA-MM. */
export function estMois(valeur: string): boolean {
  return FORMAT_MOIS.test(valeur)
}

/** Mois d'un jour (« 2026-10-06 » donne « 2026-10 »). */
export function moisDe(jour: DateIso): Mois {
  const mois = jour.slice(0, 7)
  lireMois(mois)
  return mois
}

/** Premier jour du mois, le jour que la base pose pour une saisie « mois » (« 2026-09-01 »). */
export function premierJourDuMois(mois: Mois): DateIso {
  lireMois(mois)
  return `${mois}-01`
}

/** Ajoute (ou retire, si négatif) des mois. */
export function ajouterMois(mois: Mois, nombreDeMois: number): Mois {
  if (!Number.isInteger(nombreDeMois))
    throw new RangeError(`Nombre de mois invalide : ${nombreDeMois}`)
  const { annee, numero } = lireMois(mois)
  const index = annee * 12 + (numero - 1) + nombreDeMois
  return ecrireMois(Math.floor(index / 12), (index % 12) + 1)
}

/** « Septembre 2026 ». */
export function libelleMois(mois: Mois): string {
  const { annee, numero } = lireMois(mois)
  return `${majusculeInitiale(nomDuMois(numero))} ${annee}`
}

/** « Octobre en cours » : le mois de aujourd'hui, à part de la somme et de la complétude. */
export function libelleMoisEnCours(mois: Mois): string {
  return `${majusculeInitiale(nomDuMois(lireMois(mois).numero))} en cours`
}

/** « Depuis juillet », « Depuis janvier » : le départ d'une somme de mois, toujours nommé. */
export function libelleDepuisMois(mois: Mois): string {
  return `Depuis ${nomDuMois(lireMois(mois).numero)}`
}

/** Premier mois qu'on peut saisir : janvier de l'année précédente (rattrapage, K3). */
export function premierMoisPermis(aujourdhui: DateIso): Mois {
  return ecrireMois(lireMois(moisDe(aujourdhui)).annee - 1, 1)
}

/** Dernier mois qu'on peut saisir : le mois en cours, pour tout indicateur, sensible compris. */
export function dernierMoisPermis(aujourdhui: DateIso): Mois {
  return moisDe(aujourdhui)
}

function moisPropose(mois: Mois, aujourdhui: DateIso): MoisPropose {
  return { mois, libelle: libelleMois(mois), enCours: mois === moisDe(aujourdhui) }
}

/** Mois proposés d'abord (K1a) : le mois en cours et les deux précédents, du plus récent au plus ancien. */
export function moisProposes(aujourdhui: DateIso): MoisPropose[] {
  const dernier = dernierMoisPermis(aujourdhui)
  return Array.from({ length: 3 }, (_, rang) =>
    moisPropose(ajouterMois(dernier, -rang), aujourdhui),
  )
}

/** Tous les mois qu'on peut saisir pour un rattrapage (« Choisir un autre mois »), du plus récent. */
export function moisDeRattrapage(aujourdhui: DateIso): MoisPropose[] {
  const dernier = dernierMoisPermis(aujourdhui)
  const premier = premierMoisPermis(aujourdhui)
  const liste: MoisPropose[] = []
  for (let mois = dernier; mois >= premier; mois = ajouterMois(mois, -1)) {
    liste.push(moisPropose(mois, aujourdhui))
  }
  return liste
}

/** Ce mois se saisit-il aujourd'hui (ni futur, ni avant le 1er janvier de l'an dernier) ? */
export function moisEstPermis(mois: Mois, aujourdhui: DateIso): boolean {
  return (
    estMois(mois) && mois >= premierMoisPermis(aujourdhui) && mois <= dernierMoisPermis(aujourdhui)
  )
}

/**
 * Mois choisi d'abord : le dernier mois fini qui n'a pas encore de saisie parmi les mois proposés,
 * sinon le mois en cours.
 */
export function moisParDefaut(aujourdhui: DateIso, dejaSaisis: ReadonlySet<Mois>): Mois {
  const proposes = moisProposes(aujourdhui)
  const manquant = proposes.find(({ mois, enCours }) => !enCours && !dejaSaisis.has(mois))
  return manquant?.mois ?? proposes[0]?.mois ?? moisDe(aujourdhui)
}
