import type { FunctionComponent } from 'react'
import type { StatutPoint, TypeCompte } from '@/lib/base'

/**
 * Ce que les boutons d'un point lisent du point. Les identifiants viennent de `v_point` et de
 * `point_mention`, jamais des noms affichés : deux ministères peuvent changer de nom, pas d'id.
 */
export interface PointDesActions {
  id: string
  /** Titre du point, rappelé en tête du panneau « Changer le statut » et de « Marquer traité ». */
  titre: { texte: string; masque: boolean }
  statut: StatutPoint
  /** Ministère créateur (`point_attention.ministere_id`). */
  ministereId: string
  /** Identifiants des ministères mentionnés (`point_mention.ministere_id`). */
  mentions: readonly string[]
}

/** Ce que les boutons lisent du compte connecté (`compte.type` et `compte.ministere_id`). */
export interface CompteDesActions {
  type: TypeCompte
  /** Ministère du compte, pour un compte de ministère seulement ; null pour les autres profils. */
  ministereId: string | null
}

export interface ProprietesActionsPoint {
  point: PointDesActions
  compte: CompteDesActions
}

/**
 * Boutons « Changer le statut » et « Marquer traité » d'un point (étape 5, BRIEF section 9 ;
 * plan des étapes 5 à 8, P1). Propriétés figées par le lot C0 : le lot P1 remplit ce composant,
 * le lot P4 le pose sur « À décider » (`PointADecider.tsx`), sur la fiche (`CartePointFiche.tsx`)
 * et sur « Vos points » de l'accueil du ministère, sans changer ces propriétés.
 *
 * Règle des boutons : ils se montrent au ministère créateur, à un ministère mentionné, ou au
 * berger et au conseil (`estDecideur`, « Marquer traité » seulement) ; jamais à EJP Tech ni à
 * l'administration de l'église (T29) ; plus aucun sur un point traité. Amorce : ne rend rien.
 */
export const ActionsPoint: FunctionComponent<ProprietesActionsPoint> = () => null
