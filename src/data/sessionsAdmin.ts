// Sessions de l'écran 14 (lot L2) : une fonction par requête. Les lectures passent par la RLS
// (tous les profils de l'application lisent `session`), les écritures par les trois fonctions de
// l'API, réservées à l'administration de l'église. Le total et la complétude viennent de
// `v_session_completude` : rien n'est recompté ici.

import {
  schemaDeclaration,
  schemaIdentifiantSession,
  schemaMinisteresAttendus,
} from '@/features/sessions/schemas'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type SessionDeclaree = Pick<
  LigneVue<'v_session_completude'>,
  | 'session_id'
  | 'type'
  | 'date'
  | 'intitule'
  | 'a_eu_lieu'
  | 'nb_attendus'
  | 'nb_saisis'
  | 'manquants'
>

/** Sessions déclarées, la plus récente d'abord, avec leur complétude et les ministères qui manquent. */
export async function lireSessionsDeclarees(): Promise<SessionDeclaree[]> {
  const { data, error } = await supabase()
    .from('v_session_completude')
    .select('session_id, type, date, intitule, a_eu_lieu, nb_attendus, nb_saisis, manquants')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

/** Identifiants des ministères attendus d'une session (pour « Modifier »). */
export async function lireAttendusDeLaSession(sessionId: string): Promise<string[]> {
  const identifiant = schemaIdentifiantSession.parse(sessionId)
  const { data, error } = await supabase()
    .from('session_attendu')
    .select('ministere_id')
    .eq('session_id', identifiant)
  if (error) throw error
  return data.map((ligne) => ligne.ministere_id)
}

/**
 * Déclare une session et ses ministères attendus : rend son identifiant. Les valeurs sont
 * validées par le schéma du formulaire avant tout appel ; la base refuse une session déjà
 * déclarée (même type et même date, ou même nom pour un autre rassemblement).
 */
export async function declarerSession(brut: ValeursDeclaration): Promise<string> {
  const declaration = schemaDeclaration.parse(brut)
  const { data, error } = await supabase().rpc('declarer_session', {
    p_type: declaration.type,
    p_date: declaration.date,
    p_intitule: declaration.intitule,
    p_ministeres: declaration.ministeres,
  })
  if (error) throw error
  return data
}

/** Remplace les ministères attendus d'une session (type, date et nom ne changent pas). */
export async function modifierSession(
  sessionId: string,
  ministeres: readonly string[],
): Promise<void> {
  const { error } = await supabase().rpc('modifier_session', {
    p_session_id: schemaIdentifiantSession.parse(sessionId),
    p_ministeres: schemaMinisteresAttendus.parse(ministeres),
  })
  if (error) throw error
}

/** Supprime une session que personne n'a encore saisie ; la base refuse sinon. */
export async function supprimerSession(sessionId: string): Promise<void> {
  const { error } = await supabase().rpc('supprimer_session', {
    p_session_id: schemaIdentifiantSession.parse(sessionId),
  })
  if (error) throw error
}
