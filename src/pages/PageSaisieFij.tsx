import { SaisieCarteConnectee } from '@/features/saisie-fij/SaisieCarteConnectee'
import { useRetourSaisie } from '@/features/saisie-session/useRetourSaisie'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/saisir/fij` (lot E4) : la carte des FIJ, réservée au ministère `fij`. Un autre ministère
 * reçoit la page non disponible (`useSaisieCarte` lit d'abord le code du ministère) ; les autres
 * profils, dès `PageApplication`.
 */
export function PageSaisieFij({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  const retour = useRetourSaisie()
  if (!compte.ministereId) return <PageNonDisponible />
  return <SaisieCarteConnectee ministereId={compte.ministereId} titre={titre} onFermer={retour} />
}
