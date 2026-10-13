import { lireErreurBase, MESSAGES_COMMUNS } from '@/data/messagesBase'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un refus après l'envoi d'un signalement ou d'une clôture (contrat de l'étape 4,
// section 7), par la table de traduction de `src/data/messagesBase.ts` : un refus du texte
// (longueur, données personnelles, crochets) se dit sous le champ ; un autre refus (écran hors
// liste, signalement déjà clos), un refus de droit (42501), une connexion expirée, un compte
// désactivé ou un refus inattendu se disent sous le bouton. Seule une erreur sans réponse est un
// problème de connexion (valeurs gardées, LISEZMOI « Erreur de formulaire ») ; après 10 s sans
// réponse à un signalement, il est peut-être enregistré : la phrase dit de vérifier la liste avant
// de réessayer (m259). Une clôture se refait sans doublon : la base dit « déjà clos ».

export type RefusSignalement =
  /** Sous le champ libre (texte du signalement ou commentaire). */
  | { ou: 'champ'; message: string }
  /** Sous le bouton. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous le bouton. */
  | { ou: 'connexion' }

/** Place et texte d'un refus, pour le formulaire qui l'a reçu (signalement ou clôture). */
export function lireRefusSignalement(
  erreur: unknown,
  envoi: 'signalement' | 'cloture' = 'signalement',
): RefusSignalement {
  const lue = lireErreurBase(erreur)
  switch (lue.genre) {
    case 'reseau':
      return { ou: 'connexion' }
    case 'delai':
      return envoi === 'signalement'
        ? { ou: 'bouton', message: MESSAGES_COMMUNS.peutEtreFait }
        : { ou: 'connexion' }
    case 'acces':
      return { ou: 'bouton', message: MESSAGES_BASE_SIGNALEMENT.acces }
    case 'message':
      return lue.nature === 'refus' && lue.champ === 'texte'
        ? { ou: 'champ', message: lue.message }
        : { ou: 'bouton', message: lue.message }
  }
}

/** La base dit que le signalement est déjà clos : la liste est à relire. */
export function estDejaClos(refus: RefusSignalement): boolean {
  return refus.ou === 'bouton' && refus.message === MESSAGES_BASE_SIGNALEMENT.dejaClos
}
