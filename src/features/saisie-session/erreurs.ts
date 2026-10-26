// Message d'un envoi refusé des saisies de chiffres (présence, dimanche, mois, carte et chiffres
// par département), par le classement unique de `src/data/echecEnvoi.ts` (T76, m270 à m272) : un
// refus de la base prend sa phrase et son champ ; un refus de droit (42501, politique d'ajout)
// prend le message du contrat de l'étape 4 (section 7) ; une connexion expirée, un compte
// désactivé ou un refus inattendu ont chacun leur phrase. Un échec technique sans risque de
// doublon (la dernière saisie fait foi) laisse le formulaire dire la phrase de `LISEZMOI.md`
// (« La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez. », m256) ;
// un bogue prend le repli. Un échec technique porte sa référence.

import { lireEchec } from '@/data/echecEnvoi'
import { MESSAGES_COMMUNS } from '@/data/messagesBase'
import type { ChampRefus } from '@/data/messagesBase'

/**
 * Refus de droit (contrat de l'étape 4, section 7), dans la forme commune d'un élément
 * introuvable de la table de traduction (T66, t064 et m273 ; guide 10.10).
 */
export const MESSAGE_ACCES_REFUSE = MESSAGES_COMMUNS.acces

/** Échec d'un envoi : sa phrase (null : la phrase de connexion), son champ et sa référence. */
export interface EchecEnvoi {
  message: string | null
  champ: ChampRefus | null
  /** Référence d'un échec technique (T76), à montrer sous la phrase. */
  reference: string | null
}

/**
 * Phrase, champ et référence d'un envoi refusé ; `message` null : problème de connexion. `acces` :
 * la phrase d'un refus de droit, quand l'écran connaît l'objet (« Cette session est
 * introuvable. », m115).
 */
export function lireEchecEnvoi(erreur: unknown, acces: string = MESSAGE_ACCES_REFUSE): EchecEnvoi {
  const lu = lireEchec(erreur, { nature: 'reprise', acces })
  return {
    message: lu.nature === 'technique' ? null : lu.message,
    champ: lu.champ,
    reference: lu.reference,
  }
}

/** Message à afficher sous le bouton ; null : problème de connexion (message par défaut). */
export function messageErreurEnvoi(erreur: unknown): string | null {
  return lireEchecEnvoi(erreur).message
}
