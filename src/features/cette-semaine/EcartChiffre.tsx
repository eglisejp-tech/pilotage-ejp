import type { Ecart } from './types'

const couleurs: Record<Ecart['sens'], string> = {
  hausse: 'text-bien',
  baisse: 'text-alerte',
  stable: 'text-encre-3',
}

interface Props {
  ecart: Ecart
  className?: string
}

/** Écart à périmètre égal : le nombre signé se lit, la couleur ne fait que le doubler. */
export function EcartChiffre({ ecart, className = '' }: Props) {
  return (
    <span className={`font-bold whitespace-nowrap ${couleurs[ecart.sens]} ${className}`}>
      <span aria-hidden="true">{ecart.texte}</span>
      <span className="sr-only">{ecart.description}</span>
    </span>
  )
}
