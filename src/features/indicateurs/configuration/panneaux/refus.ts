import type { z } from 'zod'
import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'
import { messageDeRefusPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'

/**
 * Phrase d'un refus d'écriture, par la table de traduction de `src/data/messagesBase.ts` (m233) :
 * un refus de la base ou d'un schéma prend sa phrase ; un refus de droit dit seulement que
 * l'élément n'est pas accessible ; une connexion expirée, un compte désactivé ou un refus
 * inattendu ont chacun leur phrase. Seule une erreur sans réponse prend `connexion`. La fenêtre de
 * retrait (`connexionFenetre`) est une action sans formulaire : son repli ne parle pas de saisie.
 */
export function lireRefusEcriture(erreur: unknown, connexion: string): string {
  const formulaire = connexion !== TEXTES_PANNEAUX.connexionFenetre
  return messageDeRefusPrevus(erreur, formulaire) ?? connexion
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
