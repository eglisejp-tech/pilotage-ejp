// Types des points d'attention (étape 5), dans le format de `communs.ts`. La table `point_attention`
// et la vue `v_point` sont déjà lues (communs.ts) ; s'ajoutent les trois fonctions de l'API
// (`creer_point`, `changer_statut_point`, `marquer_traite`; sources : supabase/migrations/
// 20260930163204_fonctions_api.sql et 20260930194240_correctifs_audit.sql) et, pour les mentions
// modifiables (T54, 20261010122000_mentions_modifiables.sql), la table des retraits, la vue des
// mentions en vigueur et trois fonctions.

import type { Priorite, StatutPoint, TableEnLecture, Vue } from './communs'

export type TablesPoints = {
  /** Un retrait de mention (T54) : la ligne d'ajout qu'il annule, la date et le compte. */
  point_mention_retrait: TableEnLecture<{
    id: string
    mention_id: string
    saisi_le: string
    saisi_par: string
  }>
}

export type VuesPoints = {
  /**
   * Mentions en vigueur (T54) : les lignes d'ajout de `point_mention` qui n'ont pas de retrait,
   * pour les points que le compte lit. Un ministère retiré n'y figure plus.
   */
  v_point_mention: Vue<{ point_id: string; ministere_id: string }>
}

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
  /**
   * Ajoute un ministère mentionné sur un point non traité (ministère créateur, berger ou conseil).
   * Refus repris tels quels : « Ce ministère ne peut pas être mentionné. » (créateur, désactivé ou
   * inconnu), « Ce ministère est déjà mentionné sur ce point. », « Ce point est traité : ses
   * mentions ne changent plus. ».
   */
  ajouter_mention_point: {
    Args: { p_point_id: string; p_ministere_id: string }
    Returns: undefined
  }
  /**
   * Retire un ministère mentionné. Refus : « Ce ministère n'est pas mentionné sur ce point. », « Ce
   * point est traité : ses mentions ne changent plus. ».
   */
  retirer_mention_point: {
    Args: { p_point_id: string; p_ministere_id: string }
    Returns: undefined
  }
  /**
   * Remplace les mentions par la liste envoyée : la base retire ceux qui n'y sont plus et ajoute les
   * nouveaux, dans une seule transaction. Seuls les ajouts sont revérifiés.
   */
  modifier_mentions_point: {
    Args: { p_point_id: string; p_mentions: string[] }
    Returns: undefined
  }
}
