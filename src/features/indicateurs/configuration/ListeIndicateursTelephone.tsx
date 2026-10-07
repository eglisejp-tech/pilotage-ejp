import { Link } from 'react-router'
import { CellulePrevus } from '@/features/indicateurs/configuration/CellulePrevus'
import { CelluleSaisie } from '@/features/indicateurs/configuration/CelluleSaisie'
import type { LigneMinistereConfiguration } from '@/features/indicateurs/configuration/construire'
import { TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'

interface Props {
  lignes: LigneMinistereConfiguration[]
  creation: CreationPrevus
  idTitre: string
}

const textes = TEXTES_CONFIGURATION.liste

/**
 * Les ministères sous 600 px (le tableau devenu liste, comme 03) : le nom qui ouvre l'écran du
 * ministère, puis une ligne par colonne du tableau, avec son titre.
 */
export function ListeIndicateursTelephone({ lignes, creation, idTitre }: Props) {
  return (
    <ul aria-labelledby={idTitre}>
      {lignes.map((ligne) => (
        <li
          key={ligne.id}
          className="flex flex-col gap-1 border-t border-filet py-3 first:border-t-0"
        >
          <Link
            to={ligne.href}
            className="-my-3 inline-flex min-h-cible items-center self-start font-semibold underline decoration-encre-3 underline-offset-4"
          >
            {ligne.nom}
          </Link>
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 text-[15px]">
            <dt className="text-note text-encre-3">{textes.colonneIndicateurs}</dt>
            <dd className="text-encre-2">{ligne.texteIndicateurs}</dd>
            <dt className="text-note text-encre-3">{textes.colonnePrevus}</dt>
            <dd>
              <CellulePrevus ligne={ligne} creation={creation} />
            </dd>
            <dt className="text-note text-encre-3">{textes.colonneSaisie}</dt>
            <dd>
              <CelluleSaisie ligne={ligne} />
            </dd>
            <dt className="text-note text-encre-3">{textes.colonneChangement}</dt>
            <dd className="text-encre-2">{ligne.dernierChangement ?? textes.aucunChangement}</dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}
