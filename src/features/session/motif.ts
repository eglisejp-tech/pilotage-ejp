import type { Statut } from '@/features/session/etat'

// Pourquoi l'écran de connexion s'affiche : une session qui se termine sans « Se déconnecter »
// (jeton refusé, compte bloqué, double authentification réinitialisée) est annoncée par un
// bandeau (BRIEF section 8 et LISEZMOI, « États ») ; un clic sur « Se déconnecter » est confirmé
// par « Compte déconnecté. » (m060, utile sur un appareil partagé).

export type MotifFin = 'connexion-expiree' | 'session-expiree' | 'deconnexion'

/** Fin voulue par la personne : null (aucune), annoncée ou silencieuse (compte désactivé). */
let deconnexionVolontaire: 'annoncee' | 'silencieuse' | null = null
let motif: MotifFin | null = null

/**
 * À appeler juste avant signOut : la fin de session qui suit n'est pas une expiration. `annoncer`
 * faux : rien ne s'affiche ensuite (l'écran « Compte désactivé » a déjà tout dit).
 */
export function noterDeconnexionVolontaire(annoncer = true) {
  deconnexionVolontaire = annoncer ? 'annoncee' : 'silencieuse'
}

/** Compare l'état précédent et le nouvel état de la session. */
export function noterTransition(precedent: Statut | undefined, suivant: Statut) {
  if (suivant !== 'anonyme') {
    deconnexionVolontaire = null
    motif = null
    return
  }
  if (deconnexionVolontaire === null) {
    if (precedent === 'code' || precedent === 'activation') motif = 'connexion-expiree'
    if (precedent === 'connecte' || precedent === 'conditions' || precedent === 'declaration') {
      motif = 'session-expiree'
    }
  } else if (
    deconnexionVolontaire === 'annoncee' &&
    precedent !== undefined &&
    precedent !== 'anonyme'
  ) {
    motif = 'deconnexion'
  }
  deconnexionVolontaire = null
}

/** Motif à annoncer sur l'écran de connexion. */
export function lireMotif(): MotifFin | null {
  return motif
}

/** Une fois annoncé, le motif s'efface : un retour sur l'écran ne le réaffiche pas. */
export function effacerMotif() {
  motif = null
}
