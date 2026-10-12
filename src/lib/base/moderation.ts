// Types de la modération (étape 6, écran 15, lot L6), dans le format de `communs.ts` : la file des
// textes à relire, `marquer_relu` et `masquer_texte`. Source : 20261009120000_lot_i_correctifs.sql
// (`private.textes_a_relire()`, onze colonnes) et 20261009110000_signalements.sql (les deux
// fonctions). EJP Tech seul lit la file et appelle les fonctions, en `aal2`.

import type { Aucun, Vue } from './communs'

/**
 * Ce que porte une ligne de la file : l'écriture d'un point, d'un commentaire de traitement,
 * d'un événement, d'une réunion ou la précision d'un chiffre sensible (P46). Un signalement n'y
 * entre pas : il a son bloc (T39).
 */
export type CibleTexteARelire =
  'point_attention' | 'point_suivi' | 'evenement' | 'reunion' | 'precision_sensible'

/**
 * Ce que `masquer_texte` accepte : les cibles de la file, le « Pourquoi » et le motif d'un refus
 * d'indicateur (qui valent relecture, hors file), et les deux textes d'un signalement.
 */
export type CibleMasquable =
  CibleTexteARelire | 'demande_indicateur' | 'validation' | 'signalement' | 'signalement_suivi'

/** Les quatre motifs de la liste de « Masquer le texte » (BRIEF, « Modération »). */
export type MotifMasquage = 'nom_personne' | 'coordonnees' | 'situation_personnelle' | 'autre'

export type EtatTexteARelire = 'a_relire' | 'relu' | 'masque'

export type TablesModeration = Aucun

export type VuesModeration = {
  /**
   * La file de relecture d'EJP Tech (`private.textes_a_relire()`) : une ligne par écriture qui
   * porte des champs libres. Tous les éléments à relire, puis ceux écrits dans les 30 derniers
   * jours (jour de Paris). Jamais une valeur chiffrée, une priorité ni un statut.
   */
  v_textes_a_relire: Vue<{
    cible: CibleTexteARelire
    cible_id: string
    /** Ministère de l'auteur, ou de la précision ; null pour le berger, le conseil et EJP Tech. */
    ministere_id: string | null
    /** Libellé du compte auteur : « Social », « Berger », « Conseil, compte 3 ». */
    auteur_libelle: string
    ecrit_le: string
    /** Les champs libres non vides : `{ titre, description, action_attendue }`, `{ texte }`... */
    champs: Record<string, string>
    etat: EtatTexteARelire
    /** Null tant que le texte est à relire. */
    decision_le: string | null
    /** Motif d'un masquage, null sinon. */
    motif: MotifMasquage | null
    /** Précision d'un chiffre sensible seulement : libellé actuel de l'indicateur. */
    indicateur_libelle: string | null
    /** Précision d'un chiffre sensible seulement : premier jour du mois. */
    mois: string | null
  }>
}

export type FonctionsModeration = {
  /** Marque un texte comme relu : « rien à signaler » (EJP Tech seul, une seule fois). */
  marquer_relu: {
    Args: { p_cible: CibleMasquable; p_cible_id: string }
    Returns: undefined
  }
  /**
   * Remplace un champ par « [texte masqué par EJP Tech] » (EJP Tech seul) : refus repris tels
   * quels (« Choisissez un motif dans la liste. », « Texte introuvable, vide ou déjà masqué. »).
   */
  masquer_texte: {
    Args: { p_cible: CibleMasquable; p_cible_id: string; p_champ: string; p_motif: MotifMasquage }
    Returns: undefined
  }
}
