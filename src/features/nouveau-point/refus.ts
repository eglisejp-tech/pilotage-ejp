import { lireErreurBase } from '@/data/messagesBase'
import { messageDeRefusPoint } from '@/data/pointsEcriture'

// Lecture d'un refus de `creer_point` après un envoi, par la table de traduction de
// `src/data/messagesBase.ts` : un refus de la base (ou d'un contrôle de la couche data) se dit
// sous le champ que la table désigne, sinon sous le bouton ; un refus de droit (42501) ne dit pas
// pourquoi ; une connexion expirée, un compte désactivé ou un refus inattendu ont chacun leur
// phrase ; une création sans réponse après 10 s dit de vérifier la liste avant de réessayer
// (m259). Seule une erreur sans réponse est un problème de connexion (valeurs gardées, LISEZMOI
// « Erreur de formulaire »).

export type ChampPoint = 'titre' | 'description' | 'attendu' | 'echeance' | 'mentions'

export type RefusPoint =
  /** Sous le champ désigné, relié par `aria-describedby`. */
  | { ou: 'champ'; champ: ChampPoint; message: string }
  /** Sous le bouton d'enregistrement. */
  | { ou: 'bouton'; message: string }
  /** Erreur de formulaire de LISEZMOI (connexion), sous le bouton. */
  | { ou: 'connexion' }

const CHAMPS_POINT: ReadonlySet<string> = new Set<ChampPoint>([
  'titre',
  'description',
  'attendu',
  'echeance',
  'mentions',
])

function estChampPoint(champ: string | null): champ is ChampPoint {
  return champ !== null && CHAMPS_POINT.has(champ)
}

/** Place et texte du refus d'une création de point. */
export function lireRefusPoint(erreur: unknown): RefusPoint {
  const lue = lireErreurBase(erreur)
  if (lue.genre === 'message' && lue.nature === 'refus' && estChampPoint(lue.champ)) {
    return { ou: 'champ', champ: lue.champ, message: lue.message }
  }
  const message = messageDeRefusPoint(erreur, 'creation')
  return message === null ? { ou: 'connexion' } : { ou: 'bouton', message }
}
