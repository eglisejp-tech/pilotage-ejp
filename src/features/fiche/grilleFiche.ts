// Grille d'une ligne de « Les chiffres du ministère » (maquette 04 : libellé, valeur, écart,
// courbe, dernière saisie). À partir de 768 px, cinq colonnes alignées d'une ligne à l'autre ; en
// dessous, le libellé et la valeur sur la première ligne, l'écart et la date dessous, sans courbe
// (la courbe a son équivalent texte, et la date suffit sur téléphone). Classes partagées par les
// lignes des communs, des indicateurs et l'en-tête de la colonne des courbes.

export const GRILLE_LIGNE =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_8.5rem_3rem_8.75rem_minmax(0,1fr)]'

export const CASE_LIBELLE = 'col-start-1 min-w-0 text-base break-words'
export const CASE_VALEUR = 'col-start-2 row-start-1 justify-self-end text-right'
export const CASE_ECART = 'col-span-2 min-w-0 md:col-span-1'
export const CASE_COURBE = 'hidden md:block'
export const CASE_DETAIL = 'col-span-2 min-w-0 text-sm text-encre-3 md:col-span-1'

/** Largeur et hauteur des petites courbes (maquette 04). */
export const COURBE_LARGEUR = 132
export const COURBE_HAUTEUR = 26
