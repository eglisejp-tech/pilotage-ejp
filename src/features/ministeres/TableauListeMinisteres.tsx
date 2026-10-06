import { Link } from 'react-router'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { couleursPriorite, libellesPriorite } from '@/features/cette-semaine/priorites'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { MarqueFraicheur } from '@/features/fiche/MarqueFraicheur'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'
import { cn } from '@/lib/utils'

interface Props {
  ministeres: LigneListeMinistere[]
  idTitre: string
}

const cellule = 'py-[13px] pr-5 align-baseline'
const entete = 'pt-3 pr-5 pb-1.5 text-left font-normal'
const textes = TEXTES_FICHE.liste

/**
 * Tableau des ministères à partir de 600 px (bloc « Les ministères » de 01) : chaque nom ouvre la
 * fiche, la description du ministère sous son nom. « Prochaine réunion » et « Point ouvert » à
 * partir de 1024 px, comme sur la vue de l'église.
 */
export function TableauListeMinisteres({ ministeres, idTitre }: Props) {
  const ordinateur = useLargeurMin(1024)
  return (
    <table aria-labelledby={idTitre} className="w-full border-collapse">
      <thead>
        <tr className="text-note text-encre-3">
          <th scope="col" className={cn(entete, 'w-[40%] lg:w-[32%]')}>
            {textes.colonneMinistere}
          </th>
          <th scope="col" className={cn(entete, 'w-[11rem]')}>
            {textes.colonneMiseAJour}
          </th>
          <th scope="col" className={entete}>
            {textes.colonneEvenement}
          </th>
          {ordinateur ? (
            <>
              <th scope="col" className={cn(entete, 'w-[9.5rem]')}>
                {textes.colonneReunion}
              </th>
              <th scope="col" className={cn(entete, 'w-[7rem] pr-0')}>
                {textes.colonnePoint}
              </th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {ministeres.map((ministere) => (
          <tr key={ministere.id} className="border-t border-filet text-[15px]">
            <th scope="row" className={cn(cellule, 'text-left font-normal')}>
              <Link
                to={ministere.href}
                className="-my-3 inline-flex min-h-cible items-center font-semibold underline decoration-encre-3 underline-offset-4 hover:decoration-encre"
              >
                {ministere.nom}
              </Link>
              {ministere.description !== null ? (
                <span className="block text-sm text-encre-3">{ministere.description}</span>
              ) : null}
            </th>
            <td className={cellule}>
              <MarqueFraicheur
                libelle={ministere.fraicheur.libelle}
                etat={ministere.fraicheur.etat}
              />
            </td>
            <td className={cn(cellule, 'text-encre-2')}>
              {ministere.prochainEvenement === null ? (
                textes.aucunEvenement
              ) : (
                <>
                  {ministere.prochainEvenement.date},{' '}
                  <ChampLibre texte={ministere.prochainEvenement.nom} />
                </>
              )}
            </td>
            {ordinateur ? (
              <>
                <td className={cn(cellule, 'text-encre-2')}>
                  {ministere.prochaineReunion ?? textes.reunionNonRenseignee}
                </td>
                <td
                  className={cn(
                    cellule,
                    'pr-0 text-sm font-semibold',
                    ministere.pointOuvert
                      ? couleursPriorite[ministere.pointOuvert]
                      : 'text-encre-3',
                  )}
                >
                  {ministere.pointOuvert
                    ? libellesPriorite[ministere.pointOuvert]
                    : textes.aucunPointOuvert}
                </td>
              </>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
