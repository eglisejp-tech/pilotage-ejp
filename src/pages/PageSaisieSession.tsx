import { useParams } from 'react-router'
import { ChoixSessionConnecte } from '@/features/saisie-session/ChoixSessionConnecte'
import { SaisieSessionConnectee } from '@/features/saisie-session/SaisieSessionConnectee'
import { CHOIX_SESSION } from '@/features/saisie-session/session'
import { useRetourSaisie } from '@/features/saisie-session/useRetourSaisie'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/saisir/session/:id` (lot E4, maquette 09) : la saisie de la session `id`, ou le panneau
 * « Choisir la session » pour `/saisir/session/choisir`. Le profil « ministère » est vérifié par
 * `PageApplication` avant toute requête ; un compte de ministère sans ministère n'a rien à saisir.
 */
export function PageSaisieSession({ titre }: ProprietesPage) {
  const { id } = useParams()
  const compte = useCompteConnecte()
  const retour = useRetourSaisie()
  const ministereId = compte.ministereId
  if (!ministereId) return <PageNonDisponible />
  if (!id || id === CHOIX_SESSION) {
    return <ChoixSessionConnecte ministereId={ministereId} onFermer={retour} />
  }
  return (
    <SaisieSessionConnectee
      key={id}
      sessionId={id}
      ministereId={ministereId}
      titre={titre}
      onFermer={retour}
    />
  )
}
