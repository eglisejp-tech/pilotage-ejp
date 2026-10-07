import { useSearchParams } from 'react-router'
import { SaisieMoisConnectee } from '@/features/saisie-chiffres/SaisieMoisConnectee'
import { useRetourSaisie } from '@/features/saisie-session/useRetourSaisie'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/saisir/mois` (lot E3, « Chiffres du mois ») : le mois de l'adresse (`?mois=AAAA-MM`), ou le
 * dernier mois fini non saisi, sinon le mois en cours. Le profil « ministère » est vérifié par
 * `PageApplication` avant toute requête ; un compte de ministère sans ministère n'a rien à
 * saisir. Les autres profils, EJP Tech compris, reçoivent la page non disponible.
 */
export function PageSaisieMois({ titre }: ProprietesPage) {
  const [parametres] = useSearchParams()
  const compte = useCompteConnecte()
  const retour = useRetourSaisie()
  if (!compte.ministereId) return <PageNonDisponible />
  return (
    <SaisieMoisConnectee
      ministereId={compte.ministereId}
      parametreMois={parametres.get('mois')}
      titre={titre}
      onFermer={retour}
    />
  )
}
