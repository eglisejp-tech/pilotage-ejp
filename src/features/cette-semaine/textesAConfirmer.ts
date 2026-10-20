// Textes du bloc « Événements à confirmer » de « Cette semaine » (T31, lot E6). Sources :
// docs/conception/validation-metier.md, 4.4 et 4.5. « Proposé » : texte que ni le BRIEF ni
// LISEZMOI ne donnent encore. La phrase définit la liste : le titre n'a plus de bulle (T66, t197
// et t198).

export const TEXTES_A_CONFIRMER = {
  titre: 'Événements à confirmer',
  phrase: 'Toujours en attente de validation, à 3 jours ou moins de leur date, ou déjà passés.',
  /** « Voir les 8 événements à confirmer » (le dépliage se fait sur place). */
  voirTout: (n: number) => `Voir les ${n} événements à confirmer`,
  /** Une fois la liste dépliée. Proposé. */
  replier: 'Voir moins',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
