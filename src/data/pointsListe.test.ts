import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import { lirePointsListe } from './pointsListe'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

describe('lirePointsListe', () => {
  it('lit tous les points, sans filtre de statut, puis leurs mentions et les auteurs des traitements', async () => {
    const faux = fauxRequete({
      v_point: {
        data: [
          { id: 'p1', traite_par: null },
          { id: 'p2', traite_par: 'c1' },
          { id: 'p3', traite_par: 'c1' },
          { id: 'p4', traite_par: 'c2' },
        ],
        error: null,
      },
      v_point_mention: { data: [{ point_id: 'p1', ministere_id: 'com' }], error: null },
      compte: {
        data: [
          { user_id: 'c1', ministere_id: null, libelle: 'Berger' },
          { user_id: 'c2', ministere_id: 'coo', libelle: 'Ministère Coordination' },
        ],
        error: null,
      },
    })
    courant.client = faux.client
    const resultat = await lirePointsListe()
    expect(resultat.points).toHaveLength(4)
    expect(resultat.mentions).toEqual([{ point_id: 'p1', ministere_id: 'com' }])
    expect(resultat.auteurs).toHaveLength(2)

    const points = appelsDe(faux.de('v_point')[0])
    expect(points).toHaveLength(1)
    expect(points[0]).toContain('select("id, ministere_id, titre, description, action_attendue')
    // Un seul compte par auteur, jamais la liste de tous les comptes.
    expect(appelsDe(faux.de('compte')[0])).toEqual([
      'select("user_id, ministere_id, libelle")',
      'in("user_id", ["c1","c2"])',
    ])
  })

  it('aucun point : ni mentions ni comptes à lire', async () => {
    const faux = fauxRequete({ v_point: { data: [], error: null } })
    courant.client = faux.client
    expect(await lirePointsListe()).toEqual({ points: [], mentions: [], auteurs: [] })
    expect(faux.de('v_point_mention')).toHaveLength(0)
    expect(faux.de('compte')).toHaveLength(0)
  })

  it('aucun point traité : les comptes ne sont pas lus', async () => {
    const faux = fauxRequete({
      v_point: { data: [{ id: 'p1', traite_par: null }], error: null },
    })
    courant.client = faux.client
    const resultat = await lirePointsListe()
    expect(resultat.auteurs).toEqual([])
    expect(faux.de('compte')).toHaveLength(0)
  })

  it('une erreur de la base est relancée, quelle que soit la lecture', async () => {
    courant.client = fauxRequete({ v_point: { data: null, error: new Error('refusé') } }).client
    await expect(lirePointsListe()).rejects.toThrow('refusé')

    const points = { data: [{ id: 'p1', traite_par: 'c1' }], error: null }
    courant.client = fauxRequete({
      v_point: points,
      v_point_mention: { data: null, error: new Error('mentions refusées') },
    }).client
    await expect(lirePointsListe()).rejects.toThrow('mentions refusées')

    courant.client = fauxRequete({
      v_point: points,
      compte: { data: null, error: new Error('comptes refusés') },
    }).client
    await expect(lirePointsListe()).rejects.toThrow('comptes refusés')
  })
})
