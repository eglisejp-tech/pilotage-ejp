import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { classer, premierEnvoiEnregistre } from '@/data/echecEnvoi'
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
 * Une création à numéro anti-doublon (événement, point, signalement ; T76) : les lectures sont
 * relues après la réussite, et aussi après tout échec dont l'issue est inconnue (aucune réponse,
 * réponse perdue, délai : la base a peut-être enregistré, m259) ou dont le numéro dit que le
 * premier envoi est enregistré. La liste relue montre alors ce qui est passé. Un statut 2xx reçu
 * (réponse perdue ensuite, ou bogue après la réponse) vaut réussite : la base a enregistré.
 */
export async function creerPuisRelire(
  creer: () => Promise<unknown>,
  apresEcriture: () => void,
): Promise<void> {
  try {
    await creer()
  } catch (erreur) {
    const { issue } = classer(erreur)
    if (issue === 'enregistre') {
      apresEcriture()
      return
    }
    if (issue !== 'rien_enregistre' || premierEnvoiEnregistre(erreur)) apresEcriture()
    throw erreur
  }
  apresEcriture()
}
