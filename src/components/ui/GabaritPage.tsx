import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** L'en-tête (EnTetePage), puis les sections de l'écran, dans l'ordre de lecture. */
  children: ReactNode
  className?: string
}

/**
 * Gabarit de page commun (proposition 14, T69) : l'en-tête puis les sections, séparés par un
 * seul écart nommé (`gap-sections`, 48 px, écart 7). La largeur et les marges de la page
 * viennent de la mise en page connectée (contenu plafonné à 1280 px).
 */
export function GabaritPage({ children, className }: Props) {
  return <div className={cn('flex flex-col gap-sections', className)}>{children}</div>
}
