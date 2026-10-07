import { useCompteConnecte } from '@/features/session/contexte'
import { BlocSignalementsLu } from '@/features/signalement/BlocSignalementsLu'

/**
 * Emplacement du bloc « Signalements » sur l'accueil d'EJP Tech (`/moderation`), au-dessus du
 * reste de l'écran Modération (T39). Seul EJP Tech lit les signalements et peut les clore : pour
 * tout autre compte, le bloc ne rend rien et ne lit rien (le berger, le conseil et
 * l'administration ne lisent aucun signalement).
 */
export function BlocSignalements() {
  const compte = useCompteConnecte()
  if (compte.type !== 'admin_plateforme') return null
  return <BlocSignalementsLu />
}
