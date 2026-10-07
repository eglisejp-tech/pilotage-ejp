import { Aide } from '@/components/aide/Aide'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { BoutonsLigne } from '@/features/comptes/BoutonsLigne'
import { CelluleIndicateurs } from '@/features/comptes/CelluleIndicateurs'
import { EtatDoubleAuthentification } from '@/features/comptes/EtatDoubleAuthentification'
import { ResultatLigne } from '@/features/comptes/ResultatLigne'
import type { ResultatAction } from '@/features/comptes/ResultatLigne'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { cn } from '@/lib/utils'

interface Props {
  lignes: LigneCompte[]
  /** « ministeres » : colonnes Ministère, Email de connexion, Indicateurs ; sinon Compte, Email personnel. */
  variante: 'ministeres' | 'personnes'
  idTitre: string
  onAction: (ligne: LigneCompte, action: ActionLigne) => void
  enCours: { cle: string; action: ActionLigne } | null
  /** Résultat de la dernière action de ligne, affiché sous les boutons de sa ligne. */
  resultat: ResultatAction | null
}

const entete = 'pt-1 pr-5 pb-1 text-left align-middle font-normal'
const cellule = 'py-2.5 pr-5 align-middle'

/**
 * Tableau d'une section de l'écran 13 à partir de 600 px (maquette 13). À partir de 1024 px,
 * l'adresse a sa colonne ; de 600 à 1023 px, elle passe sous le nom pour que les boutons tiennent.
 * La colonne « Indicateurs » n'existe que pour les ministères.
 */
export function TableauComptes({ lignes, variante, idTitre, onAction, enCours, resultat }: Props) {
  const ordinateur = useLargeurMin(1024)
  const ministeres = variante === 'ministeres'
  return (
    <table aria-labelledby={idTitre} className="w-full border-collapse">
      <thead>
        <tr className="text-note text-encre-3">
          <th scope="col" className={cn(entete, ordinateur ? 'w-[180px]' : 'w-[34%]')}>
            {ministeres ? TEXTES_COMPTES.colonneMinistere : TEXTES_COMPTES.colonneCompte}
          </th>
          {ordinateur ? (
            <th scope="col" className={cn(entete, 'w-[250px]')}>
              {ministeres
                ? TEXTES_COMPTES.colonneEmailMinistere
                : TEXTES_COMPTES.colonneEmailPersonnel}
            </th>
          ) : null}
          {ministeres ? (
            <th scope="col" className={entete}>
              <span className="inline-flex items-center">
                {TEXTES_COMPTES.colonneIndicateurs}
                <Aide
                  code="comptes.indicateurs"
                  libelle={TEXTES_COMPTES.colonneIndicateurs}
                  placement="flottante"
                />
              </span>
            </th>
          ) : (
            <td />
          )}
          <th scope="col" className={cn(entete, ordinateur && 'w-[200px]')}>
            <span className="inline-flex items-center whitespace-nowrap">
              {TEXTES_COMPTES.colonneEtat}
              <Aide
                code="comptes.etat"
                libelle={TEXTES_COMPTES.colonneEtat}
                placement="flottante"
              />
            </span>
          </th>
          <th scope="col" className={cn(entete, 'pr-0')}>
            <span className="sr-only">{TEXTES_COMPTES.colonneActions}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne) => (
          <tr key={ligne.cle} data-cle={ligne.cle} className="border-t border-filet text-[15px]">
            <th scope="row" className={cn(cellule, 'text-left font-semibold')}>
              {ligne.nom}
              {ordinateur ? null : (
                <span className="block text-sm font-normal break-all text-encre-2">
                  {ligne.email ?? TEXTES_COMPTES.pasDeCompte}
                </span>
              )}
            </th>
            {ordinateur ? (
              <td className={cn(cellule, 'break-all text-encre-2')}>
                {ligne.email ?? TEXTES_COMPTES.pasDeCompte}
              </td>
            ) : null}
            {ministeres ? (
              <td className={cellule}>
                <CelluleIndicateurs ligne={ligne} />
              </td>
            ) : (
              <td />
            )}
            <td className={cellule}>
              <EtatDoubleAuthentification etat={ligne.etat} desactiveLe={ligne.desactiveLe} />
            </td>
            <td className={cn(cellule, 'pr-0')}>
              <BoutonsLigne
                ligne={ligne}
                onAction={onAction}
                enCours={enCours?.cle === ligne.cle ? enCours.action : null}
              />
              <ResultatLigne resultat={resultat?.cle === ligne.cle ? resultat : null} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
