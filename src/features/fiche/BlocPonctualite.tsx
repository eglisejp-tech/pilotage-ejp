import { useId } from 'react'
import { ApresChargement } from '@/components/etats/ApresChargement'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatComptages, EtatRetards } from '@/features/fiche/construireComptages'
import { LigneComptage } from '@/features/fiche/LigneComptage'
import { RetardsDuMois } from '@/features/fiche/RetardsDuMois'
import { TEXTES_COMPTAGES } from '@/features/fiche/textesComptages'

interface Props {
  bloc: EtatComptages
  /**
   * Lecture des événements commencés en retard : pour le berger, le conseil et EJP Tech ; null
   * pour Coordination, qui ne lit que les totaux (K11).
   */
  retards: EtatRetards | null
}

/**
 * Bloc « Ponctualité » de la fiche de Coordination (T68) : pour le mois écoulé, le mois en cours
 * à part, puis depuis le départ, la part des événements et des cultes commencés à l'heure, le
 * retard moyen et la complétude (« 4 sur 6 ont leurs heures ») ; dessous, « Cultes : 3 sur 5 »
 * et « Autres événements : 4 sur 4 ». « Non calculé » quand aucun n'a ses heures. Sous le mois
 * des grandes valeurs, la liste repliée des retards pour les lecteurs qui la voient. Sans
 * chiffres (problème passager, premier usage), le bloc « Événements de l'église » parle seul.
 */
export function BlocPonctualite({ bloc: lecture, retards }: Props) {
  const bloc = useLectureAffichee(lecture).lecture
  const idTitre = useId()
  if (bloc.etat === 'erreur' || bloc.etat === 'premier_usage') return null
  const listeRetards = bloc.etat === 'donnees' ? bloc.donnees.retards : null
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_COMPTAGES.titrePonctualite}
        complement={
          bloc.etat === 'donnees' ? (
            <span className="text-note text-encre-3">{TEXTES_COMPTAGES.colonnePonctualite}</span>
          ) : null
        }
      />
      <ApresChargement
        enChargement={bloc.etat === 'chargement'}
        indicateur={<ChargementBloc texte={TEXTES_COMPTAGES.chargementPonctualite} />}
      >
        {bloc.etat === 'donnees' ? (
          <>
            <ul className="flex flex-col">
              {bloc.donnees.ponctualite.map((ligne, rang) => (
                <LigneComptage
                  key={ligne.cle}
                  ligne={ligne}
                  complement={
                    rang === 0 && listeRetards !== null && retards !== null ? (
                      <RetardsDuMois retards={listeRetards} lecture={retards} />
                    ) : undefined
                  }
                />
              ))}
            </ul>
            <p className="mt-3 text-note text-encre-3">{TEXTES_COMPTAGES.notePonctualite}</p>
          </>
        ) : null}
      </ApresChargement>
    </section>
  )
}
