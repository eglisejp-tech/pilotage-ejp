// Textes du bloc « À décider » de « Cette semaine » (berger, conseil, EJP Tech ; BRIEF, section 9).
// Sortis du JSX par la refonte des textes (T66, t253) : aucun composant ne les écrit en dur. Les
// textes gardés tels quels (« À décider », « Tous les points »). L'état vide est dans
// `textesVides.ts`.

export const TEXTES_A_DECIDER = {
  titre: 'À décider',
  /** Lien vers l'onglet « Ouverts » de l'écran des points. */
  tousLesPoints: 'Tous les points',
  /** Lu avant la priorité par les lecteurs d'écran : « Priorité Urgente ». */
  priorite: 'Priorité ',
  /** Échéance passée : toujours le mot, jamais la couleur seule (BRIEF, section 9). */
  depassee: ', dépassée',
  attendu: 'Attendu :',
} as const
