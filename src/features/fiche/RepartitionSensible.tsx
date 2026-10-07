import { useState } from 'react'
import type { RepartitionMois } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

interface Props {
  repartitions: RepartitionMois[]
}

/**
 * Répartition par catégorie d'un indicateur sensible (P47), repliée sous sa ligne : pour le
 * dernier mois saisi et le mois en cours, une ligne par catégorie (« Malaise : 4 », « Blessure :
 * 1 ») et « Non réparti : 1 ». Valeurs exactes pour le ministère, le berger, le conseil et EJP
 * Tech (P52). Mois sans répartition : « Pas de répartition pour septembre. ». Aucune somme de
 * l'année ni courbe par catégorie.
 */
export function RepartitionSensible({ repartitions }: Props) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <details
      open={ouvert}
      onToggle={(evenement) => setOuvert(evenement.currentTarget.open)}
      className="text-sm"
    >
      <summary className="inline-flex min-h-cible cursor-pointer items-center font-semibold text-encre underline underline-offset-4">
        {TEXTES_FICHE.repartition}
      </summary>
      <div className="flex flex-col gap-3 pb-2">
        {repartitions.map((repartition) => (
          <div key={repartition.mois} className="flex flex-col gap-1">
            <p className="font-semibold text-encre">{repartition.titre}</p>
            {repartition.etat === 'cases' ? (
              <ul className="flex flex-col">
                {repartition.cases.map((cas) => (
                  <li key={cas.libelle} className="flex min-h-7 items-center text-encre-2">
                    <span>
                      {cas.libelle} : <span className="font-semibold text-encre">{cas.texte}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-encre-2">{repartition.texte}</p>
            )}
          </div>
        ))}
      </div>
    </details>
  )
}
