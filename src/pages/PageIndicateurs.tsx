import { useCreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { useConfigurationIndicateurs } from '@/features/indicateurs/configuration/useLecturesConfiguration'
import { VueIndicateurs } from '@/features/indicateurs/configuration/VueIndicateurs'
import { BlocAValider } from '@/features/indicateurs/validation/BlocAValider'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/indicateurs` (lot L3a ; configuration-indicateurs.md, 7.1) : la phrase de l'église, le bloc
 * « À valider » (lot L4) et le tableau des ministères avec leurs prévus, pour l'administration de
 * l'église et EJP Tech. Les autres profils reçoivent la page non disponible de `PageApplication`,
 * sans requête ; la garde est reprise ici pour que la page ne lise rien en dehors de ces deux
 * profils.
 */
export function PageIndicateurs({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  const autorise = compte.type === 'admin_eglise' || compte.type === 'admin_plateforme'
  const configuration = useConfigurationIndicateurs(compte.type, autorise)
  const creation = useCreationPrevus()
  if (!autorise) return <PageNonDisponible />
  return (
    <VueIndicateurs
      titre={titre}
      profil={compte.type}
      configuration={configuration}
      creation={creation}
      blocAValider={<BlocAValider profil={compte.type} />}
    />
  )
}
