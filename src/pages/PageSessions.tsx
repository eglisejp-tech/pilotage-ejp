import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useActionsSessions, useSessionsAdmin } from '@/features/sessions/useSessionsAdmin'
import { VueSessions } from '@/features/sessions/VueSessions'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/sessions`, écran 14 « Sessions » (lot L2), pour l'administration de l'église seulement :
 * `PageApplication` donne la page non disponible aux autres profils, sans requête. Les lectures
 * passent par la RLS (`v_session_completude`), les écritures par `declarer_session`,
 * `modifier_session` et `supprimer_session`.
 */
export function PageSessions({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const donnees = useSessionsAdmin()
  const actions = useActionsSessions()
  return <VueSessions titre={titre} donnees={donnees} actions={actions} />
}
