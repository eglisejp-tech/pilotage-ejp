import { Link } from 'react-router'
import { etatAffiche, motEtat } from '@/features/accueil-ministere/etatLigne'
import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { cn } from '@/lib/utils'

interface Props {
  ligne: LigneVosSaisies
}

const COULEUR: Record<'fait' | 'a_faire', { texte: string; carre: string }> = {
  fait: { texte: 'text-bien', carre: 'bg-bien' },
  a_faire: { texte: 'text-attention', carre: 'bg-attention' },
}

/**
 * Une ligne de « Vos saisies » (maquette 07) : le libellé, puis le mot d'état en couleur avec son
 * carré (jamais la couleur seule) et le détail, et à droite le bouton de la ligne (« Corriger »,
 * « Saisir », « Renseigner », « Mettre à jour »). Le nom accessible du bouton reprend le libellé
 * de la ligne (« Corriger : Chiffres du dimanche 27 sept. »), puisque plusieurs boutons portent le
 * même mot. Un événement qui mentionne seulement le ministère n'a pas de bouton.
 */
export function LigneSaisie({ ligne }: Props) {
  const { mot, texte } = etatAffiche(ligne)
  return (
    <li className="flex items-center justify-between gap-3 border-t border-filet py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[15px] font-semibold break-words">{ligne.libelle}</p>
        {mot !== null || texte !== null ? (
          <p className="flex flex-wrap gap-x-2.5 text-sm">
            {mot !== null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-2 font-semibold whitespace-nowrap',
                  COULEUR[mot].texte,
                )}
              >
                <span aria-hidden="true" className={cn('size-2', COULEUR[mot].carre)} />
                {motEtat(mot)}
              </span>
            ) : null}
            {texte !== null ? <span className="text-encre-3">{texte}</span> : null}
          </p>
        ) : null}
      </div>
      {ligne.action !== null ? (
        <Link
          to={ligne.action.vers}
          aria-label={`${ligne.action.libelle} : ${ligne.libelle}`}
          className="inline-flex min-h-cible shrink-0 items-center border border-encre bg-papier px-4.5 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond"
        >
          {ligne.action.libelle}
        </Link>
      ) : null}
    </li>
  )
}
