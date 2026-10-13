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
  /** aal2, mais la version courante des conditions n'est pas acceptée (T53) : écran d'acceptation. */
  | { statut: 'conditions'; compte: Compte; email: string | null }
  /**
   * Compte de ministère en aal2, conditions acceptées, sans déclaration valable sur cette session
   * (aucune, 7 jours ou plus, ou prénom effacé) : écran « Qui utilise l'outil ? » (T56).
   */
  | {
      statut: 'declaration'
      compte: Compte
      email: string | null
      /** La déclaration précédente de la session (rappel), ou null. */
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
  /** Le compte a accepté la version courante des conditions (lu seulement en aal2). */
  conditionsAcceptees: boolean
  /**
   * Dernière déclaration de la session (T56), lue seulement pour un compte de ministère en aal2
   * qui a accepté les conditions ; null sinon.
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
    if (!conditionsAcceptees) return { statut: 'conditions', compte, email }
    // Seul un compte de ministère est partagé : lui seul dit qui l'utilise (T56).
    if (compte.type !== 'ministere') return { statut: 'connecte', compte, email }
    if (declaration === null || declarationNecessaire(declaration)) {
      return { statut: 'declaration', compte, email, declaration }
    }
    return { statut: 'connecte', compte, email, prenom: declaration.prenom }
  }
  if (niveau.suivant === 'aal2' && facteurVerifie) {
    return { statut: 'code', compte, email, facteurId: facteurVerifie }
  }
  return { statut: 'activation', compte, email }
}
