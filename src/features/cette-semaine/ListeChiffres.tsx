import { Courbe } from './Courbe'
import { EcartChiffre } from './EcartChiffre'
import type { LigneChiffre } from './types'
import { ValeurChiffre } from './ValeurChiffre'

interface Props {
  lignes: LigneChiffre[]
}

/**
 * Les chiffres de l'église sous 600 px (maquette 03) : libellé, date et complétude à gauche,
 * courbe au milieu, valeur et écart à droite.
 */
export function ListeChiffres({ lignes }: Props) {
  return (
    <ul>
      {lignes.map((ligne) => {
        const aSignaler = ligne.dateSignalee || !ligne.complet
        return (
          <li
            key={ligne.id}
            className="grid grid-cols-[minmax(0,1fr)_72px_minmax(4.5rem,auto)] items-center gap-x-3 border-t border-filet py-3 first:border-t-0"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px]">{ligne.libelle}</span>
              <span
                className={`text-note ${aSignaler ? 'font-semibold text-attention' : 'text-encre-3'}`}
              >
                {ligne.dateCourte ?? ligne.date},{' '}
                <span className="whitespace-nowrap">{ligne.completude}</span>
              </span>
            </div>
            <div>
              {ligne.courbe ? <Courbe courbe={ligne.courbe} largeur={72} hauteur={22} /> : null}
            </div>
            <div className="flex flex-col items-end text-right">
              <ValeurChiffre valeur={ligne.valeur} unite={ligne.unite} />
              {ligne.ecart ? <EcartChiffre ecart={ligne.ecart} className="text-note" /> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
