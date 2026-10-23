import { lireErreurBase, MESSAGES_COMMUNS } from '@/data/messagesBase'
import { MESSAGE_ACCES_EVENEMENT, TEXTES_REUNION } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un refus de la base après un envoi (contrat de l'étape 4, section 7), par la table de
// traduction de `src/data/messagesBase.ts` : un refus de la base prend sa phrase, sous le champ
// date quand il porte sur la date (avec le lien « Signaler une difficulté », T37, T39), sinon sous
// le bouton ; un refus sur une heure d'événement (T68) va sous son champ ; un refus de droit
// (42501) dit seulement que l'élément n'est pas accessible ; une
// connexion expirée, un compte désactivé ou un refus inattendu ont chacun leur phrase. Seule une
// erreur sans réponse est un problème de connexion (valeurs gardées, LISEZMOI « Erreur de
// formulaire ») ; après 10 s sans réponse à un ajout, l'événement est peut-être enregistré : la
// phrase dit de vérifier la liste avant de réessayer (m259).

export type Refus =
  /** Sous le champ date : texte de aides-contextuelles.md, section 7, suivi du lien. */
  | { ou: 'date'; message: string }
  /**
   * Sous un champ heure d'un événement (T68) ; le formulaire le dit sous le bouton quand le champ
   * n'est pas affiché (heure de début d'un événement qui n'est pas Terminé ou pas encore passé).
   */
  | { ou: 'heure_prevue' | 'heure_debut'; message: string }
  /** Sous le bouton d'enregistrement, tel quel. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous le bouton. */
  | { ou: 'connexion' }

/**
 * Place et texte d'un refus de la base, pour le formulaire qui l'a reçu : `ajout` (un nouvel
 * événement), `evenement` (sa mise à jour) ou `reunion`. Pour la réunion, un refus de droit
 * (42501) vient de la politique d'ajout de `reunion` (date du jour ou à venir) : le jour a changé
 * depuis l'ouverture du panneau, c'est donc une date passée, dite sous le champ date.
 */
export function lireRefus(
  erreur: unknown,
  saisie: 'ajout' | 'evenement' | 'reunion' = 'evenement',
): Refus {
  const lue = lireErreurBase(erreur)
  switch (lue.genre) {
    case 'reseau':
      return { ou: 'connexion' }
    case 'delai':
      return saisie === 'ajout'
        ? { ou: 'bouton', message: MESSAGES_COMMUNS.peutEtreFait }
        : { ou: 'connexion' }
    case 'acces':
      return saisie === 'reunion'
        ? { ou: 'date', message: TEXTES_REUNION.erreurDatePassee }
        : { ou: 'bouton', message: MESSAGE_ACCES_EVENEMENT }
    case 'message':
      if (lue.champ === 'date') return { ou: 'date', message: lue.message }
      if (saisie !== 'reunion' && (lue.champ === 'heure_prevue' || lue.champ === 'heure_debut')) {
        return { ou: lue.champ, message: lue.message }
      }
      return { ou: 'bouton', message: lue.message }
  }
}

/** Un message sous le champ date qui appelle le lien « Signaler une difficulté ». */
export function appelleUnSignalement(message: string | undefined): boolean {
  return (
    message === TEXTES_SIGNALEMENT.dateRefuseeAjout ||
    message === TEXTES_SIGNALEMENT.dateRefuseeMiseAJour
  )
}
