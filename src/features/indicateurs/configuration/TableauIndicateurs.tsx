import { Fragment } from 'react'
import { Link } from 'react-router'
import { Aide } from '@/components/aide/Aide'
import { CellulePrevus } from '@/features/indicateurs/configuration/CellulePrevus'
import { CelluleSaisie } from '@/features/indicateurs/configuration/CelluleSaisie'
import type { LigneMinistereConfiguration } from '@/features/indicateurs/configuration/construire'
import { RefusCreation } from '@/features/indicateurs/configuration/RefusCreation'
import { TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { cn } from '@/lib/utils'

interface Props {
  lignes: LigneMinistereConfiguration[]
  creation: CreationPrevus
  idTitre: string
}

const cellule = 'py-[13px] pr-5 align-baseline'
const entete = 'pt-3 pr-5 pb-1.5 text-left font-normal'
const textes = TEXTES_CONFIGURATION.liste

/**
 * Tableau des ministères à partir de 600 px (7.1) : le nom, qui ouvre l'écran du ministère ;
 * « Indicateurs » (« 8 sur 30, dont 1 ajouté par Kumi ») ; « Prévus » et son bouton « Créer » ;
 * « Saisie » ; « Dernier changement ». Le refus de la base à un « Créer » s'affiche dans une ligne
 * sous le ministère concerné. Aucune valeur d'indicateur.
 */
export function TableauIndicateurs({ lignes, creation, idTitre }: Props) {
  return (
    <table aria-labelledby={idTitre} className="w-full border-collapse">
      <thead>
        <tr className="text-note text-encre-3">
          <th scope="col" className={cn(entete, 'w-[22%]')}>
            {textes.colonneMinistere}
          </th>
          <th scope="col" className={entete}>
            <span className="inline-flex items-center">
              {textes.colonneIndicateurs}
              <Aide
                code="indicateurs.nombre"
                libelle={textes.colonneIndicateurs}
                placement="flottante"
              />
            </span>
          </th>
          <th scope="col" className={cn(entete, 'w-[15rem]')}>
            <span className="inline-flex items-center">
              {textes.colonnePrevus}
              <Aide
                code="indicateurs.prevus"
                libelle={textes.colonnePrevus}
                placement="flottante"
              />
            </span>
          </th>
          <th scope="col" className={cn(entete, 'w-[8rem]')}>
            {textes.colonneSaisie}
          </th>
          <th scope="col" className={cn(entete, 'w-[9rem] pr-0')}>
            {textes.colonneChangement}
          </th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne) => (
          <Fragment key={ligne.id}>
            <tr className="border-t border-filet text-[15px]">
              <th scope="row" className={cn(cellule, 'text-left font-normal')}>
                <Link
                  to={ligne.href}
                  className="-my-3 inline-flex min-h-cible items-center font-semibold underline decoration-encre-3 underline-offset-4 hover:decoration-encre"
                >
                  {ligne.nom}
                </Link>
              </th>
              <td className={cn(cellule, 'text-encre-2')}>{ligne.texteIndicateurs}</td>
              <td className={cellule}>
                <CellulePrevus ligne={ligne} creation={creation} />
              </td>
              <td className={cellule}>
                <CelluleSaisie ligne={ligne} />
              </td>
              <td className={cn(cellule, 'pr-0 text-encre-2')}>
                {ligne.dernierChangement ?? textes.aucunChangement}
              </td>
            </tr>
            {creation.dernier === ligne.id && creation.refus !== null ? (
              <tr>
                <td colSpan={5} className="pb-3">
                  <RefusCreation refus={creation.refus} />
                </td>
              </tr>
            ) : null}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
