import { GardeMinistereFij } from '@/features/saisie-fij/GardeMinistereFij'
import { SaisieStatistiquesConnectee } from '@/features/saisie-fij/SaisieStatistiquesConnectee'
import { useRetourSaisie } from '@/features/saisie-session/useRetourSaisie'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/saisir/fij-statistiques` (lot E4) : les chiffres par département, réservés au ministère
 * `fij`. Un autre ministère reçoit la page non disponible (`GardeMinistereFij`).
 */
export function PageSaisieFijStatistiques({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  const retour = useRetourSaisie()
  if (!compte.ministereId) return <PageNonDisponible />
  return (
    <GardeMinistereFij ministereId={compte.ministereId} titre={titre}>
      <SaisieStatistiquesConnectee titre={titre} onFermer={retour} />
    </GardeMinistereFij>
  )
}
