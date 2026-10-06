// Saisies d'événement (maquette 11 et « Mettre à jour l'événement ») : ajout par la fonction
// `ajouter_evenement` (B6, mentions comprises), mise à jour par un ajout direct dans
// `evenement_etat` (une instruction, une ligne de journal). Les lectures du panneau de mise à jour
// sont ici aussi ; celles du calendrier et de l'alerte sont dans `evenements.ts` (lot E6). Chaque
// écriture valide ses valeurs par les schémas de base de `src/features/evenements/schemas.ts`,
// les mêmes que le formulaire : une valeur invalide lève une erreur avant tout appel à la base.

import {
  schemaBaseAjoutEvenement,
  schemaBaseMiseAJourEvenement,
  verifierIdentifiant,
} from '@/features/evenements/schemas'
import type { AjoutEvenement, MiseAJourEvenement } from '@/features/evenements/schemas'
import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type EvenementAMettreAJour = Pick<
  LigneVue<'v_evenement'>,
  'id' | 'ministere_id' | 'titre' | 'date' | 'statut' | 'a_confirmer' | 'reporte_du'
>

/**
 * Ajoute un événement du ministère connecté, avec ses mentions : la base refuse une date passée
 * (« La date ne peut pas être passée. ») et un ministère qu'on ne peut pas mentionner. Rend
 * l'identifiant de l'événement.
 */
export async function ajouterEvenement(brut: AjoutEvenement): Promise<string> {
  const evenement = schemaBaseAjoutEvenement.parse(brut)
  const { data, error } = await supabase().rpc('ajouter_evenement', {
    p_titre: evenement.titre,
    p_date: evenement.date,
    p_statut: evenement.statut,
    p_mentions: evenement.mentions,
  })
  if (error) throw error
  return data
}

/**
 * Reporte la date et le statut d'un événement du ministère : une nouvelle ligne d'état. La base
 * refuse une nouvelle date passée et une ligne identique au dernier état (T37).
 */
export async function mettreAJourEvenement(
  evenementId: string,
  brut: MiseAJourEvenement,
): Promise<void> {
  const miseAJour = schemaBaseMiseAJourEvenement.parse(brut)
  const identifiant = verifierIdentifiant(evenementId)
  const { error } = await supabase().from('evenement_etat').insert({
    evenement_id: identifiant,
    date: miseAJour.date,
    statut: miseAJour.statut,
  })
  if (error) throw error
}

/**
 * Dernier état d'un événement, s'il est lisible par le compte (ses événements et ceux qui le
 * mentionnent) ; null sinon, sans dire pourquoi.
 */
export async function lireEvenementAMettreAJour(id: string): Promise<EvenementAMettreAJour | null> {
  const { data, error } = await supabase()
    .from('v_evenement')
    .select('id, ministere_id, titre, date, statut, a_confirmer, reporte_du')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Ministères mentionnés par un événement, fixés à sa création (T32). */
export async function lireMentionsEvenement(
  evenementId: string,
): Promise<LigneTable<'evenement_mention'>[]> {
  const { data, error } = await supabase()
    .from('evenement_mention')
    .select('evenement_id, ministere_id')
    .eq('evenement_id', evenementId)
  if (error) throw error
  return data
}
