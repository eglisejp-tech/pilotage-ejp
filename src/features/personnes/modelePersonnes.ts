// Données de l'onglet « Personnes » prêtes à afficher (T56) : contrat entre `usePersonnes.ts` (ou
// l'aperçu) et les composants de `src/features/personnes/`.

import type { CompteAffiche, ConnexionAffichee } from '@/features/personnes/construirePersonnes'

export interface DonneesPersonnes {
  /** Personnes actives sur 30 jours, par compte. */
  actives: readonly CompteAffiche[]
  /** Déclarations de plus de 12 mois dont le prénom reste à effacer. */
  aEffacer: number
  /** Dernières connexions, de la plus récente à la plus ancienne. */
  connexions: readonly ConnexionAffichee[]
  /** Reste-t-il des connexions : « Afficher 50 de plus ». */
  aPlus: boolean
  plusEnCours: boolean
}
