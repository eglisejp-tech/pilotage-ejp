import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lireComptagesEglise, lireRetardsDuMois } from '@/data/comptages'
import { COMPTAGES_EXEMPLE } from '@/features/fiche/apercu/exemplesComptages'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

const ECHEC = { data: null, error: { message: 'refusé', code: '42501' } }

function installer(
  reponses: Parameters<typeof fauxRequete>[0] = {},
  rpc: ReponseFausse = { data: [], error: null },
) {
  const faux = fauxRequete(reponses)
  const appelRpc = vi.fn<(nom: string, args?: unknown) => Promise<ReponseFausse>>(() =>
    Promise.resolve(rpc),
  )
  courant.client = { from: faux.client.from, rpc: appelRpc }
  return { ...faux, rpc: appelRpc }
}

describe('lireComptagesEglise', () => {
  it('appelle evenements_eglise_mois() sans argument et rend ses lignes telles quelles', async () => {
    const faux = installer({}, { data: COMPTAGES_EXEMPLE, error: null })
    await expect(lireComptagesEglise()).resolves.toEqual(COMPTAGES_EXEMPLE)
    expect(faux.rpc).toHaveBeenCalledWith('evenements_eglise_mois')
  })

  it('un refus de la base (42501) remonte', async () => {
    installer({}, ECHEC)
    await expect(lireComptagesEglise()).rejects.toMatchObject({ code: '42501' })
  })
})

describe('lireRetardsDuMois', () => {
  it('les événements du mois commencés en retard, par date puis titre', async () => {
    const faux = installer({
      v_evenement: {
        data: [
          { id: 'e1', ministere_id: 'm1', titre: 'Soirée', date: '2026-09-10', retard: 12 },
          { id: 'e2', ministere_id: 'm2', titre: 'Sans heures', date: '2026-09-11', retard: null },
        ],
        error: null,
      },
    })
    await expect(lireRetardsDuMois('2026-09-01', '2026-09-30')).resolves.toEqual([
      { id: 'e1', ministere_id: 'm1', titre: 'Soirée', date: '2026-09-10', retard: 12 },
    ])
    expect(appelsDe(faux.de('v_evenement')[0])).toEqual([
      'select("id, ministere_id, titre, date, retard")',
      'eq("a_l_heure", false)',
      'gte("date", "2026-09-01")',
      'lte("date", "2026-09-30")',
      'order("date", {"ascending":true})',
      'order("titre", {"ascending":true})',
    ])
  })

  it('une erreur de la base remonte', async () => {
    installer({ v_evenement: ECHEC })
    await expect(lireRetardsDuMois('2026-09-01', '2026-09-30')).rejects.toMatchObject({
      code: '42501',
    })
  })
})
