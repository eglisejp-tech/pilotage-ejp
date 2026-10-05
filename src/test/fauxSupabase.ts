import { vi } from 'vitest'
import type { TypeCompte } from '@/lib/base'

// Faux client Supabase pour les tests unitaires : seulement les appels que fait l'application.
// Chaque test décrit la session voulue et, au besoin, les lignes des vues ; aucune requête réseau.

export type ScenarioSession = {
  utilisateur?: { id: string; email: string } | null
  niveau?: { currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2' }
  compte?: {
    user_id: string
    type: TypeCompte
    ministere_id: string | null
    libelle: string
    desactive_le: string | null
  } | null
  facteursVerifies?: string[]
  /**
   * Lignes rendues par une vue ou une table autre que `compte` (`v_semaine`, `v_point`...).
   * Absente : aucune ligne. Les filtres et tris ne sont pas appliqués : le test donne les lignes
   * telles que la base les rendrait.
   */
  lignes?: Record<string, unknown[]>
  /** Vues ou tables dont la lecture échoue (erreur PostgREST). */
  enEchec?: string[]
}

type Reponse = { data: unknown; error: { message: string; code: string } | null }

/** Requête PostgREST : chaque filtre rend la requête ; `await` ou `maybeSingle` la lit. */
export interface FausseRequete extends PromiseLike<Reponse> {
  select: (colonnes?: string) => FausseRequete
  eq: (colonne: string, valeur: unknown) => FausseRequete
  neq: (colonne: string, valeur: unknown) => FausseRequete
  gt: (colonne: string, valeur: unknown) => FausseRequete
  gte: (colonne: string, valeur: unknown) => FausseRequete
  lt: (colonne: string, valeur: unknown) => FausseRequete
  lte: (colonne: string, valeur: unknown) => FausseRequete
  in: (colonne: string, valeurs: unknown[]) => FausseRequete
  is: (colonne: string, valeur: unknown) => FausseRequete
  not: (colonne: string, operateur: string, valeur: unknown) => FausseRequete
  or: (filtres: string) => FausseRequete
  filter: (colonne: string, operateur: string, valeur: unknown) => FausseRequete
  match: (criteres: Record<string, unknown>) => FausseRequete
  order: (colonne: string, options?: unknown) => FausseRequete
  limit: (nombre: number) => FausseRequete
  range: (debut: number, fin: number) => FausseRequete
  abortSignal: (signal: AbortSignal) => FausseRequete
  maybeSingle: () => Promise<Reponse>
  single: () => Promise<Reponse>
}

export function fauxSupabase(scenario: ScenarioSession = {}) {
  const utilisateur = scenario.utilisateur ?? null
  const niveau = scenario.niveau ?? { currentLevel: 'aal1', nextLevel: 'aal1' }
  const facteurs = (scenario.facteursVerifies ?? []).map((id) => ({
    id,
    factor_type: 'totp',
    status: 'verified',
  }))

  const tables: string[] = []
  const eq = vi.fn<(colonne: string, valeur: unknown) => void>()

  function lignesDe(table: string): unknown[] {
    if (table === 'compte') return scenario.compte ? [scenario.compte] : []
    return scenario.lignes?.[table] ?? []
  }

  function requete(table: string): FausseRequete {
    const echec = scenario.enEchec?.includes(table) ?? false
    const repondre = (data: unknown): Promise<Reponse> =>
      Promise.resolve(
        echec
          ? { data: null, error: { message: 'Lecture refusée (test).', code: 'PGRST000' } }
          : { data, error: null },
      )
    const lignes = lignesDe(table)
    const suite = () => fausse
    const fausse: FausseRequete = {
      select: suite,
      eq: (colonne, valeur) => {
        eq(colonne, valeur)
        return fausse
      },
      neq: suite,
      gt: suite,
      gte: suite,
      lt: suite,
      lte: suite,
      in: suite,
      is: suite,
      not: suite,
      or: suite,
      filter: suite,
      match: suite,
      order: suite,
      limit: suite,
      range: suite,
      abortSignal: suite,
      maybeSingle: () => repondre(lignes[0] ?? null),
      single: () => repondre(lignes[0] ?? null),
      then: (siReponse, siErreur) => repondre(lignes).then(siReponse, siErreur),
    }
    return fausse
  }

  const from = vi.fn((table: string) => {
    tables.push(table)
    return requete(table)
  })

  const auth = {
    getSession: vi.fn(() =>
      Promise.resolve({
        data: {
          session: utilisateur ? { user: { id: utilisateur.id, email: utilisateur.email } } : null,
        },
        error: null,
      }),
    ),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    mfa: {
      getAuthenticatorAssuranceLevel: vi.fn(() => Promise.resolve({ data: niveau, error: null })),
      listFactors: vi.fn(() =>
        Promise.resolve({ data: { all: facteurs, totp: facteurs, phone: [] }, error: null }),
      ),
      unenroll: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      enroll: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'facteur-nouveau',
            type: 'totp',
            totp: {
              qr_code: 'data:image/svg+xml;utf-8,<svg></svg>',
              secret: 'JBSWY3DPEHPK3PXP',
              uri: '',
            },
          },
          error: null,
        }),
      ),
      challengeAndVerify: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  }

  return { client: { from, auth }, tables, auth, from, eq }
}
