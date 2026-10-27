// Types des signalements de difficulté (étape 4, T39) et de leur suivi (T77). Fichier rempli par
// les lots B7 et E8, puis par le suivi : `signalement`, `signalement_suivi`, `v_signalement`,
// `signaler_difficulte`, `clore_signalement` et les quatre gestes du suivi, dans le format de
// `communs.ts`. Un signalement n'est lu que par le ministère qui l'a écrit et par EJP Tech.
// Sources : 20261009110000_signalements.sql et 20261026140703_signalements_suivi.sql.

import type { TableEnLecture, Vue } from './communs'

/**
 * Écran d'où part un signalement (liste fermée, `/signaler?ecran=<code>`). « autre » quand on
 * arrive sans formulaire d'origine. Les libellés sont dans `src/features/signalement/textes.ts`.
 */
export type EcranSignalement =
  | 'saisie_dimanche'
  | 'saisie_mois'
  | 'saisie_session'
  | 'saisie_fij'
  | 'saisie_fij_statistiques'
  | 'saisie_evenement'
  | 'saisie_reunion'
  | 'autre'

/** Une étape du suivi, une ligne de `signalement_suivi` (vocabulaire fixé, T77). */
export type EtapeSuivi = 'en_cours' | 'reponse' | 'regle' | 'reponse_ministere' | 'clos'

/** Statut d'un signalement, lu par la base dans sa dernière étape et le jour de Paris (T77). */
export type StatutSignalement = 'recu' | 'en_cours' | 'repondu' | 'clos'

/** Fin d'un signalement clos : confirmé par le ministère, sans retour en 7 jours, ou par EJP Tech. */
export type FinSignalement = 'confirme' | 'automatique' | 'ejp_tech'

export type TablesSignalements = {
  /** Écrit par `signaler_difficulte` seulement (aucun GRANT insert), en ajout seulement. */
  signalement: TableEnLecture<{
    id: string
    ministere_id: string
    ecran: EcranSignalement
    /** 10 à 280 caractères ; « [texte masqué par EJP Tech] » s'il est masqué. */
    texte: string
    saisi_le: string
    saisi_par: string
  }>
  /**
   * Une ligne par étape (T77), écrite par les fonctions du suivi et `clore_signalement`, en ajout
   * seulement. `commentaire` : la réponse d'EJP Tech ou du ministère, la réponse de clôture ;
   * null pour une prise en charge ou une confirmation. `ordre` : l'ordre réel des lignes.
   */
  signalement_suivi: TableEnLecture<{
    id: string
    signalement_id: string
    commentaire: string | null
    saisi_le: string
    saisi_par: string
    etape: EtapeSuivi
    ordre: number
  }>
}

export type VuesSignalements = {
  /**
   * Un signalement avec sa clôture, sous la RLS du lecteur (le ministère auteur, EJP Tech). Les
   * dates se calculent à l'heure de Paris par la base : l'écran lit `ouvert` et `clos_recent`,
   * jamais la date du navigateur.
   */
  v_signalement: Vue<{
    id: string
    ministere_id: string
    ministere_nom: string
    ecran: EcranSignalement
    texte: string
    saisi_le: string
    /** La clôture ; null si ouvert. */
    suivi_id: string | null
    /** Null si ouvert ou clos sans commentaire. */
    commentaire: string | null
    /** Null si ouvert. */
    clos_le: string | null
    ouvert: boolean
    /** Clôture d'il y a 30 jours au plus (jour de Paris) ; faux si ouvert. */
    clos_recent: boolean
    statut: StatutSignalement
    /** Étape de la dernière ligne de suivi ; null pour Reçu. */
    derniere_etape: EtapeSuivi | null
    /** Instant du statut : dernière ligne, envoi pour Reçu, `clos_le` pour un Clos. */
    statut_le: string
    /** Jour de Paris moins celui de `statut_le` : l'âge affiché à EJP Tech. */
    jours_depuis: number
    /** Null si ouvert. */
    fin: FinSignalement | null
    /** Pour un Répondu : dernier jour de Paris (AAAA-MM-JJ) où le ministère peut répondre. */
    reponse_possible_jusquau: string | null
    /** Le ministère a un compte actif : sans lui, « Répondre au ministère » est refusé. */
    compte_actif: boolean
  }>
}

export type FonctionsSignalements = {
  /**
   * Ministère actif seulement (le ministère vient de la session) : rend l'identifiant du
   * signalement. Refus de la base (contrat de l'étape 4, section 7), traduits par
   * `src/data/messagesBase.ts`.
   */
  signaler_difficulte: {
    /** `p_cle` : numéro anti-doublon (T76), obligatoire ; la version à deux arguments délègue. */
    Args: { p_ecran: EcranSignalement; p_texte: string; p_cle: string }
    Returns: string
  }
  /**
   * EJP Tech seul, tout statut sauf Clos (« Ce signalement est déjà clos. »). Réponse facultative
   * en base (l'ancien site), obligatoire à l'écran (T77).
   */
  clore_signalement: {
    Args: { p_signalement_id: string; p_commentaire?: string | null }
    Returns: undefined
  }
  /** EJP Tech seul : Reçu vers En cours. */
  prendre_en_charge_signalement: {
    Args: { p_signalement_id: string }
    Returns: undefined
  }
  /** EJP Tech seul : Reçu ou En cours vers Répondu, réponse obligatoire ; rend l'id de la ligne. */
  repondre_au_ministere: {
    Args: { p_signalement_id: string; p_reponse: string }
    Returns: string
  }
  /** Le ministère du signalement, à l'étape Répondu : vers Clos (« Oui, c'est réglé »). */
  confirmer_signalement: {
    Args: { p_signalement_id: string }
    Returns: undefined
  }
  /** Le ministère du signalement, à l'étape Répondu : vers En cours, texte obligatoire. */
  repondre_a_ejp_tech: {
    Args: { p_signalement_id: string; p_texte: string }
    Returns: undefined
  }
}
