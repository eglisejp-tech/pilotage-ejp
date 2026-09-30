// Points d'attention : ordre de « À décider » et des onglets de l'écran 05, libellés et échéances
// (BRIEF.md section 3, règle 7, et section 9, « Points ouverts, « À décider » et phrases »).
//
// Les fonctions de tri prennent les lignes de `v_point` telles quelles (noms des colonnes de la
// base) et rendent une copie triée. L'ordre SQL de « À décider » (`(statut = 'attente_decision')
// desc`) ne s'écrit pas dans une requête PostgREST : il se fait ici.

import { formaterJourCourt, joursEntre, lireInstant, type DateIso, type Instant } from './dates'

/** Enum `public.statut_point`. */
export type StatutPoint = 'a_traiter' | 'en_cours' | 'attente_decision' | 'traite'
/** Enum `public.priorite` (l'ordre de l'enum sert aux tris). */
export type Priorite = 'normale' | 'haute' | 'urgente'

export const LIBELLE_STATUT: Record<StatutPoint, string> = {
  a_traiter: 'À traiter',
  en_cours: 'En cours',
  attente_decision: 'En attente de décision',
  traite: 'Traité',
}

export const LIBELLE_PRIORITE: Record<Priorite, string> = {
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
}

const RANG_PRIORITE: Record<Priorite, number> = { normale: 0, haute: 1, urgente: 2 }

/** « À décider » montre les 3 premiers points à toutes les tailles. */
export const NOMBRE_A_DECIDER = 3

/** Colonnes de `v_point` utiles aux tris. */
export interface PointTriable {
  statut: StatutPoint
  priorite: Priorite
  echeance: DateIso | null
  cree_le: Instant
}

/** Un point est ouvert tant qu'il n'est pas traité (un point traité ne se rouvre pas). */
export function estOuvert(point: { statut: StatutPoint }): boolean {
  return point.statut !== 'traite'
}

function comparerEcheances(a: DateIso | null, b: DateIso | null): number {
  if (a === b) return 0
  if (a === null) return 1 // sans échéance en dernier
  if (b === null) return -1
  return joursEntre(b, a)
}

// Priorité (Urgente, Haute, Normale), puis échéance (sans échéance en dernier), puis du plus
// ancien au plus récent.
function comparerOuverts(a: PointTriable, b: PointTriable): number {
  return (
    RANG_PRIORITE[b.priorite] - RANG_PRIORITE[a.priorite] ||
    comparerEcheances(a.echeance, b.echeance) ||
    lireInstant(a.cree_le).getTime() - lireInstant(b.cree_le).getTime()
  )
}

function enAttente(point: PointTriable): number {
  return point.statut === 'attente_decision' ? 1 : 0
}

/**
 * Ordre de « À décider », sur les points non traités : d'abord « En attente de décision », puis
 * par priorité, puis par échéance (sans échéance en dernier), puis du plus ancien au plus récent.
 */
export function trierADecider<T extends PointTriable>(points: readonly T[]): T[] {
  return points
    .filter(estOuvert)
    .sort((a, b) => enAttente(b) - enAttente(a) || comparerOuverts(a, b))
}

export interface SelectionADecider<T> {
  /** Les premiers points de l'ordre de « À décider » (3 au plus). */
  points: T[]
  /** Nombre de points ouverts ; 0 : « Aucun point ouvert. » */
  nbOuverts: number
  /** Au moins un point ouvert est Urgent : sur téléphone, le bloc remonte après la phrase. */
  urgent: boolean
}

/** Contenu du bloc « À décider » : les 3 premiers points, le nombre d'ouverts et l'urgence. */
export function selectionADecider<T extends PointTriable>(
  points: readonly T[],
  nombre: number = NOMBRE_A_DECIDER,
): SelectionADecider<T> {
  const tries = trierADecider(points)
  return {
    points: tries.slice(0, Math.max(0, nombre)),
    nbOuverts: tries.length,
    urgent: tries.some((point) => point.priorite === 'urgente'),
  }
}

/** Onglet « Ouverts » : par priorité, puis échéance (sans échéance en dernier), puis création. */
export function trierOuverts<T extends PointTriable>(points: readonly T[]): T[] {
  return points.filter(estOuvert).sort(comparerOuverts)
}

/** Onglet « Traités » : du plus récent au plus ancien traitement. */
export function trierTraites<T extends PointTriable & { traite_le: Instant | null }>(
  points: readonly T[],
): T[] {
  const moment = (point: T): number =>
    point.traite_le === null ? 0 : lireInstant(point.traite_le).getTime()
  return points.filter((point) => !estOuvert(point)).sort((a, b) => moment(b) - moment(a))
}

/** Onglet « Tous » : les ouverts, puis les traités. */
export function trierTous<T extends PointTriable & { traite_le: Instant | null }>(
  points: readonly T[],
): T[] {
  return [...trierOuverts(points), ...trierTraites(points)]
}

/** Nombre de points « En attente de décision » (partie surlignée des phrases). */
export function compterEnAttenteDeDecision(points: readonly { statut: StatutPoint }[]): number {
  return points.filter((point) => point.statut === 'attente_decision').length
}

/** Échéance dépassée : avant aujourd'hui (jour de Paris, `v_semaine.aujourdhui`). */
export function echeanceDepassee(echeance: DateIso | null, aujourdhui: DateIso): boolean {
  return echeance !== null && joursEntre(aujourdhui, echeance) < 0
}

export interface Echeance {
  /** « 5 oct. », ou « 28 sept., dépassée » */
  texte: string
  /** En rouge (`--alerte`), toujours avec le mot « dépassée ». */
  depassee: boolean
}

/** Échéance d'un point ouvert, avec le mot « dépassée » s'il y a lieu ; `null` sans échéance. */
export function libelleEcheance(echeance: DateIso | null, aujourdhui: DateIso): Echeance | null {
  if (echeance === null) return null
  const depassee = echeanceDepassee(echeance, aujourdhui)
  const jour = formaterJourCourt(echeance)
  return { texte: depassee ? `${jour}, dépassée` : jour, depassee }
}

/** Colonne « Point ouvert » : priorité la plus haute des points ouverts, sinon « Aucun ». */
export function libellePointOuvert(priorite: Priorite | null): string {
  return priorite === null ? 'Aucun' : LIBELLE_PRIORITE[priorite]
}
