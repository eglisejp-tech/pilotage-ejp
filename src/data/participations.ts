// Présences aux sessions (maquette 09, lot E4) : une fonction par requête. Les vues font la
// complétude, le total sans double compte et les manquants (BRIEF, règles 5 et 13) ; rien n'est
// recompté ici. Les dates sont celles de Paris (`v_session_completude.a_eu_lieu` se calcule avec
// `private.aujourdhui()`), jamais la date du navigateur.

import { schemaParticipation } from '@/features/saisie-session/schemas'
import type { SaisieParticipation } from '@/features/saisie-session/schemas'
import type { LigneVue, TypeSession } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type SessionCompletude = LigneVue<'v_session_completude'>
export type ParticipationCourante = LigneVue<'v_participation_courante'>

const COLONNES_SESSION =
  'session_id, type, date, intitule, a_eu_lieu, nb_attendus, nb_saisis, total_saisi, total, manquants'

/** Nombre de sessions passées que propose « Choisir la session » (BRIEF, section 9). */
export const SESSIONS_PROPOSEES = 8

/** Une session, avec sa complétude et ses manquants ; null si elle n'existe pas. */
export async function lireSession(sessionId: string): Promise<SessionCompletude | null> {
  const { data, error } = await supabase()
    .from('v_session_completude')
    .select(COLONNES_SESSION)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Les 8 dernières sessions passées ou du jour (heure de Paris), les plus récentes d'abord. */
export async function lireSessionsRecentes(): Promise<SessionCompletude[]> {
  const { data, error } = await supabase()
    .from('v_session_completude')
    .select(COLONNES_SESSION)
    .eq('a_eu_lieu', true)
    .order('date', { ascending: false })
    .limit(SESSIONS_PROPOSEES)
  if (error) throw error
  return data
}

/**
 * Session passée du même type juste avant `date` (« Session précédente : 12 »). Null pour un
 * autre rassemblement (chacun a son nom) ou s'il n'y en a pas.
 */
export async function lireSessionPrecedente(
  type: TypeSession,
  date: string,
): Promise<SessionCompletude | null> {
  if (type === 'autre') return null
  const { data, error } = await supabase()
    .from('v_session_completude')
    .select(COLONNES_SESSION)
    .eq('type', type)
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Saisie la plus récente du ministère pour chacune des sessions données. */
export async function lireMesParticipations(
  ministereId: string,
  sessionIds: readonly string[],
): Promise<ParticipationCourante[]> {
  if (sessionIds.length === 0) return []
  const { data, error } = await supabase()
    .from('v_participation_courante')
    .select('session_id, ministere_id, valeur, deja_comptes, compte_dans_total, saisi_le')
    .eq('ministere_id', ministereId)
    .in('session_id', sessionIds)
  if (error) throw error
  return data
}

/** Sessions où le ministère est attendu (« Vos saisies » de l'accueil, lot E7). */
export async function lireSessionsAttendues(ministereId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('session_attendu')
    .select('session_id')
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data.map((ligne) => ligne.session_id)
}

/**
 * Enregistre une présence : une seule ligne de `participation` (la base écrit `saisi_le`,
 * `saisi_par` et une ligne de journal). La saisie est vérifiée par le schéma du formulaire ; la
 * base refuse une session future et un autre ministère que celui du compte.
 */
export async function enregistrerParticipation(saisie: SaisieParticipation): Promise<void> {
  const { sessionId, ministereId, valeur, dejaComptes } = schemaParticipation.parse(saisie)
  const { error } = await supabase().from('participation').insert({
    session_id: sessionId,
    ministere_id: ministereId,
    valeur,
    deja_comptes: dejaComptes,
  })
  if (error) throw error
}
