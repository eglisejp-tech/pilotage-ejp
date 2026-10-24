/**
 * Colonnes de la file « Textes à relire » à partir de 1024 px (maquette 15) : le type et la date,
 * le texte cité, puis les boutons ou la décision. Une seule grille les porte, celle de la liste
 * (`GRILLE_FILE`) ; chaque ligne et chaque texte en héritent par sous-grille (`RANGEE_FILE`) :
 * les citations commencent toutes au même endroit, quelle que soit la largeur du type ou des
 * boutons d'une ligne (proposition 5, T69). En dessous de 1024 px, une seule colonne.
 */
export const GRILLE_FILE =
  'ordinateur:grid ordinateur:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] ordinateur:gap-x-8'

export const RANGEE_FILE =
  'ordinateur:col-span-full ordinateur:grid ordinateur:grid-cols-subgrid ordinateur:gap-x-8'
