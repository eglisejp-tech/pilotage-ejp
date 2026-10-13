/**
 * Ancre du bloc dans `/indicateurs` : le lien « Voir dans À valider » d'une ligne de
 * `/indicateurs/:id` (L3a) et celui de l'en-tête de la modération (L6) mènent à
 * `/indicateurs#a-valider`. Dans son propre fichier pour que le bloc et ses liens s'importent sans
 * cycle.
 */
export const ANCRE_A_VALIDER = 'a-valider'
