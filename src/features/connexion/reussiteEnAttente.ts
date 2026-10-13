// Réussite d'une étape de connexion annoncée sur l'écran suivant (messages m037 et m045) : après
// « Enregistrer le mot de passe » ou « Activer », la garde change d'écran aussitôt ; le message
// attend ici que l'écran suivant le lise. Il ne vit que dans cet onglet, et pas plus de 15 s : un
// écran qui ne l'affiche pas ne le laisse jamais ressortir plus tard, ailleurs.

/** Mot de passe choisi (invitation ou « Mot de passe oublié »), annoncé sur l'écran suivant. */
export const ANNONCE_MOT_DE_PASSE = 'Mot de passe enregistré.'

/** Premier code accepté à l'activation (écran 17), annoncé sur l'écran suivant. */
export const ANNONCE_DOUBLE_AUTHENTIFICATION = 'Double authentification activée.'

const DUREE_VALIDITE_MS = 15_000

let enAttente: { message: string; jusqua: number } | null = null

/** Le message s'affichera sur le prochain écran qui contient `AnnonceSuivante`. */
export function annoncerSurEcranSuivant(message: string) {
  enAttente = { message, jusqua: Date.now() + DUREE_VALIDITE_MS }
}

/** Message en attente, ou null (aucun, ou trop ancien). Ne l'efface pas. */
export function lireAnnonceSuivante(): string | null {
  if (enAttente === null || Date.now() > enAttente.jusqua) return null
  return enAttente.message
}

export function effacerAnnonceSuivante() {
  enAttente = null
}
