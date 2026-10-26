import type { LigneRaisonSuppression } from '@/lib/base'

// T75 : « Supprimer » partout, avec la raison d'un refus. La base calcule les raisons
// (public.raisons_suppression_ministere) avec des codes stables ; l'écran les lit avec la liste,
// les relit après un refus de la suppression, et les traduit (textes.ts, texteRaison).

/**
 * Codes connus, dans l'ordre où la base les rend. `autre_donnee` n'est jamais rendu par la base :
 * il remplace un code que l'écran ne connaît pas encore, ou dit qu'une suppression a été refusée
 * sans raison connue (une clé étrangère imprévue).
 */
export const CODES_RAISONS = [
  'ministere_de_reference',
  'compte_deja_active',
  'chiffres',
  'presences',
  'carte_fij',
  'statistiques_fij',
  'repartitions',
  'precisions',
  'points',
  'mentions_points',
  'evenements',
  'mentions_evenements',
  'reunions',
  'signalements',
  'demandes',
  'validations',
  'retraits',
  'autre_donnee',
] as const

export type CodeRaison = (typeof CODES_RAISONS)[number]

/** Une raison qui empêche la suppression, avec son nombre (« 12 chiffres saisis »). */
export interface RaisonSuppression {
  code: CodeRaison
  nombre: number
}

/** Ce que l'écran sait d'une suppression : ses raisons (vide : il se supprime) et ses sessions. */
export interface SuppressionMinistere {
  raisons: readonly RaisonSuppression[]
  /** Sessions qui l'attendent : il sort de leur liste de ministères attendus. */
  sessions: number
}

/** Le code des sessions à quitter : une information, jamais une raison. */
const SESSIONS_ATTENDUES = 'sessions_attendues'

function estCodeConnu(code: string): code is CodeRaison {
  return (CODES_RAISONS as readonly string[]).includes(code)
}

/** Les lignes de la base pour un ministère, dans leur ordre. */
export function suppressionDe(
  lignes: readonly Pick<LigneRaisonSuppression, 'code' | 'nombre' | 'bloque'>[],
): SuppressionMinistere {
  const raisons: RaisonSuppression[] = []
  let sessions = 0
  for (const ligne of lignes) {
    if (!ligne.bloque) {
      if (ligne.code === SESSIONS_ATTENDUES) sessions = ligne.nombre
      continue
    }
    raisons.push({
      code: estCodeConnu(ligne.code) ? ligne.code : 'autre_donnee',
      nombre: ligne.nombre,
    })
  }
  return { raisons, sessions }
}

/** Les lignes de la base pour tous les ministères, rangées par ministère. */
export function suppressionsParMinistere(
  lignes: readonly LigneRaisonSuppression[],
): ReadonlyMap<string, SuppressionMinistere> {
  const parMinistere = new Map<string, LigneRaisonSuppression[]>()
  for (const ligne of lignes) {
    const deCeMinistere = parMinistere.get(ligne.ministere_id) ?? []
    deCeMinistere.push(ligne)
    parMinistere.set(ligne.ministere_id, deCeMinistere)
  }
  return new Map([...parMinistere].map(([id, deCeMinistere]) => [id, suppressionDe(deCeMinistere)]))
}

/** Un ministère sans raison ni session : il se supprime. */
export const SUPPRESSION_LIBRE: SuppressionMinistere = { raisons: [], sessions: 0 }

/** Refusé à la suppression sans raison connue (une donnée que la liste ne nomme pas). */
export const RAISON_INCONNUE: RaisonSuppression = { code: 'autre_donnee', nombre: 1 }
