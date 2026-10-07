import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useListeMinisteres } from '@/features/ministeres/useListeMinisteres'
import { VueMinisteres } from '@/features/ministeres/VueMinisteres'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/ministeres` (lot E2) : la liste des ministères actifs pour le berger, le conseil et EJP Tech
 * (lecture seule). Les autres profils reçoivent la page non disponible de `PageApplication`, sans
 * requête.
 */
export function PageMinisteres({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const liste = useListeMinisteres()
  return <VueMinisteres liste={liste} />
}
