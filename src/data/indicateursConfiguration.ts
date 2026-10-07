// Lectures et écriture de la configuration des indicateurs (étape 6, lot L3a ; configuration-
// indicateurs.md, 7.1 et 7.2) : les écrans `/indicateurs` et `/indicateurs/:id` de
// l'administration de l'église et d'EJP Tech. Une fonction typée par requête ; rien n'est recompté
// ici. Aucune valeur d'indicateur n'est lue : seulement les définitions, l'usage (jamais une
// valeur), le catalogue des prévus et quelques lignes du journal (« Dernier changement »,
// « Aucun prévu »). Le fichier `indicateurs.ts` de l'étape 4 n'est pas modifié : il ne lit ni
// `modele_code`, ni `texte_le`, que cet écran demande.

import type { DetailJournal, LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Un indicateur propre à un ministère, tel que le lit l'écran de configuration (sans valeur). */
export type IndicateurConfiguration = Pick<
  LigneTable<'indicateur'>,
  | 'id'
  | 'libelle'
  | 'definition'
  | 'nature'
  | 'unite'
  | 'sensible'
  | 'calcul'
  | 'etat'
  | 'origine'
  | 'ministere_id'
  | 'modele_code'
  | 'remplace_id'
  | 'cree_le'
  | 'texte_le'
  | 'retire_le'
  | 'retrait_motif'
>

const COLONNES_CONFIGURATION =
  'id, libelle, definition, nature, unite, sensible, calcul, etat, origine, ministere_id, modele_code, remplace_id, cree_le, texte_le, retire_le, retrait_motif'

/**
 * Tous les indicateurs propres des ministères, tous états (actif, à valider, retiré), calculs
 * compris. Les chiffres communs (`ministere_id` nul) n'y sont pas : ils ne se configurent pas. La
 * base ne rend à l'administration et à EJP Tech que des définitions : une valeur n'est jamais lue.
 */
export async function lireIndicateursPropres(): Promise<IndicateurConfiguration[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select(COLONNES_CONFIGURATION)
    .not('ministere_id', 'is', null)
  if (error) throw error
  return data
}

/** Lignes du journal que lit l'écran : date, ministère, code de l'action et son détail. */
export type LigneJournalConfiguration = {
  ministere_id: string
  le: string
  action: string
  detail: DetailJournal | null
}

/** Codes d'action du journal qui comptent comme un changement de la configuration d'un ministère. */
export const ACTIONS_CONFIGURATION = [
  'indicateur_cree',
  'indicateurs_prevus_crees',
  'indicateur_corrige',
  'indicateur_retire',
  'indicateur_valide',
  'indicateur_refuse',
] as const

function garderMinistere<Ligne extends { ministere_id: string | null }>(
  lignes: Ligne[],
): (Ligne & { ministere_id: string })[] {
  return lignes.filter(
    (ligne): ligne is Ligne & { ministere_id: string } => ligne.ministere_id !== null,
  )
}

/**
 * Gestes de configuration du journal, du plus récent au plus ancien, 1 000 lignes au plus : la
 * colonne « Dernier changement » n'en lit que la date. Le journal ne porte jamais un texte libre.
 */
export async function lireChangementsConfiguration(): Promise<LigneJournalConfiguration[]> {
  const { data, error } = await supabase()
    .from('v_journal')
    .select('ministere_id, le, action, detail')
    .in('action', [...ACTIONS_CONFIGURATION])
    .order('le', { ascending: false })
    .limit(1000)
  if (error) throw error
  return garderMinistere(data)
}

/**
 * Créations des indicateurs prévus et choix « Aucun prévu » : une ligne par appel de
 * `creer_indicateurs_prevus` qui a écrit. Sert à savoir qu'un ministère sans prévu a déjà reçu sa
 * réponse « aucun » (le détail porte le code du modèle).
 */
export async function lireCreationsPrevus(): Promise<LigneJournalConfiguration[]> {
  const { data, error } = await supabase()
    .from('v_journal')
    .select('ministere_id, le, action, detail')
    .eq('action', 'indicateurs_prevus_crees')
  if (error) throw error
  return garderMinistere(data)
}

/** Catalogue des prévus et des suggestions (administration et EJP Tech). */
export type LigneCatalogue = LigneVue<'v_catalogue'>

/** Usage d'un indicateur propre : périodes saisies et attendues, dernière saisie, jamais une valeur. */
export type LigneUsage = LigneVue<'v_usage_indicateurs'>

/** Un ministère de la liste de configuration. */
export type MinistereConfiguration = Pick<
  LigneTable<'ministere'>,
  'id' | 'code' | 'nom' | 'desactive_le'
>

/** Ministères, désactivés compris : l'écran ne montre que les actifs. */
export async function lireMinisteresConfiguration(): Promise<MinistereConfiguration[]> {
  const { data, error } = await supabase().from('ministere').select('id, code, nom, desactive_le')
  if (error) throw error
  return data
}

/**
 * Crée les indicateurs prévus d'un ministère (`creer_indicateurs_prevus`, administration et EJP
 * Tech) : tout ou rien, sans doublon. `modele` est le code du catalogue (nom normalisé du
 * ministère de la liste de la coordination), ou « aucun » pour un ministère sans prévu. Rend le
 * nombre d'indicateurs créés.
 */
export async function creerIndicateursPrevus(ministereId: string, modele: string): Promise<number> {
  const { data, error } = await supabase().rpc('creer_indicateurs_prevus', {
    p_ministere_id: ministereId,
    p_modele: modele,
  })
  if (error) throw error
  return data
}
