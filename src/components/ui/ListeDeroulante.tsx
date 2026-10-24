import type { VariantProps } from 'class-variance-authority'
import type { Ref, SelectHTMLAttributes } from 'react'
import { classesChamp } from '@/components/ui/Champ'
import { cn } from '@/lib/utils'

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> &
  VariantProps<typeof classesChamp> & {
    ref?: Ref<HTMLSelectElement>
    /** Classes de l'enveloppe (largeur, place dans la ligne) ; la liste la remplit. */
    className?: string
  }

/**
 * Liste déroulante (proposition 13, écart 6, T69) : le modèle de Champ, débarrassé du dessin du
 * système (coins arrondis et flèche de l'iPhone), avec une flèche dessinée à droite, celle de la
 * maquette 06 (« ▾ »), en `currentColor`. Un vrai `<select>`, nommé par son libellé.
 */
export function ListeDeroulante({ taille, className, children, ...attributs }: Props) {
  return (
    <span className={cn('relative flex min-w-0', className)}>
      <select
        {...attributs}
        className={cn(classesChamp({ taille }), 'cursor-pointer appearance-none pr-10')}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 10 6"
        className="pointer-events-none absolute top-1/2 right-3.5 h-1.5 w-2.5 -translate-y-1/2 fill-current text-encre"
      >
        <path d="M0 0h10L5 6z" />
      </svg>
    </span>
  )
}
