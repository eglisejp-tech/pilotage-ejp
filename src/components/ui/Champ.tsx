import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'

/**
 * Le modèle de champ (proposition 13, T69) : bordure encre, fond papier, angles droits, texte de
 * 16 px au moins (`text-texte`, 17 px à partir de 1440 px) pour que Safari sur iPhone ne zoome
 * pas (proposition 3). Bordure de 2 px en `--alerte` quand le champ est invalide.
 *
 * - taille : `formulaire` 52 px (maquettes 10, 11 et 14), `filtre` 44 px (filtres d'une liste,
 *   maquette 06).
 *
 * Partagé par Champ, ZoneDeTexte et ListeDeroulante.
 */
export const classesChamp = cva(
  'w-full min-w-0 border border-encre bg-papier text-texte font-normal text-encre aria-invalid:border-2 aria-invalid:border-alerte',
  {
    variants: {
      taille: {
        formulaire: 'h-13 px-3.5',
        filtre: 'h-cible px-3',
      },
    },
    defaultVariants: { taille: 'formulaire' },
  },
)

type Props = InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof classesChamp> & { ref?: Ref<HTMLInputElement> }

/**
 * Champ d'une ligne. Le libellé reste à l'écran qui l'utilise (`<label htmlFor>`), avec la
 * définition, le rappel et l'erreur reliés par `aria-describedby`.
 */
export function Champ({ taille, className, ...attributs }: Props) {
  return <input {...attributs} className={cn(classesChamp({ taille }), className)} />
}
