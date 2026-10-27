import { TEXTES_OCTOBRE_ROSE } from '@/features/octobre-rose/octobreRose'
import { useOctobreRose } from '@/features/octobre-rose/useOctobreRose'
import { cn } from '@/lib/utils'

type Proprietes = {
  /** Hauteur du ruban, à la taille du nom de l'outil ; la largeur suit le dessin. */
  className?: string
}

/**
 * Ruban de sensibilisation, à côté de « Pilotage EJP », en octobre seulement (heure de Paris).
 * Une image nommée « Octobre rose », hors du lien du nom : elle ne reçoit pas le focus et ne
 * change pas le nom du lien. Couleur : --octobre-rose (src/styles/tokens.css).
 */
export function RubanOctobreRose({ className }: Proprietes) {
  const octobre = useOctobreRose()
  if (!octobre) return null
  return (
    <svg
      role="img"
      aria-label={TEXTES_OCTOBRE_ROSE.nom}
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinejoin="round"
      className={cn('w-auto shrink-0 text-octobre-rose', className)}
    >
      <title>{TEXTES_OCTOBRE_ROSE.nom}</title>
      {/* La boucle en haut, les deux pans croisés dessous. */}
      <path d="M6.5 29.5 L14.6 13.4 C16.6 9.6 16.2 3 12 3 C7.8 3 7.4 9.6 9.4 13.4 L17.5 29.5" />
    </svg>
  )
}
