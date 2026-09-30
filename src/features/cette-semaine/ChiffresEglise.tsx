import { useId } from 'react'
import { ListeChiffres } from './ListeChiffres'
import { TableauChiffres } from './TableauChiffres'
import { TitreSection } from './TitreSection'
import type { LigneChiffre } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  /** « Les chiffres de l'église » ; « L'église cette semaine » pour un ministère. */
  titre: string
  lignes: LigneChiffre[]
  note: string
}

/** Bloc des chiffres de l'église : un tableau à partir de 600 px, une liste en dessous. */
export function ChiffresEglise({ titre, lignes, note }: Props) {
  const idTitre = useId()
  const tableau = useLargeurMin(600)

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={titre}
        complement={
          <span aria-hidden="true" className="hidden text-note text-encre-3 lg:inline">
            Ministères ayant saisi
          </span>
        }
      />
      {tableau ? (
        <TableauChiffres lignes={lignes} idTitre={idTitre} />
      ) : (
        <ListeChiffres lignes={lignes} />
      )}
      <p className="mt-2.5 text-note text-encre-3">{note}</p>
    </section>
  )
}
