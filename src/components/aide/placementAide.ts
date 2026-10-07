/**
 * Où s'affiche la bulle (aides-contextuelles.md, section 3).
 * - « flux » : sous le libellé, dans le flux. Elle pousse le champ vers le bas, ne le recouvre
 *   jamais (formulaires).
 * - « flottante » : sous le libellé, ou au-dessus s'il manque de la place. Elle ne recouvre ni
 *   son bouton ni le chiffre qu'elle explique (écrans de lecture).
 */
export type PlacementAide = 'flux' | 'flottante'
