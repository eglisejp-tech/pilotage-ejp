// Types de l'acceptation des conditions d'utilisation (T53, T61) : les tables
// `acceptation_conditions` (par compte) et `acceptation_personne` (par personne déclarée sur un
// compte de ministère partagé), la fonction `accepter_conditions`, qui écrit dans l'une ou
// l'autre selon le compte, et `conditions_acceptees`, la question de l'écran. Sources :
// 20261010121000_acceptation_conditions.sql, 20261013140000_acceptation_par_personne.sql et
// 20261013140500_acceptation_par_personne_corrections.sql.

import type { TableEnLecture } from './communs'

export type TablesConditions = {
  /**
   * Comptes non partagés (berger, conseil, administration, EJP Tech) : une ligne par compte et par
   * version. Un compte ne lit que les siennes, EJP Tech toutes. Écrite par `accepter_conditions`
   * seulement (aucun GRANT insert), en ajout seulement.
   */
  acceptation_conditions: TableEnLecture<{
    id: string
    compte: string
    /** Date de la version acceptée, « 2026-10-08 ». */
    version: string
    saisi_le: string
    saisi_par: string
  }>
  /**
   * Comptes de ministère (T61) : une ligne par déclaration et par version, attachée à la
   * déclaration de la personne (`intervenant`), jamais un prénom. Lue par EJP Tech seul (onglet
   * « Personnes ») ; la session d'un ministère pose seulement la question par
   * `conditions_acceptees`. Écrite par `accepter_conditions` seulement, en ajout seulement.
   */
  acceptation_personne: TableEnLecture<{
    id: number
    intervenant_id: number
    /** Date de la version acceptée, « 2026-10-12 ». */
    version: string
    saisi_le: string
    saisi_par: string
  }>
}

export type FonctionsConditions = {
  /**
   * Par personne pour un compte de ministère (refusée sans prénom déclaré sur la session, ou sur
   * une session fermée), par compte sinon. Refusée pour une version qui n'est pas une vraie date ou
   * qui est à venir (jour de Paris). Idempotente pour une même version ; aucune ligne de journal.
   */
  accepter_conditions: {
    Args: { p_version: string }
    Returns: undefined
  }
  /**
   * La question de l'écran (T61) : la personne déclarée sur la session (compte de ministère), ou
   * le compte (sinon), a-t-elle accepté cette version ? Faux sans déclaration valable. Source :
   * 20261013140500_acceptation_par_personne_corrections.sql.
   */
  conditions_acceptees: {
    Args: { p_version: string }
    Returns: boolean
  }
}
