// Saisies d'événement (maquette 11 et « Mettre à jour l'événement ») : ajout par la fonction
// `ajouter_evenement` (B6, mentions comprises), mise à jour par un ajout direct dans
// `evenement_etat` (une instruction, une ligne de journal). Les lectures du panneau de mise à jour
// sont ici aussi ; celles du calendrier et de l'alerte sont dans `evenements.ts` (lot E6). Chaque
// écriture valide ses valeurs par les schémas de base de `src/features/evenements/schemas.ts`,
// les mêmes que le formulaire : une valeur invalide lève une erreur avant tout appel à la base.

import {
  schemaBaseAjoutEvenement,
  schemaBaseMiseAJourEvenement,
  schemaBaseSerie,
  verifierIdentifiant,
} from '@/features/evenements/schemas'
import { envoyer, schemaNumero } from '@/data/envoi'
import type {
  AjoutSerie,
  EntreeAjoutEvenement,
  MiseAJourEvenement,
} from '@/features/evenements/schemas'
import type { MentionEvenement } from '@/data/evenements'
import type { NomCorrige } from '@/data/evenementsCorrections'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type EvenementAMettreAJour = Pick<
  LigneVue<'v_evenement'>,
  | 'id'
  | 'ministere_id'
  | 'titre'
  | 'date'
  | 'statut'
  | 'a_confirmer'
  | 'reporte_du'
  | 'heure_prevue'
  | 'heure_debut'
  | 'date_fin'
  | 'heure_fin'
  | 'jours_fin'
  | 'serie_id'
>

/**
 * Ajoute un événement du ministère connecté, sur un jour ou plusieurs (T78, lot 2), avec ses
 * mentions, son heure prévue et son heure de fin (null : sans heure), par la version à huit
 * arguments de `ajouter_evenement` : `numero` est le numéro anti-doublon que le formulaire a tiré
 * au premier envoi (T76). Même numéro, même contenu : la base rend l'événement déjà créé. Après un
 * échec rapide, l'envoi repart une fois de lui-même (Q1). La base refuse une date passée, un
 * dernier jour avant le premier ou à plus de 30 jours, un ministère qu'on ne peut pas mentionner,
 * une heure hors de la journée et un numéro déjà servi avec d'autres valeurs. Rend l'identifiant
 * de l'événement.
 */
export async function ajouterEvenement(
  brut: EntreeAjoutEvenement,
  numero: string,
): Promise<string> {
  const evenement = schemaBaseAjoutEvenement.parse(brut)
  const cle = schemaNumero.parse(numero)
  const { data, error } = await envoyer(
    'rpc/ajouter_evenement',
    () =>
      supabase().rpc('ajouter_evenement', {
        p_titre: evenement.titre,
        p_date: evenement.date,
        p_date_fin: evenement.date_fin,
        p_statut: evenement.statut,
        p_mentions: evenement.mentions,
        p_heure_prevue: evenement.heure_prevue,
        p_heure_fin: evenement.heure_fin,
        p_cle: cle,
      }),
    { nouvelEssai: true },
  )
  if (error) throw error
  return data
}

/**
 * Ajoute une série (T78, lot 2) : un événement par date, en une fois, avec le même nom, statut,
 * mentions et heures, par `ajouter_evenements_serie` et le numéro anti-doublon (T76) : un nouvel
 * envoi de la même série rend la même série, sans doublon. Rend l'identifiant de la série.
 */
export async function ajouterSerie(brut: AjoutSerie, numero: string): Promise<string> {
  const serie = schemaBaseSerie.parse(brut)
  const cle = schemaNumero.parse(numero)
  const { data, error } = await envoyer(
    'rpc/ajouter_evenements_serie',
    () =>
      supabase().rpc('ajouter_evenements_serie', {
        p_titre: serie.titre,
        p_dates: serie.dates,
        p_statut: serie.statut,
        p_mentions: serie.mentions,
        p_heure_prevue: serie.heure_prevue,
        p_heure_fin: serie.heure_fin,
        p_cle: cle,
      }),
    { nouvelEssai: true },
  )
  if (error) throw error
  return data
}

/**
 * Reporte la date, le statut et les heures d'un événement du ministère : une nouvelle ligne
 * d'état. Une heure nulle laisse la base reprendre celle du dernier état (T68). La base refuse une
 * nouvelle date passée, une heure de début sans Terminé ou sur une date à venir, et une ligne
 * identique au dernier état (T37).
 */
export async function mettreAJourEvenement(
  evenementId: string,
  brut: MiseAJourEvenement,
): Promise<void> {
  const miseAJour = schemaBaseMiseAJourEvenement.parse(brut)
  const identifiant = verifierIdentifiant(evenementId)
  const { error } = await envoyer('table/evenement_etat', () =>
    supabase()
      .from('evenement_etat')
      .insert({
        evenement_id: identifiant,
        date: miseAJour.date,
        statut: miseAJour.statut,
        heure_prevue: miseAJour.heure_prevue,
        heure_debut: miseAJour.heure_debut,
        date_fin: miseAJour.date_fin ?? null,
        heure_fin: miseAJour.heure_fin ?? null,
      }),
  )
  if (error) throw error
}

/**
 * Dernier état d'un événement, s'il est lisible par le compte (ses événements et ceux qui le
 * mentionnent) et pas retiré ; null sinon, sans dire pourquoi. Avec son nom en vigueur, l'ancien
 * nom et le jour de la correction (T78).
 */
export async function lireEvenementAMettreAJour(
  id: string,
): Promise<(EvenementAMettreAJour & NomCorrige) | null> {
  const { data, error } = await supabase()
    .from('v_evenement')
    .select(
      'id, ministere_id, titre, date, statut, a_confirmer, reporte_du, heure_prevue, heure_debut, date_fin, heure_fin, jours_fin, serie_id, titre_precedent, titre_corrige_le',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Ministères mentionnés en ce moment par un événement (`v_evenement_mention`, T78). */
export async function lireMentionsEvenement(evenementId: string): Promise<MentionEvenement[]> {
  const { data, error } = await supabase()
    .from('v_evenement_mention')
    .select('evenement_id, ministere_id')
    .eq('evenement_id', evenementId)
  if (error) throw error
  return data
}
