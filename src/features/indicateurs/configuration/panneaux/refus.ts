import type { z } from 'zod'
import { traduireErreurBase } from '@/data/messagesBase'
import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'
import { messageDeRefusPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import type { VerificationLibelle } from '@/lib/base'

/**
 * Un refus de la base qui porte sur le nom (doublon, mot de calcul, période) ou sur la définition
 * se dit sous ce champ, qui prend le focus (guide, 10.1 et 10.8) : rend l'erreur du champ à poser,
 * ou null pour un refus qui se dit sous le bouton (`lireRefusEcriture`).
 */
export function erreurDeChamp(erreur: unknown): Record<string, string> | null {
  const lue = traduireErreurBase(erreur)
  if (lue.genre !== 'message' || lue.nature !== 'refus') return null
  if (lue.champ === 'nom') return { libelle: lue.message }
  if (lue.champ === 'definition') return { definition: lue.message }
  return null
}

/**
 * Les contrôles pendant la frappe, sans celui que l'erreur du champ dit déjà : la phrase de la
 * table est la même avant l'envoi et après le refus (m233), elle ne se dit qu'une fois.
 */
export function sansRepetition(
  verifications: readonly VerificationLibelle[],
  erreur: string | undefined,
): readonly VerificationLibelle[] {
  if (erreur === undefined) return verifications
  return verifications.filter((verification) => verification.message !== erreur)
}

/**
 * Phrase d'un refus d'écriture, par la table de traduction de `src/data/messagesBase.ts` (m233) :
 * un refus de la base ou d'un schéma prend sa phrase ; un refus de droit dit seulement que
 * l'élément n'est pas accessible ; une connexion expirée, un compte désactivé ou un refus
 * inattendu ont chacun leur phrase. Un échec technique prend `connexion` ; pour une création
 * (`creation`) à l'issue inconnue, « Vérifiez la liste avant de réessayer » (T76). La fenêtre de
 * retrait (`connexionFenetre`) est une action sans formulaire : son repli ne parle pas de saisie.
 */
export function lireRefusEcriture(erreur: unknown, connexion: string, creation = false): string {
  const formulaire = connexion !== TEXTES_PANNEAUX.connexionFenetre
  return messageDeRefusPrevus(erreur, formulaire, creation) ?? connexion
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
