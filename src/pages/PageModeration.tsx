import { BlocSignalements } from '@/features/signalement/BlocSignalements'
import { EcranModeration } from '@/features/signalement/EcranModeration'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/moderation`, l'accueil d'EJP Tech. Le bloc « Signalements » (lot E8, T39) est en tête de
 * l'écran ; la file de relecture des champs libres arrive à l'étape 6.
 */
export function PageModeration({ titre }: ProprietesPage) {
  return (
    <EcranModeration titre={titre}>
      <BlocSignalements />
    </EcranModeration>
  )
}
