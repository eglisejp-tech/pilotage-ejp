import { useId } from 'react'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { couleursPriorite, libellesPriorite } from '@/features/cette-semaine/priorites'
import { RANGEE_POINTS } from '@/features/points/colonnesPoints'
import type { LignePoint as DonneesLigne } from '@/features/points/modelePoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import { ActionsPoint } from '@/features/points-actions/ActionsPoint'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'
import { cn } from '@/lib/utils'

interface Props {
  ligne: DonneesLigne
  compte: CompteDesActions
}

/**
 * Une rangée de l'écran 05 (maquette 05) : priorité, point (titre, description, attendu, ministère
 * et ses puces de mentions, lues « mentionne @Coordination »), statut, échéance et boutons. À
 * partir de 1024 px, ce sont les colonnes du tableau, héritées de sa grille ; en dessous, une carte (priorité et échéance en tête, puis le point, le statut et les
 * boutons), comme « À décider ». Un point traité n'a ni échéance ni bouton : il dit « Traité le
 * 30 sept. par Coordination » et cite son commentaire. L'échéance dépassée est en rouge et porte
 * le mot « dépassée ». Les boutons viennent de `ActionsPoint` (lot P1) ; il ne rend rien pour
 * EJP Tech, pour l'administration, ni pour un point traité.
 */
export function LignePoint({ ligne, compte }: Props) {
  const idTitre = useId()
  const traite = ligne.traite !== null
  return (
    <article
      aria-labelledby={idTitre}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 py-[18px]',
        RANGEE_POINTS,
        'ordinateur:items-start',
      )}
    >
      <p
        className={cn(
          'col-start-1 row-start-1 font-chiffres text-priorite uppercase ordinateur:col-start-1',
          traite ? 'text-encre-3' : couleursPriorite[ligne.priorite],
        )}
      >
        <span className="sr-only">{TEXTES_POINTS.priorite}</span>
        {libellesPriorite[ligne.priorite]}
      </p>

      <div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-1 ordinateur:col-span-1 ordinateur:col-start-2 ordinateur:row-start-1">
        <h3 id={idTitre} className="font-lecture text-titre-point">
          <ChampLibre texte={ligne.titre} />
        </h3>
        {ligne.description ? (
          <p className="text-interface leading-normal text-encre-2">
            <ChampLibre texte={ligne.description} />
          </p>
        ) : null}
        {ligne.attendu ? (
          <p className="text-detail text-encre-2">
            {TEXTES_POINTS.attendu}{' '}
            <strong className="font-semibold text-encre">
              <ChampLibre texte={ligne.attendu} />
            </strong>
          </p>
        ) : null}
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-detail text-encre-3">
          <span>
            {ligne.ministere}
            {ligne.mentions.length > 0 ? (
              <span className="sr-only"> {TEXTES_POINTS.mentionne}</span>
            ) : null}
          </span>
          {ligne.mentions.map((mention) => (
            <span
              key={mention}
              className="bg-nuit-pale px-1.5 py-px text-note whitespace-nowrap text-nuit"
            >
              @{mention}
            </span>
          ))}
        </p>
        {ligne.traite !== null ? (
          <p className="text-detail text-encre-2">
            <span className="font-semibold text-bien">{ligne.traite.texte}</span>
            {ligne.traite.commentaire !== null ? (
              <>
                {' '}
                « <ChampLibre texte={ligne.traite.commentaire} /> »
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* Sous 1024 px, un point traité le dit déjà dans « Traité le … par … » : pas de statut. */}
      <p
        className={cn(
          'col-span-2 row-start-3 text-interface ordinateur:col-span-1 ordinateur:col-start-3 ordinateur:row-start-1',
          traite && 'max-ordinateur:hidden',
        )}
      >
        <span className="text-encre-3 ordinateur:sr-only">{TEXTES_POINTS.statutDe}</span>
        {ligne.statutLibelle}
      </p>

      {ligne.echeance !== null ? (
        <p className="col-start-2 row-start-1 text-right text-interface tabular-nums ordinateur:col-start-4 ordinateur:text-left">
          <span className="sr-only">{TEXTES_POINTS.echeanceDe}</span>
          <span className={cn(ligne.echeance.depassee && 'font-bold text-alerte')}>
            {ligne.echeance.texte}
          </span>
        </p>
      ) : null}

      <div className="col-span-2 row-start-4 flex flex-wrap items-start gap-2 empty:hidden ordinateur:col-span-1 ordinateur:col-start-5 ordinateur:row-start-1 ordinateur:justify-end">
        <ActionsPoint point={ligne.actions} compte={compte} />
      </div>
    </article>
  )
}
