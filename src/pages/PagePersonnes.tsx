import { usePersonnes } from '@/features/personnes/usePersonnes'
import { VuePersonnes } from '@/features/personnes/VuePersonnes'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/personnes`, onglet d'EJP Tech (T56) : qui utilise chaque compte de ministère, et l'effacement
 * d'un prénom. `PageApplication` donne la page non disponible aux autres profils, sans requête ;
 * la base ne leur rend de toute façon aucun prénom.
 */
export function PagePersonnes({ titre }: ProprietesPage) {
  const { resultat, actions } = usePersonnes()
  return <VuePersonnes titre={titre} resultat={resultat} actions={actions} />
}
