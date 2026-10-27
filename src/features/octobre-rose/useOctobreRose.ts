import { useSyncExternalStore } from 'react'
import { estOctobreRose } from '@/features/octobre-rose/octobreRose'

// Relu à chaque rendu, et quand la personne revient sur l'onglet ou la fenêtre : une page restée
// ouverte la nuit du 31 octobre perd le ruban et le bandeau à son retour, sans minuterie.
function abonner(relire: () => void): () => void {
  document.addEventListener('visibilitychange', relire)
  window.addEventListener('focus', relire)
  return () => {
    document.removeEventListener('visibilitychange', relire)
    window.removeEventListener('focus', relire)
  }
}

const lire = () => estOctobreRose(new Date())

/** Vrai pendant le mois d'octobre, à l'heure de Paris. */
export function useOctobreRose(): boolean {
  return useSyncExternalStore(abonner, lire, lire)
}
