import { createContext, useContext } from 'react'
import { lireMinisteres } from '@/data/ministeres'
import type { MinistereListe } from '@/data/ministeres'
import { changerStatutPoint, marquerTraite, modifierMentionsPoint } from '@/data/pointsEcriture'
import type { StatutChoisi } from '@/data/pointsEcriture'

/**
 * Les accès aux données des boutons d'un point : trois écritures (`changer_statut_point`,
 * `marquer_traite`, `modifier_mentions_point`) et la lecture des ministères que montre la fenêtre
 * « Modifier les mentions ». Par défaut, les vraies fonctions (`src/data/`). L'aperçu de
 * développement (`/apercu/points-actions`) en fournit des simulées par ce contexte, sans changer
 * les propriétés d'`ActionsPoint`.
 */
export interface EcrituresPoint {
  changerStatut: (pointId: string, statut: StatutChoisi) => Promise<void>
  marquerTraite: (pointId: string, commentaire: string | null) => Promise<void>
  /** Remplace les mentions du point par la liste voulue (identifiants de ministères). */
  modifierMentions: (pointId: string, mentions: string[]) => Promise<void>
  /** Tous les ministères, désactivés compris. */
  lireMinisteres: () => Promise<MinistereListe[]>
}

const ECRITURES_REELLES: EcrituresPoint = {
  changerStatut: (pointId, statut) => changerStatutPoint(pointId, statut),
  marquerTraite: (pointId, commentaire) => marquerTraite(pointId, commentaire),
  modifierMentions: (pointId, mentions) => modifierMentionsPoint(pointId, mentions),
  lireMinisteres: () => lireMinisteres(),
}

export const ContexteEcrituresPoint = createContext<EcrituresPoint>(ECRITURES_REELLES)

export function useEcrituresPoint(): EcrituresPoint {
  return useContext(ContexteEcrituresPoint)
}
