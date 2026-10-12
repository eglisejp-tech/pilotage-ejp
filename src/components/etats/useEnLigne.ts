import { useSyncExternalStore } from 'react'

function abonner(prevenir: () => void) {
  window.addEventListener('online', prevenir)
  window.addEventListener('offline', prevenir)
  return () => {
    window.removeEventListener('online', prevenir)
    window.removeEventListener('offline', prevenir)
  }
}

/** Sans navigator.onLine (tests, rendu hors navigateur), on suppose la connexion présente. */
function lire(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/**
 * Vrai tant que le navigateur se croit connecté à internet. Sert au bandeau « Pas de connexion
 * internet » et à rien d'autre : aucun bouton n'est grisé hors ligne, l'envoi échoue et le dit
 * (LISEZMOI, « États »). Le navigateur ne se trompe que dans un sens : « en ligne » peut cacher
 * un serveur injoignable, que les erreurs de lecture et d'envoi couvrent.
 */
export function useEnLigne(): boolean {
  return useSyncExternalStore(abonner, lire, () => true)
}
