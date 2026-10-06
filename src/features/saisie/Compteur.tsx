import { nombre } from '@/lib/metier/texte'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  /** Nombre de caractères écrits. */
  valeur: number
  /** Limite du champ : 80 pour un nom ou un objet, 280 pour un commentaire ou un signalement. */
  max: number
  /** Le compteur s'affiche à partir de ce nombre de caractères (60 pour une limite de 80). */
  afficherDes?: number
}

/**
 * Compteur de caractères d'un champ libre : « 12 sur 80 », « 0 sur 280 ». Au-delà de la limite,
 * il passe en couleur d'alerte, le mot « sur » dit déjà la limite (jamais la couleur seule).
 */
export function Compteur({ id, valeur, max, afficherDes = 0 }: Props) {
  if (valeur < afficherDes) return null
  return (
    <p
      id={id}
      className={cn('text-note tabular-nums', valeur > max ? 'text-alerte' : 'text-encre-3')}
    >
      {nombre(valeur)} sur {nombre(max)}
    </p>
  )
}
