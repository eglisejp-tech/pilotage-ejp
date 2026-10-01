import { vi } from 'vitest'
import type { TypeCompte } from '@/lib/base'

// Faux client Supabase pour les tests unitaires : seulement les appels que fait l'application.
// Chaque test décrit la session voulue ; aucune requête réseau.

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
  const maybeSingle = vi.fn(() => Promise.resolve({ data: scenario.compte ?? null, error: null }))
  const eq = vi.fn<(colonne: string, valeur: string) => { maybeSingle: typeof maybeSingle }>(
    () => ({ maybeSingle }),
  )
  const select = vi.fn<(colonnes: string) => { eq: typeof eq }>(() => ({ eq }))
  const from = vi.fn((table: string) => {
    tables.push(table)
    return { select }
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
