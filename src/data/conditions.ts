// Acceptation des conditions d'utilisation (T53, T61) : une fonction par requête. Un compte non
// partagé accepte par compte (`acceptation_conditions`) ; sur un compte de ministère, chaque
// personne déclarée accepte elle-même (`acceptation_personne`). La RLS ne rend à chacun que ses
// lignes ; l'écriture passe par la fonction `accepter_conditions`, idempotente, sans ligne de
// journal, qui choisit la table selon le compte.

import { schemaVersionConditions } from '@/lib/metier/conditions'
import { supabase } from '@/lib/supabase'

/**
 * Le compte a-t-il accepté cette version ? Comptes non partagés. Lisible en aal2 seulement
 * (politique restrictive) : l'appelant ne la lit qu'une fois le code vérifié. Le filtre sur
 * `compte` est indispensable : EJP Tech lit les lignes de tous les comptes.
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

/**
 * La personne déclarée sur cette session a-t-elle accepté cette version (T61) ? Compte de
 * ministère seulement, une fois le prénom indiqué. La base ne rend à la session que les lignes de
 * sa personne (même prénom sur le compte, sur cet appareil ou sur un autre) : aucun filtre de plus
 * n'est possible ni utile, un compte de ministère ne lit jamais celles d'une autre personne.
 */
export async function lireConditionsAccepteesParLaPersonne(version: string): Promise<boolean> {
  const versionValide = schemaVersionConditions.parse(version)
  const { data, error } = await supabase()
    .from('acceptation_personne')
    .select('id')
    .eq('version', versionValide)
    .limit(1)
  if (error) throw error
  return data.length > 0
}

/**
 * Accepte la version : pour le compte connecté, ou, sur un compte de ministère, pour la personne
 * déclarée sur cette session. Un second appel pour la même version ne fait rien.
 */
export async function accepterConditions(version: string): Promise<void> {
  const { error } = await supabase().rpc('accepter_conditions', {
    p_version: schemaVersionConditions.parse(version),
  })
  if (error) throw error
}
