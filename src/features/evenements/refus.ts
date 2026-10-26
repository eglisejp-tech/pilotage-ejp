import { lireEchec } from '@/data/echecEnvoi'
import { TEXTES_REUNION } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un échec d'envoi (contrat de l'étape 4, section 7), par le classement unique de
// `src/data/echecEnvoi.ts` (T76) : un refus de la base prend sa phrase, sous le champ date quand
// il porte sur la date (avec le lien « Signaler une difficulté », T37, T39), sinon sous le
// bouton ; un refus sur une heure d'événement (T68) va sous son champ ; un refus de droit (42501)
// dit seulement que l'élément n'est pas accessible ; une connexion expirée, un compte désactivé
// ou un refus inattendu ont chacun leur phrase. Un ajout dont l'issue est inconnue (aucune
// réponse, réponse perdue, délai) dit de vérifier la liste avant de réessayer (m259) ; une mise à
// jour ou une réunion, qui ne se doublent pas, gardent la phrase de connexion. Un échec technique
// porte sa référence.

export type Refus =
  /** Sous le champ date : texte de aides-contextuelles.md, section 7, suivi du lien. */
  | { ou: 'date'; message: string }
  /**
   * Sous un champ heure d'un événement (T68) ; le formulaire le dit sous le bouton quand le champ
   * n'est pas affiché (heure de début d'un événement qui n'est pas Terminé ou pas encore passé).
   */
  | { ou: 'heure_prevue' | 'heure_debut'; message: string }
  /** Sous le bouton d'enregistrement, tel quel, avec la référence d'un échec technique. */
  | { ou: 'bouton'; message: string; reference: string | null }

/**
 * Place et texte d'un échec d'envoi, pour le formulaire qui l'a reçu : `ajout` (un nouvel
 * événement, une création), `evenement` (sa mise à jour) ou `reunion`. Pour la réunion, un refus
 * de droit (42501) vient de la politique d'ajout de `reunion` (date du jour ou à venir) : le jour
 * a changé depuis l'ouverture du panneau, c'est donc une date passée, dite sous le champ date.
 */
export function lireRefus(
  erreur: unknown,
  saisie: 'ajout' | 'evenement' | 'reunion' = 'evenement',
): Refus {
  const lu = lireEchec(erreur, { nature: saisie === 'ajout' ? 'creation' : 'reprise' })
  if (lu.genre === 'acces' && saisie === 'reunion') {
    return { ou: 'date', message: TEXTES_REUNION.erreurDatePassee }
  }
  if (lu.champ === 'date') return { ou: 'date', message: lu.message }
  if (saisie !== 'reunion' && (lu.champ === 'heure_prevue' || lu.champ === 'heure_debut')) {
    return { ou: lu.champ, message: lu.message }
  }
  return { ou: 'bouton', message: lu.message, reference: lu.reference }
}

/** Un message sous le champ date qui appelle le lien « Signaler une difficulté ». */
export function appelleUnSignalement(message: string | undefined): boolean {
  return (
    message === TEXTES_SIGNALEMENT.dateRefuseeAjout ||
    message === TEXTES_SIGNALEMENT.dateRefuseeMiseAJour
  )
}
