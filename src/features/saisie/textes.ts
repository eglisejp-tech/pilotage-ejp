// Textes communs aux formulaires de saisie (BRIEF section 3 règle 9 ; LISEZMOI, « États »).
// Un écran ne réécrit jamais ces phrases : il passe par les briques de `src/features/saisie/`.

/**
 * Rappel sur les données personnelles : une fois par formulaire, sous le premier champ libre.
 * Seule exception : le champ « Pourquoi cet indicateur ? », sans rappel (T30). Une phrase : la
 * relecture est expliquée dans la page Confidentialité (guide, section 5 ; T66, t060).
 */
export const RAPPEL_DONNEES_PERSONNELLES = "N'écrivez aucun nom ni information personnelle."

/** Durée du message de réussite après une saisie : 6 secondes (LISEZMOI, « Réussite »). */
export const DUREE_REUSSITE_MS = 6000

/**
 * Ce qui reste dans le formulaire après un échec d'envoi : des chiffres, ou une saisie pour tous
 * les autres formulaires (événement, réunion, point, signalement, clôture, session, indicateur :
 * T66, t062 et m257, les mêmes mots pour la même situation).
 */
export type ObjetSaisie = 'chiffres' | 'saisie'

const ERREURS_CONNEXION: Record<ObjetSaisie, string> = {
  chiffres: 'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
  saisie: 'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
}

/** Erreur de formulaire, sous le bouton d'enregistrement : les valeurs restent. */
export function erreurDeConnexion(objet: ObjetSaisie): string {
  return ERREURS_CONNEXION[objet]
}

/** Largeur à partir de laquelle une saisie s'ouvre en panneau latéral de 460 px (BRIEF section 9). */
export const LARGEUR_PANNEAU = 600

/**
 * Fermer un panneau de saisie dont un champ a changé (m265, guide des messages 10.7, Proposé) :
 * « Retour », Échap, le fond du panneau ou « Annuler ».
 */
export const TEXTES_FERMER_SANS_ENREGISTRER = {
  titre: 'Fermer sans enregistrer ?',
  texte: 'Ce que vous avez saisi sera perdu.',
  fermer: 'Fermer sans enregistrer',
  continuer: 'Continuer la saisie',
} as const
