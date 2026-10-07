// Types des comptes et des sessions de l'administration (étape 6), dans le format de
// `communs.ts`. Posé vide par le lot C0 et branché dans `src/lib/base.ts` : les lots le remplissent
// sans toucher `base.ts`.
// - L1 (écran 13) : `v_etat_comptes`. Les Edge Functions de comptes ne passent pas par ce type.
// - L2 (écran 14) : la table `session`, `declarer_session`, `modifier_session`,
//   `supprimer_session`.
// Déjà typées ailleurs, à ne pas redéclarer ici : `v_session_completude` (communs.ts) et
// `v_usage_indicateurs` (indicateurs.ts).

import type { Aucun, TypeCompte, Vue } from './communs'

export type TablesComptes = Aucun

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

export type FonctionsComptes = Aucun
