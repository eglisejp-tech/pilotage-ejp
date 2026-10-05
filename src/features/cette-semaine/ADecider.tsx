import { useId } from 'react'
import { Link } from 'react-router'
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
}

/** Bloc « À décider » du berger et du conseil. */
export function ADecider({ points, lienTousLesPoints }: Props) {
  const idTitre = useId()
  const affiches = points.slice(0, POINTS_A_DECIDER_AFFICHES)

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
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
              <PointADecider point={point} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
