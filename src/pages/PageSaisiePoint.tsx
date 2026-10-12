import { SaisieNouveauPoint } from '@/features/nouveau-point/SaisieNouveauPoint'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

/**
 * `/saisir/point` (maquette 10, « Nouveau point d'attention »), pour un compte de ministère
 * seulement : `PageApplication` a déjà refusé les autres profils, sans requête. Le titre vient du
 * panneau, pas de `ProprietesPage`.
 */
export function PageSaisiePoint() {
  const compte = useCompteConnecte()
  if (compte.ministereId === null) return <PageNonDisponible />
  return <SaisieNouveauPoint ministereId={compte.ministereId} libelleCompte={compte.libelle} />
}
