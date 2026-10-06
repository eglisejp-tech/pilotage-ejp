import { FicheConnectee } from '@/features/fiche/FicheConnectee'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/ma-fiche` (lot E2, maquette 12) : la fiche du ministère connecté, avec ses boutons de saisie.
 * Le profil « ministère » est vérifié par `PageApplication` avant toute requête ; un compte de
 * ministère sans ministère n'a pas de fiche.
 */
export function PageMaFiche({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  if (compte.type !== 'ministere' || !compte.ministereId) return <PageNonDisponible />
  return <FicheConnectee ministereId={compte.ministereId} profil="ministere" titre={titre} />
}
