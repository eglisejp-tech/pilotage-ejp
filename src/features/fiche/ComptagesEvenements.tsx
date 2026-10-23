import type { FunctionComponent } from 'react'
import { ComptagesEvenementsLus } from '@/features/fiche/ComptagesEvenementsLus'
import { comptagesVisibles, retardsVisibles } from '@/features/fiche/construireComptages'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'

/**
 * Emplacement « Comptages d'événements » de la fiche (lot L2, X10 ; T68) : « Événements de
 * l'église » et « Ponctualité ». Les blocs n'existent que sur la fiche de Coordination, lue par
 * Coordination, le berger, le conseil et EJP Tech ; ils sont absents de toute autre fiche et de
 * l'administration, sans requête. La liste des retards par événement n'est pas pour Coordination,
 * qui ne lit que des totaux (K11).
 */
export const ComptagesEvenements: FunctionComponent<ProprietesEmplacementFiche> = ({
  ministereCode,
  profil,
}) => {
  if (!comptagesVisibles(ministereCode, profil)) return null
  return <ComptagesEvenementsLus avecRetards={retardsVisibles(profil)} />
}
