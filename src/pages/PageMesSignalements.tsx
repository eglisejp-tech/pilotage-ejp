import { useCompteConnecte } from '@/features/session/contexte'
import { MesSignalementsLus } from '@/features/signalement/MesSignalementsLus'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/signalements`, « Mes signalements » (T77) : le suivi des signalements du ministère connecté,
 * pour le profil « ministère » seulement. `PageApplication` refuse déjà les autres profils, sans
 * requête ; la page le vérifie encore avant toute lecture (le berger, le conseil, l'administration
 * et EJP Tech n'ont pas cette page : EJP Tech suit les signalements sur Modération).
 */
export function PageMesSignalements({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  if (compte.type !== 'ministere' || compte.ministereId === null) return <PageNonDisponible />
  return <MesSignalementsLus ministereId={compte.ministereId} titre={titre} />
}
