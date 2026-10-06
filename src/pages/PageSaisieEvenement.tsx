import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de W0 pour `/saisir/evenement` et `/saisir/evenement/:id` : le lot E5 la remplace
 * (ajout et mise à jour d'un événement, 11).
 */
export function PageSaisieEvenement({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
