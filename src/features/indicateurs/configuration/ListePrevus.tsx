import type { PrevuCatalogue } from '@/features/indicateurs/configuration/catalogue'
import { libelleRythme } from '@/lib/metier/indicateurs'

interface Props {
  prevus: readonly PrevuCatalogue[]
}

/** Prévus d'une liste : le libellé, le rythme et la mention d'un calcul. */
export function ListePrevus({ prevus }: Props) {
  return (
    <ul className="mt-3 w-full">
      {prevus.map((prevu) => (
        <li
          key={prevu.code}
          className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-filet py-2 text-interface"
        >
          <span className="min-w-0 break-words">{prevu.libelle}</span>
          <span className="text-note text-encre-3">
            {libelleRythme(prevu.nature)}
            {prevu.calcul !== null ? ', calcul' : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
