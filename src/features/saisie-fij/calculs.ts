// Métier des saisies FIJ (carte des FIJ et chiffres par département) : totaux en direct, semaines
// proposées, valeurs préremplies et valeurs envoyées. Fonctions pures. Un champ vide n'est jamais
// un 0 : il ne compte ni dans le total ni dans la complétude, et il n'est pas envoyé.

import {
  DEPARTEMENTS_FIJ,
  NOMBRE_DEPARTEMENTS,
  RUBRIQUES_FIJ,
} from '@/features/saisie-fij/departements'
import type { LigneStatistiqueFij } from '@/data/fij'
import type { Departement, RubriqueFij, ValeurFijStatistique } from '@/lib/base'
import { ajouterJours } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { libellePeriode, semaineIso } from '@/lib/metier/semaine'
import { nombre } from '@/lib/metier/texte'

/** Les 8 champs d'une ligne de départements, en texte (vide : pas de valeur). */
export type ChampsDepartements = Record<Departement, string>

/** Les 32 champs des chiffres par département. */
export type ChampsStatistiques = Record<RubriqueFij, ChampsDepartements>

export function champsDepartementsVides(): ChampsDepartements {
  return Object.fromEntries(DEPARTEMENTS_FIJ.map(({ code }) => [code, ''])) as ChampsDepartements
}

export function champsStatistiquesVides(): ChampsStatistiques {
  return Object.fromEntries(
    RUBRIQUES_FIJ.map(({ code }) => [code, champsDepartementsVides()]),
  ) as ChampsStatistiques
}

/** Somme des champs remplis et nombre de départements qui ont une valeur. */
export function totalDepartements(champs: ChampsDepartements): { total: number; nombre: number } {
  return DEPARTEMENTS_FIJ.reduce(
    (cumul, { code }) => {
      const texte = champs[code]
      if (texte === '') return cumul
      return { total: cumul.total + Number(texte), nombre: cumul.nombre + 1 }
    },
    { total: 0, nombre: 0 },
  )
}

/** « 6 dép. sur 8 » : complétude d'un total par département (BRIEF, règle 13). */
export function libelleDepartementsSur8(nombreSaisis: number): string {
  return `${nombre(nombreSaisis)} dép. sur ${nombre(NOMBRE_DEPARTEMENTS)}`
}

/**
 * Ligne « Total : 29 FIJ » de la carte, en direct (BRIEF, section 9). Tant qu'un département
 * manque, le total garde sa complétude (« Total : 20 FIJ, 6 dép. sur 8 »).
 */
export function ligneTotalCarte(champs: ChampsDepartements): string {
  const { total, nombre: saisis } = totalDepartements(champs)
  if (saisis === 0) return 'Total : aucun département saisi.'
  const fij = `${nombre(total)} FIJ`
  return saisis === NOMBRE_DEPARTEMENTS
    ? `Total : ${fij}`
    : `Total : ${fij}, ${libelleDepartementsSur8(saisis)}`
}

/** Ligne « Total : 58, 6 dép. sur 8 » d'une rubrique, en direct. */
export function ligneTotalRubrique(champs: ChampsDepartements): string {
  const { total, nombre: saisis } = totalDepartements(champs)
  if (saisis === 0) return 'Total : aucun département saisi.'
  return `Total : ${nombre(total)}, ${libelleDepartementsSur8(saisis)}`
}

/** Carte préremplie avec la dernière valeur de chaque département (`v_carte_fij`). */
export function champsCarte(
  carte: readonly { departement: Departement; valeur: number }[],
): ChampsDepartements {
  const champs = champsDepartementsVides()
  for (const { departement, valeur } of carte) champs[departement] = String(valeur)
  return champs
}

/** Lignes envoyées pour la carte : les 8 départements, dans l'ordre des codes. */
export function valeursCarte(
  champs: ChampsDepartements,
): { departement: Departement; valeur: number }[] {
  return DEPARTEMENTS_FIJ.map(({ code }) => ({ departement: code, valeur: Number(champs[code]) }))
}

/** Une semaine proposée à la saisie des chiffres par département. */
export interface SemaineProposee {
  /** Dimanche de la semaine (du lundi au dimanche). */
  dimanche: DateIso
  /**
   * « Sem. 39, 21 au 27 sept. », ou « Déjà saisie, sem. 39, 21 au 27 sept. ». L'état est en
   * tête : un menu natif coupe la fin du texte à 360 px, et c'est l'état qui ne doit pas manquer.
   */
  libelle: string
  dejaSaisie: boolean
}

/** Nombre de semaines proposées : la semaine de référence et les trois précédentes. */
export const SEMAINES_PROPOSEES = 4

/**
 * Semaines proposées : celle du dimanche de référence (`v_semaine.dimanche`, heure de Paris) et
 * les trois précédentes, la plus récente d'abord. Une semaine déjà saisie le dit.
 */
export function semainesProposees(
  dimancheReference: DateIso,
  statistiques: readonly Pick<LigneStatistiqueFij, 'dimanche' | 'nb_departements'>[],
): SemaineProposee[] {
  return Array.from({ length: SEMAINES_PROPOSEES }, (_, rang) => {
    const dimanche = ajouterJours(dimancheReference, -7 * rang)
    const dejaSaisie = statistiques.some(
      (ligne) => ligne.dimanche === dimanche && ligne.nb_departements > 0,
    )
    const semaine = semaineIso(dimanche)
    const periode = libellePeriode(semaine.lundi, semaine.dimanche).replace(/^du /, '')
    const court = `sem. ${semaine.numero}, ${periode}`
    return {
      dimanche,
      dejaSaisie,
      libelle: dejaSaisie
        ? `Déjà saisie, ${court}`
        : `${court.charAt(0).toUpperCase()}${court.slice(1)}`,
    }
  })
}

/** Sous un champ préempli puis vidé : l'ancienne valeur reste comptée tant qu'on n'en saisit pas une autre. */
export function messageValeurEffacee(valeur: number): string {
  return `La valeur enregistrée (${nombre(valeur)}) reste comptée. Saisissez 0 ou la bonne valeur.`
}

/**
 * Valeurs déjà enregistrées pour la semaine dont le champ a été vidé. Un champ vide n'est pas
 * envoyé : la base garderait l'ancienne valeur (la dernière saisie fait foi, ajout seulement),
 * sans que rien ne le dise. Le formulaire demande 0 ou la bonne valeur.
 */
export function valeursEffacees(
  champs: ChampsStatistiques,
  statistiques: readonly Pick<LigneStatistiqueFij, 'rubrique' | 'dimanche' | 'departements'>[],
  dimanche: DateIso,
): { rubrique: RubriqueFij; departement: Departement; valeur: number }[] {
  const enregistrees = champsStatistiques(statistiques, dimanche)
  return RUBRIQUES_FIJ.flatMap(({ code: rubrique }) =>
    DEPARTEMENTS_FIJ.flatMap(({ code: departement }) =>
      enregistrees[rubrique][departement] !== '' && champs[rubrique][departement] === ''
        ? [{ rubrique, departement, valeur: Number(enregistrees[rubrique][departement]) }]
        : [],
    ),
  )
}

/**
 * Champs préremplis avec la dernière saisie de chaque département pour la semaine : une
 * correction part de ce qui est déjà enregistré. Un département absent reste vide.
 */
export function champsStatistiques(
  statistiques: readonly Pick<LigneStatistiqueFij, 'rubrique' | 'dimanche' | 'departements'>[],
  dimanche: DateIso,
): ChampsStatistiques {
  const champs = champsStatistiquesVides()
  for (const ligne of statistiques) {
    if (ligne.dimanche !== dimanche) continue
    for (const { code } of DEPARTEMENTS_FIJ) {
      const valeur = ligne.departements[code]
      if (valeur !== undefined) champs[ligne.rubrique][code] = String(valeur)
    }
  }
  return champs
}

/** Valeurs envoyées : seulement les champs remplis, dans l'ordre des rubriques puis des codes. */
export function valeursStatistiques(champs: ChampsStatistiques): ValeurFijStatistique[] {
  return RUBRIQUES_FIJ.flatMap(({ code: rubrique }) =>
    DEPARTEMENTS_FIJ.flatMap(({ code: departement }) => {
      const texte = champs[rubrique][departement]
      return texte === '' ? [] : [{ rubrique, departement, valeur: Number(texte) }]
    }),
  )
}

/** « Chiffres par département de la semaine 39 enregistrés. » (proposé, plan E4). */
export function messageReussiteStatistiques(dimanche: DateIso): string {
  return `Chiffres par département de la semaine ${semaineIso(dimanche).numero} enregistrés.`
}

/** « Carte des FIJ enregistrée. » (proposé, plan E4). */
export const MESSAGE_REUSSITE_CARTE = 'Carte des FIJ enregistrée.'
