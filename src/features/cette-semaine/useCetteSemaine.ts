import type { TypeSession } from '@/lib/metier/phrases'
import type { DonneesCetteSemaine, Lecteur } from './types'

/**
 * État de la vue pour l'écran. Les trois cas s'excluent : on teste `donnees`, `erreur` ou
 * `enChargement`, et TypeScript resserre les deux autres.
 */
export type ResultatCetteSemaine = {
  /** Relance les lectures en échec ; l'état repasse à `enChargement`. */
  reessayer: () => void
} & (
  | {
      /** Première lecture, ou nouvel essai après une erreur : « Chargement » après 300 ms. */
      enChargement: true
      erreur: false
      donnees: null
    }
  | {
      /**
       * Une lecture a échoué (après la nouvelle tentative de TanStack Query), aucune réponse
       * après 10 s, ou v_semaine sans ligne : bandeau « La connexion a échoué. Réessayez. ».
       */
      enChargement: false
      erreur: true
      donnees: null
    }
  | { enChargement: false; erreur: false; donnees: DonneesCetteSemaine }
)

/**
 * Lit la vue « Cette semaine » (useQueries, une requête par clé de LecturesCetteSemaine) et la
 * construit avec construireCetteSemaine. Les points ne sont lus que pour le berger et le
 * conseil ; les participations, pour la session affichée seulement.
 */
export function useCetteSemaine(
  lecteur: Lecteur,
  typeSession: TypeSession | null,
): ResultatCetteSemaine {
  // TODO lot A : lectures (src/data), délai de 10 s, construction.
  void lecteur
  void typeSession
  return { enChargement: true, erreur: false, donnees: null, reessayer: () => undefined }
}
