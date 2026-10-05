import { useId } from 'react'
import { niveauTeinte, placesDepartements, teintesCarte } from './carte'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { DonneesCarteFij } from './types'

interface Props {
  carte: DonneesCarteFij | null
}

/**
 * Carte des FIJ : un carré par département, placé comme sur la carte réelle. C'est une liste
 * (« Paris (75) : 4 FIJ ») : les carrés ne font que la dessiner. Elle suit la largeur de son
 * bloc, au plus 346 px sur téléphone et 380 px sur ordinateur.
 */
export function CarteFij({ carte }: Props) {
  const idTitre = useId()
  const valeurs = (carte?.departements ?? []).flatMap((departement) =>
    departement.valeur === null ? [] : [departement.valeur],
  )

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col gap-3 min-[600px]:gap-4">
      <TitreSection
        id={idTitre}
        titre="FIJ en Île-de-France"
        complement={
          carte && valeurs.length > 0 ? (
            <span className="text-note text-encre-3">{carte.total} FIJ</span>
          ) : null
        }
      />
      {carte === null || valeurs.length === 0 ? (
        <p className="text-encre-2">{TEXTES_VIDES.carte.vide}</p>
      ) : (
        <>
          <ul className="grid w-full max-w-[346px] grid-cols-5 gap-1 lg:max-w-[380px]">
            {carte.departements.map((departement) => {
              const place = placesDepartements[departement.code]
              const teinte =
                departement.valeur === null
                  ? 'border-2 border-dashed border-attention text-attention'
                  : teintesCarte[
                      niveauTeinte(departement.valeur, Math.min(...valeurs), Math.max(...valeurs))
                    ]
              return (
                <li
                  key={departement.code}
                  className={`${place} ${teinte} flex aspect-square min-w-0 flex-col justify-between p-1.5 min-[600px]:p-2`}
                >
                  <span aria-hidden="true" className="text-xs font-semibold">
                    {departement.code}
                  </span>
                  <span
                    aria-hidden="true"
                    className={
                      departement.valeur === null
                        ? 'text-xs font-semibold'
                        : 'font-chiffres text-2xl leading-[0.9] font-extrabold tabular-nums lg:text-[29px]'
                    }
                  >
                    {departement.valeur ?? TEXTES_VIDES.carte.departementSansValeur}
                  </span>
                  <span className="sr-only">
                    {departement.nom} ({departement.code}) :{' '}
                    {departement.valeur === null ? 'à saisir' : `${departement.valeur} FIJ`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="text-note text-encre-3">
            Un carré par département, placé comme sur la carte. Plus il est foncé, plus il compte de
            FIJ.
          </p>
        </>
      )}
    </section>
  )
}
