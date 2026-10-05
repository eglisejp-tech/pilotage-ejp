import { useId } from 'react'
import { ListeMinisteres } from './ListeMinisteres'
import { MessageVide } from './MessageVide'
import { TableauMinisteres } from './TableauMinisteres'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { LigneMinistere } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  ministeres: LigneMinistere[]
  avecColonnesConseil: boolean
}

/**
 * Bloc « Les ministères » : un tableau à partir de 600 px, une liste en dessous. Sans ministère
 * actif, ni tableau ni en-têtes vides : la phrase de TEXTES_VIDES.
 */
export function LesMinisteres({ ministeres, avecColonnesConseil }: Props) {
  const idTitre = useId()
  const tableau = useLargeurMin(600)
  const vide = ministeres.length === 0

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre="Les ministères"
        complement={
          vide ? null : (
            <span className="hidden text-note text-encre-3 lg:inline">
              Du moins récent au plus récent
            </span>
          )
        }
      />
      {vide ? (
        <MessageVide>{TEXTES_VIDES.ministeres.aucun}</MessageVide>
      ) : tableau ? (
        <TableauMinisteres
          ministeres={ministeres}
          avecColonnesConseil={avecColonnesConseil}
          idTitre={idTitre}
        />
      ) : (
        <ListeMinisteres ministeres={ministeres} />
      )}
    </section>
  )
}
