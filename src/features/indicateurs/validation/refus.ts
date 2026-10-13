import { z } from 'zod'
import { lireErreurBase } from '@/data/messagesBase'
import { MESSAGES_BASE_VALIDATION } from '@/features/indicateurs/validation/textes'

// Lecture d'un refus après « Valider » ou « Refuser » (`valider_indicateur`, validation-metier.md,
// 2.4), par la table de traduction de `src/data/messagesBase.ts` : un refus du motif (longueur,
// données personnelles, crochets) se dit sous le champ ; un autre refus (demande déjà décidée,
// demande sortie), un refus de droit (42501), une connexion expirée, un compte désactivé ou un
// refus inattendu se disent sous les boutons. Seule une erreur sans réponse est un problème de
// connexion (le motif reste dans la fenêtre, LISEZMOI « Erreur de formulaire »).

export type RefusValidation =
  /** Sous le champ du motif. */
  | { ou: 'champ'; message: string }
  /** Sous les boutons. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous les boutons. */
  | { ou: 'connexion' }

/** Place et texte d'un refus, pour la ligne ou la fenêtre qui l'a reçu. */
export function lireRefusValidation(erreur: unknown): RefusValidation {
  const lue = lireErreurBase(erreur)
  switch (lue.genre) {
    case 'reseau':
    case 'delai':
      return { ou: 'connexion' }
    case 'acces':
      return { ou: 'bouton', message: MESSAGES_BASE_VALIDATION.acces }
    case 'message':
      // Le motif est le seul champ : un contrôle de son schéma se dit sous lui.
      return lue.nature === 'refus' && (lue.champ === 'texte' || erreur instanceof z.ZodError)
        ? { ou: 'champ', message: lue.message }
        : { ou: 'bouton', message: lue.message }
  }
}
