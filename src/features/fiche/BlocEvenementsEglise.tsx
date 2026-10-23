import { useId } from 'react'
import { ApresChargement } from '@/components/etats/ApresChargement'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatComptages } from '@/features/fiche/construireComptages'
import { LigneComptage } from '@/features/fiche/LigneComptage'
import { TEXTES_COMPTAGES } from '@/features/fiche/textesComptages'

interface Props {
  bloc: EtatComptages
}

/**
 * Bloc « Événements de l'église » de la fiche de Coordination (L2, X10 ; K10a à K11) : prévus,
 * réalisés, annulés, reportés, en attente et passés sans état final du mois écoulé, le mois en
 * cours à droite (K23), les réalisés depuis le départ, toujours nommé. Totaux de l'église
 * seulement, sans titre ni ministère. Il porte aussi le problème passager et le premier usage
 * des deux blocs : « Ponctualité » ne se montre qu'avec des chiffres.
 */
export function BlocEvenementsEglise({ bloc: lecture }: Props) {
  const bloc = useLectureAffichee(lecture).lecture
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_COMPTAGES.titreEvenements}
        complement={
          bloc.etat === 'donnees' ? (
            <span className="text-note text-encre-3">{bloc.donnees.periode}</span>
          ) : null
        }
      />
      <ApresChargement
        enChargement={bloc.etat === 'chargement'}
        indicateur={<ChargementBloc texte={TEXTES_COMPTAGES.chargementEvenements} />}
      >
        {bloc.etat === 'erreur' ? (
          <EtatVide
            situation="probleme_passager"
            action={{ libelle: 'Réessayer', surClic: bloc.reessayer }}
          >
            {TEXTES_COMPTAGES.probleme}
          </EtatVide>
        ) : null}
        {bloc.etat === 'premier_usage' ? (
          <EtatVide situation="premier_usage" suite={TEXTES_COMPTAGES.quiDeclare}>
            {TEXTES_COMPTAGES.premierUsage}
          </EtatVide>
        ) : null}
        {bloc.etat === 'donnees' ? (
          <>
            <ul className="flex flex-col">
              {bloc.donnees.evenements.map((ligne) => (
                <LigneComptage key={ligne.cle} ligne={ligne} />
              ))}
            </ul>
            <p className="mt-3 text-note text-encre-3">
              {TEXTES_COMPTAGES.noteEvenements(bloc.donnees.depuis)}
            </p>
          </>
        ) : null}
      </ApresChargement>
    </section>
  )
}
