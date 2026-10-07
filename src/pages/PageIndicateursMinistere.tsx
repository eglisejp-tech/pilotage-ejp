import { useParams } from 'react-router'
import { estIdentifiantMinistere } from '@/features/fiche/useFiche'
import { useCreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { useConfigurationMinistere } from '@/features/indicateurs/configuration/useLecturesConfiguration'
import { VueIndicateursMinistere } from '@/features/indicateurs/configuration/VueIndicateursMinistere'
import { useCompteConnecte } from '@/features/session/contexte'
import type { TypeCompte } from '@/lib/base'
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
  if (!autorise) return <PageNonDisponible />
  // `key` : d'une adresse /indicateurs/:id à l'autre (précédent, suivant), React garde la page. Le
  // contenu repart de zéro, pour qu'un refus obtenu sur un ministère ne reste pas sur le suivant.
  return <ContenuIndicateursMinistere key={id ?? ''} id={id} titre={titre} profil={compte.type} />
}

interface PropsContenu {
  id: string | undefined
  titre: string
  profil: TypeCompte
}

/** Les lectures et la création des prévus d'un ministère, pour un profil qui a la page. */
function ContenuIndicateursMinistere({ id, titre, profil }: PropsContenu) {
  const identifiantValide = estIdentifiantMinistere(id)
  const ministere = useConfigurationMinistere(id ?? '', identifiantValide)
  const creation = useCreationPrevus()
  return (
    <VueIndicateursMinistere
      titre={titre}
      profil={profil}
      ministere={identifiantValide ? ministere : { etat: 'introuvable' }}
      creation={creation}
    />
  )
}
