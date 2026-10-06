import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de W0 pour `/saisir/mois` : le lot E3 la remplace (chiffres du mois). */
export function PageSaisieMois({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
