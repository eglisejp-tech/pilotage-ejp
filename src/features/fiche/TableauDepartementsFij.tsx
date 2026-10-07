import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { PAS_DE_SAISIE } from '@/features/fiche/donneesChiffresParDepartement'
import type {
  DepartementDuBloc,
  RubriqueDuBloc,
} from '@/features/fiche/donneesChiffresParDepartement'
import { nombre } from '@/lib/metier/texte'

interface Props {
  rubriques: readonly RubriqueDuBloc[]
  departements: readonly DepartementDuBloc[]
  /** « Semaine 39, du 21 au 27 sept. » */
  semaine: string
}

const valeur = (v: number | null) => (v === null ? PAS_DE_SAISIE : nombre(v))

/**
 * Dernière valeur de chaque rubrique, par département, pour la semaine de référence : un tableau
 * à partir de 600 px, une liste en dessous (BRIEF_DESIGN, section 6). Un département absent
 * porte « Pas de saisie », jamais 0. Un seul rendu à la fois, pour que l'ordre de lecture suive
 * ce qui est affiché.
 */
export function TableauDepartementsFij({ rubriques, departements, semaine }: Props) {
  const tableau = useLargeurMin(600)
  if (!tableau) {
    return (
      <ul className="flex flex-col">
        {departements.map((departement) => (
          <li key={departement.code} className="border-b border-filet py-3">
            <p className="text-[15px] font-semibold">
              {departement.code} {departement.nom}
            </p>
            <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 text-sm">
              {rubriques.map((rubrique) => {
                const v = departement.valeurs[rubrique.code]
                return (
                  <div key={rubrique.code} className="contents">
                    <dt className="text-encre-2">{rubrique.libelle}</dt>
                    <dd className={v === null ? 'text-encre-3' : 'tabular-nums'}>{valeur(v)}</dd>
                  </div>
                )
              })}
            </dl>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <table className="w-full border-collapse text-left text-[15px]">
      <caption className="sr-only">Dernière valeur de chaque département, {semaine}</caption>
      <thead>
        <tr className="border-b border-filet text-note text-encre-3">
          <th scope="col" className="py-2 pr-3 font-normal">
            Département
          </th>
          {rubriques.map((rubrique) => (
            <th key={rubrique.code} scope="col" className="py-2 pr-3 font-normal">
              {rubrique.libelle}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {departements.map((departement) => (
          <tr key={departement.code} className="border-b border-filet">
            <th scope="row" className="py-2.5 pr-3 font-normal">
              {departement.code} {departement.nom}
            </th>
            {rubriques.map((rubrique) => {
              const v = departement.valeurs[rubrique.code]
              return (
                <td
                  key={rubrique.code}
                  className={
                    v === null ? 'py-2.5 pr-3 text-sm text-encre-3' : 'py-2.5 pr-3 tabular-nums'
                  }
                >
                  {valeur(v)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
