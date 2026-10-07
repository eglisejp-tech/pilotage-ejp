import { useSearchParams } from 'react-router'
import { SaisieDimancheConnectee } from '@/features/saisie-chiffres/SaisieDimancheConnectee'
import { useRetourSaisie } from '@/features/saisie-session/useRetourSaisie'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/saisir/dimanche` (lot E3, maquette 08) : la saisie du dimanche de référence, ou du dimanche
 * de l'adresse (`?date=AAAA-MM-JJ`, « Corriger » de « Vos saisies »). Le profil « ministère » est
 * vérifié par `PageApplication` avant toute requête ; un compte de ministère sans ministère n'a
 * rien à saisir. EJP Tech, le berger, le conseil et l'administration reçoivent la page non
 * disponible, sans aucune requête.
 */
export function PageSaisieDimanche({ titre }: ProprietesPage) {
  const [parametres] = useSearchParams()
  const compte = useCompteConnecte()
  const retour = useRetourSaisie()
  if (!compte.ministereId) return <PageNonDisponible />
  return (
    <SaisieDimancheConnectee
      ministereId={compte.ministereId}
      parametreDate={parametres.get('date')}
      titre={titre}
      onFermer={retour}
    />
  )
}
