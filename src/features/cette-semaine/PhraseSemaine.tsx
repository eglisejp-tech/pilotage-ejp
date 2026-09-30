import { Fragment } from 'react'
import type { MorceauPhrase } from './types'

interface Props {
  morceaux: MorceauPhrase[]
  /** Berger et conseil seulement : le surligneur marque ce qui attend une décision. */
  surligner: boolean
}

/** Phrase de la semaine : seule la partie « À décider » reçoit le surligneur jaune. */
export function PhraseSemaine({ morceaux, surligner }: Props) {
  return (
    <>
      {morceaux.map((morceau, index) =>
        surligner && morceau.aDecider ? (
          <mark key={index} className="a-decider text-inherit">
            {morceau.texte}
          </mark>
        ) : (
          <Fragment key={index}>{morceau.texte}</Fragment>
        ),
      )}
    </>
  )
}
