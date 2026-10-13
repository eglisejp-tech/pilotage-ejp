import { useEffect } from 'react'
import { signalerEcran } from '@/features/connexion/changementEcran'

/**
 * Titre de l'onglet : « {écran}, Pilotage EJP » (BRIEF section 10, « Textes »). L'écran se
 * signale aussi aux lecteurs d'écran (m254, `AnnonceDePage`) ; `annoncer` vaut faux pour une
 * fenêtre, dont le titre est lu quand le focus y entre.
 */
export function useTitrePage(ecran: string, { annoncer = true }: { annoncer?: boolean } = {}) {
  useEffect(() => {
    const precedent = document.title
    document.title = `${ecran}, Pilotage EJP`
    signalerEcran(ecran, annoncer)
    return () => {
      document.title = precedent
    }
  }, [ecran, annoncer])
}
