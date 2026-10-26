import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { classer } from '@/data/echecEnvoi'
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

/**
 * Une création (événement, point, signalement) : les lectures sont relues après la réussite, et
 * aussi après tout échec dont l'issue est inconnue (aucune réponse, réponse perdue, délai : la base
 * a peut-être enregistré, m259, T76). La liste relue
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
    if (classer(erreur).issue !== 'rien_enregistre') apresEcriture()
    throw erreur
  }
  apresEcriture()
}
