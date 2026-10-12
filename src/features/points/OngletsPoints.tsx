import { Link, useSearchParams } from 'react-router'
import { TEXTES_POINTS, VUES_POINTS } from '@/features/points/textesPoints'
import type { VuePoints } from '@/features/points/textesPoints'
import { cn } from '@/lib/utils'

interface Props {
  vue: VuePoints
  nombres: Record<VuePoints, number>
}

/**
 * Onglets Ouverts, Traités et Tous, avec leur nombre (maquette 05). Chacun est un lien : la vue
 * est dans l'adresse (`?vue=traites`), et les autres paramètres (le ministère choisi) restent.
 * L'onglet actif est en gras, souligné par la lumière (l'un de ses trois usages). « Ouverts » est
 * la vue par défaut : son adresse n'a pas de paramètre `vue`.
 */
export function OngletsPoints({ vue, nombres }: Props) {
  const [parametres] = useSearchParams()
  const adresse = (cible: VuePoints) => {
    const suivants = new URLSearchParams(parametres)
    if (cible === 'ouverts') suivants.delete('vue')
    else suivants.set('vue', cible)
    return { search: suivants.toString() }
  }
  return (
    <nav aria-label={TEXTES_POINTS.navigationVues}>
      <ul role="list" className="flex gap-5 min-[600px]:gap-7">
        {VUES_POINTS.map((cible) => {
          const actif = cible === vue
          return (
            <li key={cible} className="flex">
              <Link
                to={adresse(cible)}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-cible items-center whitespace-nowrap text-encre-2',
                  actif && 'font-bold text-encre shadow-[inset_0_-4px_0_var(--color-lumiere)]',
                )}
              >
                {TEXTES_POINTS.onglet(cible, nombres[cible])}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
