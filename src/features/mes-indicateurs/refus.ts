import { z } from 'zod'
import { lireErreurBase } from '@/data/messagesBase'
import { MESSAGES_BASE_SUGGESTION } from '@/features/mes-indicateurs/textes'

// Lecture d'un refus après « Envoyer pour validation » (`ajouter_suggestion`, validation-metier.md,
// 2.4 et configuration-indicateurs.md, 4.2), par la table de traduction de
// `src/data/messagesBase.ts` (m233) : un refus du « Pourquoi » (longueur, données personnelles,
// crochets) se dit sous le champ ; un refus de limite (3 ajouts, 30 lignes), de doublon ou de
// suggestion inconnue, un refus de droit (42501), une connexion expirée, un compte désactivé ou un
// refus inattendu se disent sous le bouton. Seule une erreur sans réponse est un problème de
// connexion (le texte reste dans le formulaire, LISEZMOI « Erreur de formulaire »).

export type RefusSuggestion =
  /** Sous le champ « Pourquoi ». */
  | { ou: 'champ'; message: string }
  /** Sous le bouton. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous le bouton. */
  | { ou: 'connexion' }

/**
 * Le même partage pour la fenêtre « Retirer » d'un ajout (T62, `retirer_mon_indicateur`) : un
 * refus du motif (longueur, données personnelles, crochets) sous le champ ; un ajout déjà retiré,
 * la source d'un calcul ou un refus de droit sous les boutons, la fenêtre ouverte.
 */
export function lireRefusRetrait(erreur: unknown): RefusSuggestion {
  return lireRefusSuggestion(erreur)
}

/** Place et texte d'un refus, pour le formulaire qui l'a reçu. */
export function lireRefusSuggestion(erreur: unknown): RefusSuggestion {
  const lue = lireErreurBase(erreur)
  switch (lue.genre) {
    case 'reseau':
    case 'delai':
      return { ou: 'connexion' }
    case 'acces':
      return { ou: 'bouton', message: MESSAGES_BASE_SUGGESTION.acces }
    case 'message':
      // Le « Pourquoi » est le seul champ : un contrôle de son schéma se dit sous lui.
      return lue.nature === 'refus' && (lue.champ === 'texte' || erreur instanceof z.ZodError)
        ? { ou: 'champ', message: lue.message }
        : { ou: 'bouton', message: lue.message }
  }
}
