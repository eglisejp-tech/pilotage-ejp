// Droits d'action sur un point d'attention, côté interface (BRIEF.md, section 3 règle 7 ; fonctions
// `changer_statut_point` et `marquer_traite` de supabase/migrations/20260930163204_fonctions_api.sql
// et 20260930194240_correctifs_audit.sql). Miroir de ce que la base accepte : la base décide,
// l'interface cache seulement un bouton que la base refuserait.
//
// - Changer le statut (À traiter, En cours, En attente de décision) : le ministère créateur et
//   les ministères mentionnés, jamais le berger ni le conseil (« ils marquent traité »).
// - Marquer traité : le ministère créateur ou mentionné (commentaire de 10 à 280 caractères) ;
//   le berger et le conseil (commentaire facultatif, 280 au plus, `estDecideur`). Jamais EJP Tech
//   ni l'administration de l'église (T29).
// - Un point traité ne se rouvre pas : plus aucun des deux boutons.

import type { StatutPoint, TypeCompte } from '@/lib/base'
import { estDecideur } from '@/lib/metier/droits'

/** Ce que les droits lisent du compte connecté (le compte de la session convient tel quel). */
export interface CompteDeDroits {
  type: TypeCompte
  /** Ministère du compte, pour un compte de ministère seulement. */
  ministereId: string | null
}

/** Ce que les droits lisent d'un point : son statut, son créateur et les ministères mentionnés. */
export interface PointDeDroits {
  statut: StatutPoint
  /** Ministère créateur (`point_attention.ministere_id`). */
  ministereId: string
  /** Identifiants des ministères mentionnés (`point_mention.ministere_id`). */
  mentions: readonly string[]
}

/** Lien d'un compte de ministère avec un point : il l'a créé, ou il y est mentionné. */
export type LienAuPoint = 'createur' | 'mentionne'

/** Longueur du commentaire d'un traitement (la base refuse au-delà de 280). */
export const COMMENTAIRE_TRAITE_MAX = 280
/** Commentaire minimal d'un ministère qui marque un point traité (la base refuse en dessous). */
export const COMMENTAIRE_TRAITE_MIN_MINISTERE = 10

/**
 * Lien du compte avec le point : `createur` si son ministère l'a créé, `mentionne` s'il y est
 * mentionné, sinon null. Toujours null pour un compte sans ministère (berger, conseil,
 * administration, EJP Tech) : leur droit ne vient pas d'un lien au point.
 */
export function lienAuPoint(compte: CompteDeDroits, point: PointDeDroits): LienAuPoint | null {
  if (compte.type !== 'ministere' || compte.ministereId === null) return null
  if (point.ministereId === compte.ministereId) return 'createur'
  return point.mentions.includes(compte.ministereId) ? 'mentionne' : null
}

/** Un point traité ne se rouvre pas : plus aucune action. */
function estTraite(point: PointDeDroits): boolean {
  return point.statut === 'traite'
}

/** « Changer le statut » : un ministère lié au point, tant que le point n'est pas traité. */
export function peutChangerStatut(compte: CompteDeDroits, point: PointDeDroits): boolean {
  return !estTraite(point) && lienAuPoint(compte, point) !== null
}

/**
 * « Marquer traité » : un ministère lié au point, le berger ou le conseil, tant que le point n'est
 * pas traité. Jamais EJP Tech ni l'administration de l'église.
 */
export function peutMarquerTraite(compte: CompteDeDroits, point: PointDeDroits): boolean {
  if (estTraite(point)) return false
  return estDecideur(compte.type) || lienAuPoint(compte, point) !== null
}

/**
 * Le commentaire d'un traitement est-il obligatoire (10 à 280 caractères) ? Oui pour un ministère
 * lié au point, non pour le berger et le conseil (facultatif, 280 au plus).
 */
export function commentaireTraiteObligatoire(
  compte: CompteDeDroits,
  point: PointDeDroits,
): boolean {
  return lienAuPoint(compte, point) !== null
}
