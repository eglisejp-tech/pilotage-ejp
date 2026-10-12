// Types des comptes et des sessions de l'administration (étape 6), dans le format de
// `communs.ts`. Posé vide par le lot C0 et branché dans `src/lib/base.ts` : les lots le remplissent
// sans toucher `base.ts`.
// - L1 (écran 13) : `v_etat_comptes`. Les Edge Functions de comptes ne passent pas par ce type.
// - L2 (écran 14) : la table `session`, `declarer_session`, `modifier_session`,
//   `supprimer_session`.
// Déjà typées ailleurs, à ne pas redéclarer ici : `v_session_completude` (communs.ts) et
// `v_usage_indicateurs` (indicateurs.ts).

import type { TableEnLecture, TypeCompte, TypeSession, Vue } from './communs'

export type TablesComptes = {
  /** Sessions déclarées (L2) : lues par tous les profils de l'application, écrites par fonction. */
  session: TableEnLecture<{
    id: string
    type: TypeSession
    date: string
    /** Nom du rassemblement, seulement pour le type « autre ». */
    intitule: string | null
    saisi_le: string
    saisi_par: string
  }>
  /** Ministères attendus d'une session (L2). */
  session_attendu: TableEnLecture<{ session_id: string; ministere_id: string }>
}

/**
 * État de la double authentification d'un compte, calculé par `private.etat_comptes()` : compte
 * désactivé, adresse pas encore confirmée (invitation envoyée), confirmée sans facteur TOTP
 * vérifié (à activer), ou avec un facteur vérifié (activée).
 */
export type EtatCompte = 'desactive' | 'invitation_envoyee' | 'a_activer' | 'activee'

export type VuesComptes = {
  /**
   * Tous les comptes avec leur adresse (lue dans Auth) et leur état (L1). Une ligne pour
   * l'administration de l'église en aal2 seulement ; aucune pour les autres profils, ni en aal1.
   */
  v_etat_comptes: Vue<{
    user_id: string
    type: TypeCompte
    libelle: string
    ministere_id: string | null
    email: string | null
    desactive_le: string | null
    etat: EtatCompte
  }>
}

export type FonctionsComptes = {
  /**
   * Déclare une session et ses ministères attendus (administration de l'église) : rend son
   * identifiant. Refus repris tels quels : « Une session ... est déjà déclarée le ... », « Cochez
   * au moins un ministère. », « Donnez un nom au rassemblement (80 caractères au plus). ».
   */
  declarer_session: {
    Args: { p_type: TypeSession; p_date: string; p_intitule: string | null; p_ministeres: string[] }
    Returns: string
  }
  /** Remplace les ministères attendus d'une session. */
  modifier_session: { Args: { p_session_id: string; p_ministeres: string[] }; Returns: undefined }
  /** Supprime une session sans aucune saisie. */
  supprimer_session: { Args: { p_session_id: string }; Returns: undefined }
}
