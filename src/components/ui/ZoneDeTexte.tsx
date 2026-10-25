import type { Ref, TextareaHTMLAttributes } from 'react'
import { classesChamp } from '@/components/ui/Champ'
import { cn } from '@/lib/utils'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }

/**
 * Champ de plusieurs lignes (proposition 13, T69) : le modèle de Champ, sa hauteur suit `rows`.
 * Texte de 16 px au moins (proposition 3).
 */
export function ZoneDeTexte({ className, ...attributs }: Props) {
  return (
    <textarea
      {...attributs}
      className={cn(classesChamp(), 'h-auto px-3.5 py-2.5 leading-normal', className)}
    />
  )
}
