import { ChampLibre } from './ChampLibre'
import { IndicateurFraicheur } from './IndicateurFraicheur'
import { NomMinistere } from './NomMinistere'
import { couleursPriorite, libellesPriorite } from './priorites'
import { TEXTES_VIDES } from './textesVides'
import type { LigneMinistere } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  ministeres: LigneMinistere[]
  /** Berger et conseil : colonnes « Prochaine réunion » et « Point ouvert ». */
  avecColonnesConseil: boolean
  idTitre: string
}

const cellule = 'py-[13px] pr-5'

/**
 * Tableau des ministères à partir de 600 px, dans l'ordre reçu (du moins récent au plus
 * récent). Les colonnes « Prochaine réunion » et « Point ouvert » n'apparaissent que pour le
 * berger et le conseil, à partir de 1024 px (maquettes 01 et 02).
 */
export function TableauMinisteres({ ministeres, avecColonnesConseil, idTitre }: Props) {
  const ordinateur = useLargeurMin(1024)
  const colonnesConseil = avecColonnesConseil && ordinateur

  return (
    <table aria-labelledby={idTitre} className="w-full border-collapse">
      <thead>
        <tr className="text-left text-note text-encre-3">
          <th scope="col" className="w-[12.5rem] pt-3 pr-5 pb-1.5 font-normal lg:w-[13.75rem]">
            Ministère
          </th>
          <th scope="col" className="w-[10.5rem] pt-3 pr-5 pb-1.5 font-normal lg:w-[11.875rem]">
            Mise à jour
          </th>
          <th scope="col" className="pt-3 pr-5 pb-1.5 font-normal">
            Prochain événement
          </th>
          {colonnesConseil ? (
            <>
              <th scope="col" className="w-[9.375rem] pt-3 pr-5 pb-1.5 font-normal">
                Prochaine réunion
              </th>
              <th scope="col" className="w-[6.875rem] pt-3 pb-1.5 font-normal">
                Point ouvert
              </th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {ministeres.map((ministere) => (
          <tr key={ministere.id} className="border-t border-filet align-baseline text-[15px]">
            <th scope="row" className={`${cellule} text-left font-semibold`}>
              <NomMinistere ministere={ministere} />
            </th>
            <td className={cellule}>
              <IndicateurFraicheur fraicheur={ministere.fraicheur} />
            </td>
            <td className={`${cellule} text-encre-2`}>
              {ministere.prochainEvenement.etat === 'prevu' ? (
                <>
                  {ministere.prochainEvenement.date},{' '}
                  <ChampLibre texte={ministere.prochainEvenement.nom} />
                </>
              ) : (
                TEXTES_VIDES.ministeres.aucunEvenement
              )}
            </td>
            {colonnesConseil ? (
              <>
                <td className={`${cellule} text-encre-2`}>
                  {ministere.conseil?.prochaineReunion ??
                    TEXTES_VIDES.ministeres.reunionNonRenseignee}
                </td>
                <td
                  className={`py-[13px] text-sm font-semibold ${ministere.conseil?.pointOuvert ? couleursPriorite[ministere.conseil.pointOuvert] : 'text-encre-3'}`}
                >
                  {ministere.conseil?.pointOuvert
                    ? libellesPriorite[ministere.conseil.pointOuvert]
                    : TEXTES_VIDES.ministeres.aucunPointOuvert}
                </td>
              </>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
