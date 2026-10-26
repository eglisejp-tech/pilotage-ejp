// Signalements de difficulté (T39, lots B7 et E8) et leur suivi (T77) : une fonction par requête.
// Un signalement n'est lu que par le ministère qui l'a écrit et par EJP Tech (RLS de `signalement`
// et `signalement_suivi`, sous `v_signalement`) ; le berger, le conseil et l'administration
// n'appellent jamais ces fonctions (leurs écrans n'existent pas pour eux). Les dates et le statut
// viennent de la base : `statut`, `jours_depuis`, `reponse_possible_jusquau`, `clos_recent` (jour
// de Paris), jamais la date du navigateur. Chaque écriture valide ses valeurs par les schémas de
// `src/features/signalement/schemas.ts`, les mêmes que les formulaires : une valeur invalide lève
// une erreur avant tout appel à la base.

import {
  schemaCloture,
  schemaIdentifiantSignalement,
  schemaReponse,
  schemaSignalement,
} from '@/features/signalement/schemas'
import type { Cloture, Reponse, Signalement } from '@/features/signalement/schemas'
import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'
import { envoyer } from '@/data/envoi'

export type LigneSignalement = LigneVue<'v_signalement'>

/** Une étape du suivi daté d'un signalement (`signalement_suivi`, sans son auteur). */
export type EtapeDuSuivi = Pick<
  LigneTable<'signalement_suivi'>,
  'id' | 'signalement_id' | 'etape' | 'commentaire' | 'saisi_le' | 'ordre'
>

const COLONNES =
  'id, ministere_id, ministere_nom, ecran, texte, saisi_le, suivi_id, commentaire, clos_le, ouvert, clos_recent, statut, derniere_etape, statut_le, jours_depuis, fin, reponse_possible_jusquau, compte_actif'

const COLONNES_SUIVI = 'id, signalement_id, etape, commentaire, saisi_le, ordre'

/**
 * « Mes signalements » du ministère : ses ouverts et ses clos des 30 derniers jours (filtres de
 * la base), du plus ancien au plus récent. L'écran les range par statut.
 */
export async function lireMesSignalements(ministereId: string): Promise<LigneSignalement[]> {
  const { data, error } = await supabase()
    .from('v_signalement')
    .select(COLONNES)
    .eq('ministere_id', ministereId)
    .or('ouvert.is.true,clos_recent.is.true')
    .order('saisi_le', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Bloc « Signalements » d'EJP Tech : les ouverts et les clos des 30 derniers jours (filtres de la
 * base), du plus ancien au plus récent. L'écran les range par statut.
 */
export async function lireSignalementsATraiter(): Promise<LigneSignalement[]> {
  const { data, error } = await supabase()
    .from('v_signalement')
    .select(COLONNES)
    .or('ouvert.is.true,clos_recent.is.true')
    .order('saisi_le', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Envoie un signalement du ministère connecté (le ministère vient de la session, jamais d'un
 * paramètre) : rend son identifiant. Une ligne de journal `difficulte_signalee`, sans le texte.
 */
export async function signalerDifficulte(brut: Signalement): Promise<string> {
  const signalement = schemaSignalement.parse(brut)
  const { data, error } = await envoyer('rpc/signaler_difficulte', () =>
    supabase().rpc('signaler_difficulte', {
      p_ecran: signalement.ecran,
      p_texte: signalement.texte,
    }),
  )
  if (error) throw error
  return data
}

/** Clôt un signalement (EJP Tech seul, une fois), avec la réponse que lira le ministère (T77). */
export async function cloreSignalement(brut: Cloture): Promise<void> {
  const cloture = schemaCloture.parse(brut)
  const { error } = await envoyer('rpc/clore_signalement', () =>
    supabase().rpc('clore_signalement', {
      p_signalement_id: cloture.signalementId,
      p_commentaire: cloture.commentaire,
    }),
  )
  if (error) throw error
}

// Suivi (T77)

/**
 * « Ma semaine » du ministère : ses signalements ouverts seulement, pour le bandeau (un Répondu)
 * ou la ligne discrète (Reçu, En cours), du plus ancien au plus récent.
 */
export async function lireMesSignalementsOuverts(
  ministereId: string,
): Promise<Pick<LigneSignalement, 'id' | 'saisi_le' | 'statut'>[]> {
  const { data, error } = await supabase()
    .from('v_signalement')
    .select('id, saisi_le, statut')
    .eq('ministere_id', ministereId)
    .eq('ouvert', true)
    .order('saisi_le', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Le suivi daté de signalements déjà lus, sous la RLS du lecteur (le ministère auteur, EJP Tech),
 * dans l'ordre réel des lignes (`ordre`, tiré par la base). Aucune lecture sans signalement.
 */
export async function lireSuiviDesSignalements(ids: readonly string[]): Promise<EtapeDuSuivi[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase()
    .from('signalement_suivi')
    .select(COLONNES_SUIVI)
    .in('signalement_id', [...ids])
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/** « Prendre en charge » (EJP Tech seul) : Reçu vers En cours. */
export async function prendreEnCharge(signalementId: string): Promise<void> {
  const id = schemaIdentifiantSignalement.parse(signalementId)
  const { error } = await envoyer('rpc/prendre_en_charge_signalement', () =>
    supabase().rpc('prendre_en_charge_signalement', { p_signalement_id: id }),
  )
  if (error) throw error
}

/** « Répondre au ministère » (EJP Tech seul) : rend l'identifiant de la ligne de réponse. */
export async function repondreAuMinistere(brut: Reponse): Promise<string> {
  const reponse = schemaReponse.parse(brut)
  const { data, error } = await envoyer('rpc/repondre_au_ministere', () =>
    supabase().rpc('repondre_au_ministere', {
      p_signalement_id: reponse.signalementId,
      p_reponse: reponse.texte,
    }),
  )
  if (error) throw error
  return data
}

/** « Oui, c'est réglé » (le ministère du signalement, à l'étape Répondu). */
export async function confirmerSignalement(signalementId: string): Promise<void> {
  const id = schemaIdentifiantSignalement.parse(signalementId)
  const { error } = await envoyer('rpc/confirmer_signalement', () =>
    supabase().rpc('confirmer_signalement', { p_signalement_id: id }),
  )
  if (error) throw error
}

/** « Répondre à EJP Tech » (le ministère du signalement, à l'étape Répondu). */
export async function repondreAEjpTech(brut: Reponse): Promise<void> {
  const reponse = schemaReponse.parse(brut)
  const { error } = await envoyer('rpc/repondre_a_ejp_tech', () =>
    supabase().rpc('repondre_a_ejp_tech', {
      p_signalement_id: reponse.signalementId,
      p_texte: reponse.texte,
    }),
  )
  if (error) throw error
}
