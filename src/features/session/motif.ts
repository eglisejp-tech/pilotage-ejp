import type { Statut } from '@/features/session/etat'

// Pourquoi l'écran de connexion s'affiche : une session qui se termine sans « Se déconnecter »
// (jeton refusé, compte bloqué, double authentification réinitialisée) est annoncée par un
// bandeau (BRIEF section 8 et LISEZMOI, « États »).

export type MotifFin = 'connexion-expiree' | 'session-expiree'

let deconnexionVolontaire = false
let motif: MotifFin | null = null

/** À appeler juste avant signOut : la fin de session qui suit n'est pas une expiration. */
export function noterDeconnexionVolontaire() {
  deconnexionVolontaire = true
}

/** Compare l'état précédent et le nouvel état de la session. */
export function noterTransition(precedent: Statut | undefined, suivant: Statut) {
  if (suivant !== 'anonyme') {
    deconnexionVolontaire = false
    motif = null
    return
  }
  if (!deconnexionVolontaire) {
    if (precedent === 'code' || precedent === 'activation') motif = 'connexion-expiree'
    if (precedent === 'connecte') motif = 'session-expiree'
  }
  deconnexionVolontaire = false
}

/** Motif à annoncer sur l'écran de connexion. */
export function lireMotif(): MotifFin | null {
  return motif
}

/** Une fois annoncé, le motif s'efface : un retour sur l'écran ne le réaffiche pas. */
export function effacerMotif() {
  motif = null
}
