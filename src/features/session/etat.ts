import type { Compte } from '@/data/compte'

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
  /** aal2 et conditions acceptées : l'application. */
  | { statut: 'connecte'; compte: Compte; email: string | null }

export type Statut = EtatSession['statut']

export type ElementsSession = {
  utilisateur: { id: string; email: string | null } | null
  niveau: { actuel: string | null; suivant: string | null }
  compte: Compte | null
  /** Premier facteur TOTP vérifié (mfa.listFactors), lu seulement quand il sert. */
  facteurVerifie: string | null
  /** Le compte a accepté la version courante des conditions (lu seulement en aal2). */
  conditionsAcceptees: boolean
}

/** Applique le tableau de routage de la section 8, dans son ordre. */
export function deduireEtat({
  utilisateur,
  niveau,
  compte,
  facteurVerifie,
  conditionsAcceptees,
}: ElementsSession): EtatSession {
  if (!utilisateur) return { statut: 'anonyme' }
  if (!compte || !compte.actif) return { statut: 'desactive' }
  const { email } = utilisateur
  if (niveau.actuel === 'aal2') {
    return { statut: conditionsAcceptees ? 'connecte' : 'conditions', compte, email }
  }
  if (niveau.suivant === 'aal2' && facteurVerifie) {
    return { statut: 'code', compte, email, facteurId: facteurVerifie }
  }
  return { statut: 'activation', compte, email }
}
