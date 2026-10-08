// Types de l'acceptation des conditions d'utilisation (T53) : la table `acceptation_conditions` et
// la fonction `accepter_conditions`. Une ligne par compte et par version ; un compte ne lit que
// les siennes, EJP Tech lit toutes les lignes. Source : 20261010121000_acceptation_conditions.sql.

import type { TableEnLecture } from './communs'

export type TablesConditions = {
  /** Écrite par `accepter_conditions` seulement (aucun GRANT insert), en ajout seulement. */
  acceptation_conditions: TableEnLecture<{
    id: string
    compte: string
    /** Date de la version acceptée, « 2026-10-08 ». */
    version: string
    saisi_le: string
    saisi_par: string
  }>
}

export type FonctionsConditions = {
  /** Idempotente pour une même version ; aucune ligne de journal. */
  accepter_conditions: {
    Args: { p_version: string }
    Returns: undefined
  }
}
