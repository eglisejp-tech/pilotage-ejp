// Modération d'EJP Tech (écran 15, lot L6) : une fonction par requête. La file et les deux
// fonctions sont réservées à EJP Tech en `aal2` ; la base refuse tout autre compte (42501) et rend
// une file vide hors `aal2`. La file ne porte jamais une valeur chiffrée : pour une précision, le
// libellé de l'indicateur et le mois seulement. Les jours (« depuis 4 jours », les 30 derniers
// jours de la file) viennent de la base, à l'heure de Paris, jamais de la date du navigateur.

import { schemaMasquage, schemaRelecture } from '@/features/moderation/schemas'
import type { Masquage, Relecture } from '@/features/moderation/schemas'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type LigneTexteARelire = LigneVue<'v_textes_a_relire'>

/** Une demande d'indicateur qui attend EJP Tech : l'indicateur et le nombre de jours d'attente. */
export type DemandeEnAttente = Pick<LigneVue<'v_a_valider'>, 'indicateur_id' | 'attente_jours'>

const COLONNES_FILE =
  'cible, cible_id, ministere_id, auteur_libelle, ecrit_le, champs, etat, decision_le, motif, indicateur_libelle, mois'

/**
 * La file de relecture : tous les éléments à relire, puis ceux écrits dans les 30 derniers jours
 * (filtres de la base). Le tri est celui de l'écran.
 */
export async function lireTextesARelire(): Promise<LigneTexteARelire[]> {
  const { data, error } = await supabase().from('v_textes_a_relire').select(COLONNES_FILE)
  if (error) throw error
  return data
}

/**
 * Les demandes d'indicateur qui attendent la validation d'EJP Tech, sans aucun texte (ni nom, ni
 * « Pourquoi ») : l'en-tête de l'écran n'en lit que le nombre et le jour d'attente.
 */
export async function lireDemandesEnAttente(): Promise<DemandeEnAttente[]> {
  const { data, error } = await supabase()
    .from('v_a_valider')
    .select('indicateur_id, attente_jours')
  if (error) throw error
  return data
}

/** « Rien à signaler » : marque un texte comme relu (une seule fois par texte). */
export async function marquerRelu(brut: Relecture): Promise<void> {
  const relecture = schemaRelecture.parse(brut)
  const { error } = await supabase().rpc('marquer_relu', {
    p_cible: relecture.cible,
    p_cible_id: relecture.cibleId,
  })
  if (error) throw error
}

/**
 * Remplace un champ par « [texte masqué par EJP Tech] ». Les valeurs sont validées par le schéma
 * de la fenêtre avant tout appel ; la base refuse un texte vide, introuvable ou déjà masqué.
 */
export async function masquerTexte(brut: Masquage): Promise<void> {
  const masquage = schemaMasquage.parse(brut)
  const { error } = await supabase().rpc('masquer_texte', {
    p_cible: masquage.cible,
    p_cible_id: masquage.cibleId,
    p_champ: masquage.champ,
    p_motif: masquage.motif,
  })
  if (error) throw error
}
