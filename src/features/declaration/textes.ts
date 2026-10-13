// Textes de l'écran « Qui utilise l'outil ? » et de l'en-tête (décisions T56 et T63). Pas de
// rappel « N'écrivez aucun nom... » sous le champ : il contredirait la question.

export const TEXTES_DECLARATION = {
  titre: "Qui utilise l'outil ?",
  phrase: 'Ce compte est partagé. Indiquez votre prénom.',
  /** Rappel du jour (T63) : le prénom de la veille est déjà dans le champ. */
  phraseRappel: 'Ce compte est partagé. Confirmez votre prénom, ou changez-le.',
  libelle: 'Votre prénom',
  // Espaces insécables : « Marie D. » ne se coupe pas en fin de ligne.
  aide: "Vous pouvez ajouter l'initiale de votre nom : « Marie D. ».",
  information: "EJP Tech le voit, pour suivre l'utilisation de l'outil.",
  lienConfidentialite: 'Confidentialité',
  /** Lu seulement par les lecteurs d'écran, après « Confidentialité ». */
  nouvelOnglet: '(nouvel onglet)',
  continuer: 'Continuer',
  enCours: 'Enregistrement en cours',
  annuler: 'Annuler',
  seDeconnecter: 'Se déconnecter',
} as const

export const TEXTES_EN_TETE_PERSONNE = {
  /** « Vous : Marie ». */
  vous: (prenom: string) => `Vous : ${prenom}`,
  pasMoi: "Ce n'est pas moi",
} as const
