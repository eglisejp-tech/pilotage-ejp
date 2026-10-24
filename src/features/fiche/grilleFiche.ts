// Grille d'une ligne de « Les chiffres du ministère » (maquette 04 : libellé, valeur, écart,
// courbe, dernière saisie). À partir de 768 px, cinq colonnes alignées d'une ligne à l'autre ; en
// dessous, le libellé et la valeur sur la première ligne, l'écart et la date dessous, sans courbe
// (la courbe a son équivalent texte, et la date suffit sur téléphone). Classes partagées par les
// lignes des communs, des indicateurs, des comptages et l'en-tête de la colonne des courbes.
//
// Rangée régulière (proposition 17, T69 ; écart 10 de LISEZMOI) : la première ligne ne porte que
// le libellé, la valeur, l'écart, la courbe et la date. Le reste (somme de l'année et son aide,
// mois en cours, explication d'une valeur non calculée, précisions) passe dessous, sous le
// libellé, en petit et en gris, sur toute la largeur de la rangée. La colonne des valeurs tient
// « Non calculé, à vérifier » sur une ligne, jusqu'au texte agrandi de 1440 px.

export const GRILLE_LIGNE =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 tablette-large:grid-cols-[minmax(0,1fr)_9.5rem_3rem_8.75rem_minmax(0,1fr)]'

export const CASE_LIBELLE = 'col-start-1 min-w-0 text-texte break-words'
export const CASE_VALEUR = 'col-start-2 row-start-1 justify-self-end text-right'
export const CASE_ECART = 'col-span-2 min-w-0 tablette-large:col-span-1'
export const CASE_COURBE = 'hidden tablette-large:block'
/** Dernière colonne : la date de la dernière saisie (ou la complétude d'un calcul). */
export const CASE_DETAIL = 'col-span-2 min-w-0 text-detail text-encre-3 tablette-large:col-span-1'
/** Sous la rangée, sous le libellé : le détail, en petit et en gris (proposition 17). */
export const SOUS_LIGNES = 'mt-1.5 flex flex-col gap-1 text-detail text-encre-3'

/** Largeur et hauteur des petites courbes (maquette 04). */
export const COURBE_LARGEUR = 132
export const COURBE_HAUTEUR = 26
