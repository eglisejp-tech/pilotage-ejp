import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Amorce de W0 pour `/saisir/session/:id` : le lot E4 la remplace (saisie d'une session, 09). */
export function PageSaisieSession({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
