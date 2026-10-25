import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useListeMinisteres } from '@/features/ministeres/useListeMinisteres'
import { VueMinisteres } from '@/features/ministeres/VueMinisteres'
import { useCompteConnecte } from '@/features/session/contexte'
import { gereLOutil } from '@/lib/metier/droits'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/ministeres` (lot E2) : la liste des ministères actifs pour le berger, le conseil et EJP Tech
 * (lecture seule). Les autres profils reçoivent la page non disponible de `PageApplication`, sans
 * requête. EJP Tech, qui crée les ministères (T60), lit un état vide qui le lui dit, et le repère
 * « Prévus : à choisir » d'un ministère sans liste d'indicateurs prévus choisie (T72).
 */
export function PageMinisteres({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const compte = useCompteConnecte()
  const gestion = gereLOutil(compte.type)
  const liste = useListeMinisteres(gestion)
  return <VueMinisteres liste={liste} gestion={gestion} />
}
