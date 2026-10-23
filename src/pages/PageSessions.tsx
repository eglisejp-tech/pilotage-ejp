import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useCompteConnecte } from '@/features/session/contexte'
import { useActionsSessions, useSessionsAdmin } from '@/features/sessions/useSessionsAdmin'
import { VueSessions } from '@/features/sessions/VueSessions'
import { gereLOutil } from '@/lib/metier/droits'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/sessions`, écran 14 « Sessions » (lot L2), pour l'administration de l'église et EJP Tech
 * (T60) : `PageApplication` donne la page non disponible aux autres profils, sans requête. Les
 * lectures passent par la RLS (`v_session_completude`), les écritures par `declarer_session`,
 * `modifier_session` et `supprimer_session`. EJP Tech, qui ajoute les ministères, lit sans
 * ministère actif où les ajouter ; l'administration lit qu'EJP Tech les crée.
 */
export function PageSessions({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const compte = useCompteConnecte()
  const donnees = useSessionsAdmin()
  const actions = useActionsSessions()
  return (
    <VueSessions
      titre={titre}
      donnees={donnees}
      actions={actions}
      gestionMinisteres={gereLOutil(compte.type)}
    />
  )
}
