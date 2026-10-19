import { useSyncExternalStore } from 'react'

const REQUETE = '(prefers-reduced-motion: reduce)'

function abonner(prevenir: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const liste = window.matchMedia(REQUETE)
  liste.addEventListener('change', prevenir)
  return () => liste.removeEventListener('change', prevenir)
}

function lire() {
  return typeof window.matchMedia === 'function' && window.matchMedia(REQUETE).matches
}

/**
 * Vrai quand l'appareil demande moins d'animations (« Réduire les animations »). Les animations
 * CSS s'arrêtent déjà par la règle de src/styles/tokens.css ; ce signal sert aux formes animées
 * en SVG (SMIL), que seul pauseAnimations arrête. Sans matchMedia (tests jsdom) : faux.
 */
export function useMoinsDAnimations(): boolean {
  return useSyncExternalStore(abonner, lire, () => false)
}
