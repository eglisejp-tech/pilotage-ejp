// Carte des FIJ et chiffres FIJ par département (lot E4) : une fonction par requête. Le ministère
// `fij` seul écrit (politique d'ajout de `fij_departement`, `saisir_fij_statistiques`) ; la vue
// `v_fij_statistique` fait les totaux, la complétude sur 8 et la dernière saisie de chaque
// département (lot B5). Rien n'est recompté ici.

import { schemaCarteFij, schemaStatistiquesFij } from '@/features/saisie-fij/schemas'
import type { SaisieCarteFij, SaisieStatistiquesFij } from '@/features/saisie-fij/schemas'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type LigneStatistiqueFij = LigneVue<'v_fij_statistique'>

/** Code du ministère FIJ (posé par migration) : les deux saisies FIJ lui sont réservées. */
export const CODE_MINISTERE_FIJ = 'fij'

/** Code technique d'un ministère (« fij », « coordination »), ou null. */
export async function lireCodeMinistere(ministereId: string): Promise<string | null> {
  const { data, error } = await supabase()
    .from('ministere')
    .select('code')
    .eq('id', ministereId)
    .maybeSingle()
  if (error) throw error
  return data?.code ?? null
}

/**
 * Chiffres par département des 10 derniers dimanches jusqu'au dimanche de référence, une ligne
 * par rubrique et par dimanche, du plus ancien au plus récent.
 */
export async function lireStatistiquesFij(): Promise<LigneStatistiqueFij[]> {
  const { data, error } = await supabase()
    .from('v_fij_statistique')
    .select(
      'rubrique, rubrique_libelle, rubrique_ordre, dimanche, total, nb_departements, departements, derniere_saisie_le',
    )
    .order('dimanche', { ascending: true })
    .order('rubrique_ordre', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Enregistre la carte des FIJ : les 8 départements en une seule instruction `insert` (une ligne
 * de journal `fij_saisie`, BRIEF section 6).
 */
export async function enregistrerCarteFij(
  ministereId: string,
  valeurs: SaisieCarteFij,
): Promise<void> {
  const lignes = schemaCarteFij.parse(valeurs)
  const { error } = await supabase()
    .from('fij_departement')
    .insert(
      lignes.map(({ departement, valeur }) => ({ ministere_id: ministereId, departement, valeur })),
    )
  if (error) throw error
}

/**
 * Enregistre les chiffres par département d'une semaine : un seul appel de
 * `saisir_fij_statistiques` (32 valeurs au plus, une ligne de journal sans valeur).
 */
export async function enregistrerStatistiquesFij(saisie: SaisieStatistiquesFij): Promise<void> {
  const { dimanche, valeurs } = schemaStatistiquesFij.parse(saisie)
  const { error } = await supabase().rpc('saisir_fij_statistiques', {
    p_dimanche: dimanche,
    p_valeurs: valeurs,
  })
  if (error) throw error
}
