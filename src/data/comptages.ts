// Comptages d'événements de l'église et ponctualité (lot L2, X10 ; T68) : une fonction typée par
// requête. La base compte tout (`evenements_eglise_mois()`, `v_evenement`) à l'heure de Paris et
// décide qui lit quoi : Coordination, le berger, le conseil et EJP Tech lisent les totaux ; tout
// autre compte reçoit un refus 42501. Rien n'est recompté ici.

import type { LigneComptagesEglise, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Un événement commencé en retard, lu dans `v_evenement` (dernier état « Terminé »). */
export type RetardEvenement = Pick<
  LigneVue<'v_evenement'>,
  'id' | 'ministere_id' | 'titre' | 'date'
> & {
  /** Minutes de retard, au-delà de la tolérance de 5 minutes (K22b). */
  retard: number
}

/**
 * Totaux de l'église par mois, du mois de départ au mois en cours, du plus récent au plus ancien
 * (mois vides compris).
 */
export async function lireComptagesEglise(): Promise<LigneComptagesEglise[]> {
  const { data, error } = await supabase().rpc('evenements_eglise_mois')
  if (error) throw error
  return data
}

/**
 * Événements datés entre `debut` et `fin` (inclus) commencés en retard, par date puis titre. Pour
 * le berger, le conseil et EJP Tech, qui lisent tous les événements (RLS) ; jamais demandé pour
 * Coordination, qui ne lit que les totaux (K11). `a_l_heure` faux équivaut à `retard > 5` : la
 * tolérance reste dans la base.
 */
export async function lireRetardsDuMois(debut: string, fin: string): Promise<RetardEvenement[]> {
  const { data, error } = await supabase()
    .from('v_evenement')
    .select('id, ministere_id, titre, date, retard')
    .eq('a_l_heure', false)
    .gte('date', debut)
    .lte('date', fin)
    .order('date', { ascending: true })
    .order('titre', { ascending: true })
  if (error) throw error
  return data.flatMap(({ retard, ...evenement }) =>
    retard === null ? [] : [{ ...evenement, retard }],
  )
}
