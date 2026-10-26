import { lireEchec } from '@/data/echecEnvoi'
import { lireErreurBase } from '@/data/messagesBase'
import { MESSAGES_BASE_SIGNALEMENT, TEXTES_REPONSE } from '@/features/signalement/textes'

// Lecture d'un échec après un geste du suivi (T77) : prendre en charge, répondre, confirmer,
// clore, par le classement unique de `src/data/echecEnvoi.ts` (T76). Un refus du texte se dit
// sous le champ ; le reste sous le bouton, avec la référence d'un échec technique. Aucun geste ne
// crée de doublon quand il est refait : la base refuse le second (« déjà pris en charge », « déjà
// clos »...), donc une issue inconnue dit de réessayer. Un geste en un clic sans réponse dit
// « L'envoi n'a pas abouti. Réessayez. » ; un panneau garde son texte (« Votre saisie est encore
// dans le formulaire »). Un refus qui dit que le signalement a changé entre-temps (deux personnes
// d'EJP Tech, une page ouverte depuis longtemps, une date limite passée) demande de relire la liste.

/** Messages de la base d'un signalement qui a changé de statut, et leur phrase à l'écran. */
const STATUT_CHANGE = new Set(
  [
    MESSAGES_BASE_SIGNALEMENT.dejaClos,
    MESSAGES_BASE_SIGNALEMENT.dejaPrisEnCharge,
    MESSAGES_BASE_SIGNALEMENT.attendLeMinistere,
    MESSAGES_BASE_SIGNALEMENT.nAttendPas,
    MESSAGES_BASE_SIGNALEMENT.sansCompteActif,
  ].map((message) => {
    const lue = lireErreurBase({ code: 'P0001', message })
    return lue.genre === 'message' ? lue.message : message
  }),
)

export type RefusGeste =
  /** Sous le champ de la réponse. */
  | { ou: 'champ'; message: string }
  /**
   * Sous le bouton, avec la référence d'un échec technique ; `relire` : le signalement a changé,
   * la liste est à relire.
   */
  | { ou: 'bouton'; message: string; reference: string | null; relire: boolean }

/** Un geste en un clic (« Prendre en charge », « Oui, c'est réglé ») ou un panneau de réponse. */
export type FormeGeste = 'clic' | 'panneau'

/** Place et texte d'un échec après un geste du suivi. */
export function lireRefusGeste(erreur: unknown, forme: FormeGeste): RefusGeste {
  const lu =
    forme === 'clic'
      ? lireEchec(erreur, { nature: 'action', connexion: TEXTES_REPONSE.echecEnvoi })
      : lireEchec(erreur, { nature: 'reprise' })
  if (lu.nature === 'refus' && lu.champ === 'texte') return { ou: 'champ', message: lu.message }
  return {
    ou: 'bouton',
    message: lu.message,
    reference: lu.reference,
    relire: STATUT_CHANGE.has(lu.message),
  }
}
