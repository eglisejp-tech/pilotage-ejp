// Message d'un envoi refusé des saisies de chiffres (présence, dimanche, mois, carte et chiffres
// par département), lu dans la table de traduction de `src/data/messagesBase.ts` (m270 à m272) :
// un refus de la base prend sa phrase et son champ ; un refus de droit (42501, politique d'ajout)
// prend le message du contrat de l'étape 4 (section 7) ; une connexion expirée, un compte
// désactivé ou un refus inattendu ont chacun leur phrase. Seule une erreur sans réponse (réseau,
// délai) laisse le formulaire dire la phrase de `LISEZMOI.md` (« La connexion a échoué. Vos
// chiffres sont encore dans le formulaire : réessayez. »), réservée à ce cas (m256).

import { lireErreurBase, MESSAGES_COMMUNS } from '@/data/messagesBase'
import type { ChampRefus } from '@/data/messagesBase'

/**
 * Refus de droit (contrat de l'étape 4, section 7), dans la forme commune d'un élément
 * introuvable de la table de traduction (T66, t064 et m273 ; guide 10.10).
 */
export const MESSAGE_ACCES_REFUSE = MESSAGES_COMMUNS.acces

/** Échec d'un envoi : sa phrase (null : sans réponse) et le champ où la dire, s'il y en a un. */
export interface EchecEnvoi {
  message: string | null
  champ: ChampRefus | null
}

/**
 * Phrase et champ d'un envoi refusé ; `message` null : problème de connexion. `acces` : la phrase
 * d'un refus de droit, quand l'écran connaît l'objet (« Cette session est introuvable. », m115).
 */
export function lireEchecEnvoi(erreur: unknown, acces: string = MESSAGE_ACCES_REFUSE): EchecEnvoi {
  const lue = lireErreurBase(erreur)
  switch (lue.genre) {
    case 'reseau':
    case 'delai':
      return { message: null, champ: null }
    case 'acces':
      return { message: acces, champ: null }
    case 'message':
      return { message: lue.message, champ: lue.champ }
  }
}

/** Message à afficher sous le bouton ; null : problème de connexion (message par défaut). */
export function messageErreurEnvoi(erreur: unknown): string | null {
  return lireEchecEnvoi(erreur).message
}
