import { tracerCourbe } from './traceCourbe'
import type { DonneesCourbe } from './types'

interface Props {
  courbe: DonneesCourbe
  largeur: number
  hauteur: number
}

/** Petite courbe en bleu nuit, avec son équivalent texte (BRIEF, section 10). */
export function Courbe({ courbe, largeur, hauteur }: Props) {
  const { chemin, reperes } = tracerCourbe(courbe.points, largeur, hauteur)

  return (
    <svg
      role="img"
      aria-label={courbe.description}
      width={largeur}
      height={hauteur}
      viewBox={`0 0 ${largeur} ${hauteur}`}
      className="block overflow-visible text-nuit"
    >
      <path
        d={chemin}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {reperes.map((repere) => (
        <circle
          key={`${repere.x} ${repere.y}`}
          cx={repere.x}
          cy={repere.y}
          r={repere.rayon}
          data-plein={repere.plein}
          className={repere.plein ? 'fill-nuit' : 'fill-fond stroke-nuit'}
          strokeWidth={repere.plein ? 0 : 1.5}
        />
      ))}
    </svg>
  )
}
