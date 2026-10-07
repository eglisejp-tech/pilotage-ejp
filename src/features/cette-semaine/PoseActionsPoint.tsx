import { ActionsPoint } from '@/features/points-actions/ActionsPoint'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'
import type { StatutPoint } from '@/lib/base'

/** Ce que la pose des boutons lit d'un point de « À décider », de la fiche ou de « Vos points ». */
interface PointAvecDroits {
  id: string
  titre: { texte: string; masque: boolean }
  statut: StatutPoint
  /** Ministère créateur (`v_point.ministere_id`). */
  ministereId: string
  /** Identifiants des ministères mentionnés (`point_mention.ministere_id`). */
  mentionIds: readonly string[]
}

interface Props {
  point: PointAvecDroits
  /**
   * Compte connecté. Null : la vue est en lecture seule (EJP Tech, T29), aucun bouton ne se pose.
   * Les droits eux-mêmes (créateur, mentionné, berger, conseil, point traité) sont ceux
   * d'`ActionsPoint` (`droitsPoint.ts`) : la base décide, ce composant ne fait que le brancher.
   */
  compte: CompteDesActions | null
}

/**
 * Pose `ActionsPoint` sous un point (étape 5, lot P4). Un seul endroit relie les points de
 * « À décider », de la fiche (04 et 12) et de « Vos points » (07) aux propriétés d'`ActionsPoint` :
 * les identifiants viennent de `v_point` et de `point_mention`, jamais des noms affichés. Quand
 * aucun bouton ne se montre, le conteneur reste vide et disparaît : pas d'espace en trop.
 */
export function PoseActionsPoint({ point, compte }: Props) {
  if (compte === null) return null
  return (
    <div className="mt-1.5 empty:hidden">
      <ActionsPoint
        point={{
          id: point.id,
          titre: point.titre,
          statut: point.statut,
          ministereId: point.ministereId,
          mentions: point.mentionIds,
        }}
        compte={compte}
      />
    </div>
  )
}
