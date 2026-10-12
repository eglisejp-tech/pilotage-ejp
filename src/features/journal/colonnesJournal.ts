/**
 * Colonnes du tableau (maquette 06 : 190, 240, 190 px, puis le reste, écart de 20 px). En dessous
 * de 1024 px, chaque ligne est une carte et l'en-tête disparaît. De 1024 à 1280 px, les trois
 * premières colonnes se resserrent pour laisser sa place au détail.
 */
export const COLONNES_JOURNAL =
  'lg:grid lg:grid-cols-[150px_190px_190px_minmax(0,1fr)] lg:gap-x-5 xl:grid-cols-[190px_240px_190px_minmax(0,1fr)]'
