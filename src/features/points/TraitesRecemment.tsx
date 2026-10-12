import { useId } from 'react'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import type { LignePoint } from '@/features/points/modelePoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'

interface Props {
  /** Les 5 derniers points traités, du plus récent au plus ancien. */
  lignes: readonly LignePoint[]
}

/**
 * « Traités récemment » sous l'onglet Ouverts (maquette 05) : une ligne par point traité, avec
 * son ministère et « Traité le 26 sept. par Berger ». Trois colonnes à partir de 1024 px, trois
 * lignes empilées en dessous. Le bloc disparaît quand aucun point n'est traité : l'onglet
 * « Traités » dit déjà « Aucun point traité pour l'instant. ».
 */
export function TraitesRecemment({ lignes }: Props) {
  const idTitre = useId()
  if (lignes.length === 0) return null
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={TEXTES_POINTS.titreTraitesRecemment} />
      <ul role="list">
        {lignes.map((ligne) => (
          <li
            key={ligne.id}
            className="grid gap-x-5 gap-y-0.5 border-t border-filet py-3.5 text-[15px] first:border-t-0 lg:grid-cols-[minmax(0,1fr)_240px_280px] lg:items-baseline"
          >
            <p className="text-encre-2">
              <ChampLibre texte={ligne.titre} />
            </p>
            <p className="text-encre-3">{ligne.ministere}</p>
            <p className="text-encre-3">{ligne.traite?.texte}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
