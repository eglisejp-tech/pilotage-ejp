import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accepterConditions, lireConditionsAcceptees } from '@/data/conditions'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMPTE = '20000000-0000-4000-8000-000000000001'

function installer(
  reponses: Parameters<typeof fauxRequete>[0] = {},
  rpc: ReponseFausse = { data: null, error: null },
) {
  const faux = fauxRequete(reponses)
  const appelRpc = vi.fn<(nom: string, args: unknown) => Promise<ReponseFausse>>(() =>
    Promise.resolve(rpc),
  )
  courant.client = { from: faux.client.from, rpc: appelRpc }
  return { ...faux, rpc: appelRpc }
}

beforeEach(() => {
  courant.client = undefined
})

describe('lireConditionsAcceptees', () => {
  it('lit les lignes du compte pour la version demandée, et rien d’autre', async () => {
    const faux = installer({ acceptation_conditions: { data: [{ id: 'a1' }], error: null } })
    expect(await lireConditionsAcceptees(COMPTE, '2026-10-08')).toBe(true)
    expect(appelsDe(faux.de('acceptation_conditions')[0])).toEqual([
      'select("id")',
      `eq("compte", "${COMPTE}")`,
      'eq("version", "2026-10-08")',
      'limit(1)',
    ])
  })

  it('aucune ligne pour cette version (jamais acceptée, ou une ancienne version) : faux', async () => {
    installer({ acceptation_conditions: { data: [], error: null } })
    expect(await lireConditionsAcceptees(COMPTE, '2026-10-08')).toBe(false)
  })

  it('une erreur de lecture remonte', async () => {
    installer({ acceptation_conditions: { data: null, error: new Error('refus') } })
    await expect(lireConditionsAcceptees(COMPTE, '2026-10-08')).rejects.toThrow('refus')
  })

  it('refuse une version mal formée avant tout appel', async () => {
    const faux = installer()
    await expect(lireConditionsAcceptees(COMPTE, '8 octobre')).rejects.toThrow()
    expect(faux.de('acceptation_conditions')).toHaveLength(0)
  })
})

describe('accepterConditions', () => {
  it('appelle la fonction de la base avec la version', async () => {
    const faux = installer()
    await accepterConditions('2026-10-08')
    expect(faux.rpc).toHaveBeenCalledWith('accepter_conditions', { p_version: '2026-10-08' })
  })

  it('une erreur de la base remonte', async () => {
    installer({}, { data: null, error: new Error('Double authentification requise.') })
    await expect(accepterConditions('2026-10-08')).rejects.toThrow(
      'Double authentification requise.',
    )
  })

  it('refuse une version mal formée avant tout appel', async () => {
    const faux = installer()
    await expect(accepterConditions('v1')).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})
