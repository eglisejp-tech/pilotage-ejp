import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de W0 pour `/saisir/dimanche` : le lot E3 la remplace (saisie du dimanche, 08). */
export function PageSaisieDimanche({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
