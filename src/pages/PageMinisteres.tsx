import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de W0 pour `/ministeres` : le lot E2 la remplace (liste des ministères). */
export function PageMinisteres({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
