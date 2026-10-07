import { useId } from 'react'
import { Link } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import { ChampLibre as Libre } from '@/features/cette-semaine/ChampLibre'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { DerniereSaisieFiche, EtatBloc } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'

interface Props {
  bloc: EtatBloc<DerniereSaisieFiche[]>
  /** « Tout le journal » : le journal filtré sur ce ministère (écran de l'étape 6). */
  lienJournal: string
}

/**
 * « Dernières saisies » (maquettes 04 et 12) : les 5 dernières lignes écrites par un compte du
 * ministère, puis la note sur les corrections. Lu à part : son problème passager garde le titre et
 * propose « Réessayer » sans toucher le reste de la fiche. Premier usage : « Aucune saisie pour
 * l'instant. »
 */
export function DernieresSaisies({ bloc, lienJournal }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_FICHE.titreDernieresSaisies}
        complement={
          <Link
            to={lienJournal}
            className="-my-3 inline-flex min-h-cible items-center text-sm text-nuit underline underline-offset-4"
          >
            {TEXTES_FICHE.toutLeJournal}
          </Link>
        }
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
          <EtatVide situation="premier_usage">
            {TEXTES_VIDES_INDICATEURS.aucuneDerniereSaisie}
          </EtatVide>
        ) : (
          <>
            <ul className="flex flex-col">
              {bloc.donnees.map((ligne) => (
                <li
                  key={ligne.id}
                  className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] items-baseline gap-x-5 border-b border-filet py-2.5 text-[15px]"
                >
                  <span className="text-sm text-encre-3">{ligne.quand}</span>
                  <span className="min-w-0 break-words">
                    {ligne.texte}
                    {ligne.objet !== null ? (
                      <>
                        {' '}
                        <Libre texte={ligne.objet} />
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-note leading-normal text-encre-3">
              {TEXTES_FICHE.noteDernieresSaisies}
            </p>
          </>
        )
      ) : null}
    </section>
  )
}
