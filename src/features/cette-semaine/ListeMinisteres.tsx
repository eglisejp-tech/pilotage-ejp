import { IndicateurFraicheur } from './IndicateurFraicheur'
import { NomMinistere } from './NomMinistere'
import type { LigneMinistere } from './types'

interface Props {
  ministeres: LigneMinistere[]
}

/** Les ministères sous 600 px (maquette 03) : le nom et la fraîcheur, dans l'ordre reçu. */
export function ListeMinisteres({ ministeres }: Props) {
  return (
    <ul>
      {ministeres.map((ministere) => (
        <li
          key={ministere.id}
          className="flex items-baseline justify-between gap-3 border-t border-filet py-3 text-[15px] first:border-t-0"
        >
          <span className="font-semibold">
            <NomMinistere ministere={ministere} />
          </span>
          <IndicateurFraicheur fraicheur={ministere.fraicheur} />
        </li>
      ))}
    </ul>
  )
}
