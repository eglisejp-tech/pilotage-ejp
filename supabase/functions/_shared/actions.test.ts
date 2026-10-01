// @vitest-environment node
// Tests unitaires (npm test) de l'ordre des étapes de reinitialiser-2fa et desactiver-compte, et
// de leurs chemins d'échec, avec un faux client de la clé secrète qui note chaque appel.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { desactiverCompte } from '../desactiver-compte/index.ts'
import { reinitialiserDoubleAuthentification } from '../reinitialiser-2fa/index.ts'

const CIBLE = '7f1c2a54-3b6e-4d1a-9f0e-2c8b5a6d4e31'

// echecs : étape qui échoue, avec le message que rend la base pour un appel rpc.
function clientFactice(
  echecs: Record<string, string> = {},
  compteApres: { desactive_le: string | null } | null = { desactive_le: null },
) {
  const appels: string[] = []
  const erreurAuth = (etape: string) =>
    etape in echecs ? { code: 'unexpected_failure', status: 500 } : null
  const client = {
    rpc: async (nom: string) => {
      const etape = `rpc:${nom}`
      appels.push(etape)
      const message = echecs[etape]
      return { data: null, error: message ? { code: 'P0001', message } : null }
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            appels.push('lecture_compte')
            return { data: compteApres, error: null }
          },
        }),
      }),
    }),
    auth: {
      admin: {
        updateUserById: async (_id: string, attributs: Record<string, unknown>) => {
          const etape =
            'password' in attributs ? 'mot_de_passe' : `ban:${String(attributs['ban_duration'])}`
          appels.push(etape)
          return { data: { user: null }, error: erreurAuth(etape) }
        },
        mfa: {
          listFactors: async () => {
            appels.push('liste_facteurs')
            return 'liste_facteurs' in echecs
              ? { data: null, error: { code: 'unexpected_failure' } }
              : { data: { factors: [{ id: 'f1' }, { id: 'f2' }] }, error: null }
          },
          deleteFactor: async ({ id }: { id: string }) => {
            const etape = `suppression_facteur:${id}`
            appels.push(etape)
            return { data: { id }, error: erreurAuth(etape) }
          },
        },
      },
    },
  } as unknown as SupabaseClient
  return { appelant: { id: 'appelant', admin: client }, appels }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('reinitialiser-2fa', () => {
  const demande = { user_id: CIBLE }

  it('mot de passe, sessions, facteurs, puis sessions et journal, dans cet ordre', async () => {
    const { appelant, appels } = clientFactice()
    await reinitialiserDoubleAuthentification(demande, appelant)
    expect(appels).toEqual([
      'rpc:serveur_controler_cible',
      'mot_de_passe',
      'rpc:serveur_revoquer_sessions',
      'liste_facteurs',
      'suppression_facteur:f1',
      'suppression_facteur:f2',
      'rpc:serveur_reinitialiser_2fa',
    ])
  })

  it('un refus de la base arrête tout avant Auth', async () => {
    const { appelant, appels } = clientFactice({ 'rpc:serveur_controler_cible': 'propre_compte' })
    await expect(reinitialiserDoubleAuthentification(demande, appelant)).rejects.toMatchObject({
      statut: 403,
      code: 'propre_compte',
    })
    expect(appels).toEqual(['rpc:serveur_controler_cible'])
  })

  it('échec du mot de passe : ni sessions ni facteurs touchés', async () => {
    const { appelant, appels } = clientFactice({ mot_de_passe: '' })
    await expect(reinitialiserDoubleAuthentification(demande, appelant)).rejects.toMatchObject({
      statut: 500,
      code: 'erreur_interne',
    })
    expect(appels).toEqual(['rpc:serveur_controler_cible', 'mot_de_passe'])
  })

  it('échec de la suppression des sessions : les facteurs restent', async () => {
    const { appelant, appels } = clientFactice({ 'rpc:serveur_revoquer_sessions': 'interne' })
    await expect(reinitialiserDoubleAuthentification(demande, appelant)).rejects.toMatchObject({
      statut: 500,
    })
    expect(appels).not.toContain('liste_facteurs')
    expect(appels.some((appel) => appel.startsWith('suppression_facteur'))).toBe(false)
  })

  it('échec sur un facteur : sessions déjà supprimées, pas de journal', async () => {
    const { appelant, appels } = clientFactice({ 'suppression_facteur:f1': '' })
    await expect(reinitialiserDoubleAuthentification(demande, appelant)).rejects.toMatchObject({
      statut: 500,
    })
    expect(appels.indexOf('rpc:serveur_revoquer_sessions')).toBeLessThan(
      appels.indexOf('suppression_facteur:f1'),
    )
    expect(appels).not.toContain('suppression_facteur:f2')
    expect(appels).not.toContain('rpc:serveur_reinitialiser_2fa')
  })

  it('échec de la liste des facteurs : pas de journal', async () => {
    const { appelant, appels } = clientFactice({ liste_facteurs: '' })
    await expect(reinitialiserDoubleAuthentification(demande, appelant)).rejects.toMatchObject({
      statut: 500,
    })
    expect(appels).toContain('rpc:serveur_revoquer_sessions')
    expect(appels).not.toContain('rpc:serveur_reinitialiser_2fa')
  })
})

describe('desactiver-compte', () => {
  const demande = { user_id: CIBLE }

  it('bannissement puis désactivation en base', async () => {
    const { appelant, appels } = clientFactice()
    await desactiverCompte(demande, appelant)
    expect(appels).toEqual([
      'rpc:serveur_controler_cible',
      'ban:876000h',
      'rpc:serveur_desactiver_compte',
    ])
  })

  it('échec du bannissement : la base n’est pas touchée', async () => {
    const { appelant, appels } = clientFactice({ 'ban:876000h': '' })
    await expect(desactiverCompte(demande, appelant)).rejects.toMatchObject({ statut: 500 })
    expect(appels).toEqual(['rpc:serveur_controler_cible', 'ban:876000h'])
  })

  it('refus de la base, compte resté actif : le bannissement est levé', async () => {
    const { appelant, appels } = clientFactice({ 'rpc:serveur_desactiver_compte': 'interne' })
    await expect(desactiverCompte(demande, appelant)).rejects.toMatchObject({ statut: 500 })
    expect(appels.slice(-2)).toEqual(['lecture_compte', 'ban:none'])
  })

  it('refus de la base, compte déjà désactivé : le bannissement reste', async () => {
    const { appelant, appels } = clientFactice(
      { 'rpc:serveur_desactiver_compte': 'compte_desactive' },
      { desactive_le: '2026-10-01T08:00:00Z' },
    )
    await expect(desactiverCompte(demande, appelant)).rejects.toMatchObject({
      statut: 409,
      code: 'compte_desactive',
    })
    expect(appels).not.toContain('ban:none')
  })
})
