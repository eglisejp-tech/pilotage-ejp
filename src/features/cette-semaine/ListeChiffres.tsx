import { Courbe } from './Courbe'
import { EcartChiffre } from './EcartChiffre'
import type { LigneChiffre } from './types'
import { ValeurChiffre } from './ValeurChiffre'

interface Props {
  lignes: LigneChiffre[]
  /**
   * Résumé du ministère sous 600 px (maquette 07) : libellé, date et complétude, puis la valeur,
   * sans courbe ni écart.
   */
  compacte?: boolean
}

/**
 * Les chiffres de l'église sous 600 px (maquette 03) : libellé, date et complétude à gauche,
 * courbe au milieu, valeur et écart à droite. Une ligne sans valeur n'a ni courbe ni écart :
 * « Pas encore de saisie » prend leur place, sur une ligne.
 */
export function ListeChiffres({ lignes, compacte = false }: Props) {
  return (
    <ul>
      {lignes.map((ligne) => {
        const aSignaler = ligne.dateSignalee || ligne.completude?.complet === false
        const avecCourbe = !compacte && ligne.valeur.etat === 'saisie'
        return (
          <li
            key={ligne.id}
            className={`grid items-center gap-x-3 border-t border-filet py-3 first:border-t-0 ${avecCourbe ? 'grid-cols-[minmax(0,1fr)_72px_minmax(4.5rem,auto)]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px]">{ligne.libelle}</span>
              <span
                className={`text-note ${aSignaler ? 'font-semibold text-attention' : 'text-encre-3'}`}
              >
                {ligne.dateCourte ?? ligne.date}
                {ligne.completude ? (
                  <>
                    , <span className="whitespace-nowrap">{ligne.completude.texte}</span>
                  </>
                ) : null}
              </span>
            </div>
            {avecCourbe ? (
              <div>
                {ligne.courbe ? <Courbe courbe={ligne.courbe} largeur={72} hauteur={22} /> : null}
              </div>
            ) : null}
            <div className="flex flex-col items-end text-right">
              <ValeurChiffre valeur={ligne.valeur} />
              {ligne.ecart && !compacte ? (
                <EcartChiffre ecart={ligne.ecart} className="text-note" />
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
