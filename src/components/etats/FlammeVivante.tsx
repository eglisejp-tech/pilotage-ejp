import { FlammeAnimee } from '@/components/etats/FlammeAnimee'
import { useSvgImmobile } from '@/components/etats/useSvgImmobile'

/**
 * La flamme vivante d'une page qui charge (T65, moment 2), 52 x 72 px. Dessin seulement
 * (`aria-hidden`) : le texte qui l'accompagne dit ce qui charge.
 */
export function FlammeVivante() {
  const { ref, immobile } = useSvgImmobile()
  return (
    <svg
      ref={ref}
      viewBox="72 80 30 50"
      aria-hidden="true"
      focusable="false"
      data-flamme="vivante"
      data-immobile={immobile ? '' : undefined}
      className="h-[72px] w-[52px] shrink-0 overflow-visible"
    >
      <FlammeAnimee />
    </svg>
  )
}
