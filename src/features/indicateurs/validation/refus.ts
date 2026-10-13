import { z } from 'zod'
import { lireErreurBase } from '@/data/messagesBase'
import type { OptionsLecture } from '@/data/messagesBase'
import { MESSAGES_BASE_VALIDATION } from '@/features/indicateurs/validation/textes'

// Lecture d'un refus après « Valider » ou « Refuser » (`valider_indicateur`, validation-metier.md,
// 2.4), par la table de traduction de `src/data/messagesBase.ts` : un refus du motif (longueur,
// données personnelles, crochets) se dit sous le champ ; un refus qui porte sur la demande (déjà
// décidée, demande sortie, refus de droit 42501) se dit en haut du bloc, la liste relue. Une
// connexion expirée, un compte désactivé ou un refus inattendu (repli) ne disent rien de la
// demande : la phrase reste sous les boutons, la fenêtre reste ouverte et garde le motif. Une
// erreur sans réponse est un problème de connexion (LISEZMOI « Erreur de formulaire »).

export type RefusValidation =
  /** Sous le champ du motif. */
  | { ou: 'champ'; message: string }
  /** Refus de la demande elle-même : en haut du bloc, la fenêtre se ferme, la liste se relit. */
  | { ou: 'bouton'; message: string }
  /** Sous les boutons de la ligne ou de la fenêtre, qui reste ouverte avec son motif. */
  | { ou: 'formulaire'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous les boutons. */
  | { ou: 'connexion' }

/**
 * Place et texte d'un refus, pour la ligne ou la fenêtre qui l'a reçu. `formulaire` faux pour
 * « Valider », qui n'a rien à garder : le repli dit alors « L'action n'a pas abouti. ».
 */
export function lireRefusValidation(
  erreur: unknown,
  options: OptionsLecture = {},
): RefusValidation {
  const lue = lireErreurBase(erreur, options)
  switch (lue.genre) {
    case 'reseau':
    case 'delai':
      return { ou: 'connexion' }
    case 'acces':
      return { ou: 'bouton', message: MESSAGES_BASE_VALIDATION.acces }
    case 'message':
      if (lue.nature !== 'refus') return { ou: 'formulaire', message: lue.message }
      // Le motif est le seul champ : un contrôle de son schéma se dit sous lui.
      return lue.champ === 'texte' || erreur instanceof z.ZodError
        ? { ou: 'champ', message: lue.message }
        : { ou: 'bouton', message: lue.message }
  }
}
