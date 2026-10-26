import { lireEchecPoint } from '@/data/pointsEcriture'

// Lecture d'un échec de `creer_point`, par le classement unique (`src/data/echecEnvoi.ts`, T76) :
// un refus de la base (ou d'un contrôle de la couche data) se dit sous le champ que la table
// désigne, sinon sous le bouton ; un refus de droit (42501) ne dit pas pourquoi ; une connexion
// expirée, un compte désactivé ou un refus inattendu ont chacun leur phrase ; une création dont
// l'issue est inconnue (aucune réponse, réponse perdue, délai) dit de vérifier la liste avant de
// réessayer (m259). Un échec technique porte sa référence.

export type ChampPoint = 'titre' | 'description' | 'attendu' | 'echeance' | 'mentions'

export type RefusPoint =
  /** Sous le champ désigné, relié par `aria-describedby`. */
  | { ou: 'champ'; champ: ChampPoint; message: string }
  /** Sous le bouton, tel quel, avec la référence d'un échec technique. */
  | { ou: 'bouton'; message: string; reference: string | null }

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

/** Place et texte d'un échec de création d'un point. */
export function lireRefusPoint(erreur: unknown): RefusPoint {
  const lu = lireEchecPoint(erreur, 'creation')
  if (lu.nature === 'refus' && estChampPoint(lu.champ)) {
    return { ou: 'champ', champ: lu.champ, message: lu.message }
  }
  return { ou: 'bouton', message: lu.message, reference: lu.reference }
}
