import { Fragment } from 'react'
import type { Segment } from '@/lib/metier/phrases'
import { lierNombres } from '@/lib/metier/texte'

interface Props {
  phrase: readonly Segment[]
}

/**
 * Phrase de la fiche (04, 12, la même pour tous) : seule la partie « Un point attend une
 * décision. » reçoit le surligneur jaune, le point final restant hors du surligneur. Un nombre
 * reste avec son mot (T69, proposition 8).
 */
export function PhraseFiche({ phrase }: Props) {
  return (
    <p className="max-w-[54rem] font-lecture text-[clamp(22px,2.2vw,26px)] leading-[1.3]">
      {phrase.map((segment, rang) =>
        segment.surligne ? (
          <mark key={rang} className="a-decider text-inherit">
            {lierNombres(segment.texte)}
          </mark>
        ) : (
          <Fragment key={rang}>{lierNombres(segment.texte)}</Fragment>
        ),
      )}
    </p>
  )
}
