import { useId } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { LigneRubriqueFij } from '@/features/fiche/LigneRubriqueFij'
import { TableauDepartementsFij } from '@/features/fiche/TableauDepartementsFij'
import { TEXTES_BLOC_FIJ } from '@/features/fiche/donneesChiffresParDepartement'
import type { DonneesChiffresParDepartement } from '@/features/fiche/donneesChiffresParDepartement'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'

/** État du bloc, de la lecture à l'affichage. */
export type EtatBlocFij =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'premier_usage' }
  | { etat: 'donnees'; donnees: DonneesChiffresParDepartement }

interface Props {
  bloc: EtatBlocFij
  /** Le ministère `fij` sur sa fiche : seul profil qui peut saisir (EJP Tech lit sans bouton). */
  peutSaisir: boolean
}

/**
 * Bloc « Chiffres par département » de la fiche de Coordo FIJ (fiche 04 et 12 ; X5, P40) : total
 * de chaque rubrique avec sa complétude et sa courbe, puis la dernière valeur de chaque
 * département. Il garde sa forme dans chaque état (T36) : chargement, problème passager, premier
 * usage (avec « Saisir les chiffres par département » pour le seul ministère `fij`), semaine
 * incomplète (jamais un 0 pour un département absent).
 */
export function BlocChiffresParDepartement({ bloc, peutSaisir }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_BLOC_FIJ.titre}
        complement={
          bloc.etat === 'donnees' ? (
            <span className="text-note text-encre-3">{bloc.donnees.semaine}</span>
          ) : null
        }
      />
      {bloc.etat === 'chargement' ? (
        <div className="py-[18px]">
          <ChargementSaisie />
        </div>
      ) : null}
      {bloc.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: bloc.reessayer }}
        >
          {TEXTES_BLOC_FIJ.probleme}
        </EtatVide>
      ) : null}
      {bloc.etat === 'premier_usage' ? (
        <EtatVide
          situation="premier_usage"
          suite={peutSaisir ? undefined : TEXTES_BLOC_FIJ.quiSaisit}
          action={{ libelle: TEXTES_BLOC_FIJ.saisir, vers: '/saisir/fij-statistiques' }}
          peutAgir={peutSaisir}
        >
          {TEXTES_BLOC_FIJ.premierUsage}
        </EtatVide>
      ) : null}
      {bloc.etat === 'donnees' ? (
        <>
          <ul className="flex flex-col">
            {bloc.donnees.rubriques.map((rubrique, rang) => (
              <LigneRubriqueFij key={rubrique.code} rubrique={rubrique} avecAide={rang === 0} />
            ))}
          </ul>
          <h3 className="mt-6 text-[15px] font-semibold">{TEXTES_BLOC_FIJ.parDepartement}</h3>
          {bloc.donnees.semaineVide ? (
            <p className="max-w-prose py-3 text-encre-2">
              {TEXTES_BLOC_FIJ.semaineVide(bloc.donnees.semaine)}
            </p>
          ) : (
            <TableauDepartementsFij
              rubriques={bloc.donnees.rubriques}
              departements={bloc.donnees.departements}
              semaine={bloc.donnees.semaine}
            />
          )}
          <p className="mt-3 text-note text-encre-3">{TEXTES_BLOC_FIJ.note}</p>
        </>
      ) : null}
    </section>
  )
}
