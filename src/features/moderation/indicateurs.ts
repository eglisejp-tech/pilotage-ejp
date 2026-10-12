import type { DemandeEnAttente } from '@/data/moderation'

/** Ce que dit l'en-tête : le nombre d'indicateurs qui attendent, et depuis combien de jours. */
export interface IndicateursAValider {
  nombre: number
  /** Jours d'attente du plus ancien, comptés par la base (heure de Paris). */
  plusAncienJours: number
}

/**
 * Résume les demandes en attente : un indicateur compte une fois, même avec deux demandes (un
 * ajout et une correction du nom). Aucune demande : `null`, l'en-tête ne s'affiche pas.
 */
export function resumerIndicateursAValider(
  demandes: readonly DemandeEnAttente[],
): IndicateursAValider | null {
  const indicateurs = new Set(demandes.map((demande) => demande.indicateur_id))
  if (indicateurs.size === 0) return null
  return {
    nombre: indicateurs.size,
    plusAncienJours: Math.max(...demandes.map((demande) => demande.attente_jours)),
  }
}
