import { FLAMME, FORMES_FLAMME, REFLETS } from '@/components/etats/formesFlamme'
import { useIdDessin } from '@/components/etats/useIdDessin'

/**
 * La flamme vivante, à placer dans un `<svg>` au repère du logo : une lueur qui respire (CSS), la
 * flamme qui passe par ses trois formes en boucle (SMIL, 1,9 s) et ses reflets qui dansent (CSS).
 * Le `<svg>` qui la porte arrête le SMIL quand l'appareil demande moins d'animations.
 */
export function FlammeAnimee() {
  const id = useIdDessin()
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-flamme`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--flamme-haut)' }} />
          <stop offset="1" style={{ stopColor: 'var(--flamme-bas)' }} />
        </linearGradient>
        <radialGradient id={`${id}-lueur`} cx="50%" cy="60%" r="50%">
          <stop offset="0" style={{ stopColor: 'var(--lumiere)', stopOpacity: 0.9 }} />
          <stop offset="1" style={{ stopColor: 'var(--lumiere)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse
        className="flamme-lueur"
        cx="87"
        cy="112"
        rx="15"
        ry="17"
        fill={`url(#${id}-lueur)`}
      />
      <path fill={`url(#${id}-flamme)`} d={FLAMME}>
        <animate
          attributeName="d"
          dur="1.9s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;.33;.66;1"
          keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1"
          values={FORMES_FLAMME}
        />
      </path>
      <g className="flamme-reflets" style={{ fill: 'var(--flamme-reflet)' }}>
        {REFLETS.map((reflet) => (
          <path key={reflet} d={reflet} />
        ))}
      </g>
    </g>
  )
}
