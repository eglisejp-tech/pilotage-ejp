import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de W0 pour `/signaler` : le lot E8 la remplace (« Signaler une difficulté », T39). Les
 * formulaires de saisie y mènent déjà par `LienSignalement`.
 */
export function PageSignalement({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
