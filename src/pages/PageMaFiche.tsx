import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de W0 pour `/ma-fiche` : le lot E2 la remplace (fiche 12, ministère). */
export function PageMaFiche({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
