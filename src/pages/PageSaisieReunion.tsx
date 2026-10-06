import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de W0 pour `/saisir/reunion` : le lot E5 la remplace (prochaine réunion). */
export function PageSaisieReunion({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
