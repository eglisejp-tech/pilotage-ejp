import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * État vide d'un bloc (docs/decisions.md, T22) : sous le titre et son filet, à la place du
 * contenu, une phrase qui dit ce qui manque, avec le rythme d'une ligne du bloc rempli. Jamais un
 * blanc, jamais un zéro qui aurait l'air d'une donnée. Le texte vient de TEXTES_VIDES.
 */
export function MessageVide({ children }: Props) {
  return <p className="max-w-prose py-[18px] text-encre-2">{children}</p>
}
