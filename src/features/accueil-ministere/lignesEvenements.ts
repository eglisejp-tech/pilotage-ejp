import type { LigneVosSaisies } from '@/features/accueil-ministere/types'

/**
 * Lignes de « Vos saisies » pour les événements du ministère ou qui le mentionnent, dont ceux à
 * confirmer (maquette 07). Amorce de W0 : aucune ligne. Le lot E6 la remplit (et lui donne ses
 * paramètres), E7 l'appelle.
 */
export function lignesEvenements(): readonly LigneVosSaisies[] {
  return []
}
