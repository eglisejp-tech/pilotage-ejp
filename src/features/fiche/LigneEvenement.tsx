import { Link } from 'react-router'
import { ChampLibre as Libre } from '@/features/cette-semaine/ChampLibre'
import type { LigneCalendrier, TonStatut } from '@/features/fiche/construireCalendrier'
import { TEXTES_CALENDRIER } from '@/features/fiche/textesCalendrier'
import { cn } from '@/lib/utils'

const COULEUR_STATUT: Record<TonStatut, string> = {
  bien: 'text-bien',
  attention: 'text-attention',
  alerte: 'text-alerte',
}

/** Grille d'une ligne : date, événement, statut et, si une ligne a une action, une colonne de bouton. */
export const GRILLE_EVENEMENT =
  'grid grid-cols-[minmax(0,1fr)] items-baseline gap-x-5 gap-y-1 md:grid-cols-[8.75rem_minmax(0,1fr)_17rem]'
export const GRILLE_EVENEMENT_ACTION = 'md:grid-cols-[8.75rem_minmax(0,1fr)_17rem_9.5rem]'

const classeBouton =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond'

interface Props {
  ligne: LigneCalendrier
  /** Une des lignes du calendrier a un bouton : la colonne existe pour toutes, alignée. */
  avecAction: boolean
}

/**
 * Un événement du calendrier (maquettes 04 et 12) : date, nom, statut en mots (la couleur ne dit
 * jamais seule), puis « Mettre à jour » pour le seul ministère porteur. Un événement à confirmer
 * ajoute le texte de sa date au statut (« En attente de validation, dans 2 jours »). Sous le nom :
 * le report, les ministères mentionnés (« @Coordination ») ou « Mentionné par Communication ».
 */
export function LigneEvenement({ ligne, avecAction }: Props) {
  const aDesNotes =
    ligne.report !== null ||
    ligne.mentions.length > 0 ||
    ligne.mentionnePar !== null ||
    ligne.lectureSeule !== null
  return (
    <li
      className={cn(
        GRILLE_EVENEMENT,
        avecAction && GRILLE_EVENEMENT_ACTION,
        'border-b border-filet py-3.5 text-base',
      )}
    >
      <span className="text-encre-2 tabular-nums">{ligne.jour}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="break-words">
          <Libre texte={ligne.titre} />
        </span>
        {aDesNotes ? (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-note text-encre-3">
            {ligne.report !== null ? <span>{ligne.report}</span> : null}
            {ligne.mentionnePar !== null ? <span>{ligne.mentionnePar}.</span> : null}
            {ligne.lectureSeule !== null ? <span>{ligne.lectureSeule}</span> : null}
            {ligne.mentions.map((nom) => (
              <span key={nom} className="bg-nuit-pale px-1.5 py-px whitespace-nowrap text-nuit">
                @{nom}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <span className={cn('font-medium', ligne.ton !== null && 'font-semibold')}>
        <span className={ligne.ton !== null ? COULEUR_STATUT[ligne.ton] : 'text-encre'}>
          {ligne.ton !== null ? (
            <span aria-hidden="true" className="mr-2 inline-block size-2 bg-current" />
          ) : null}
          {ligne.libelleStatut}
          {ligne.texteDate !== null ? ',' : null}
        </span>
        {ligne.texteDate !== null ? (
          <>
            {' '}
            <span className={cn('text-[15px]', COULEUR_STATUT[ligne.texteDate.ton])}>
              {ligne.texteDate.texte}
            </span>
          </>
        ) : null}
      </span>
      {avecAction ? (
        <span className="mt-1 md:mt-0 md:justify-self-end">
          {ligne.versMiseAJour !== null ? (
            <Link to={ligne.versMiseAJour} className={classeBouton}>
              {TEXTES_CALENDRIER.metteAJour}
              <span className="sr-only"> l'événement {ligne.titre.texte}</span>
            </Link>
          ) : null}
        </span>
      ) : null}
    </li>
  )
}
