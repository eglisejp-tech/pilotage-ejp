import { phraseErreur } from '@/data/echecEnvoi'
import { traduireErreurBase } from '@/data/messagesBase'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'

// Lecture d'un refus après « Ajouter », « Enregistrer » ou « Supprimer », par la table de
// traduction de `src/data/messagesBase.ts` : un refus de la base prend sa phrase (« Une session
// Bâtir l'Église existe déjà le samedi 10 octobre. Choisissez une autre date. », m210) ; un refus
// de droit (42501) dit que la session est introuvable, ou, pour un ajout, que le compte ne permet
// pas d'ajouter une session (T66, m207) ; une connexion expirée, un compte désactivé ou un refus
// inattendu ont chacun leur phrase. Seule une erreur sans réponse prend la phrase de connexion du
// formulaire (les valeurs restent dans le formulaire).

/**
 * Phrase d'un refus, avec la phrase de connexion propre au formulaire qui l'a reçu. La suppression
 * (phrase de connexion `erreurConnexionSuppression`) est une action sans formulaire : son repli
 * ne parle pas de saisie gardée. `acces` : la phrase d'un refus de droit (défaut : session
 * introuvable). `creation` : une déclaration à l'issue inconnue dit « Vérifiez la liste avant de
 * réessayer » (un nouvel essai rendrait « Une session ... existe déjà », T76).
 */
export function lireRefusSession(
  erreur: unknown,
  connexion: string,
  acces: string = TEXTES_SESSIONS.erreurAcces,
  creation = false,
): string {
  const formulaire = connexion !== TEXTES_SESSIONS.erreurConnexionSuppression
  return phraseErreur(erreur, { connexion, acces, creation }, { formulaire })
}

/**
 * Refus du formulaire : sa phrase, et `date` quand la base refuse la date choisie (session du
 * même type déjà déclarée ce jour-là, m210), pour la dire sous le champ date (guide, 10.1). Un
 * ajout refusé pour un droit n'a pas encore de session : il le dit (m207).
 */
export function lireRefusDeclaration(
  erreur: unknown,
  connexion: string,
  ajout = false,
): { message: string; champ: 'date' | null } {
  const lue = traduireErreurBase(erreur)
  const champ = lue.genre === 'message' && lue.champ === 'date' ? 'date' : null
  const acces = ajout ? TEXTES_SESSIONS.erreurAccesAjout : TEXTES_SESSIONS.erreurAcces
  return { message: lireRefusSession(erreur, connexion, acces, ajout), champ }
}
