// Types des fonctions d'écriture des points d'attention (étape 5), dans le format de `communs.ts`.
// La table `point_attention`, la vue `v_point` et `point_mention` sont déjà lues (communs.ts) ;
// seules les trois fonctions de l'API s'ajoutent. Sources : supabase/migrations/
// 20260930163204_fonctions_api.sql (signatures) et 20260930194240_correctifs_audit.sql (statut
// courant). Écrit par le lot C0 ; les lots P1 à P4 ne le changent pas.

import type { Aucun, Priorite, StatutPoint } from './communs'

export type TablesPoints = Aucun

export type VuesPoints = Aucun

export type FonctionsPoints = {
  /**
   * Crée un point du ministère connecté (seul un compte de ministère le peut) : il naît « À
   * traiter », avec ses mentions, une ligne de journal sans texte. Rend l'identifiant du point.
   * Refus repris tels quels : « Donnez un titre au point (80 caractères au plus). », « L'échéance
   * ne peut pas être passée. », « Ce ministère ne peut pas être mentionné. ».
   */
  creer_point: {
    Args: {
      p_titre: string
      p_description: string | null
      p_action_attendue: string | null
      p_priorite: Priorite
      /** « 2026-10-12 » (jour de Paris), ou null : sans échéance. */
      p_echeance: string | null
      p_mentions: string[]
    }
    Returns: string
  }
  /**
   * Passe un point d'un statut ouvert à un autre (ministère créateur ou mentionné seulement).
   * Le statut « traite » passe par `marquer_traite`. Le même statut n'écrit rien.
   */
  changer_statut_point: {
    Args: { p_point_id: string; p_statut: StatutPoint }
    Returns: undefined
  }
  /**
   * Marque un point traité, définitivement : ministère créateur ou mentionné (commentaire de 10 à
   * 280 caractères), berger ou conseil (commentaire facultatif, 280 au plus).
   */
  marquer_traite: {
    Args: { p_point_id: string; p_commentaire?: string | null }
    Returns: undefined
  }
}
