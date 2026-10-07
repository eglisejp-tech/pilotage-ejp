import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de C0 pour `/points` (écran 05 ; « Mes points » pour le ministère) : le lot P3 la
 * remplace.
 */
export function PagePoints({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={5} />
}
