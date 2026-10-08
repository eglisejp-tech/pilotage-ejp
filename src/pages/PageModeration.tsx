import { BandeauIndicateurs } from '@/features/moderation/BandeauIndicateurs'
import { EcranModeration } from '@/features/moderation/EcranModeration'
import { FileARelire } from '@/features/moderation/FileARelire'
import { useFileModeration, useIndicateursAValider } from '@/features/moderation/useModeration'
import { BlocSignalements } from '@/features/signalement/BlocSignalements'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/moderation`, l'accueil d'EJP Tech, écran 15 (lot L6) : en tête « N indicateurs attendent votre
 * validation » (s'il y a lieu), le bloc « Signalements » (lot E8, T39), puis la file « Champs
 * libres à relire ». `PageApplication` donne la page non disponible aux autres profils, sans
 * requête ; la base refuse de toute façon la file et les deux fonctions à tout autre compte.
 */
export function PageModeration({ titre }: ProprietesPage) {
  const indicateurs = useIndicateursAValider()
  const file = useFileModeration()
  return (
    <EcranModeration
      titre={titre}
      bandeau={indicateurs ? <BandeauIndicateurs indicateurs={indicateurs} /> : null}
      signalements={<BlocSignalements />}
      file={<FileARelire contenu={file} />}
    />
  )
}
