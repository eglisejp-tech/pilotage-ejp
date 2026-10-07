import { useId } from 'react'
import { ChampLibre as Libre } from '@/features/cette-semaine/ChampLibre'
import { PoseActionsPoint } from '@/features/cette-semaine/PoseActionsPoint'
import { couleursPriorite } from '@/features/cette-semaine/priorites'
import type { PointFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'
import { LIBELLE_PRIORITE } from '@/lib/metier/points'
import { cn } from '@/lib/utils'

interface Props {
  point: PointFiche
  /** Compte connecté, pour les boutons du point. Null ou absent : lecture seule (EJP Tech, T29). */
  compte?: CompteDesActions | null
}

/**
 * Un point de la fiche (maquettes 04, 07 et 12) : priorité, ministère créateur et échéance, titre,
 * description, action attendue et mentions ; « Mentionné par Intégration. » pour le ministère
 * mentionné ; puis les boutons « Changer le statut » et « Marquer traité » (`ActionsPoint`,
 * étape 5), jamais pour EJP Tech (T29) ni sur un point traité ; « Traité le 30 sept. » et le
 * commentaire pour un point traité depuis 7 jours.
 */
export function CartePointFiche({ point, compte = null }: Props) {
  const idTitre = useId()
  const avecAttendu = point.attendu !== null || point.mentions.length > 0
  return (
    <article aria-labelledby={idTitre} className="flex flex-col gap-1.5 py-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p
          className={cn(
            'font-chiffres text-[19px] font-extrabold tracking-[0.04em] uppercase',
            point.traite === null ? couleursPriorite[point.priorite] : 'text-encre-3',
          )}
        >
          <span className="sr-only">Priorité </span>
          {LIBELLE_PRIORITE[point.priorite]}
        </p>
        <p className="text-note text-encre-3">
          {point.ministere}
          {point.echeance ? (
            <>
              ,{' '}
              <span className={cn(point.echeance.depassee && 'font-semibold text-alerte')}>
                {point.echeance.texte}
                {point.echeance.depassee ? TEXTES_FICHE.points.depassee : null}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <h3 id={idTitre} className="font-lecture text-[22px] leading-tight font-medium">
        <Libre texte={point.titre} />
      </h3>
      {point.description ? (
        <p className="text-[15px] leading-normal text-encre-2">
          <Libre texte={point.description} />
        </p>
      ) : null}
      {avecAttendu ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm text-encre-2">
          {point.attendu ? (
            <span>
              {TEXTES_FICHE.points.attendu}{' '}
              <strong className="text-encre">
                <Libre texte={point.attendu} />
              </strong>
            </span>
          ) : null}
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
      {point.mentionnePar !== null ? (
        <p className="text-note text-encre-3">
          {TEXTES_FICHE.points.mentionnePar(point.mentionnePar)}
        </p>
      ) : null}
      <PoseActionsPoint point={point} compte={compte} />
      {point.traite !== null ? (
        <p className="text-sm text-encre-2">
          <span className="font-semibold text-bien">{point.traite.texte}</span>
          {point.traite.commentaire !== null ? (
            <>
              {' '}
              « <Libre texte={point.traite.commentaire} /> »
            </>
          ) : null}
        </p>
      ) : null}
    </article>
  )
}
