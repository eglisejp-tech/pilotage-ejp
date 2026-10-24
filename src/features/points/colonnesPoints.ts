/**
 * Colonnes du tableau de l'écran 05 à partir de 1024 px (maquette 05 : priorité, point, statut,
 * échéance, boutons). Une seule grille les porte, celle du tableau (`GRILLE_POINTS`) ; l'en-tête,
 * la liste, chaque rangée et chaque point en héritent par sous-grille (`RANGEE_POINTS`), pour que
 * chaque titre soit au-dessus de sa valeur, quelle que soit la largeur des boutons d'une rangée
 * (proposition 5, T69) : la colonne des boutons prend la largeur des plus larges. Les sous-grilles
 * reprennent l'écart de la grille. En dessous de 1024 px, la rangée est une carte à deux colonnes
 * (priorité et échéance en tête).
 */
export const GRILLE_POINTS =
  'ordinateur:grid ordinateur:grid-cols-[110px_minmax(0,1fr)_150px_150px_auto] ordinateur:gap-x-5'

export const RANGEE_POINTS =
  'ordinateur:col-span-full ordinateur:grid ordinateur:grid-cols-subgrid ordinateur:gap-x-5'
