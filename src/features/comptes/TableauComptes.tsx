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
import { LARGEURS } from '@/lib/largeurs'
import { cn } from '@/lib/utils'

interface Props {
  lignes: LigneCompte[]
  /** « ministeres » : colonnes Ministère, Email de connexion, Indicateurs ; sinon Compte, Email personnel. */
  variante: 'ministeres' | 'personnes'
  idTitre: string
  /** Null en lecture (administration de l'église, T60) : ni boutons ni colonne d'actions. */
  onAction: ((ligne: LigneCompte, action: ActionLigne) => void) | null
  enCours: { cle: string; action: ActionLigne } | null
  /** Résultat de la dernière action de ligne, affiché sous les boutons de sa ligne. */
  resultat: ResultatAction | null
  /** Compte connecté : sa ligne n'a pas de bouton (T60). */
  moi?: string | null
}

const entete = 'pt-1 pr-5 pb-1 text-left align-middle font-normal'
const cellule = 'py-2.5 pr-5 align-middle'

/**
 * Largeurs des colonnes, les mêmes dans les trois sections (Ministères, Berger et conseil, EJP
 * Tech) : la colonne « Double authentification » est au même endroit dans chaque tableau, comme
 * dans la maquette 13 (proposition 5, T69), et une ligne ne pousse jamais la page hors de
 * l'écran. La colonne « Indicateurs » reste vide hors des ministères ; les boutons prennent le
 * reste (« État » le prend en lecture seule). Proches de la maquette à 1440 px (200, 270, 284,
 * 206 et 303 px de 1264).
 */
function largeursColonnes(ordinateur: boolean, avecActions: boolean): string[] {
  const etat = avecActions ? (ordinateur ? 'w-[17%]' : 'w-[24%]') : ''
  return ordinateur
    ? ['w-[15%]', 'w-[21%]', 'w-[14%] grand-ecran:w-[19%]', etat]
    : ['w-[30%]', 'w-[20%]', etat]
}

/**
 * Tableau d'une section de l'écran 13 à partir de 600 px (maquette 13). À partir de 1024 px,
 * l'adresse a sa colonne ; de 600 à 1023 px, elle passe sous le nom pour que les boutons tiennent.
 * La colonne « Indicateurs » n'existe que pour les ministères. Largeurs fixes (`table-fixed`) :
 * un libellé trop long passe à la ligne dans sa case, même celui d'un bouton.
 */
export function TableauComptes({
  lignes,
  variante,
  idTitre,
  onAction,
  enCours,
  resultat,
  moi,
}: Props) {
  const ordinateur = useLargeurMin(LARGEURS.ordinateur)
  const ministeres = variante === 'ministeres'
  return (
    <table aria-labelledby={idTitre} className="w-full table-fixed border-collapse">
      <colgroup>
        {largeursColonnes(ordinateur, onAction !== null).map((largeur, rang) => (
          <col key={rang} className={largeur || undefined} />
        ))}
        {onAction !== null ? <col /> : null}
      </colgroup>
      <thead>
        <tr className="text-note text-encre-3">
          <th scope="col" className={entete}>
            {ministeres ? TEXTES_COMPTES.colonneMinistere : TEXTES_COMPTES.colonneCompte}
          </th>
          {ordinateur ? (
            <th scope="col" className={entete}>
              {ministeres
                ? TEXTES_COMPTES.colonneEmailMinistere
                : TEXTES_COMPTES.colonneEmailPersonnel}
            </th>
          ) : null}
          {ministeres ? (
            <th scope="col" className={entete}>
              {TEXTES_COMPTES.colonneIndicateurs}
            </th>
          ) : (
            <td />
          )}
          <th scope="col" className={entete}>
            <span className="inline-flex items-center">
              {TEXTES_COMPTES.colonneEtat}
              <Aide
                code="comptes.etat"
                libelle={TEXTES_COMPTES.colonneEtat}
                placement="flottante"
              />
            </span>
          </th>
          {onAction !== null ? (
            <th scope="col" className={cn(entete, 'pr-0')}>
              <span className="sr-only">{TEXTES_COMPTES.colonneActions}</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne) => (
          <tr key={ligne.cle} data-cle={ligne.cle} className="border-t border-filet text-interface">
            <th scope="row" className={cn(cellule, 'text-left font-semibold')}>
              {ligne.nom}
              {ordinateur ? null : (
                <span className="block text-detail font-normal break-all text-encre-2">
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
            {onAction !== null ? (
              <td className={cn(cellule, 'pr-0')}>
                <BoutonsLigne
                  ligne={ligne}
                  onAction={onAction}
                  enCours={enCours?.cle === ligne.cle ? enCours.action : null}
                  moi={moi}
                />
                <ResultatLigne resultat={resultat?.cle === ligne.cle ? resultat : null} />
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
