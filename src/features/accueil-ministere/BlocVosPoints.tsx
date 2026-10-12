import { useId } from 'react'
import { Aide } from '@/components/aide/Aide'
import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import { CartePointFiche } from '@/features/fiche/CartePointFiche'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc, PointFiche } from '@/features/fiche/modeleFiche'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'

interface Props {
  bloc: EtatBloc<PointFiche[]>
  /** Compte du ministère, pour les boutons de chaque point (créé ou mentionné). */
  compte: CompteDesActions
}

/**
 * « Vos points » de l'accueil du ministère (maquette 07 ; BRIEF, section 9) : ses points ouverts et
 * ceux qui le mentionnent, puis ceux traités depuis 7 jours, chacun comme sur « Ma fiche »
 * (`CartePointFiche`). Aide `accueil.points` à côté du titre, hors du titre (T38). Tout est fait :
 * « Aucun point ouvert pour votre ministère. » Lu à part : un problème passager garde le titre et
 * propose « Réessayer ». Chaque point porte ses boutons « Changer le statut » et « Marquer
 * traité » (`ActionsPoint`, étape 5). Le bloc porte le repère de focus de la page
 * (`data-repli-focus`) : quand un point traité quitte la liste, le focus y revient.
 */
export function BlocVosPoints({ bloc, compte }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} data-repli-focus className="flex min-w-0 flex-col">
      <div
        data-ligne-aide
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2 border-encre pb-3"
      >
        <div className="flex items-center gap-1 [&>span]:-my-3">
          <h2 id={idTitre} className="font-lecture text-section leading-tight font-medium">
            {TEXTES_ACCUEIL.titrePoints}
          </h2>
          <Aide code="accueil.points" libelle={TEXTES_ACCUEIL.titrePoints} placement="flottante" />
        </div>
        <span className="text-note text-encre-3">{TEXTES_ACCUEIL.complementPoints}</span>
      </div>
      {bloc.etat === 'chargement' ? <ChargementBloc /> : null}
      {bloc.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_ACCUEIL.reessayer, surClic: bloc.reessayer }}
        >
          {TEXTES_ACCUEIL.erreur}
        </EtatVide>
      ) : null}
      {bloc.etat === 'donnees' ? (
        bloc.donnees.length === 0 ? (
          <EtatVide situation="tout_est_fait">{TEXTES_ACCUEIL.aucunPoint}</EtatVide>
        ) : (
          <div className="flex flex-col divide-y divide-filet">
            {bloc.donnees.map((point) => (
              <CartePointFiche key={point.id} point={point} compte={compte} />
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}
