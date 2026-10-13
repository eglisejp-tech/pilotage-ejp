import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useListeMinisteres } from '@/features/ministeres/useListeMinisteres'
import { VueMinisteres } from '@/features/ministeres/VueMinisteres'
import { useCompteConnecte } from '@/features/session/contexte'
import { gereLOutil } from '@/lib/metier/droits'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/ministeres` (lot E2) : la liste des ministères actifs pour le berger, le conseil et EJP Tech
 * (lecture seule). Les autres profils reçoivent la page non disponible de `PageApplication`, sans
 * requête. EJP Tech, qui crée les ministères (T60), lit un état vide qui le lui dit.
 */
export function PageMinisteres({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const compte = useCompteConnecte()
  const liste = useListeMinisteres()
  return <VueMinisteres liste={liste} gestion={gereLOutil(compte.type)} />
}
