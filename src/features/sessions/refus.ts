import { lireErreurBase, phraseErreur } from '@/data/messagesBase'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'

// Lecture d'un refus après « Déclarer », « Enregistrer » ou « Supprimer », par la table de
// traduction de `src/data/messagesBase.ts` : un refus de la base prend sa phrase (« Une session
// Bâtir l'Église existe déjà le samedi 10 octobre. Choisissez une autre date. », m210) ; un refus
// de droit (42501) dit que la session n'est pas accessible ; une connexion expirée, un compte
// désactivé ou un refus inattendu ont chacun leur phrase. Seule une erreur sans réponse prend la
// phrase de connexion du formulaire (les valeurs restent dans le formulaire).

/**
 * Phrase d'un refus, avec la phrase de connexion propre au formulaire qui l'a reçu. La suppression
 * (phrase de connexion `erreurConnexionSuppression`) est une action sans formulaire : son repli
 * ne parle pas de saisie gardée.
 */
export function lireRefusSession(erreur: unknown, connexion: string): string {
  const formulaire = connexion !== TEXTES_SESSIONS.erreurConnexionSuppression
  return phraseErreur(erreur, { connexion, acces: TEXTES_SESSIONS.erreurAcces }, { formulaire })
}

/**
 * Refus d'une déclaration : sa phrase, et `date` quand la base refuse la date choisie (session du
 * même type déjà déclarée ce jour-là, m210), pour la dire sous le champ date (guide, 10.1).
 */
export function lireRefusDeclaration(
  erreur: unknown,
  connexion: string,
): { message: string; champ: 'date' | null } {
  const lue = lireErreurBase(erreur)
  const champ = lue.genre === 'message' && lue.champ === 'date' ? 'date' : null
  return { message: lireRefusSession(erreur, connexion), champ }
}
