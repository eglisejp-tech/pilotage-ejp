import { SaisieReunion } from '@/features/evenements/SaisieReunion'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

/**
 * `/saisir/reunion` : la prochaine réunion du ministère (panneau dérivé de 11), pour un compte de
 * ministère seulement (`PageApplication` refuse les autres profils, sans requête). Le titre
 * « Prochaine réunion » vient du panneau.
 */
export function PageSaisieReunion() {
  const compte = useCompteConnecte()
  if (compte.ministereId === null) return <PageNonDisponible />
  return <SaisieReunion ministereId={compte.ministereId} />
}
