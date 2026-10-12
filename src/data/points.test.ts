import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import { lirePointsOuverts } from './points'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

describe('lirePointsOuverts', () => {
  it('lit les points non traités puis leurs mentions', async () => {
    const faux = fauxRequete({
      v_point: { data: [{ id: 'p1' }, { id: 'p2' }], error: null },
      v_point_mention: { data: [{ point_id: 'p1', ministere_id: 'com' }], error: null },
    })
    courant.client = faux.client
    const resultat = await lirePointsOuverts()
    expect(resultat.points).toHaveLength(2)
    expect(resultat.mentions).toEqual([{ point_id: 'p1', ministere_id: 'com' }])
    const points = appelsDe(faux.de('v_point')[0])
    expect(points[0]).toContain('select("id, ministere_id, titre, description, action_attendue')
    expect(points[1]).toBe('neq("statut", "traite")')
    expect(appelsDe(faux.de('v_point_mention')[0])).toEqual([
      'select("point_id, ministere_id")',
      'in("point_id", ["p1","p2"])',
    ])
  })

  it('aucun point ouvert : pas de lecture des mentions', async () => {
    const faux = fauxRequete({ v_point: { data: [], error: null } })
    courant.client = faux.client
    expect(await lirePointsOuverts()).toEqual({ points: [], mentions: [] })
    expect(faux.de('v_point_mention')).toHaveLength(0)
  })

  it('une erreur de la base est relancée', async () => {
    courant.client = fauxRequete({ v_point: { data: null, error: new Error('refusé') } }).client
    await expect(lirePointsOuverts()).rejects.toThrow('refusé')
    courant.client = fauxRequete({
      v_point: { data: [{ id: 'p1' }], error: null },
      v_point_mention: { data: null, error: new Error('mentions refusées') },
    }).client
    await expect(lirePointsOuverts()).rejects.toThrow('mentions refusées')
  })
})
