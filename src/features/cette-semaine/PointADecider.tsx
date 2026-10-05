import { useId } from 'react'
import { ChampLibre } from './ChampLibre'
import { couleursPriorite, libellesPriorite } from './priorites'
import type { PointADecider as DonneesPoint } from './types'

interface Props {
  point: DonneesPoint
}

/**
 * Un point de « À décider » : priorité, ministère et échéance, titre, description (cachée sur
 * téléphone, comme la maquette 03), action attendue et mentions. « Marquer traité » arrive avec
 * sa fenêtre à l'étape 5 : pas de bouton sans effet d'ici là (docs/decisions.md, T19). Il ne
 * s'affichera jamais quand la vue est en lecture seule (EJP Tech, `lectureSeule`, T29).
 */
export function PointADecider({ point }: Props) {
  const idTitre = useId()
  const avecAttendu = Boolean(point.attendu) || point.mentions.length > 0

  return (
    <article aria-labelledby={idTitre} className="flex flex-col gap-1.5 py-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p
          className={`font-chiffres text-[19px] font-extrabold tracking-[0.04em] uppercase ${couleursPriorite[point.priorite]}`}
        >
          <span className="sr-only">Priorité </span>
          {libellesPriorite[point.priorite]}
        </p>
        <p className="text-note text-encre-3">
          {point.ministere}
          {point.echeance ? (
            <>
              ,{' '}
              <span className={point.echeance.depassee ? 'font-semibold text-alerte' : undefined}>
                {point.echeance.texte}
                {point.echeance.depassee ? ', dépassée' : null}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <h3 id={idTitre} className="font-lecture text-[22px] leading-tight font-medium">
        <ChampLibre texte={point.titre} />
      </h3>
      {point.description ? (
        <p className="hidden text-[15px] leading-normal text-encre-2 min-[600px]:block">
          <ChampLibre texte={point.description} />
        </p>
      ) : null}
      {avecAttendu ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm text-encre-2">
          {point.attendu ? (
            <span>
              Attendu :{' '}
              <strong className="text-encre">
                <ChampLibre texte={point.attendu} />
              </strong>
            </span>
          ) : null}
          {/* Nom complet du ministère mentionné, sur une seule ligne : « @Prodiges Junior » (T24). */}
          {point.mentions.map((mention) => (
            <span
              key={mention}
              className="bg-nuit-pale px-1.5 py-px text-note whitespace-nowrap text-nuit"
            >
              @{mention}
            </span>
          ))}
        </p>
      ) : null}
    </article>
  )
}
