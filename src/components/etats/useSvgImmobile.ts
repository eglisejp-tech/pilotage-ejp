import { useEffect, useState } from 'react'
import { useMoinsDAnimations } from '@/components/etats/useMoinsDAnimations'

export interface DessinImmobile {
  /** À poser sur le `<svg>` (ref de rappel) : le dessin peut n'apparaître qu'après 300 ms. */
  ref: (dessin: SVGSVGElement | null) => void
  /** L'appareil demande moins d'animations : le composant le dit aussi dans le DOM. */
  immobile: boolean
}

/**
 * Arrête les animations SMIL d'un dessin quand l'appareil demande moins d'animations : le dessin
 * revient à sa première forme et ne bouge plus. Les animations CSS, elles, s'arrêtent par la règle
 * de src/styles/tokens.css. Le dessin est suivi par une ref de rappel : il est traité dès qu'il
 * apparaît, même après le premier rendu du composant.
 */
export function useSvgImmobile(): DessinImmobile {
  const immobile = useMoinsDAnimations()
  const [dessin, setDessin] = useState<SVGSVGElement | null>(null)

  useEffect(() => {
    if (dessin === null) return
    // jsdom et certains navigateurs anciens n'ont pas l'horloge SMIL.
    if (typeof dessin.pauseAnimations !== 'function') return
    if (immobile) {
      dessin.pauseAnimations()
      if (typeof dessin.setCurrentTime === 'function') dessin.setCurrentTime(0)
    } else {
      dessin.unpauseAnimations()
    }
  }, [dessin, immobile])

  return { ref: setDessin, immobile }
}
