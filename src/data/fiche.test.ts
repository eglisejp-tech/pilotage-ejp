import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  lireDernieresSaisies,
  lireLigneTableauMinistere,
  lireMesuresCommunsMinistere,
  lireMinistereFiche,
  lirePointsMinistere,
  lirePrecisionsMinistere,
  lireRepartitionsMinistere,
  lireSensiblesMinistere,
} from './fiche'

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

const ECHEC = { data: null, error: { message: 'refusé', code: '42501' } }

describe('lireMinistereFiche', () => {
  it('lit le ministère par son identifiant, null s’il est inconnu', async () => {
    const faux = client({ ministere: { data: null, error: null } })
    expect(await lireMinistereFiche('m1')).toBeNull()
    expect(appelsDe(faux.de('ministere')[0])).toEqual([
      'select("id, code, nom, description, desactive_le")',
      'eq("id", "m1")',
      'maybeSingle()',
    ])
  })

  it('une erreur de la base remonte', async () => {
    client({ ministere: ECHEC })
    await expect(lireMinistereFiche('m1')).rejects.toMatchObject({ code: '42501' })
  })
})

describe('lectures de la fiche', () => {
  it('ligne du tableau, communs, sensibles, répartitions et précisions : filtrées sur la fiche', async () => {
    const faux = client({})
    await lireLigneTableauMinistere('m1')
    await lireMesuresCommunsMinistere('m1', ['c1', 'c2'])
    await lireSensiblesMinistere('m1')
    await lireRepartitionsMinistere('m1')
    await lirePrecisionsMinistere('m1')
    expect(appelsDe(faux.de('v_tableau_ministeres')[0])).toContain('eq("ministere_id", "m1")')
    expect(appelsDe(faux.de('v_mesure_periode')[0])).toEqual(
      expect.arrayContaining(['eq("ministere_id", "m1")', 'in("indicateur_id", ["c1","c2"])']),
    )
    expect(appelsDe(faux.de('indicateur')[0])).toEqual([
      'select("id, modele_code")',
      'eq("ministere_id", "m1")',
      'eq("sensible", true)',
    ])
    expect(appelsDe(faux.de('v_ventilation_sensible')[0])).toEqual(
      expect.arrayContaining([
        'eq("ministere_id", "m1")',
        'order("periode", {"ascending":true})',
        'order("ordre", {"ascending":true})',
      ]),
    )
    expect(appelsDe(faux.de('v_precision_sensible')[0])).toEqual([
      'select("indicateur_id, ministere_id, mois, texte")',
      'eq("ministere_id", "m1")',
    ])
  })

  it('sans chiffre commun connu, aucune requête de mesures', async () => {
    const faux = client({})
    expect(await lireMesuresCommunsMinistere('m1', [])).toEqual([])
    expect(faux.de('v_mesure_periode')).toHaveLength(0)
  })
})

describe('lirePointsMinistere', () => {
  it('les points créés par le ministère ou qui le mentionnent, puis leurs mentions', async () => {
    const faux = client({
      v_point_mention: { data: [{ point_id: 'p2', ministere_id: 'm1' }], error: null },
      v_point: { data: [{ id: 'p1' }, { id: 'p2' }], error: null },
    })
    const lus = await lirePointsMinistere('m1')
    expect(lus.points).toEqual([{ id: 'p1' }, { id: 'p2' }])
    expect(appelsDe(faux.de('v_point_mention')[0])).toContain('eq("ministere_id", "m1")')
    expect(appelsDe(faux.de('v_point')[0])).toContain('or("ministere_id.eq.m1,id.in.(p2)")')
    expect(appelsDe(faux.de('v_point_mention')[1])).toContain('in("point_id", ["p1","p2"])')
  })

  it('aucun point : pas de lecture des mentions', async () => {
    const faux = client({ v_point: { data: [], error: null } })
    expect(await lirePointsMinistere('m1')).toEqual({ points: [], mentions: [] })
    expect(appelsDe(faux.de('v_point')[0])).toContain('or("ministere_id.eq.m1")')
    expect(faux.de('v_point_mention')).toHaveLength(1)
  })
})

describe('lireDernieresSaisies', () => {
  it('5 lignes écrites par un compte du ministère, sans les signalements, les plus récentes d’abord', async () => {
    const faux = client({})
    await lireDernieresSaisies('m1')
    expect(appelsDe(faux.de('v_journal')[0])).toEqual([
      'select("id, le, action, cible, cible_id, detail, cible_texte")',
      'eq("auteur_ministere_id", "m1")',
      'not("action", "in", "(difficulte_signalee,signalement_clos)")',
      'order("le", {"ascending":false})',
      'order("id", {"ascending":false})',
      'limit(5)',
    ])
  })
})
