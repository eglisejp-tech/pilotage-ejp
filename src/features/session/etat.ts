import type { Compte } from '@/data/compte'
import { declarationNecessaire } from '@/lib/metier/declaration'
import type { Declaration } from '@/lib/metier/declaration'

/**
 * État de la session, calculé à chaque changement d'authentification (BRIEF section 8,
 * « Routage selon le niveau »). Seule source de vérité des gardes et de la navigation.
 */
export type EtatSession =
  | { statut: 'anonyme' }
  /** Ligne `compte` absente ou désactivée : message, puis déconnexion locale. */
  | { statut: 'desactive' }
  /** aal1 sans facteur vérifié : écran 17. */
  | { statut: 'activation'; compte: Compte; email: string | null }
  /** aal1 avec un facteur vérifié : écran 18, sur ce facteur. */
  | { statut: 'code'; compte: Compte; email: string | null; facteurId: string }
  /**
   * aal2, mais la version courante des conditions n'est pas acceptée : écran d'acceptation. Par
   * compte (T53) ; sur un compte de ministère, par la personne déclarée sur cet appareil (T61),
   * dont `prenom` porte le nom (« Vous : Marie », « Ce n'est pas moi »).
   */
  | { statut: 'conditions'; compte: Compte; email: string | null; prenom?: string }
  /**
   * Compte de ministère en aal2 sans déclaration valable sur cette session (aucune, d'un jour
   * précédent, ou prénom effacé) : écran « Qui utilise l'outil ? » (T56, T63), avant les
   * conditions de la personne (T61).
   */
  | {
      statut: 'declaration'
      compte: Compte
      email: string | null
      /** La déclaration précédente de la session (rappel du jour : son prénom est proposé), ou null. */
      declaration: Declaration | null
    }
  /**
   * aal2 et conditions acceptées : l'application. `prenom` : la personne déclarée sur cet
   * appareil, pour un compte de ministère seulement (« Vous : Marie »).
   */
  | { statut: 'connecte'; compte: Compte; email: string | null; prenom?: string }

export type Statut = EtatSession['statut']

export type ElementsSession = {
  utilisateur: { id: string; email: string | null } | null
  niveau: { actuel: string | null; suivant: string | null }
  compte: Compte | null
  /** Premier facteur TOTP vérifié (mfa.listFactors), lu seulement quand il sert. */
  facteurVerifie: string | null
  /**
   * La version courante des conditions est acceptée (lu seulement en aal2) : par le compte, ou,
   * pour un compte de ministère, par la personne déclarée sur cette session (T61).
   */
  conditionsAcceptees: boolean
  /**
   * Dernière déclaration de la session (T56), lue seulement pour un compte de ministère en aal2 ;
   * null sinon.
   */
  declaration: Declaration | null
}

/** Applique le tableau de routage de la section 8, dans son ordre. */
export function deduireEtat({
  utilisateur,
  niveau,
  compte,
  facteurVerifie,
  conditionsAcceptees,
  declaration,
}: ElementsSession): EtatSession {
  if (!utilisateur) return { statut: 'anonyme' }
  if (!compte || !compte.actif) return { statut: 'desactive' }
  const { email } = utilisateur
  if (niveau.actuel === 'aal2') {
    // Compte non partagé : les conditions du compte (T53), puis l'application.
    if (compte.type !== 'ministere') {
      return conditionsAcceptees
        ? { statut: 'connecte', compte, email }
        : { statut: 'conditions', compte, email }
    }
    // Compte de ministère, partagé : qui l'utilise (T56), puis les conditions de cette personne
    // (T61), puis l'application.
    if (declaration === null || declarationNecessaire(declaration)) {
      return { statut: 'declaration', compte, email, declaration }
    }
    if (!conditionsAcceptees) {
      return { statut: 'conditions', compte, email, prenom: declaration.prenom }
    }
    return { statut: 'connecte', compte, email, prenom: declaration.prenom }
  }
  if (niveau.suivant === 'aal2' && facteurVerifie) {
    return { statut: 'code', compte, email, facteurId: facteurVerifie }
  }
  return { statut: 'activation', compte, email }
}
