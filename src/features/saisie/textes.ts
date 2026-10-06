// Textes communs aux formulaires de saisie (BRIEF section 3 règle 9 ; LISEZMOI, « États »).
// Un écran ne réécrit jamais ces phrases : il passe par les briques de `src/features/saisie/`.

/**
 * Rappel sur les données personnelles : une fois par formulaire, sous le premier champ libre.
 * Seule exception : le champ « Pourquoi cet indicateur ? », sans rappel (T30).
 */
export const RAPPEL_DONNEES_PERSONNELLES =
  "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech."

/** Durée du message de réussite après une saisie : 6 secondes (LISEZMOI, « Réussite »). */
export const DUREE_REUSSITE_MS = 6000

/** Ce qui reste dans le formulaire après un échec d'envoi. */
export type ObjetSaisie = 'chiffres' | 'message'

const ERREURS_CONNEXION: Record<ObjetSaisie, string> = {
  chiffres: 'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
  message: 'La connexion a échoué. Votre message est encore dans le formulaire : réessayez.',
}

/** Erreur de formulaire, sous le bouton d'enregistrement : les valeurs restent. */
export function erreurDeConnexion(objet: ObjetSaisie): string {
  return ERREURS_CONNEXION[objet]
}

/** Largeur à partir de laquelle une saisie s'ouvre en panneau latéral de 460 px (BRIEF section 9). */
export const LARGEUR_PANNEAU = 600
