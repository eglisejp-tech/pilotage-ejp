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
 * Le fondu ne joue qu'une fois (`Arrivee`) : il est réputé fini après deux fois sa durée (une
 * image en retard ne le coupe jamais), puis ce qui apparaît dessous arrive sans animation.
 */
export const FIN_DU_FONDU_MS = 2 * DUREE_FONDU_MS

/**
 * Ouverture de l'outil (T67) : le monogramme se dessine, puis la flamme s'allume, puis le nom
 * apparaît, en 2,5 s. Elle s'affiche tout de suite (sans les 300 ms de vide) et se joue en entier,
 * même quand la session est lue avant. Les durées des classes `ouverture-*` de src/index.css
 * suivent cette constante : tracé de 0 à 1,6 s, flamme de 1,45 s à 2,05 s, nom de 1,8 s à 2,3 s,
 * puis le logo complet jusqu'à 2,5 s.
 */
export const DUREE_OUVERTURE_MS = 2500
