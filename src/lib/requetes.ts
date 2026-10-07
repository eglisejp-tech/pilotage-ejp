import { QueryClient } from '@tanstack/react-query'

/** Cache des requêtes (TanStack Query), unique pour l'application. */
export const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Par défaut, TanStack Query met une requête en pause hors ligne : elle n'échoue jamais,
      // « Chargement » ne finit pas et le délai de 10 s de fetchAvecDelai ne court pas. En mode
      // « always », la requête part, échoue et l'écran affiche « La connexion a échoué ».
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
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
