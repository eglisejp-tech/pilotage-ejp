import { useId } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { CartePointFiche } from '@/features/fiche/CartePointFiche'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc, PointFiche, ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

interface Props {
  bloc: EtatBloc<PointFiche[]>
  profil: ProfilFiche
  nomMinistere: string
}

/**
 * « Points d'attention » de la fiche (maquettes 04 et 12) : points créés par le ministère ou qui
 * le mentionnent, ouverts puis traités depuis 7 jours. Tout est fait : « Aucun point ouvert pour
 * votre ministère. » (ministère) ou « Aucun point ouvert pour Social. » (berger, conseil, EJP Tech).
 * Lu à part : son problème passager garde le titre et propose « Réessayer ».
 */
export function BlocPointsFiche({ bloc, profil, nomMinistere }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_FICHE.titrePoints}
        complement={<span className="text-note text-encre-3">{TEXTES_FICHE.complementPoints}</span>}
      />
      {bloc.etat === 'chargement' ? <ChargementBloc /> : null}
      {bloc.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_FICHE.reessayer, surClic: bloc.reessayer }}
        >
          {TEXTES_FICHE.erreur}
        </EtatVide>
      ) : null}
      {bloc.etat === 'donnees' ? (
        bloc.donnees.length === 0 ? (
          <EtatVide situation="tout_est_fait">
            {profil === 'ministere'
              ? TEXTES_FICHE.points.aucunMinistere
              : TEXTES_FICHE.points.aucun(nomMinistere)}
          </EtatVide>
        ) : (
          <div className="flex flex-col divide-y divide-filet">
            {bloc.donnees.map((point) => (
              <CartePointFiche key={point.id} point={point} />
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}
