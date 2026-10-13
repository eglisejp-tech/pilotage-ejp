import { z } from 'zod'
import { messageDeRefusPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'

/**
 * Phrase d'un refus d'écriture. Une erreur de saisie de la base (`P0001`) se lit telle quelle ;
 * un refus de droit dit seulement que l'élément n'est pas accessible (sauf la double
 * authentification, que la personne doit lire) ; une demande refusée par un schéma avant tout
 * appel (jamais atteinte depuis un formulaire qui valide d'abord) dit de vérifier les champs ;
 * tout le reste est un problème de connexion, dit par `connexion`.
 */
export function lireRefusEcriture(erreur: unknown, connexion: string): string {
  if (erreur instanceof z.ZodError) return erreur.issues[0]?.message ?? connexion
  return messageDeRefusPrevus(erreur) ?? connexion
}

/** Les erreurs sans celle d'un champ qu'on vient de modifier. */
export function sansErreur(erreurs: Record<string, string>, champ: string): Record<string, string> {
  if (!(champ in erreurs)) return erreurs
  const reste = { ...erreurs }
  delete reste[champ]
  return reste
}

/** Première erreur de chaque champ d'un résultat Zod, par nom du premier élément du chemin. */
export function erreursParChamp(erreur: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {}
  for (const probleme of erreur.issues) {
    const cle = String(probleme.path[0] ?? '')
    messages[cle] ??= probleme.message
  }
  return messages
}
