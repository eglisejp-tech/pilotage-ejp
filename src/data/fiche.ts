// Lectures de la fiche d'un ministère (maquettes 04 et 12, lot E2) : une fonction typée par
// requête. Les vues font les sommes et la complétude ; rien n'est recompté ici. Un sensible se lit
// exact par son ministère, le berger, le conseil et EJP Tech (P52). Les autres lectures de la fiche sont celles du lot E1
// (`src/data/indicateurs.ts` : suivi, calculs, courbes, libellés des communs, catégories) et de
// l'étape 3 (`src/data/eglise.ts` : semaine, communs, totaux de l'église).
//
// La RLS décide de ce que chaque profil lit : un filtre nomme seulement la fiche voulue (le
// berger, le conseil et EJP Tech lisent toutes les fiches ; un ministère, la sienne).

import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Identité d'un ministère : son nom, son code technique et son état. */
export type MinistereFiche = Pick<
  LigneTable<'ministere'>,
  'id' | 'code' | 'nom' | 'description' | 'desactive_le'
>

/** Un ministère, ou `null` si l'identifiant est inconnu (ou illisible pour ce compte). */
export async function lireMinistereFiche(ministereId: string): Promise<MinistereFiche | null> {
  const { data, error } = await supabase()
    .from('ministere')
    .select('id, code, nom, description, desactive_le')
    .eq('id', ministereId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Ligne du ministère dans `v_tableau_ministeres` : sa fraîcheur (dernière ligne de journal écrite
 * par un de ses comptes, règle 6). `null` pour un ministère désactivé, absent de la vue.
 */
export async function lireLigneTableauMinistere(
  ministereId: string,
): Promise<LigneVue<'v_tableau_ministeres'> | null> {
  const { data, error } = await supabase()
    .from('v_tableau_ministeres')
    .select(
      'ministere_id, nom, description, derniere_saisie, prochain_evenement_date, prochain_evenement_titre, prochaine_reunion_date, prochaine_reunion_heure, point_ouvert_priorite',
    )
    .eq('ministere_id', ministereId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Valeurs du ministère pour les chiffres communs (STARs au service, actifs, en FIJ) : la saisie
 * qui fait foi de chaque période, que tous les profils lisent (B2). Toutes les périodes : la fiche
 * prend le dimanche de référence, les dix derniers dimanches et la dernière valeur « à ce jour ».
 */
export async function lireMesuresCommunsMinistere(
  ministereId: string,
  communIds: readonly string[],
): Promise<LigneVue<'v_mesure_periode'>[]> {
  if (communIds.length === 0) return []
  const { data, error } = await supabase()
    .from('v_mesure_periode')
    .select('indicateur_id, ministere_id, nature, periode, valeur, moins_de_3, saisi_le')
    .eq('ministere_id', ministereId)
    .in('indicateur_id', [...communIds])
    .order('periode', { ascending: true })
  if (error) throw error
  return data
}

/** Indicateur sensible du ministère et son code de catalogue (qui relie ses catégories, B8). */
export type SensibleFiche = Pick<LigneTable<'indicateur'>, 'id' | 'modele_code'>

/** Indicateurs sensibles du ministère : la fiche cherche leurs catégories par `modele_code`. */
export async function lireSensiblesMinistere(ministereId: string): Promise<SensibleFiche[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select('id, modele_code')
    .eq('ministere_id', ministereId)
    .eq('sensible', true)
  if (error) throw error
  return data
}

/**
 * Répartitions des indicateurs sensibles du ministère, une ligne par case, dans l'ordre des
 * catégories (« Non réparti » en dernier). Valeurs exactes pour tous ses lecteurs (P52).
 */
export async function lireRepartitionsMinistere(
  ministereId: string,
): Promise<LigneVue<'v_ventilation_sensible'>[]> {
  const { data, error } = await supabase()
    .from('v_ventilation_sensible')
    .select(
      'indicateur_id, ministere_id, periode, categorie, libelle, ordre, valeur, moins_de_3, masquee, tout_masque',
    )
    .eq('ministere_id', ministereId)
    .order('periode', { ascending: true })
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/** Précisions des indicateurs sensibles du ministère : celle du total le plus récent de chaque mois. */
export async function lirePrecisionsMinistere(
  ministereId: string,
): Promise<LigneVue<'v_precision_sensible'>[]> {
  const { data, error } = await supabase()
    .from('v_precision_sensible')
    .select('indicateur_id, ministere_id, mois, texte')
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data
}

/** Points de la fiche et toutes leurs mentions (noms des ministères mentionnés). */
export interface PointsFiche {
  points: LigneVue<'v_point'>[]
  mentions: LigneTable<'point_mention'>[]
}

const COLONNES_POINT =
  'id, ministere_id, titre, description, action_attendue, priorite, echeance, cree_le, cree_par, statut, statut_le, traitement_id, traite_le, traite_par, traite_commentaire'

/**
 * Points créés par le ministère ou qui le mentionnent, ouverts ou traités (la fiche garde les
 * traités des 7 derniers jours), avec leurs mentions. Trois requêtes : les points qui mentionnent
 * le ministère, puis les points, puis toutes les mentions de ces points.
 */
export async function lirePointsMinistere(ministereId: string): Promise<PointsFiche> {
  const lectureMentionnant = await supabase()
    .from('point_mention')
    .select('point_id, ministere_id')
    .eq('ministere_id', ministereId)
  if (lectureMentionnant.error) throw lectureMentionnant.error
  const mentionnant = lectureMentionnant.data.map((mention) => mention.point_id)

  const filtre =
    mentionnant.length === 0
      ? `ministere_id.eq.${ministereId}`
      : `ministere_id.eq.${ministereId},id.in.(${mentionnant.join(',')})`
  const lecturePoints = await supabase().from('v_point').select(COLONNES_POINT).or(filtre)
  if (lecturePoints.error) throw lecturePoints.error
  const points = lecturePoints.data
  if (points.length === 0) return { points, mentions: [] }

  const lectureMentions = await supabase()
    .from('point_mention')
    .select('point_id, ministere_id')
    .in(
      'point_id',
      points.map((point) => point.id),
    )
  if (lectureMentions.error) throw lectureMentions.error
  return { points, mentions: lectureMentions.data }
}

/** Nombre de lignes de « Dernières saisies » (BRIEF, section 9). */
export const NOMBRE_DERNIERES_SAISIES = 5

/** Une ligne de « Dernières saisies ». */
export type LigneDerniereSaisie = Pick<
  LigneVue<'v_journal'>,
  'id' | 'le' | 'action' | 'cible' | 'cible_id' | 'detail' | 'cible_texte'
>

/**
 * Les 5 dernières lignes de journal écrites par un compte du ministère, de la plus récente à la
 * plus ancienne. Un signalement n'est pas une saisie (T39) : ses lignes n'y sont pas.
 */
export async function lireDernieresSaisies(ministereId: string): Promise<LigneDerniereSaisie[]> {
  const { data, error } = await supabase()
    .from('v_journal')
    .select('id, le, action, cible, cible_id, detail, cible_texte')
    .eq('auteur_ministere_id', ministereId)
    .not('action', 'in', '(difficulte_signalee,signalement_clos)')
    .order('le', { ascending: false })
    .order('id', { ascending: false })
    .limit(NOMBRE_DERNIERES_SAISIES)
  if (error) throw error
  return data
}
