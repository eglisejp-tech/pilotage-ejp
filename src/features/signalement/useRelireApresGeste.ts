import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { CLE_SESSION } from '@/lib/requetes'

/**
 * Après un geste du suivi (T77) : toutes les lectures sont à relire, comme après toute écriture
 * (`useApresEcriture`), et la promesse attend que celles de la page ouverte soient relues. Le
 * geste ne se dit réussi qu'avec la liste à jour : le focus peut alors aller sur l'en-tête du
 * signalement, dans son nouveau groupe. L'état de session ne bouge pas.
 */
export function useRelireApresGeste(): () => Promise<void> {
  const queryClient = useQueryClient()
  return useCallback(
    () =>
      queryClient.invalidateQueries({
        predicate: (requete) => requete.queryKey[0] !== CLE_SESSION[0],
      }),
    [queryClient],
  )
}
