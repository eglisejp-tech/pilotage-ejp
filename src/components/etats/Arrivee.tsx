import type { ReactNode } from 'react'

interface Props {
  /** Une lecture a précédé le contenu (`useAttenteChargement`) : il arrive en fondu. */
  fondu: boolean
  /**
   * Ce que le chargement montrait déjà ne revient pas en fondu. `contenu` (par défaut) : tout le
   * contenu arrive en fondu. `sections` : les titres de section restent, le reste arrive en fondu
   * (Cette semaine, Ma semaine). `suite` : l'en-tête de la page (titre et phrase) reste, la suite
   * arrive en fondu (Journal, Points).
   */
  mode?: 'contenu' | 'sections' | 'suite'
  children: ReactNode
}

/**
 * Le contenu qui remplace un chargement arrive en fondu de 180 ms, avec 4 px de montée (T65).
 * Sans lecture préalable (données déjà en mémoire), le contenu s'affiche tel quel, sans
 * enveloppe : l'enveloppe n'apparaît qu'après un chargement, quand le contenu arrive de toute
 * façon. L'enveloppe ne fait pas de boîte (`display: contents`, src/index.css) : la mise en page
 * du parent (flex, grille, écarts) ne change pas, chaque élément du contenu porte le fondu. Avec
 * moins d'animations, la règle de src/styles/tokens.css retire le fondu.
 */
export function Arrivee({ fondu, mode = 'contenu', children }: Props) {
  if (!fondu) return children
  return (
    <div data-arrivee={mode} className={CLASSES[mode]}>
      {children}
    </div>
  )
}

const CLASSES = {
  contenu: 'arrivee',
  sections: 'arrivee-sections',
  suite: 'arrivee-suite',
} as const
