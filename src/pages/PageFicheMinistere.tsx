import { PageAVenir } from '@/pages/PageAVenir'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Amorce de W0 pour `/ministeres/:id` : le lot E2 la remplace (fiche 04, berger, conseil et EJP
 * Tech en lecture seule). Un ministère n'arrive jamais ici : `PageApplication` renvoie son propre
 * identifiant vers `/ma-fiche` et donne la page non disponible pour tout autre, sans requête.
 */
export function PageFicheMinistere({ titre }: ProprietesPage) {
  return <PageAVenir titre={titre} etape={4} />
}
