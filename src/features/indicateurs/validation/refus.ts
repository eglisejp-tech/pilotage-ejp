import { z } from 'zod'
import { MESSAGES_BASE_VALIDATION } from '@/features/indicateurs/validation/textes'

// Lecture d'un refus de la base après « Valider » ou « Refuser » (`valider_indicateur`,
// validation-metier.md, 2.4) : un refus du motif (longueur, données personnelles, crochets) se dit
// sous le champ, tel quel ; un autre refus de saisie (demande déjà décidée, demande sortie) et un
// refus de droit (42501) se disent sous les boutons ; tout le reste est un problème de connexion
// (le motif reste dans la fenêtre, LISEZMOI « Erreur de formulaire »).

export type RefusValidation =
  /** Sous le champ du motif, tel quel. */
  | { ou: 'champ'; message: string }
  /** Sous les boutons, tel quel. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous les boutons. */
  | { ou: 'connexion' }

/** Ce que l'on lit d'une erreur PostgREST : son code SQL et son message. */
function lireErreur(erreur: unknown): { code: string; message: string } | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code, message }
}

/** Refus de saisie qui ne portent pas sur le motif écrit : ils vont sous les boutons. */
const HORS_DU_CHAMP: readonly string[] = [
  MESSAGES_BASE_VALIDATION.dejaDecidee,
  MESSAGES_BASE_VALIDATION.sortie,
  MESSAGES_BASE_VALIDATION.choix,
  MESSAGES_BASE_VALIDATION.correction,
]

/** Place et texte d'un refus de la base, pour la ligne ou la fenêtre qui l'a reçu. */
export function lireRefusValidation(erreur: unknown): RefusValidation {
  if (erreur instanceof z.ZodError) {
    return {
      ou: 'champ',
      message: erreur.issues[0]?.message ?? MESSAGES_BASE_VALIDATION.motifCourt,
    }
  }
  const lue = lireErreur(erreur)
  if (!lue) return { ou: 'connexion' }
  if (lue.code === '42501') return { ou: 'bouton', message: MESSAGES_BASE_VALIDATION.acces }
  if (lue.code !== 'P0001') return { ou: 'connexion' }
  return HORS_DU_CHAMP.includes(lue.message)
    ? { ou: 'bouton', message: lue.message }
    : { ou: 'champ', message: lue.message }
}
