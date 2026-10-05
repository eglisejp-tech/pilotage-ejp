// Lectures des ministères (tableau « Les ministères » et noms des créateurs et des mentions).

import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type MinistereListe = Pick<LigneTable<'ministere'>, 'id' | 'code' | 'nom' | 'desactive_le'>

/**
 * Tableau des ministères actifs : dernière saisie, prochain événement, et pour le berger et le
 * conseil seulement, prochaine réunion et priorité du point ouvert (null pour les autres profils).
 */
export async function lireTableauMinisteres(): Promise<LigneVue<'v_tableau_ministeres'>[]> {
  const { data, error } = await supabase()
    .from('v_tableau_ministeres')
    .select(
      'ministere_id, nom, description, derniere_saisie, prochain_evenement_date, prochain_evenement_titre, prochaine_reunion_date, prochaine_reunion_heure, point_ouvert_priorite',
    )
  if (error) throw error
  return data
}

/** Tous les ministères, désactivés compris : noms des créateurs, des mentions et des apports. */
export async function lireMinisteres(): Promise<MinistereListe[]> {
  const { data, error } = await supabase().from('ministere').select('id, code, nom, desactive_le')
  if (error) throw error
  return data
}
