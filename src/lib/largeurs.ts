/**
 * Largeurs d'écran nommées (proposition 15, T69), en pixels CSS : les mêmes que les variantes
 * Tailwind de src/index.css (`tablette:`, `ordinateur:`...), pour les composants qui changent de
 * structure en JavaScript (`useLargeurMin(LARGEURS.tablette)`). Paliers de BRIEF_DESIGN,
 * section 6 : téléphone sous 600 px, tablette, ordinateur à 1024 px, grand écran à 1440 px ;
 * 768 px (courbes de la fiche, tableau des chiffres) et 1280 px (en-tête, colonne « À décider »)
 * viennent de choix écrits dans LISEZMOI. Le test de ce fichier vérifie l'accord avec le CSS.
 */
export const LARGEURS = {
  tablette: 600,
  tabletteLarge: 768,
  ordinateur: 1024,
  ordinateurLarge: 1280,
  grandEcran: 1440,
} as const

export type NomLargeur = keyof typeof LARGEURS
