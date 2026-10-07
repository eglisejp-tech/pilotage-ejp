import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de C0 pour `/saisir/point` (maquette 10, « Nouveau point ») : le lot P2 la remplace. */
export function PageSaisiePoint({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={5} />
}
