import { useState } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { RepartitionMois } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { cn } from '@/lib/utils'

interface Props {
  repartitions: RepartitionMois[]
  /** Pose l'aide `fiche.repartition` sur la première case « masqué » (berger, conseil, EJP Tech). */
  avecAide: boolean
}

/**
 * Répartition par catégorie d'un indicateur sensible (P47), repliée sous sa ligne : pour le
 * dernier mois saisi et le mois en cours, une ligne par catégorie (« Malaise : 4 », « Blessure :
 * moins de 3 », « Autre : masqué ») et « Non réparti : 1 ». Le ministère lit ses valeurs exactes.
 * Mois sans répartition : « Pas de répartition pour septembre. » ; répartition protégée en
 * entier : « Répartition masquée pour protéger les petits nombres. ». Aucune somme de l'année ni
 * courbe par catégorie.
 */
export function RepartitionSensible({ repartitions, avecAide }: Props) {
  const [ouvert, setOuvert] = useState(false)
  // La première case « masqué », dans l'ordre d'affichage, porte l'aide.
  const premiereMasquee = avecAide
    ? repartitions.flatMap((repartition) =>
        repartition.etat === 'cases'
          ? repartition.cases
              .filter((cas) => cas.masquee)
              .map((cas) => `${repartition.mois} ${cas.libelle}`)
          : [],
      )[0]
    : undefined
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
                {repartition.cases.map((cas) => {
                  const aide = premiereMasquee === `${repartition.mois} ${cas.libelle}`
                  return (
                    <li key={cas.libelle} className="flex min-h-7 items-center text-encre-2">
                      <span>
                        {cas.libelle} :{' '}
                        <span
                          className={cn(cas.masquee ? 'text-encre-3' : 'font-semibold text-encre')}
                        >
                          {cas.texte}
                        </span>
                      </span>
                      {aide ? (
                        <Aide
                          code="fiche.repartition"
                          libelle={`${cas.libelle} : ${cas.texte}`}
                          placement="flottante"
                        />
                      ) : null}
                    </li>
                  )
                })}
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
