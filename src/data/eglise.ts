// Lectures de la vue de l'église (écran « Cette semaine ») : une fonction par requête. Les vues
// font les totaux, les écarts et la complétude ; rien n'est recompté ici (BRIEF, règles 3, 4, 13).
// Les dates sont celles de Paris, lues dans v_semaine : jamais la date du navigateur.

import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Indicateur commun : relie `indicateur_id` des vues à son code (« service », « actifs »...). */
export type IndicateurCommun = Pick<LigneTable<'indicateur'>, 'id' | 'code' | 'nature'>

/** Semaine affichée : jour de Paris, dimanche de référence, lundi et numéro ISO. */
export async function lireSemaine(): Promise<LigneVue<'v_semaine'> | null> {
  const { data, error } = await supabase()
    .from('v_semaine')
    .select('aujourdhui, dimanche, lundi, numero')
    .maybeSingle()
  if (error) throw error
  return data
}

/** Indicateurs communs à l'église (sans ministère propriétaire). */
export async function lireIndicateursCommuns(): Promise<IndicateurCommun[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select('id, code, nature')
    .is('ministere_id', null)
  if (error) throw error
  return data
}

/** Totaux et complétude des dix derniers dimanches, par indicateur commun « dimanche ». */
export async function lireTotauxDimanche(): Promise<LigneVue<'v_total_dimanche'>[]> {
  const { data, error } = await supabase()
    .from('v_total_dimanche')
    .select('indicateur_id, dimanche, total, nb_saisis, nb_attendus')
    .order('dimanche', { ascending: true })
  if (error) throw error
  return data
}

/** Écarts à périmètre égal du dimanche de référence (`v_semaine.dimanche`). */
export async function lireEcartsDimanche(
  dimanche: string,
): Promise<LigneVue<'v_ecart_dimanche'>[]> {
  const { data, error } = await supabase()
    .from('v_ecart_dimanche')
    .select('indicateur_id, dimanche, ecart, nb_comparables')
    .eq('dimanche', dimanche)
  if (error) throw error
  return data
}

/** Totaux « à ce jour » (STARs actifs, présents en FIJ) et leur complétude. */
export async function lireTotauxACeJour(): Promise<LigneVue<'v_total_a_ce_jour'>[]> {
  const { data, error } = await supabase()
    .from('v_total_a_ce_jour')
    .select('indicateur_id, code, total, nb_saisis, nb_actifs, plus_ancienne, nb_plus_de_30_jours')
  if (error) throw error
  return data
}

/**
 * Pourcentage FIJ calculé par la base (somme en FIJ sur somme des actifs). `null` : aucune ligne,
 * aucun ministère n'a encore les deux valeurs.
 */
export async function lirePourcentageFij(): Promise<LigneVue<'v_pourcentage_fij'> | null> {
  const { data, error } = await supabase()
    .from('v_pourcentage_fij')
    .select('en_fij, actifs, nb_ministeres, pourcentage')
    .maybeSingle()
  if (error) throw error
  return data
}

/** Dernière valeur de chaque département de la carte des FIJ. */
export async function lireCarteFij(): Promise<LigneVue<'v_carte_fij'>[]> {
  const { data, error } = await supabase()
    .from('v_carte_fij')
    .select('departement, valeur, saisi_le')
    .order('departement', { ascending: true })
  if (error) throw error
  return data
}

/** Sessions passées (`a_eu_lieu`), de la plus récente à la plus ancienne, avec leur complétude. */
export async function lireSessionsPassees(): Promise<LigneVue<'v_session_completude'>[]> {
  const { data, error } = await supabase()
    .from('v_session_completude')
    .select(
      'session_id, type, date, intitule, a_eu_lieu, nb_attendus, nb_saisis, total_saisi, total, manquants',
    )
    .eq('a_eu_lieu', true)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

/** Écarts à périmètre égal entre une session et la précédente du même type. */
export async function lireEcartsSessions(): Promise<LigneVue<'v_ecart_session'>[]> {
  const { data, error } = await supabase()
    .from('v_ecart_session')
    .select('session_id, ecart, nb_comparables')
  if (error) throw error
  return data
}

/** Saisie la plus récente de chaque ministère pour une session. */
export async function lireParticipations(
  sessionId: string,
): Promise<LigneVue<'v_participation_courante'>[]> {
  const { data, error } = await supabase()
    .from('v_participation_courante')
    .select('session_id, ministere_id, valeur, deja_comptes, compte_dans_total, saisi_le')
    .eq('session_id', sessionId)
  if (error) throw error
  return data
}
