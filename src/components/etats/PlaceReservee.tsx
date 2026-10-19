import { useApresDelai } from '@/components/etats/useApresDelai'
import { cn } from '@/lib/utils'

interface Props {
  /** Hauteur (et au besoin largeur) de la place, en classes Tailwind : `h-24`, `h-8 w-4/5`. */
  className?: string
}

/**
 * Place réservée au contenu pendant un chargement (T65) : un aplat gris, immobile. Pas de
 * scintillement : l'étude de Viget trouve les silhouettes qui scintillent plus lentes à l'œil.
 * La place tient sa taille dès le départ (rien ne bouge), mais le gris n'apparaît qu'après
 * 300 ms, avec l'indicateur : une réponse rapide ne fait rien clignoter. Purement visuelle
 * (`aria-hidden`) : le texte de l'indicateur dit ce qui charge.
 */
export function PlaceReservee({ className }: Props) {
  const visible = useApresDelai()
  return (
    <div
      aria-hidden="true"
      data-place-reservee={visible ? 'visible' : 'attente'}
      className={cn(visible ? 'bg-filet/60' : 'bg-transparent', className)}
    />
  )
}
