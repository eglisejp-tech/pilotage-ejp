import { QueryClient } from '@tanstack/react-query'

/** Cache des requêtes (TanStack Query), unique pour l'application. */
export const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Clé de l'état de session : la seule source de vérité des gardes et de la navigation. */
export const CLE_SESSION = ['session'] as const

/**
 * Retire du cache toutes les données, sauf l'état de session. Appelé quand le compte change ou se
 * déconnecte : un appareil partagé ne garde rien du compte précédent.
 */
export function viderDonnees() {
  clientRequetes.removeQueries({
    predicate: (requete) => requete.queryKey[0] !== CLE_SESSION[0],
  })
}
