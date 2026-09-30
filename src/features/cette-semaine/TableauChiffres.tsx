import { Courbe } from './Courbe'
import { EcartChiffre } from './EcartChiffre'
import type { LigneChiffre } from './types'
import { useLargeurMin } from './useLargeurMin'
import { ValeurChiffre } from './ValeurChiffre'

// En-têtes lus par les lecteurs d'écran ; la maquette n'en montre aucun à l'écran.
const entetes = ['Chiffre', 'Valeur', 'Écart', 'Courbe', 'Date', 'Ministères ayant saisi']

interface Props {
  lignes: LigneChiffre[]
  idTitre: string
}

/**
 * Tableau des chiffres de l'église, à partir de 600 px (maquettes 01 et 02). De 1024 à 1279 px,
 * il partage la largeur avec « À décider » : libellés et courbes y sont plus étroits.
 */
export function TableauChiffres({ lignes, idTitre }: Props) {
  const grandEcran = useLargeurMin(1280)
  const ordinateur = useLargeurMin(1024)
  const tablette = useLargeurMin(768)
  const largeurCourbe = grandEcran ? 132 : ordinateur ? 88 : tablette ? 104 : 80

  return (
    <table aria-labelledby={idTitre} className="w-full border-collapse">
      <thead>
        <tr>
          {entetes.map((entete) => (
            <th key={entete} scope="col" className="p-0 text-left font-normal">
              <span className="sr-only">{entete}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne, index) => (
          <tr key={ligne.id} className={index > 0 ? 'border-t border-filet' : undefined}>
            <th
              scope="row"
              className="w-[9.5rem] py-3 pr-3 text-left font-normal md:w-[13.25rem] lg:w-[9.5rem] xl:w-[13.75rem] xl:pr-4"
            >
              {ligne.libelle}
            </th>
            <td className="w-px py-3 pr-2 text-right">
              <ValeurChiffre valeur={ligne.valeur} unite={ligne.unite} />
            </td>
            <td className="w-px py-3 pr-3 text-sm xl:pr-4">
              {ligne.ecart ? <EcartChiffre ecart={ligne.ecart} /> : null}
            </td>
            <td className="w-px py-3 pr-3 xl:pr-4">
              {ligne.courbe ? (
                <Courbe courbe={ligne.courbe} largeur={largeurCourbe} hauteur={26} />
              ) : null}
            </td>
            <td
              className={`py-3 pr-3 text-sm ${ligne.dateSignalee ? 'font-semibold text-attention' : 'text-encre-3'}`}
            >
              {ligne.date}
            </td>
            <td
              className={`w-px py-3 text-right text-sm font-semibold whitespace-nowrap ${ligne.complet ? 'text-encre-3' : 'text-attention'}`}
            >
              {ligne.completude}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
