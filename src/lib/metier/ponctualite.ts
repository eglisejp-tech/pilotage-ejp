// Ponctualité des événements et des cultes (T68 ; K22b : « à l'heure » = au plus 5 minutes après
// l'heure prévue). La base compte tout, mois par mois (`evenements_eglise_mois()`) : combien sont
// tenus, combien ont leurs deux heures, combien à l'heure, et la somme des retards (une avance
// compte 0). Ce module ne fait que des sommes et des rapports de ces nombres :
// - part à l'heure = à l'heure ÷ avec leurs heures, « Non calculé » si aucun n'a ses heures ;
// - retard moyen = somme des retards ÷ avec leurs heures, arrondi à la minute ;
// - total = événements + cultes ; « Depuis le ... » = sommes des mois sur sommes des mois, jamais
//   une moyenne de parts.

import type { LigneComptagesEglise } from '@/lib/base'
import { formaterPourcentage, NON_CALCULE, pourcentageFij } from './pourcentage'
import { nombre } from './texte'

/** Chiffres de ponctualité d'une population (événements, cultes ou leur total) sur une période. */
export interface ChiffresPonctualite {
  /** Événements réalisés, ou dimanches dont l'heure de début du culte est saisie. */
  tenus: number
  /** Parmi eux, ceux dont le retard se calcule (heure prévue et heure de début). */
  avecHeures: number
  /** Parmi ceux-là, commencés à l'heure. */
  aLHeure: number
  /** Somme des retards en minutes, une avance comptant 0. */
  retardCumule: number
}

/** Ponctualité d'une période : les événements, les cultes, puis leur total. */
export interface PonctualitePeriode {
  evenements: ChiffresPonctualite
  cultes: ChiffresPonctualite
  total: ChiffresPonctualite
}

type LignePonctualite = Pick<
  LigneComptagesEglise,
  | 'realises'
  | 'avec_heures'
  | 'a_l_heure'
  | 'retard_cumule'
  | 'cultes'
  | 'cultes_avec_heures'
  | 'cultes_a_l_heure'
  | 'cultes_retard_cumule'
>

const AUCUN: ChiffresPonctualite = { tenus: 0, avecHeures: 0, aLHeure: 0, retardCumule: 0 }

function additionner(a: ChiffresPonctualite, b: ChiffresPonctualite): ChiffresPonctualite {
  return {
    tenus: a.tenus + b.tenus,
    avecHeures: a.avecHeures + b.avecHeures,
    aLHeure: a.aLHeure + b.aLHeure,
    retardCumule: a.retardCumule + b.retardCumule,
  }
}

/** Ponctualité d'un mois, lue dans une ligne de `evenements_eglise_mois()`. */
export function ponctualiteDuMois(ligne: LignePonctualite): PonctualitePeriode {
  const evenements: ChiffresPonctualite = {
    tenus: ligne.realises,
    avecHeures: ligne.avec_heures,
    aLHeure: ligne.a_l_heure,
    retardCumule: ligne.retard_cumule,
  }
  const cultes: ChiffresPonctualite = {
    tenus: ligne.cultes,
    avecHeures: ligne.cultes_avec_heures,
    aLHeure: ligne.cultes_a_l_heure,
    retardCumule: ligne.cultes_retard_cumule,
  }
  return { evenements, cultes, total: additionner(evenements, cultes) }
}

/** Ponctualité de plusieurs mois (« Depuis le ... ») : sommes sur sommes. */
export function ponctualiteDesMois(lignes: readonly LignePonctualite[]): PonctualitePeriode {
  return lignes.map(ponctualiteDuMois).reduce<PonctualitePeriode>(
    (somme, mois) => ({
      evenements: additionner(somme.evenements, mois.evenements),
      cultes: additionner(somme.cultes, mois.cultes),
      total: additionner(somme.total, mois.total),
    }),
    { evenements: AUCUN, cultes: AUCUN, total: AUCUN },
  )
}

/** Part entière commencée à l'heure (même arrondi que le pourcentage FIJ), ou null sans heures. */
export function partALHeure(chiffres: ChiffresPonctualite): number | null {
  return pourcentageFij(chiffres.aLHeure, chiffres.avecHeures)
}

/** Retard moyen en minutes, arrondi à la minute, ou null quand aucun n'a ses heures. */
export function retardMoyen(chiffres: ChiffresPonctualite): number | null {
  if (chiffres.avecHeures === 0) return null
  return Math.round(chiffres.retardCumule / chiffres.avecHeures)
}

/** « 50 % », ou « Non calculé ». */
export function formaterPartALHeure(chiffres: ChiffresPonctualite): string {
  return formaterPourcentage(partALHeure(chiffres))
}

/** « 12 min » (une durée en minutes). */
export function formaterMinutes(minutes: number): string {
  return `${nombre(minutes)} min`
}

/** « 12 min », ou « Non calculé ». */
export function formaterRetardMoyen(chiffres: ChiffresPonctualite): string {
  const moyenne = retardMoyen(chiffres)
  return moyenne === null ? NON_CALCULE : formaterMinutes(moyenne)
}
