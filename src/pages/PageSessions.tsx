import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de C0 pour `/sessions` (écran 14) : le lot L2 la remplace. */
export function PageSessions({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={6} />
}
