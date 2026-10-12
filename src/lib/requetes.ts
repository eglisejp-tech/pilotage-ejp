import { QueryClient } from '@tanstack/react-query'

/**
 * Vrai si l'erreur vient du délai maximal de `fetchAvecDelai` (10 s). Les lectures de `src/data/`
 * lèvent l'erreur de postgrest-js, dont le message commence par le nom de l'erreur d'origine
 * (« TimeoutError: ... ») ; une erreur JavaScript directe porte ce nom dans `name`.
 */
export function estDelaiDepasse(erreur: unknown): boolean {
  if (typeof erreur !== 'object' || erreur === null) return false
  const { name, message } = erreur as { name?: unknown; message?: unknown }
  return (
    name === 'TimeoutError' || (typeof message === 'string' && message.startsWith('TimeoutError'))
  )
}

/**
 * Un seul nouvel essai après un échec, jamais après un délai dépassé : la page affiche son erreur
 * au bout de 10 s, pas de 21 s (plan de l'étape 7, lot F1).
 */
export function relancer(nombreEchecs: number, erreur: unknown): boolean {
  return nombreEchecs < 1 && !estDelaiDepasse(erreur)
}

/** Cache des requêtes (TanStack Query), unique pour l'application. */
export const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      retry: relancer,
      refetchOnWindowFocus: false,
      // Par défaut, TanStack Query met une requête en pause hors ligne : elle n'échoue jamais,
      // « Chargement » ne finit pas et le délai de 10 s de fetchAvecDelai ne court pas. En mode
      // « always », la requête part, échoue et l'écran affiche « La connexion a échoué ».
      networkMode: 'always',
      // En mode « always », TanStack Query coupe aussi la relecture au retour du réseau (valeur
      // par défaut : networkMode !== 'always'). On la remet : une page en erreur ou périmée se
      // recharge seule quand la connexion revient.
      refetchOnReconnect: true,
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
