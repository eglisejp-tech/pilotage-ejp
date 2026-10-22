import { FLAMME } from '@/components/etats/formesFlamme'
import { useIdDessin } from '@/components/etats/useIdDessin'

interface Props {
  /**
   * `logo` (par défaut) : les couleurs de la flamme, pour un bloc qui se relit. `bouton` : la
   * couleur du libellé du bouton (la flamme orange ne se lirait pas sur le jaune du bouton
   * principal, ni le bleu nuit de la proposition sur un bouton foncé) : elle a toujours le
   * contraste du texte qu'elle accompagne.
   */
  couleur?: 'logo' | 'bouton'
}

/**
 * La petite flamme, de la taille du texte (T65, moments 3 et 4) : un bloc qui se relit, un bouton
 * qui envoie. Elle bat doucement (CSS), et ne bouge plus quand l'appareil demande moins
 * d'animations. Dessin seulement (`aria-hidden`) : le texte voisin dit ce qui se passe.
 */
export function PetiteFlamme({ couleur = 'logo' }: Props) {
  const id = useIdDessin()
  const logo = couleur === 'logo'
  return (
    <svg
      viewBox="76 86 22 40"
      aria-hidden="true"
      focusable="false"
      data-flamme="petite"
      className={`${logo ? 'flamme-battement' : 'flamme-battement-bouton'} h-[1.5em] w-[0.85em] shrink-0`}
    >
      {logo ? (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--flamme-haut)' }} />
            <stop offset="1" style={{ stopColor: 'var(--flamme-bas)' }} />
          </linearGradient>
        </defs>
      ) : null}
      <path style={{ fill: logo ? `url(#${id})` : 'currentColor' }} d={FLAMME} />
    </svg>
  )
}
