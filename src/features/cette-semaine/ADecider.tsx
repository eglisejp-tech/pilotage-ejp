import { useId } from 'react'
import { Link } from 'react-router'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'
import { MessageVide } from './MessageVide'
import { PointADecider } from './PointADecider'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { PointADecider as DonneesPoint } from './types'

/** « À décider » montre les trois premiers points à toutes les tailles (BRIEF, section 9). */
const POINTS_A_DECIDER_AFFICHES = 3

interface Props {
  /** Points ouverts, dans l'ordre de « À décider ». */
  points: DonneesPoint[]
  /** Onglet « Ouverts » des points d'attention. */
  lienTousLesPoints: string
  /**
   * Compte connecté (berger ou conseil), pour « Marquer traité » de chaque point. Null ou absent :
   * lecture seule (EJP Tech, T29), aucun bouton.
   */
  compte?: CompteDesActions | null
}

/**
 * Bloc « À décider » du berger et du conseil (et d'EJP Tech, en lecture seule). Il porte le repère
 * de focus de la page (`data-repli-focus`) : quand « Marquer traité » retire un point, le focus y
 * revient au lieu de se perdre.
 */
export function ADecider({ points, lienTousLesPoints, compte = null }: Props) {
  const idTitre = useId()
  const affiches = points.slice(0, POINTS_A_DECIDER_AFFICHES)

  return (
    <section aria-labelledby={idTitre} data-repli-focus className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre="À décider"
        complement={
          <Link
            to={lienTousLesPoints}
            className="-my-3 inline-flex min-h-cible items-center text-sm text-nuit underline underline-offset-4"
          >
            Tous les points
          </Link>
        }
      />
      {affiches.length === 0 ? (
        <MessageVide>{TEXTES_VIDES.aDecider.aucunPoint}</MessageVide>
      ) : (
        <ol>
          {affiches.map((point) => (
            <li key={point.id} className="border-t border-filet first:border-t-0">
              <PointADecider point={point} compte={compte} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
