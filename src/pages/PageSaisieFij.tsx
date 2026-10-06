import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de W0 pour `/saisir/fij` : le lot E4 la remplace (carte des FIJ). Le ministère `fij`
 * seul y accède : un autre ministère reçoit la page non disponible, vérifiée par le lot E4.
 */
export function PageSaisieFij({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
