import { NavLink } from 'react-router'
import type { Onglet } from '@/features/navigation/profils'
import { cn } from '@/lib/utils'

type Proprietes = { onglets: readonly Onglet[] }

/**
 * Onglets du profil à partir de 1024 px (maquettes 01 et 04) : l'onglet actif est en gras et
 * souligné par la lumière, l'un de ses trois usages (BRIEF_DESIGN section 3).
 */
export function NavigationOnglets({ onglets }: Proprietes) {
  return (
    <nav aria-label="Navigation principale" className="flex">
      <ul role="list" className="flex gap-6 xl:gap-7.5">
        {onglets.map(({ libelle, chemin }) => (
          <li key={chemin} className="flex">
            <NavLink
              to={chemin}
              end={chemin === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center pt-5.5 pb-4.5 text-[15px] whitespace-nowrap text-encre-2',
                  isActive && 'font-bold text-encre shadow-[inset_0_-4px_0_var(--color-lumiere)]',
                )
              }
            >
              {libelle}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
