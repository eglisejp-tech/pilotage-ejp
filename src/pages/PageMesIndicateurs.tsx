import { useMesIndicateurs } from '@/features/mes-indicateurs/useMesIndicateurs'
import { VueMesIndicateurs } from '@/features/mes-indicateurs/VueMesIndicateurs'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Page d'un ministère connecté : ses lectures, son envoi et son retrait, branchés sur la base. */
function MesIndicateursDuMinistere({
  titre,
  ministereId,
}: ProprietesPage & { ministereId: string }) {
  const { donnees, envoyer, retirer } = useMesIndicateurs(ministereId)
  return <VueMesIndicateurs titre={titre} donnees={donnees} envoyer={envoyer} retirer={retirer} />
}

/**
 * `/ma-fiche/indicateurs`, « Mes indicateurs » (lot L4 ; configuration-indicateurs.md, 7.3), pour
 * le profil « ministère » seulement : `PageApplication` donne la page non disponible aux autres
 * profils, sans requête, et la garde est reprise ici pour un compte de ministère sans ministère.
 * Les lectures passent par la RLS du ministère, l'envoi d'une suggestion par `ajouter_suggestion`
 * et le retrait d'un ajout par `retirer_mon_indicateur` (T62).
 */
export function PageMesIndicateurs({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  if (compte.type !== 'ministere' || !compte.ministereId) return <PageNonDisponible />
  return <MesIndicateursDuMinistere titre={titre} ministereId={compte.ministereId} />
}
