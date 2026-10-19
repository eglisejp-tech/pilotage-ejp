/**
 * Règle de temps commune à toutes les attentes (T65, docs/decisions.md) : rien pendant 300 ms ;
 * une fois montré, l'indicateur reste au moins 600 ms, pour ne jamais clignoter ; puis le contenu
 * arrive en fondu de 180 ms (classe `arrivee` de src/index.css), à sa place réservée.
 */

/** Rien ne s'affiche avant 300 ms : la plupart des lectures arrivent avant. */
export const DELAI_INDICATEUR_MS = 300

/** Une fois montré, l'indicateur reste au moins 600 ms. */
export const DUREE_MIN_INDICATEUR_MS = 600

/** Le contenu arrive en fondu de 180 ms (et 4 px de montée) : la durée de la classe `arrivee`. */
export const DUREE_FONDU_MS = 180

/**
 * Ouverture de l'outil : le monogramme se dessine, puis la flamme s'allume, en 1,2 s. Une fois
 * commencée, l'ouverture va jusqu'au bout (au moins 600 ms, comme tout indicateur).
 */
export const DUREE_OUVERTURE_MS = 1200
