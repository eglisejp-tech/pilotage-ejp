import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un refus de la base après l'envoi d'un signalement ou d'une clôture (contrat de
// l'étape 4, section 7) : un refus du texte (longueur, données personnelles, crochets) se dit sous
// le champ, tel quel ; un autre refus de saisie (P0001 : écran hors liste, signalement déjà clos)
// et un refus de droit (42501) se disent sous le bouton ; tout le reste est un problème de
// connexion (valeurs gardées, LISEZMOI « Erreur de formulaire »).

export type RefusSignalement =
  /** Sous le champ libre (texte du signalement ou commentaire), tel quel. */
  | { ou: 'champ'; message: string }
  /** Sous le bouton, tel quel. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous le bouton. */
  | { ou: 'connexion' }

/** Ce que l'on lit d'une erreur PostgREST : son code SQL et son message. */
function lireErreur(erreur: unknown): { code: string; message: string } | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code, message }
}

/** Refus de saisie qui ne portent pas sur le texte écrit : ils vont sous le bouton. */
const HORS_DU_CHAMP: readonly string[] = [
  MESSAGES_BASE_SIGNALEMENT.ecran,
  MESSAGES_BASE_SIGNALEMENT.dejaClos,
]

/** Place et texte d'un refus de la base, pour le formulaire qui l'a reçu. */
export function lireRefusSignalement(erreur: unknown): RefusSignalement {
  const lue = lireErreur(erreur)
  if (!lue) return { ou: 'connexion' }
  if (lue.code === '42501') return { ou: 'bouton', message: MESSAGES_BASE_SIGNALEMENT.acces }
  if (lue.code !== 'P0001') return { ou: 'connexion' }
  return HORS_DU_CHAMP.includes(lue.message)
    ? { ou: 'bouton', message: lue.message }
    : { ou: 'champ', message: lue.message }
}

/** La base dit que le signalement est déjà clos : la liste est à relire. */
export function estDejaClos(refus: RefusSignalement): boolean {
  return refus.ou === 'bouton' && refus.message === MESSAGES_BASE_SIGNALEMENT.dejaClos
}
