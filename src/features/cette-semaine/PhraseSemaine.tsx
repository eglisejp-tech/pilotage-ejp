import { Fragment } from 'react'
import { lierNombres } from '@/lib/metier/texte'
import type { MorceauPhrase } from './types'

interface Props {
  morceaux: MorceauPhrase[]
  /** Berger et conseil seulement : le surligneur marque ce qui attend une décision. */
  surligner: boolean
}

/**
 * Phrase de la semaine : seule la partie « À décider » reçoit le surligneur jaune. Un nombre
 * reste avec son mot (« 2 ministères », « un point ») : le surligneur ne commence jamais par un
 * mot seul en fin de ligne (T69, proposition 8).
 */
export function PhraseSemaine({ morceaux, surligner }: Props) {
  return (
    <>
      {morceaux.map((morceau, index) =>
        surligner && morceau.aDecider ? (
          <mark key={index} className="a-decider text-inherit">
            {lierNombres(morceau.texte)}
          </mark>
        ) : (
          <Fragment key={index}>{lierNombres(morceau.texte)}</Fragment>
        ),
      )}
    </>
  )
}
