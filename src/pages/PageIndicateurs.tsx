import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de C0 pour `/indicateurs` (configuration-indicateurs.md, 7.1) : le lot L3a la remplace.
 * Le bloc « À valider » vient de L4 par `BlocAValider`.
 */
export function PageIndicateurs({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={6} />
}
