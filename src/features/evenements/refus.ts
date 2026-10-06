import { MESSAGES_BASE } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

// Lecture d'un refus de la base après un envoi (docs/conception/contrat-etape-4.md, section 7) :
// une erreur de saisie (P0001) s'affiche telle quelle, un refus de droit (42501) dit seulement
// que l'élément n'est pas accessible, et tout le reste est un problème de connexion (valeurs
// gardées, LISEZMOI « Erreur de formulaire »). Les refus de date vont sous le champ date, avec le
// lien « Signaler une difficulté » (T37, T39) ; une ligne identique va sous le bouton, sans lien.

export type Refus =
  /** Sous le champ date : texte de aides-contextuelles.md, section 7, suivi du lien. */
  | { ou: 'date'; message: string }
  /** Sous le bouton d'enregistrement, tel quel. */
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

/** Place et texte d'un refus de la base, pour le formulaire qui l'a reçu. */
export function lireRefus(erreur: unknown): Refus {
  const lue = lireErreur(erreur)
  if (!lue) return { ou: 'connexion' }
  if (lue.code === '42501') return { ou: 'bouton', message: MESSAGES_BASE.acces }
  if (lue.code !== 'P0001') return { ou: 'connexion' }
  switch (lue.message) {
    case MESSAGES_BASE.datePasseeAjout:
      return { ou: 'date', message: TEXTES_SIGNALEMENT.dateRefuseeAjout }
    case MESSAGES_BASE.datePasseeMiseAJour:
      return { ou: 'date', message: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour }
    case MESSAGES_BASE.ligneIdentique:
      return { ou: 'bouton', message: TEXTES_SIGNALEMENT.ligneIdentique }
    default:
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
