// Types de l'observabilité des personnes (décision T56) : les tables `intervenant`,
// `journal_intervenant` et `passage`, les vues `v_ma_declaration`, `v_personnes` et
// `v_journal_intervenant`, les fonctions `declarer_intervenant`, `effacer_prenom` et
// `effacer_prenoms_anciens`. Lues par EJP Tech seul ; un compte ne lit que la dernière
// déclaration de sa session. Source : 20261013090000_observabilite_personnes.sql.

import type { Aucun, TableEnLecture, Vue } from './communs'

/** Première déclaration de la session, rappel du jour (T63), ou « Ce n'est pas moi ». */
export type MotifIntervenant = 'connexion' | 'rappel' | 'changement'

export type TablesPersonnes = {
  /** Écrite par `declarer_intervenant` seulement, en ajout seulement (sauf l'effacement). */
  intervenant: TableEnLecture<{
    id: number
    compte: string
    session_auth: string
    /** « Marie D. », ou « [prénom effacé] ». */
    prenom: string
    motif: MotifIntervenant
    declare_le: string
  }>
  /** Le lien entre une ligne de journal et une déclaration, écrit par la base. */
  journal_intervenant: TableEnLecture<{ journal_id: number; intervenant_id: number }>
  /**
   * Un jour d'utilisation. Ajout direct : la base impose la déclaration de la session et le jour
   * de Paris ; une seconde ligne le même jour est ignorée.
   */
  passage: {
    Row: { intervenant_id: number; jour: string; premiere_le: string }
    Insert: { intervenant_id?: number; jour?: string; premiere_le?: string }
    Update: Aucun
    Relationships: []
  }
}

export type VuesPersonnes = {
  /**
   * La dernière déclaration de la session qui lit. `du_jour` (T63, migration
   * 20261013140000_acceptation_par_personne.sql) : faite aujourd'hui, jour de Paris ; sinon le
   * prénom est redemandé. `age_secondes` ne sert plus (c'était le rappel des 7 jours de T56).
   */
  v_ma_declaration: Vue<{
    id: number
    prenom: string
    motif: MotifIntervenant
    declare_le: string
    age_secondes: number
    du_jour: boolean
  }>
  /** Une ligne par compte et par prénom (EJP Tech seul). Compteurs sur 30 jours de Paris. */
  v_personnes: Vue<{
    compte: string
    compte_libelle: string
    prenom: string
    /** Dernière déclaration du groupe : celle que « Effacer ce prénom » envoie. */
    intervenant_id: number
    connexions_30_jours: number
    jours_30_jours: number
    actions_30_jours: number
    derniere_activite: string
    /** Déclarations de plus de 12 mois dont le prénom n'est pas encore effacé. */
    declarations_anciennes: number
    /** Dernière version des conditions acceptée par la personne (T61) ; null : aucune. */
    version_acceptee: string | null
    /** Heure de cette acceptation ; null avec la version. */
    acceptee_le: string | null
  }>
  /**
   * Prénom des lignes de journal des comptes de ministère depuis la première déclaration (EJP
   * Tech seul) ; null : personne non déclarée.
   */
  v_journal_intervenant: Vue<{ journal_id: number; prenom: string | null }>
}

export type FonctionsPersonnes = {
  declarer_intervenant: {
    Args: { p_prenom: string; p_motif: MotifIntervenant }
    Returns: undefined
  }
  /** Rend le nombre de déclarations dont le prénom est effacé. */
  effacer_prenom: { Args: { p_intervenant: number }; Returns: number }
  effacer_prenoms_anciens: { Args: Record<string, never>; Returns: number }
}
