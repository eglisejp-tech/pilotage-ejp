// Lectures du calendrier et de l'alerte des événements (maquettes 04, 12 et « Cette semaine »,
// lot E6) : une fonction typée par requête. La base décide de tout : `v_evenement` calcule `jours`
// (date moins `private.aujourdhui()`, heure de Paris), `a_confirmer` et `reporte_du`, et la RLS
// limite chaque profil à ses lignes (le porteur, les ministères mentionnés, le berger, le
// conseil et EJP Tech ; jamais l'administration ni un autre ministère). Rien n'est recalculé ici,
// aucune date du navigateur : le filtre « au plus 7 jours dans le passé » lit `jours`. Les saisies
// et la lecture du panneau de mise à jour sont dans `evenementsEcriture.ts` (lot E5).

import { FENETRE_A_RENSEIGNER_JOURS, FENETRE_PASSE_JOURS } from '@/lib/metier/evenements'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/**
 * Une mention en vigueur (`v_evenement_mention`, T78) : l'événement et le ministère mentionné.
 * Une mention retirée, ou celle d'un événement retiré, n'y est plus.
 */
export type MentionEvenement = Pick<
  LigneVue<'v_evenement_mention'>,
  'evenement_id' | 'ministere_id'
>

/** Un événement lu dans `v_evenement`, avec son dernier état. */
export type EvenementLu = Pick<
  LigneVue<'v_evenement'>,
  'id' | 'ministere_id' | 'titre' | 'date' | 'statut' | 'jours' | 'a_confirmer' | 'reporte_du'
>

/**
 * Un événement du calendrier, avec ses heures (T68) : heure prévue, heure de début, et le retard
 * et « à l'heure » calculés par la base (jamais recalculés à l'écran).
 */
export type EvenementDuCalendrier = EvenementLu &
  Pick<
    LigneVue<'v_evenement'>,
    | 'heure_prevue'
    | 'heure_debut'
    | 'retard'
    | 'a_l_heure'
    | 'date_fin'
    | 'heure_fin'
    | 'jours_fin'
    | 'serie_id'
  >

const COLONNES_EVENEMENT = 'id, ministere_id, titre, date, statut, jours, a_confirmer, reporte_du'
// Plages (T78, lot 2) : le dernier jour, l'heure de fin, `jours_fin` et la série, en fin de liste.
const COLONNES_CALENDRIER =
  'id, ministere_id, titre, date, statut, jours, a_confirmer, reporte_du, heure_prevue, heure_debut, retard, a_l_heure, date_fin, heure_fin, jours_fin, serie_id'

/** Statuts qui ne sont pas un état final (K10 : Terminé et Annulé le sont). */
const STATUTS_SANS_ETAT_FINAL = 'brouillon,attente_validation,valide,preparation'

/**
 * Événements du calendrier d'un ministère : les siens et ceux qui le mentionnent, datés d'au plus
 * 7 jours dans le passé, plus ceux à confirmer quelle que soit leur date. Deux requêtes : les
 * événements qui mentionnent encore le ministère (`v_evenement_mention`, T78), puis
 * `v_evenement`, par date puis titre.
 */
export async function lireEvenementsMinistere(
  ministereId: string,
): Promise<EvenementDuCalendrier[]> {
  const lectureMentions = await supabase()
    .from('v_evenement_mention')
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
    .select(COLONNES_CALENDRIER)
    .or(duMinistere)
    // Visible jusqu'au dernier jour plus 7 (T78, lot 2 : `jours_fin`, le premier jour pour un jour).
    .or(`jours_fin.gte.${-FENETRE_PASSE_JOURS},a_confirmer.is.true`)
    .order('date', { ascending: true })
    .order('titre', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Événements du ministère qui attendent encore une saisie (« Vos saisies », T68) : datés
 * d'aujourd'hui ou des 30 derniers jours (`jours`, heure de Paris), sans état final, ou Terminés
 * sans heure de début. Seulement ceux qu'il porte : un ministère mentionné n'a rien à y faire.
 * Par date puis titre ; `lignesEvenements` choisit les lignes.
 */
export async function lireEvenementsARenseigner(
  ministereId: string,
): Promise<EvenementDuCalendrier[]> {
  const { data, error } = await supabase()
    .from('v_evenement')
    .select(COLONNES_CALENDRIER)
    .eq('ministere_id', ministereId)
    // Commencé (premier jour au plus aujourd'hui), fini depuis 30 jours au plus (T78, lot 2).
    .gte('jours_fin', -FENETRE_A_RENSEIGNER_JOURS)
    .lte('jours', 0)
    .or(`statut.in.(${STATUTS_SANS_ETAT_FINAL}),and(statut.eq.termine,heure_debut.is.null)`)
    .order('date', { ascending: true })
    .order('titre', { ascending: true })
  if (error) throw error
  return data
}

/** Mentions en vigueur des événements donnés (T32, modifiables depuis T78), lisibles avec eux. */
export async function lireMentionsDesEvenements(
  evenementIds: readonly string[],
): Promise<MentionEvenement[]> {
  if (evenementIds.length === 0) return []
  const { data, error } = await supabase()
    .from('v_evenement_mention')
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
