import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de C0 pour `/comptes` (écran 13, « Ministères et comptes ») : le lot L1 la remplace. */
export function PageComptes({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={6} />
}
