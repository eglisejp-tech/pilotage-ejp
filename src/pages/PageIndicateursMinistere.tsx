import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de C0 pour `/indicateurs/:id` (configuration-indicateurs.md, 7.2) : le lot L3a la remplace. */
export function PageIndicateursMinistere({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={6} />
}
