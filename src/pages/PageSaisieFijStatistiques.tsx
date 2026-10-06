import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de W0 pour `/saisir/fij-statistiques` : le lot E4 la remplace (chiffres par
 * département). Le ministère `fij` seul y accède, vérifié par le lot E4.
 */
export function PageSaisieFijStatistiques({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
