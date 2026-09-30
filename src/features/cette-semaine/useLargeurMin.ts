import { useCallback, useSyncExternalStore } from 'react'

/**
 * Vrai quand la fenêtre fait au moins `largeur` pixels CSS (zoom compris). Sert aux blocs qui
 * changent de structure selon le palier (tableau ou liste, place de « À décider ») : un seul
 * rendu à la fois, dans l'ordre du DOM, pour que l'ordre de lecture suive ce qui est affiché.
 * Sans matchMedia (tests jsdom), on suppose un grand écran.
 */
export function useLargeurMin(largeur: number): boolean {
  const requete = `(min-width: ${largeur}px)`

  const abonner = useCallback(
    (prevenir: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const liste = window.matchMedia(requete)
      liste.addEventListener('change', prevenir)
      return () => liste.removeEventListener('change', prevenir)
    },
    [requete],
  )

  const lire = useCallback(
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(requete).matches : true),
    [requete],
  )

  return useSyncExternalStore(abonner, lire)
}
