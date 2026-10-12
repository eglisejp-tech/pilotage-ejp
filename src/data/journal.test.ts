import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import { lireComptesJournal, lireJournal, TAILLE_PAGE_JOURNAL } from './journal'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

function client(reponses: Parameters<typeof fauxRequete>[0]) {
  const faux = fauxRequete(reponses)
  courant.client = { from: faux.from }
  return faux
}

const SANS_FILTRE = {
  compte: null,
  action: null,
  ministere: null,
  depuis: null,
  apres: null,
  limite: 50,
}

function lignes(nombre: number, ajout: Record<string, unknown> = {}) {
  return Array.from({ length: nombre }, (_, rang) => ({
    id: nombre - rang,
    le: `2026-10-01T10:${String(59 - (rang % 60)).padStart(2, '0')}:00.123456+00:00`,
    cible: null,
    cible_id: null,
    ...ajout,
  }))
}

describe('lireJournal', () => {
  it('lit v_journal du plus récent au plus ancien, une ligne de plus que la limite', async () => {
    const faux = client({})
    await lireJournal(SANS_FILTRE)
    expect(TAILLE_PAGE_JOURNAL).toBe(50)
    const appels = appelsDe(faux.de('v_journal')[0])
    expect(appels[0]).toMatch(/^select\("id, le, compte, ministere_id, auteur_ministere_id, action/)
    expect(appels.slice(1)).toEqual([
      'order("le", {"ascending":false})',
      'order("id", {"ascending":false})',
      'limit(51)',
    ])
  })

  it('50 lignes rendues et une 51e : il en reste, et seules 50 sont gardées', async () => {
    client({ v_journal: { data: lignes(51), error: null } })
    const page = await lireJournal(SANS_FILTRE)
    expect(page.lignes).toHaveLength(50)
    expect(page.aPlus).toBe(true)
    expect(page.lignes[0]?.id).toBe(51)
    // La page suivante reprend après la 50e ligne.
    expect(page.suivant).toEqual({ le: page.lignes[49]?.le, id: page.lignes[49]?.id })
  })

  it('50 lignes exactement : il n’en reste pas, et pas de curseur', async () => {
    client({ v_journal: { data: lignes(50), error: null } })
    const page = await lireJournal(SANS_FILTRE)
    expect(page.lignes).toHaveLength(50)
    expect(page.aPlus).toBe(false)
    expect(page.suivant).toBeNull()
  })

  it('« Afficher 50 lignes de plus » lit les 50 suivantes après le curseur, sans relire les autres', async () => {
    const faux = client({})
    await lireJournal({
      ...SANS_FILTRE,
      apres: { le: '2026-10-01T10:10:00.123456+00:00', id: 42 },
    })
    const appels = appelsDe(faux.de('v_journal')[0])
    expect(appels).toContain(
      'or("le.lt.2026-10-01T10:10:00.123456+00:00,and(le.eq.2026-10-01T10:10:00.123456+00:00,id.lt.42)")',
    )
    expect(appels).toContain('limit(51)')
    expect(appels.some((appel) => appel.startsWith('range('))).toBe(false)
  })

  it('un ministère et un curseur ensemble : deux « ou » réunis par un « et »', async () => {
    const faux = client({})
    await lireJournal({
      ...SANS_FILTRE,
      ministere: 'm-1',
      apres: { le: '2026-10-01T10:10:00Z', id: 7 },
    })
    expect(appelsDe(faux.de('v_journal')[0])).toContain(
      'or("and(or(ministere_id.eq.m-1,auteur_ministere_id.eq.m-1),or(le.lt.2026-10-01T10:10:00Z,and(le.eq.2026-10-01T10:10:00Z,id.lt.7)))")',
    )
  })

  it('un journal de plus de 1000 lignes se lit par pages de 51 lignes au plus, jamais par 1000', async () => {
    const faux = client({ v_journal: { data: lignes(51), error: null } })
    const page = await lireJournal({
      ...SANS_FILTRE,
      apres: { le: '2026-10-01T09:00:00Z', id: 1200 },
    })
    expect(page.aPlus).toBe(true)
    expect(appelsDe(faux.de('v_journal')[0])).toContain('limit(51)')
  })

  it('refuse un curseur qui ressemblerait à un filtre PostgREST', async () => {
    client({})
    await expect(
      lireJournal({ ...SANS_FILTRE, apres: { le: '2026-10-01),or(id.gt.0', id: 1 } }),
    ).rejects.toThrow(RangeError)
    await expect(
      lireJournal({ ...SANS_FILTRE, apres: { le: '2026-10-01T10:10:00Z', id: Number.NaN } }),
    ).rejects.toThrow(RangeError)
  })

  it('applique les filtres compte, action, ministère et période', async () => {
    const faux = client({})
    await lireJournal({
      compte: 'u-1',
      action: 'point_cree',
      ministere: 'm-1',
      depuis: '2026-08-31T22:00:00.000Z',
      apres: null,
      limite: 50,
    })
    const appels = appelsDe(faux.de('v_journal')[0])
    expect(appels).toEqual(
      expect.arrayContaining([
        'eq("compte", "u-1")',
        'eq("action", "point_cree")',
        'or("ministere_id.eq.m-1,auteur_ministere_id.eq.m-1")',
        'gte("le", "2026-08-31T22:00:00.000Z")',
      ]),
    )
  })

  it('refuse un identifiant qui ressemblerait à un filtre PostgREST', async () => {
    client({})
    await expect(lireJournal({ ...SANS_FILTRE, ministere: 'x),or(y' })).rejects.toThrow(RangeError)
    await expect(lireJournal({ ...SANS_FILTRE, compte: 'a,b' })).rejects.toThrow(RangeError)
  })

  it('lit les sessions citées par les lignes, une fois chacune', async () => {
    const faux = client({
      v_journal: {
        data: [
          ...lignes(2, { cible: 'session', cible_id: 's1' }),
          { id: 9, cible: 'session', cible_id: 's2' },
          { id: 10, cible: 'point_attention', cible_id: 'p1' },
        ],
        error: null,
      },
      session: {
        data: [{ id: 's1', type: 'batir', date: '2026-09-26', intitule: null }],
        error: null,
      },
    })
    const page = await lireJournal(SANS_FILTRE)
    expect(appelsDe(faux.de('session')[0])).toEqual([
      'select("id, type, date, intitule")',
      'in("id", ["s1","s2"])',
    ])
    expect(page.sessions).toHaveLength(1)
  })

  it('sans ligne de session, aucune lecture des sessions', async () => {
    const faux = client({ v_journal: { data: lignes(3), error: null } })
    await lireJournal(SANS_FILTRE)
    expect(faux.de('session')).toHaveLength(0)
  })

  it('une erreur de la base remonte', async () => {
    client({ v_journal: { data: null, error: { message: 'refusé', code: '42501' } } })
    await expect(lireJournal(SANS_FILTRE)).rejects.toMatchObject({ code: '42501' })
  })
})

describe('lireComptesJournal', () => {
  it('lit les comptes par libellé, désactivés compris', async () => {
    const faux = client({})
    await lireComptesJournal()
    expect(appelsDe(faux.de('compte')[0])).toEqual([
      'select("user_id, libelle, desactive_le")',
      'order("libelle", {"ascending":true})',
    ])
  })
})
