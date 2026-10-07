import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de C0 pour `/journal` (écran 06) et `/journal-technique` (EJP Tech) : le lot L5 la
 * remplace. Une seule page sert les deux adresses ; le profil décide de ce qui se lit.
 */
export function PageJournal({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={6} />
}
