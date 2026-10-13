// Acceptation des conditions d'utilisation (T53, T61) : une fonction par requête. Un compte non
// partagé accepte par compte (`acceptation_conditions`, qu'il lit lui-même) ; sur un compte de
// ministère, chaque personne déclarée accepte elle-même (`acceptation_personne`, lue par EJP Tech
// seul : la session pose seulement la question, oui ou non, par `conditions_acceptees`).
// L'écriture passe par la fonction `accepter_conditions`, idempotente, sans ligne de journal, qui
// choisit la table selon le compte.

import { z } from 'zod'
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
 * ministère seulement, une fois le prénom indiqué. La base répond oui ou non pour la personne (même
 * prénom sur le compte, majuscules ignorées, sur cet appareil ou sur un autre), sans rendre aucune
 * ligne : seul EJP Tech lit qui a accepté quoi, et quand.
 */
export async function lireConditionsAccepteesParLaPersonne(version: string): Promise<boolean> {
  const { data, error } = await supabase().rpc('conditions_acceptees', {
    p_version: schemaVersionConditions.parse(version),
  })
  if (error) throw error
  return z.boolean().parse(data)
}

/**
 * Accepte la version : pour le compte connecté, ou, sur un compte de ministère, pour la personne
 * déclarée sur cette session. Un second appel pour la même version ne fait rien. La base refuse
 * une version qui n'est pas une vraie date, ou qui est à venir.
 */
export async function accepterConditions(version: string): Promise<void> {
  const { error } = await supabase().rpc('accepter_conditions', {
    p_version: schemaVersionConditions.parse(version),
  })
  if (error) throw error
}
