import { z } from 'zod'
import { MESSAGES_BASE_SUGGESTION } from '@/features/mes-indicateurs/textes'

// Lecture d'un refus de la base après « Envoyer pour validation » (`ajouter_suggestion`,
// validation-metier.md, 2.4 et configuration-indicateurs.md, 4.2) : un refus du « Pourquoi »
// (longueur, données personnelles, crochets) se dit sous le champ, tel quel ; un refus de limite
// (3 ajouts, 30 lignes), de doublon ou de suggestion inconnue, et un refus de droit (42501), se
// disent sous le bouton ; tout le reste est un problème de connexion (le texte reste dans le
// formulaire, LISEZMOI « Erreur de formulaire »).

export type RefusSuggestion =
  /** Sous le champ « Pourquoi », tel quel. */
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

/**
 * Refus de saisie qui ne portent pas sur le « Pourquoi » écrit : « Votre ministère a déjà 3
 * indicateurs à lui... », « Votre fiche compte déjà 30 indicateurs... », « Votre fiche a déjà
 * « Demandes reçues ». », « Cette suggestion n'existe pas. ». Ils vont sous le bouton.
 */
const MOTIF_HORS_DU_CHAMP = /^(Votre ministère a déjà|Votre fiche|Cette suggestion)/

/** Place et texte d'un refus de la base, pour le formulaire qui l'a reçu. */
export function lireRefusSuggestion(erreur: unknown): RefusSuggestion {
  if (erreur instanceof z.ZodError) {
    return {
      ou: 'champ',
      message: erreur.issues[0]?.message ?? MESSAGES_BASE_SUGGESTION.pourquoiCourt,
    }
  }
  const lue = lireErreur(erreur)
  if (!lue) return { ou: 'connexion' }
  if (lue.code === '42501') return { ou: 'bouton', message: MESSAGES_BASE_SUGGESTION.acces }
  if (lue.code !== 'P0001') return { ou: 'connexion' }
  return MOTIF_HORS_DU_CHAMP.test(lue.message)
    ? { ou: 'bouton', message: lue.message }
    : { ou: 'champ', message: lue.message }
}
