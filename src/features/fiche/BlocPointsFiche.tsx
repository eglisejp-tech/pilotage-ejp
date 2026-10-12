import { useId } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { CartePointFiche } from '@/features/fiche/CartePointFiche'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc, PointFiche, ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'

interface Props {
  bloc: EtatBloc<PointFiche[]>
  profil: ProfilFiche
  /** Ministère de la fiche : celui du compte quand le ministère lit la sienne. */
  ministereId: string
  nomMinistere: string
}

/**
 * Compte qui lit la fiche, pour les boutons de ses points. EJP Tech lit sans aucun bouton (T29) :
 * pas de compte. Le berger et le conseil n'ont pas de ministère ; le ministère lit sa fiche.
 *
 * Le ministère du compte est celui de la fiche (`ministereId`). Cela tient parce que le profil
 * « ministere » n'arrive que par `PageMaFiche`, qui passe `compte.ministereId` ; `PageFicheMinistere`
 * (la fiche d'un autre ministère) l'exclut par son type (`Exclude<ProfilFiche, 'ministere'>`). Si un
 * écran ouvrait un jour la fiche d'un autre ministère avec ce profil, il faudrait passer le compte
 * de la session jusqu'ici. La base refuse de toute façon une écriture qui n'est pas permise.
 */
function compteDeLaFiche(profil: ProfilFiche, ministereId: string): CompteDesActions | null {
  if (profil === 'admin_plateforme') return null
  return { type: profil, ministereId: profil === 'ministere' ? ministereId : null }
}

/**
 * « Points d'attention » de la fiche (maquettes 04 et 12) : points créés par le ministère ou qui
 * le mentionnent, ouverts puis traités depuis 7 jours. Tout est fait : « Aucun point ouvert pour
 * votre ministère. » (ministère) ou « Aucun point ouvert pour Social. » (berger, conseil, EJP Tech).
 * Lu à part : son problème passager garde le titre et propose « Réessayer ».
 */
export function BlocPointsFiche({ bloc, profil, ministereId, nomMinistere }: Props) {
  const idTitre = useId()
  const compte = compteDeLaFiche(profil, ministereId)
  return (
    <section aria-labelledby={idTitre} data-repli-focus className="flex min-w-0 flex-col">
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
              <CartePointFiche key={point.id} point={point} compte={compte} />
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}
