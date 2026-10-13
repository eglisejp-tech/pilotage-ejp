import { useEffect, useRef } from 'react'
import { fermerEcran, ouvrirEcran, signalerEcran } from '@/features/connexion/changementEcran'
import type { EcranOuvert } from '@/features/connexion/changementEcran'

/**
 * Titre de l'onglet : « {écran}, Pilotage EJP » (BRIEF section 10, « Textes »). L'écran se
 * signale aussi aux lecteurs d'écran (m254, `AnnonceDePage`) ; `annoncer` vaut faux pour une
 * fenêtre, dont le titre est lu quand le focus y entre. À son démontage, l'écran qu'il couvrait
 * s'annonce de nouveau.
 */
export function useTitrePage(ecran: string, { annoncer = true }: { annoncer?: boolean } = {}) {
  const ouvert = useRef<EcranOuvert | null>(null)

  // Une place dans la pile des écrans pour toute la vie du composant : un changement de nom (le
  // nom du ministère qui arrive) ne fait pas revenir l'écran d'en dessous.
  useEffect(() => {
    const place = ouvrirEcran()
    ouvert.current = place
    return () => {
      ouvert.current = null
      fermerEcran(place)
    }
  }, [])

  useEffect(() => {
    const precedent = document.title
    document.title = `${ecran}, Pilotage EJP`
    if (ouvert.current) signalerEcran(ouvert.current, ecran, annoncer)
    return () => {
      document.title = precedent
    }
  }, [ecran, annoncer])
}
