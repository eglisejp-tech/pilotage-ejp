import { useId } from 'react'
import { nombre } from '@/lib/metier/texte'
import { niveauTeinte, placesDepartements, teintesCarte } from './carte'
import { MessageVide } from './MessageVide'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { CodeDepartement, DonneesCarteFij } from './types'

interface Props {
  carte: DonneesCarteFij | null
}

const grille = 'grid w-full max-w-[346px] grid-cols-5 gap-1 ordinateur:max-w-[380px]'
// Les codes, « À saisir » et les nombres gardent l'échelle de la carte (maquettes 01 à 03) : à
// 360 px, un carré n'a que 49 px de large, sans place pour un cran de plus.
const carre = 'flex aspect-square min-w-0 flex-col justify-between p-1.5 tablette:p-2'
const codes: CodeDepartement[] = ['75', '77', '78', '91', '92', '93', '94', '95']

/**
 * Carte vide : les huit carrés à leur place, en filet gris pointillé, avec leur seul code. Le
 * bloc garde sa forme et son rythme sans montrer de nombre (pas de zéro qui aurait l'air d'une
 * donnée) ; la phrase au-dessus dit ce qui manque. Décorative pour les lecteurs d'écran.
 */
function CarteEnAttente() {
  return (
    <div aria-hidden="true" data-testid="carte-en-attente" className={grille}>
      {codes.map((code) => (
        <div
          key={code}
          className={`${placesDepartements[code]} ${carre} border-2 border-dashed border-filet text-encre-3`}
        >
          <span className="text-xs font-semibold">{code}</span>
        </div>
      ))}
    </div>
  )
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
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre="FIJ en Île-de-France"
        complement={
          carte && valeurs.length > 0 ? (
            <span className="text-note text-encre-3">{nombre(carte.total)} FIJ</span>
          ) : null
        }
      />
      {carte === null || valeurs.length === 0 ? (
        <div className="flex flex-col">
          <MessageVide>{TEXTES_VIDES.carte.vide}</MessageVide>
          <CarteEnAttente />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 tablette:mt-4 tablette:gap-4">
          <ul className={grille}>
            {carte.departements.map((departement) => {
              const place = placesDepartements[departement.code]
              const teinte =
                departement.valeur === null
                  ? 'border-2 border-dashed border-attention text-attention'
                  : teintesCarte[
                      niveauTeinte(departement.valeur, Math.min(...valeurs), Math.max(...valeurs))
                    ]
              return (
                <li key={departement.code} className={`${place} ${teinte} ${carre}`}>
                  <span aria-hidden="true" className="text-xs font-semibold">
                    {departement.code}
                  </span>
                  <span
                    aria-hidden="true"
                    className={
                      departement.valeur === null
                        ? 'text-xs font-semibold'
                        : 'font-chiffres text-2xl leading-[0.9] font-extrabold tabular-nums ordinateur:text-[29px]'
                    }
                  >
                    {departement.valeur === null
                      ? TEXTES_VIDES.carte.departementSansValeur
                      : nombre(departement.valeur)}
                  </span>
                  <span className="sr-only">
                    {departement.nom} ({departement.code}) :{' '}
                    {departement.valeur === null ? 'à saisir' : `${nombre(departement.valeur)} FIJ`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="text-note text-encre-3">Plus le carré est foncé, plus il y a de FIJ.</p>
        </div>
      )}
    </section>
  )
}
