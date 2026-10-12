// Acceptation des conditions d'utilisation (T53) : une fonction par requête. Un compte ne lit
// que ses propres lignes (RLS de `acceptation_conditions`) ; l'écriture passe par la fonction
// `accepter_conditions`, idempotente, sans ligne de journal.

import { schemaVersionConditions } from '@/lib/metier/conditions'
import { supabase } from '@/lib/supabase'

/**
 * Le compte a-t-il accepté cette version ? Lisible en aal2 seulement (politique restrictive) :
 * l'appelant ne la lit qu'une fois le code vérifié. Le filtre sur `compte` est indispensable :
 * EJP Tech lit les lignes de tous les comptes.
 */
export async function lireConditionsAcceptees(compteId: string, version: string): Promise<boolean> {
  const versionValide = schemaVersionConditions.parse(version)
  const { data, error } = await supabase()
    .from('acceptation_conditions')
    .select('id')
    .eq('compte', compteId)
    .eq('version', versionValide)
    .limit(1)
  if (error) throw error
  return data.length > 0
}

/** Accepte la version pour le compte connecté ; un second appel pour la même version ne fait rien. */
export async function accepterConditions(version: string): Promise<void> {
  const { error } = await supabase().rpc('accepter_conditions', {
    p_version: schemaVersionConditions.parse(version),
  })
  if (error) throw error
}
