import { Link } from 'react-router'
import { MarqueFraicheur } from '@/features/fiche/MarqueFraicheur'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'

interface Props {
  ministeres: LigneListeMinistere[]
  idTitre: string
}

/**
 * Les ministères sous 600 px (comme le tableau devenu liste de 03) : le nom, qui ouvre la fiche,
 * sa description et sa fraîcheur, dans l'ordre reçu.
 */
export function ListeMinisteresTelephone({ ministeres, idTitre }: Props) {
  return (
    <ul aria-labelledby={idTitre}>
      {ministeres.map((ministere) => (
        <li
          key={ministere.id}
          className="flex flex-col gap-0.5 border-t border-filet py-3 text-[15px] first:border-t-0"
        >
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <Link
              to={ministere.href}
              className="-my-3 inline-flex min-h-cible items-center font-semibold underline decoration-encre-3 underline-offset-4"
            >
              {ministere.nom}
            </Link>
            <MarqueFraicheur
              libelle={ministere.fraicheur.libelle}
              etat={ministere.fraicheur.etat}
            />
          </span>
          {ministere.description !== null ? (
            <span className="text-sm text-encre-3">{ministere.description}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
