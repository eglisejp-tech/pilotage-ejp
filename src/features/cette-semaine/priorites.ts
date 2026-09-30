import type { Priorite } from './types'

export const libellesPriorite: Record<Priorite, string> = {
  urgente: 'Urgente',
  haute: 'Haute',
  normale: 'Normale',
}

/** Couleur d'état d'une priorité, toujours doublée de son mot. */
export const couleursPriorite: Record<Priorite, string> = {
  urgente: 'text-alerte',
  haute: 'text-attention',
  normale: 'text-encre-3',
}
