import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { CLE_SESSION } from '@/lib/requetes'

/**
 * Après une écriture réussie, toutes les lectures déjà faites sont relues à leur prochain usage
 * (calendrier, prochaine réunion, fraîcheur du ministère, journal) ; l'état de session ne bouge
 * pas. Les lectures de la page ouverte sont relues tout de suite.
 */
export function useApresEcriture(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (requete) => requete.queryKey[0] !== CLE_SESSION[0],
    })
  }, [queryClient])
}
