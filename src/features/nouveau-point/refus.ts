import { MESSAGES_POINT, messageDeRefusPoint } from '@/data/pointsEcriture'

// Lecture d'un refus de `creer_point` après un envoi : une erreur de saisie de la base (P0001)
// s'affiche telle quelle, sous le champ qu'elle concerne quand elle le désigne, sinon sous le
// bouton ; un refus de droit (42501) ne dit pas pourquoi ; tout le reste est un problème de
// connexion (valeurs gardées, LISEZMOI « Erreur de formulaire »).

export type ChampPoint = 'titre' | 'description' | 'attendu' | 'echeance' | 'mentions'

export type RefusPoint =
  /** Sous le champ désigné, relié par `aria-describedby`. */
  | { ou: 'champ'; champ: ChampPoint; message: string }
  /** Sous le bouton d'enregistrement, tel quel. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous le bouton. */
  | { ou: 'connexion' }

const CHAMP_DU_MESSAGE = new Map<string, ChampPoint>([
  [MESSAGES_POINT.refus.titre, 'titre'],
  [MESSAGES_POINT.refus.description, 'description'],
  [MESSAGES_POINT.refus.attendu, 'attendu'],
  [MESSAGES_POINT.refus.echeancePassee, 'echeance'],
  [MESSAGES_POINT.refus.echeanceFormat, 'echeance'],
  [MESSAGES_POINT.refus.mentionRefusee, 'mentions'],
])

/** Place et texte du refus d'une création de point. */
export function lireRefusPoint(erreur: unknown): RefusPoint {
  const message = messageDeRefusPoint(erreur, 'creation')
  if (message === null) return { ou: 'connexion' }
  const champ = CHAMP_DU_MESSAGE.get(message)
  return champ === undefined ? { ou: 'bouton', message } : { ou: 'champ', champ, message }
}
