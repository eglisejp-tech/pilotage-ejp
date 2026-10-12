// Période d'une saisie des chiffres (lot E3 ; BRIEF, section 3, règle 11, et section 9). Aucune
// fonction ne lit la date du navigateur : le jour de Paris et le dimanche de référence viennent de
// `v_semaine` (la base fait la bascule du dimanche à 12 h et celle du mois à minuit, heure de
// Paris), passés en paramètre.

import { schemaMoisSaisie } from '@/features/indicateurs/schemas'
import { TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import {
  ajouterJours,
  estDateIso,
  formaterJourSemaine,
  formaterJourSemaineTitre,
  jourDeLaSemaine,
} from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { libelleMois, moisDeRattrapage, moisParDefaut, moisProposes } from '@/lib/metier/periodes'
import type { Mois } from '@/lib/metier/periodes'

/** Ce que la saisie lit de `v_semaine`. */
export interface SemaineDeSaisie {
  /** Jour de Paris. */
  aujourdhui: DateIso
  /** Dimanche de référence : le dernier dimanche dont midi est passé. */
  dimanche: DateIso
}

/** « Choisir un autre dimanche » propose les 8 derniers dimanches (BRIEF, section 9 ; T55). */
export const DIMANCHES_PROPOSES = 8

/**
 * Un dimanche avant midi : le dimanche du jour n'est pas encore le dimanche de référence. Seuls
 * les indicateurs « saisi le dimanche matin » le reçoivent alors (X3).
 */
export function estDimancheMatin(semaine: SemaineDeSaisie): boolean {
  return jourDeLaSemaine(semaine.aujourdhui) === 7 && semaine.dimanche !== semaine.aujourdhui
}

export interface DimanchePropose {
  dimanche: DateIso
  /** « Dimanche 20 sept. (déjà saisi) », « Aujourd'hui, dimanche 4 oct. ». */
  libelle: string
  dejaSaisi: boolean
  /** Le dimanche du jour, avant midi. */
  matin: boolean
}

/**
 * Dimanches de « Choisir un autre dimanche » : le dimanche de référence et les trois précédents,
 * du plus récent au plus ancien, avec « (déjà saisi) » quand les STARs au service y sont saisis.
 * Un dimanche avant midi, le dimanche du jour vient en tête si le ministère a un indicateur
 * « saisi le dimanche matin » (`avecMatin`).
 */
export function dimanchesProposes(
  semaine: SemaineDeSaisie,
  saisis: ReadonlySet<DateIso>,
  avecMatin: boolean,
): DimanchePropose[] {
  const liste: DimanchePropose[] = []
  if (avecMatin && estDimancheMatin(semaine)) {
    liste.push({
      dimanche: semaine.aujourdhui,
      libelle: `Aujourd'hui, ${formaterJourSemaine(semaine.aujourdhui)}`,
      dejaSaisi: false,
      matin: true,
    })
  }
  for (let rang = 0; rang < DIMANCHES_PROPOSES; rang++) {
    const dimanche = ajouterJours(semaine.dimanche, -7 * rang)
    const dejaSaisi = saisis.has(dimanche)
    liste.push({
      dimanche,
      libelle: `${formaterJourSemaineTitre(dimanche)}${dejaSaisi ? TEXTES_CHIFFRES.suffixeDejaSaisi : ''}`,
      dejaSaisi,
      matin: false,
    })
  }
  return liste
}

export type ChoixDimanche =
  | { etat: 'ok'; dimanche: DateIso; matin: boolean }
  /** La date de l'adresse n'est pas un dimanche passé ou du jour. */
  | { etat: 'refuse' }

/**
 * Dimanche saisi : celui de l'adresse (`?date=AAAA-MM-JJ`), s'il est un dimanche passé ou du jour
 * (la base refuse les autres), sinon le dimanche de référence.
 */
export function choisirDimanche(parametre: string | null, semaine: SemaineDeSaisie): ChoixDimanche {
  if (parametre === null || parametre === '') {
    return { etat: 'ok', dimanche: semaine.dimanche, matin: false }
  }
  if (
    !estDateIso(parametre) ||
    jourDeLaSemaine(parametre) !== 7 ||
    parametre > semaine.aujourdhui
  ) {
    return { etat: 'refuse' }
  }
  return {
    etat: 'ok',
    dimanche: parametre,
    matin: parametre === semaine.aujourdhui && estDimancheMatin(semaine),
  }
}

/** Adresse de la saisie d'un dimanche (« Corriger » de « Vos saisies », liste des dimanches). */
export function adresseSaisieDimanche(dimanche?: DateIso): string {
  return dimanche === undefined ? '/saisir/dimanche' : `/saisir/dimanche?date=${dimanche}`
}

export interface MoisAChoisir {
  mois: Mois
  /** « Septembre 2026 », « Octobre 2026 (en cours) », suivi de « (déjà saisi) » s'il y a lieu. */
  libelle: string
  enCours: boolean
  dejaSaisi: boolean
}

function moisAChoisir(
  { mois, enCours }: { mois: Mois; enCours: boolean },
  complets: ReadonlySet<Mois>,
): MoisAChoisir {
  const dejaSaisi = complets.has(mois)
  const libelle = `${libelleMois(mois)}${enCours ? ' (en cours)' : ''}${dejaSaisi ? TEXTES_CHIFFRES.suffixeDejaSaisi : ''}`
  return { mois, libelle, enCours, dejaSaisi }
}

/**
 * Mois proposés d'abord (K1a, P45) : le mois en cours et les deux précédents, pour tous les
 * indicateurs, sensibles compris. « Déjà saisi » : chaque indicateur du mois y a une valeur.
 */
export function moisAProposer(aujourdhui: DateIso, complets: ReadonlySet<Mois>): MoisAChoisir[] {
  return moisProposes(aujourdhui).map((mois) => moisAChoisir(mois, complets))
}

/** « Choisir un autre mois » : tous les mois permis, jusqu'au 1er janvier de l'année précédente. */
export function moisARattraper(aujourdhui: DateIso, complets: ReadonlySet<Mois>): MoisAChoisir[] {
  return moisDeRattrapage(aujourdhui).map((mois) => moisAChoisir(mois, complets))
}

export type ChoixMois =
  | { etat: 'ok'; mois: Mois; enCours: boolean }
  /** Mois de l'adresse refusé (futur, trop ancien, illisible) : le message du schéma. */
  | { etat: 'refuse'; message: string; moisPropose: Mois }

/**
 * Mois saisi : celui de l'adresse (`?mois=AAAA-MM`), contrôlé par le schéma partagé avec la base
 * (ni futur, ni avant le 1er janvier de l'année précédente) ; sinon le dernier mois fini non
 * saisi, ou le mois en cours.
 */
export function choisirMois(
  parametre: string | null,
  aujourdhui: DateIso,
  complets: ReadonlySet<Mois>,
): ChoixMois {
  const parDefaut = moisParDefaut(aujourdhui, complets)
  const enCours = (mois: Mois) => mois === aujourdhui.slice(0, 7)
  if (parametre === null || parametre === '') {
    return { etat: 'ok', mois: parDefaut, enCours: enCours(parDefaut) }
  }
  const resultat = schemaMoisSaisie(aujourdhui).safeParse(parametre)
  if (!resultat.success) {
    return {
      etat: 'refuse',
      message: resultat.error.issues[0]?.message ?? 'Choisissez un mois.',
      moisPropose: parDefaut,
    }
  }
  return { etat: 'ok', mois: parametre, enCours: enCours(parametre) }
}

/** Adresse de « Chiffres du mois » pour un mois (`/saisir/mois?mois=2026-09`). */
export function adresseSaisieMois(mois?: Mois): string {
  return mois === undefined ? '/saisir/mois' : `/saisir/mois?mois=${mois}`
}
