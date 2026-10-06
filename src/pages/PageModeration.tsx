import { BlocSignalements } from '@/features/signalement/BlocSignalements'
import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/moderation`, l'accueil d'EJP Tech. L'écran de modération arrive à l'étape 6 : jusque-là, le
 * bloc « Signalements » (lot E8) se pose au-dessus du message « à venir ».
 */
export function PageModeration({ titre }: ProprietesPage) {
  return (
    <>
      <BlocSignalements />
      <PageAVenir titre={titre} etape={6} />
    </>
  )
}
