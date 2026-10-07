// Lectures du calendrier et de l'alerte des événements (maquettes 04, 12 et « Cette semaine »,
// lot E6) : une fonction typée par requête. La base décide de tout : `v_evenement` calcule `jours`
// (date moins `private.aujourdhui()`, heure de Paris), `a_confirmer` et `reporte_du`, et la RLS
// limite chaque profil à ses lignes (le porteur, les ministères mentionnés, le berger, le
// conseil et EJP Tech ; jamais l'administration ni un autre ministère). Rien n'est recalculé ici,
// aucune date du navigateur : le filtre « au plus 7 jours dans le passé » lit `jours`. Les saisies
// et la lecture du panneau de mise à jour sont dans `evenementsEcriture.ts` (lot E5).

import { FENETRE_PASSE_JOURS } from '@/lib/metier/evenements'
import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Un événement lu dans `v_evenement`, avec son dernier état. */
export type EvenementLu = Pick<
  LigneVue<'v_evenement'>,
  'id' | 'ministere_id' | 'titre' | 'date' | 'statut' | 'jours' | 'a_confirmer' | 'reporte_du'
>

const COLONNES_EVENEMENT = 'id, ministere_id, titre, date, statut, jours, a_confirmer, reporte_du'

/**
 * Événements du calendrier d'un ministère : les siens et ceux qui le mentionnent, datés d'au plus
 * 7 jours dans le passé, plus ceux à confirmer quelle que soit leur date. Deux requêtes : les
 * événements qui mentionnent le ministère (`evenement_mention`), puis `v_evenement`, par date puis
 * titre.
 */
export async function lireEvenementsMinistere(ministereId: string): Promise<EvenementLu[]> {
  const lectureMentions = await supabase()
    .from('evenement_mention')
    .select('evenement_id, ministere_id')
    .eq('ministere_id', ministereId)
  if (lectureMentions.error) throw lectureMentions.error
  const mentionnant = lectureMentions.data.map((mention) => mention.evenement_id)

  const duMinistere =
    mentionnant.length === 0
      ? `ministere_id.eq.${ministereId}`
      : `ministere_id.eq.${ministereId},id.in.(${mentionnant.join(',')})`
  const { data, error } = await supabase()
    .from('v_evenement')
    .select(COLONNES_EVENEMENT)
    .or(duMinistere)
    .or(`jours.gte.${-FENETRE_PASSE_JOURS},a_confirmer.is.true`)
    .order('date', { ascending: true })
    .order('titre', { ascending: true })
  if (error) throw error
  return data
}

/** Mentions des événements donnés (fixées à la création, T32), lisibles avec ces événements. */
export async function lireMentionsDesEvenements(
  evenementIds: readonly string[],
): Promise<LigneTable<'evenement_mention'>[]> {
  if (evenementIds.length === 0) return []
  const { data, error } = await supabase()
    .from('evenement_mention')
    .select('evenement_id, ministere_id')
    .in('evenement_id', [...evenementIds])
  if (error) throw error
  return data
}

/**
 * Événements à confirmer de toute l'église (T31), pour « Cette semaine » du berger, du conseil et
 * d'EJP Tech, par date puis titre. La base fait le choix (`a_confirmer`) ; la RLS ne rend rien à
 * l'administration ni à un autre ministère.
 */
export async function lireEvenementsAConfirmer(): Promise<EvenementLu[]> {
  const { data, error } = await supabase()
    .from('v_evenement')
    .select(COLONNES_EVENEMENT)
    .eq('a_confirmer', true)
    .order('date', { ascending: true })
    .order('titre', { ascending: true })
  if (error) throw error
  return data
}
