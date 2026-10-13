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
  /** Le compte a accepté la version courante des conditions (T53) ; vrai par défaut. */
  conditionsAcceptees?: boolean
  /**
   * Dernière déclaration de la session (T56, `v_ma_declaration`), lue pour un compte de
   * ministère : « Marie », déclarée il y a une minute, par défaut ; null : aucune déclaration.
   */
  declaration?: { id: number; prenom: string; age_secondes: number } | null
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
  upsert: (valeurs: unknown, options?: unknown) => FausseRequete
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
  /** Colonnes demandées (`select`) et filtres posés (`eq`, `neq`, `or`), par table lue. */
  const selections: { table: string; colonnes: string }[] = []
  const filtres: {
    table: string
    operateur: 'eq' | 'neq' | 'or'
    colonne: string
    valeur: unknown
  }[] = []

  function lignesDe(table: string): unknown[] {
    if (table === 'compte') return scenario.compte ? [scenario.compte] : []
    if (table === 'acceptation_conditions') {
      return (scenario.conditionsAcceptees ?? true) ? [{ id: 'acceptation-1' }] : []
    }
    if (table === 'v_ma_declaration') {
      const declaration =
        scenario.declaration === undefined
          ? { id: 1, prenom: 'Marie', age_secondes: 60 }
          : scenario.declaration
      return declaration ? [declaration] : []
    }
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
      select: (colonnes) => {
        selections.push({ table, colonnes: colonnes ?? '*' })
        return fausse
      },
      eq: (colonne, valeur) => {
        eq(colonne, valeur)
        filtres.push({ table, operateur: 'eq', colonne, valeur })
        return fausse
      },
      neq: (colonne, valeur) => {
        filtres.push({ table, operateur: 'neq', colonne, valeur })
        return fausse
      },
      gt: suite,
      gte: suite,
      lt: suite,
      lte: suite,
      in: suite,
      is: suite,
      not: suite,
      or: (valeurs) => {
        filtres.push({ table, operateur: 'or', colonne: '', valeur: valeurs })
        return fausse
      },
      upsert: suite,
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
    // L'acceptation des conditions est lue par la session en aal2 (T53), la déclaration et le jour
    // d'utilisation d'un compte de ministère aussi (T56) : `tables` ne note que les lectures de
    // données, que les tests comparent ; `from` garde la trace de celles-ci.
    if (!['acceptation_conditions', 'v_ma_declaration', 'passage'].includes(table)) {
      tables.push(table)
    }
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
    // Vérification de la session par le serveur, après un refus « connexion expirée » (m271).
    getUser: vi.fn<() => Promise<{ data: { user: unknown }; error: unknown }>>(() =>
      Promise.resolve({
        data: { user: utilisateur ? { id: utilisateur.id, email: utilisateur.email } : null },
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

  const rpc = vi.fn<(nom: string, args?: unknown) => Promise<Reponse>>(() =>
    Promise.resolve({ data: null, error: null }),
  )

  return { client: { from, auth, rpc }, tables, selections, filtres, auth, from, eq, rpc }
}
