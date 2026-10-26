import { lireErreurBase } from '@/data/messagesBase'
import { lireRefusSignalement } from '@/features/signalement/refus'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un refus après un geste du suivi (T77) : prendre en charge, répondre, confirmer,
// clore. Comme pour une clôture (`lireRefusSignalement`, envoi « cloture ») : un refus du texte
// sous le champ, une coupure comme une connexion perdue, le reste sous le bouton. En plus, un
// refus qui dit que le signalement a changé entre-temps (deux personnes d'EJP Tech, une page
// ouverte depuis longtemps, une date limite passée) demande de relire la liste.

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
  /** Sous le bouton ; `relire` : le signalement a changé, la liste est à relire. */
  | { ou: 'bouton'; message: string; relire: boolean }
  /** Aucune réponse de la base (réseau coupé, délai dépassé). */
  | { ou: 'connexion' }

/** Place et texte d'un refus après un geste du suivi. */
export function lireRefusGeste(erreur: unknown): RefusGeste {
  const lu = lireRefusSignalement(erreur, 'cloture')
  if (lu.ou === 'bouton') return { ...lu, relire: STATUT_CHANGE.has(lu.message) }
  return lu
}
