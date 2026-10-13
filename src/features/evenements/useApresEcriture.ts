import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { CLE_SESSION, estDelaiDepasse } from '@/lib/requetes'

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

/**
 * Une création (événement, point, signalement) : les lectures sont relues après la réussite, et
 * aussi après 10 s sans réponse, quand la base a peut-être enregistré (m259). La liste relue
 * montre alors ce qui est passé : la phrase d'erreur dit de la vérifier avant de réessayer, car
 * un doublon ne s'efface plus (ajout seulement).
 */
export async function creerPuisRelire(
  creer: () => Promise<unknown>,
  apresEcriture: () => void,
): Promise<void> {
  try {
    await creer()
  } catch (erreur) {
    if (estDelaiDepasse(erreur)) apresEcriture()
    throw erreur
  }
  apresEcriture()
}
