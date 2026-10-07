// Textes du bloc « Événements à confirmer » de « Cette semaine » (T31, lot E6). Sources :
// docs/conception/validation-metier.md, 4.4 et 4.5. « Proposé » : texte que ni le BRIEF ni
// LISEZMOI ne donnent encore. L'aide du titre est `accueil.aConfirmer` (`textesAide.ts`).

export const TEXTES_A_CONFIRMER = {
  titre: 'Événements à confirmer',
  phrase:
    'Ces événements attendent encore leur validation alors que leur date approche ou est passée. Le ministère qui les porte met à jour leur statut.',
  /** « Voir les 8 événements à confirmer » (le dépliage se fait sur place). */
  voirTout: (n: number) => `Voir les ${n} événements à confirmer`,
  /** Une fois la liste dépliée. Proposé. */
  replier: 'Voir moins',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
