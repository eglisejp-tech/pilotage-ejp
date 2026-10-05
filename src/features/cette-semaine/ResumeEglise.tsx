import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ListeChiffres } from './ListeChiffres'
import { TitreSection } from './TitreSection'
import type { LigneChiffre } from './types'

interface Props {
  /** Les trois chiffres du résumé : service, en FIJ, dernière session. */
  resume: LigneChiffre[]
  /** Les six lignes des chiffres de l'église, montrées par « Tout voir ». */
  chiffres: LigneChiffre[]
  note: string
  /** Blocs montrés par « Tout voir », après les chiffres : session, carte, ministères. */
  children: ReactNode
}

/**
 * « L'église cette semaine » d'un ministère sous 600 px (BRIEF section 9, « Accueil du
 * ministère » ; maquette 07) : trois chiffres, puis « Tout voir » (`aria-expanded`) déplie sur
 * place les six chiffres, la session, la carte des FIJ et les ministères.
 */
export function ResumeEglise({ resume, chiffres, note, children }: Props) {
  const idTitre = useId()
  const idContenu = useId()
  const [deplie, setDeplie] = useState(false)

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre="L'église cette semaine"
        complement={
          <button
            type="button"
            aria-expanded={deplie}
            aria-controls={idContenu}
            onClick={() => setDeplie((avant) => !avant)}
            className="-my-3 inline-flex min-h-cible min-w-cible items-center justify-end text-sm text-nuit underline underline-offset-4"
          >
            {deplie ? 'Voir moins' : 'Tout voir'}
          </button>
        }
      />
      <div id={idContenu} className="flex flex-col">
        {deplie ? (
          <>
            <ListeChiffres lignes={chiffres} />
            <p className="mt-2.5 text-note text-encre-3">{note}</p>
            <div className="mt-9 flex flex-col gap-9">{children}</div>
          </>
        ) : (
          <ListeChiffres lignes={resume} compacte />
        )}
      </div>
    </section>
  )
}
