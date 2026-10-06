import { useId, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export interface PeriodeAChoisir {
  cle: string
  /** « Dimanche 20 sept. (déjà saisi) », « Août 2026 ». */
  libelle: string
  /** Adresse de la saisie de cette période. */
  vers: string
  /** La période affichée par le formulaire. */
  courante: boolean
}

interface Props {
  /** « Choisir un autre dimanche », « Choisir un autre mois ». */
  libelle: string
  periodes: readonly PeriodeAChoisir[]
}

/**
 * « Choisir un autre dimanche » ou « Choisir un autre mois » : un bouton qui ouvre la liste des
 * périodes, une ligne de 48 px par période (LISEZMOI, « Choisir la session »). Chaque ligne ouvre
 * la saisie de sa période ; la période affichée porte `aria-current`.
 */
export function ListePeriodes({ libelle, periodes }: Props) {
  const [ouverte, setOuverte] = useState(false)
  const idListe = useId()
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={ouverte}
        aria-controls={ouverte ? idListe : undefined}
        onClick={() => setOuverte((precedent) => !precedent)}
        className="inline-flex min-h-cible items-center self-start text-[15px] text-nuit underline underline-offset-4"
      >
        {libelle}
      </button>
      {ouverte ? (
        <ul id={idListe} className="flex flex-col border-t border-filet">
          {periodes.map((periode) => (
            <li key={periode.cle} className="border-b border-filet">
              <Link
                to={periode.vers}
                aria-current={periode.courante ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center py-2 text-[15px] text-encre underline underline-offset-4 hover:bg-fond',
                  periode.courante && 'font-semibold',
                )}
              >
                {periode.libelle}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
