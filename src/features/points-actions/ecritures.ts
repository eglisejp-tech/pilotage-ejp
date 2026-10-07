import { createContext, useContext } from 'react'
import { changerStatutPoint, marquerTraite } from '@/data/pointsEcriture'
import type { StatutChoisi } from '@/data/pointsEcriture'

/**
 * Les deux écritures que lancent les boutons d'un point. Par défaut, les vraies fonctions de
 * l'API (`src/data/pointsEcriture.ts`). L'aperçu de développement (`/apercu/points-actions`) en
 * fournit des simulées par ce contexte, sans changer les propriétés d'`ActionsPoint`.
 */
export interface EcrituresPoint {
  changerStatut: (pointId: string, statut: StatutChoisi) => Promise<void>
  marquerTraite: (pointId: string, commentaire: string | null) => Promise<void>
}

const ECRITURES_REELLES: EcrituresPoint = {
  changerStatut: (pointId, statut) => changerStatutPoint(pointId, statut),
  marquerTraite: (pointId, commentaire) => marquerTraite(pointId, commentaire),
}

export const ContexteEcrituresPoint = createContext<EcrituresPoint>(ECRITURES_REELLES)

export function useEcrituresPoint(): EcrituresPoint {
  return useContext(ContexteEcrituresPoint)
}
