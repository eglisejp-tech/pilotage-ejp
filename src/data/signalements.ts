// Signalements de difficulté (T39, lots B7 et E8) : une fonction par requête. Un signalement n'est
// lu que par le ministère qui l'a écrit et par EJP Tech (RLS de `signalement` et
// `signalement_suivi`, sous `v_signalement`) ; le berger, le conseil et l'administration n'appellent
// jamais ces fonctions (leurs écrans n'existent pas pour eux). Les dates viennent de la base :
// `ouvert` et `clos_recent` (30 jours, heure de Paris), jamais la date du navigateur. Chaque
// écriture valide ses valeurs par les schémas de `src/features/signalement/schemas.ts`, les mêmes
// que les formulaires : une valeur invalide lève une erreur avant tout appel à la base.

import { schemaCloture, schemaSignalement } from '@/features/signalement/schemas'
import type { Cloture, Signalement } from '@/features/signalement/schemas'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type LigneSignalement = LigneVue<'v_signalement'>

const COLONNES =
  'id, ministere_id, ministere_nom, ecran, texte, saisi_le, suivi_id, commentaire, clos_le, ouvert, clos_recent'

/**
 * Les derniers signalements du ministère (« Vos derniers signalements »), du plus récent au plus
 * ancien, ouverts ou clos.
 */
export async function lireMesSignalements(
  ministereId: string,
  nombre: number,
): Promise<LigneSignalement[]> {
  const { data, error } = await supabase()
    .from('v_signalement')
    .select(COLONNES)
    .eq('ministere_id', ministereId)
    .order('saisi_le', { ascending: false })
    .limit(nombre)
  if (error) throw error
  return data
}

/**
 * Bloc « Signalements » d'EJP Tech : les ouverts et les clos des 30 derniers jours (filtres de la
 * base), du plus ancien au plus récent. L'écran les sépare par `ouvert`.
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
  const { data, error } = await supabase().rpc('signaler_difficulte', {
    p_ecran: signalement.ecran,
    p_texte: signalement.texte,
  })
  if (error) throw error
  return data
}

/** Clôt un signalement (EJP Tech seul, une fois), avec un commentaire facultatif. */
export async function cloreSignalement(brut: Cloture): Promise<void> {
  const cloture = schemaCloture.parse(brut)
  const { error } = await supabase().rpc('clore_signalement', {
    p_signalement_id: cloture.signalementId,
    p_commentaire: cloture.commentaire,
  })
  if (error) throw error
}
