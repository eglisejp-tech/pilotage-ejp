import { useParams } from 'react-router'
import { estIdentifiantMinistere } from '@/features/fiche/useFiche'
import { useCreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { useConfigurationMinistere } from '@/features/indicateurs/configuration/useLecturesConfiguration'
import { VueIndicateursMinistere } from '@/features/indicateurs/configuration/VueIndicateursMinistere'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/indicateurs/:id` (lot L3a ; configuration-indicateurs.md, 7.2) : les indicateurs d'un
 * ministère et ses prévus à créer, pour l'administration de l'église et EJP Tech. Un identifiant
 * mal formé donne « Ce ministère n'existe pas ou n'est plus actif. », sans requête. Les autres
 * profils reçoivent la page non disponible, sans requête.
 */
export function PageIndicateursMinistere({ titre }: ProprietesPage) {
  const { id } = useParams()
  const compte = useCompteConnecte()
  const autorise = compte.type === 'admin_eglise' || compte.type === 'admin_plateforme'
  const identifiantValide = estIdentifiantMinistere(id)
  const ministere = useConfigurationMinistere(id ?? '', autorise && identifiantValide)
  const creation = useCreationPrevus()
  if (!autorise) return <PageNonDisponible />
  return (
    <VueIndicateursMinistere
      titre={titre}
      profil={compte.type}
      ministere={identifiantValide ? ministere : { etat: 'introuvable' }}
      creation={creation}
    />
  )
}
