import type { ReactNode } from 'react'

/**
 * Colonnes et écarts de chaque grille de champs côte à côte, les mêmes qu'avant la grille
 * commune : `paire` pour la saisie du dimanche (une colonne, deux dès 600 px, pour que la bulle
 * d'aide en flux prenne toute la largeur au téléphone, T38), `trois` pour la répartition par
 * catégorie (deux colonnes, trois dès 600 px), `quatre` pour la carte des FIJ et les chiffres par
 * département (deux colonnes, quatre dès 600 px).
 */
const DISPOSITIONS = {
  paire: 'grid-cols-1 gap-3 tablette:grid-cols-2',
  trois: 'grid-cols-2 gap-3 tablette:grid-cols-3',
  quatre: 'grid-cols-2 gap-x-3 gap-y-4 tablette:grid-cols-4',
} as const

interface Props {
  disposition: keyof typeof DISPOSITIONS
  /** Des `ChampNombre`, un par cellule. */
  children: ReactNode
}

/**
 * Grille des champs côte à côte. Chaque `ChampNombre` y occupe trois rangées, partagées avec ses
 * voisins par sous-grille : sa tête (libellé, aide, définition, mention), sa case, son pied (note,
 * « Déjà saisi », messages). Dans une rangée, les titres sont donc sur une même ligne, les cases
 * sur une même ligne et les notes sous leur case, quelle que soit la longueur des textes venus de
 * la base et qu'une note ou un message soit d'un seul côté ou non (constaté sur iPad le
 * 26 octobre 2026). L'écart de la grille sépare deux rangées de champs ; à l'intérieur d'un
 * champ, les écarts restent les siens.
 */
export function GrilleChamps({ disposition, children }: Props) {
  return <div className={`grid ${DISPOSITIONS[disposition]}`}>{children}</div>
}
