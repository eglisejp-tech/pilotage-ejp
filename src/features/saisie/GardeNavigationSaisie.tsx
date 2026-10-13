import { useCallback, useEffect } from 'react'
import { useBlocker } from 'react-router'
import type { BlockerFunction } from 'react-router'

export interface NavigationRetenue {
  /** « Continuer la saisie » : la navigation est abandonnée, l'adresse reste celle du panneau. */
  continuer: () => void
  /** « Fermer sans enregistrer » : la navigation reprend. */
  quitter: () => void
}

interface Props {
  /** Vrai si quitter le panneau maintenant perdrait une saisie. */
  doitRetenir: () => boolean
  /** Une navigation (Précédent du navigateur, un lien) attend la réponse de la personne. */
  onRetenue: (navigation: NavigationRetenue) => void
}

/**
 * Retient une navigation qui quitterait un panneau de saisie modifié (m265) : le bouton Précédent
 * du navigateur ou un lien de la page. Seulement sous un routeur de données (`useBlocker`) : le
 * panneau ne la rend pas ailleurs (tests sous `MemoryRouter`).
 */
export function GardeNavigationSaisie({ doitRetenir, onRetenue }: Props) {
  const retenir = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search) &&
      doitRetenir(),
    [doitRetenir],
  )
  const bloqueur = useBlocker(retenir)

  useEffect(() => {
    if (bloqueur.state !== 'blocked') return
    onRetenue({ continuer: () => bloqueur.reset(), quitter: () => bloqueur.proceed() })
  }, [bloqueur, onRetenue])

  return null
}
