import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de C0 pour `/ma-fiche/indicateurs` (configuration-indicateurs.md, 7.3, « Mes
 * indicateurs ») : le lot L4 la remplace.
 */
export function PageMesIndicateurs({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={6} />
}
