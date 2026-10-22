import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { FIN_DU_FONDU_MS } from '@/components/etats/tempsChargement'

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
 *
 * Le fondu ne joue qu'une fois, à l'arrivée : une fois fini (`FIN_DU_FONDU_MS`, deux fois sa
 * durée, pour ne jamais le couper), l'enveloppe reste (rien ne se remonte) mais perd sa classe. Ce
 * qui apparaît ensuite sous elle, sans nouvelle lecture (« Rien à valider. » après la dernière
 * demande validée), s'affiche sans animation.
 */
export function Arrivee({ fondu, mode = 'contenu', children }: Props) {
  const [arrive, setArrive] = useState(false)

  useEffect(() => {
    if (!fondu || arrive) return
    const minuterie = window.setTimeout(() => setArrive(true), FIN_DU_FONDU_MS)
    return () => window.clearTimeout(minuterie)
  }, [fondu, arrive])

  if (!fondu) return children
  return (
    <div data-arrivee={arrive ? undefined : mode} className={arrive ? 'contents' : CLASSES[mode]}>
      {children}
    </div>
  )
}

const CLASSES = {
  contenu: 'arrivee',
  sections: 'arrivee-sections',
  suite: 'arrivee-suite',
} as const
