import { lireEchec } from '@/data/echecEnvoi'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un échec après l'envoi d'un signalement ou d'une clôture (contrat de l'étape 4,
// section 7), par le classement unique de `src/data/echecEnvoi.ts` (T76) : un refus du texte
// (longueur, données personnelles, crochets) se dit sous le champ ; un autre refus (écran hors
// liste, signalement déjà clos), un refus de droit (42501), une connexion expirée, un compte
// désactivé ou un refus inattendu se disent sous le bouton. Un signalement dont l'issue est
// inconnue (aucune réponse, réponse perdue, délai) est peut-être enregistré : la phrase dit de
// vérifier la liste avant de réessayer (m259). Une clôture se refait sans doublon : la base dit
// « déjà clos ». Un échec technique porte sa référence.

export type RefusSignalement =
  /** Sous le champ libre (texte du signalement ou commentaire). */
  | { ou: 'champ'; message: string }
  /** Sous le bouton, avec la référence d'un échec technique. */
  | { ou: 'bouton'; message: string; reference: string | null }

/** Place et texte d'un échec, pour le formulaire qui l'a reçu (signalement ou clôture). */
export function lireRefusSignalement(
  erreur: unknown,
  envoi: 'signalement' | 'cloture' = 'signalement',
): RefusSignalement {
  const lu = lireEchec(erreur, { nature: envoi === 'signalement' ? 'creation' : 'reprise' })
  if (lu.nature === 'refus' && lu.champ === 'texte') return { ou: 'champ', message: lu.message }
  return { ou: 'bouton', message: lu.message, reference: lu.reference }
}

/** La base dit que le signalement est déjà clos : la liste est à relire. */
export function estDejaClos(refus: RefusSignalement): boolean {
  return refus.ou === 'bouton' && refus.message === MESSAGES_BASE_SIGNALEMENT.dejaClos
}
