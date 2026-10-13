import { useId } from 'react'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { ValeurLigne } from '@/features/fiche/ValeurLigne'
import type { LigneEglise } from './types'
import { TEXTES_MA_SEMAINE } from './textesMaSemaine'

interface Props {
  lignes: readonly LigneEglise[]
}

/**
 * « Dans l'église » : deux totaux de l'église au plus, chacun avec sa complétude (« 6 sur 8 »).
 * Aucun nom, aucune valeur et aucune complétude d'un autre ministère, aucun classement.
 */
export function DansLEglise({ lignes }: Props) {
  const idTitre = useId()
  if (lignes.length === 0) return null
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={TEXTES_MA_SEMAINE.titreEglise} />
      <ul className="flex flex-col">
        {lignes.map((ligne) => (
          <li
            key={ligne.cle}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-filet py-3"
          >
            <span className="col-start-1 min-w-0 text-base break-words">{ligne.libelle}</span>
            <span className="col-start-2 row-start-1 justify-self-end text-right">
              <ValeurLigne
                valeur={
                  ligne.valeur === null
                    ? { etat: 'vide' }
                    : { etat: 'saisie', texte: ligne.valeur, unite: null }
                }
              />
            </span>
            <span className="col-span-2 min-w-0 text-sm text-encre-3">{ligne.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
