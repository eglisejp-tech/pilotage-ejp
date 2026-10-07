// Types des signalements de difficulté (étape 4, T39). Fichier rempli par les lots B7 et E8 :
// `signalement`, `signalement_suivi`, `v_signalement`, `signaler_difficulte` et
// `clore_signalement`, dans le format de `communs.ts`. Un signalement n'est lu que par le
// ministère qui l'a écrit et par EJP Tech. Source : 20261009110000_signalements.sql.

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
  /** La clôture d'EJP Tech, une seule par signalement, écrite par `clore_signalement`. */
  signalement_suivi: TableEnLecture<{
    id: string
    signalement_id: string
    commentaire: string | null
    saisi_le: string
    saisi_par: string
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
  }>
}

export type FonctionsSignalements = {
  /**
   * Ministère actif seulement (le ministère vient de la session) : rend l'identifiant du
   * signalement. Refus repris tels quels (contrat de l'étape 4, section 7).
   */
  signaler_difficulte: {
    Args: { p_ecran: EcranSignalement; p_texte: string }
    Returns: string
  }
  /** EJP Tech seul, une seule fois (« Ce signalement est déjà clos. »). */
  clore_signalement: {
    Args: { p_signalement_id: string; p_commentaire?: string | null }
    Returns: undefined
  }
}
