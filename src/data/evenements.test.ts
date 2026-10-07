import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  lireEvenementsAConfirmer,
  lireEvenementsMinistere,
  lireMentionsDesEvenements,
} from './evenements'

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

describe('lireEvenementsMinistere', () => {
  it('sans mention : les événements du ministère, 7 jours dans le passé ou à confirmer, triés', async () => {
    const faux = client({})
    await lireEvenementsMinistere('m1')
    expect(appelsDe(faux.de('evenement_mention')[0])).toEqual([
      'select("evenement_id, ministere_id")',
      'eq("ministere_id", "m1")',
    ])
    expect(appelsDe(faux.de('v_evenement')[0])).toEqual([
      'select("id, ministere_id, titre, date, statut, jours, a_confirmer, reporte_du")',
      'or("ministere_id.eq.m1")',
      'or("jours.gte.-7,a_confirmer.is.true")',
      'order("date", {"ascending":true})',
      'order("titre", {"ascending":true})',
    ])
  })

  it('avec des mentions : ajoute les événements qui mentionnent le ministère', async () => {
    const faux = client({
      evenement_mention: {
        data: [
          { evenement_id: 'e1', ministere_id: 'm1' },
          { evenement_id: 'e2', ministere_id: 'm1' },
        ],
        error: null,
      },
    })
    await lireEvenementsMinistere('m1')
    expect(appelsDe(faux.de('v_evenement')[0])).toContain('or("ministere_id.eq.m1,id.in.(e1,e2)")')
  })

  it('une erreur de la base remonte, pour les mentions comme pour les événements', async () => {
    client({ evenement_mention: ECHEC })
    await expect(lireEvenementsMinistere('m1')).rejects.toMatchObject({ code: '42501' })
    client({ v_evenement: ECHEC })
    await expect(lireEvenementsMinistere('m1')).rejects.toMatchObject({ code: '42501' })
  })
})

describe('lireMentionsDesEvenements', () => {
  it('ne fait aucune requête sans événement', async () => {
    const faux = client({})
    expect(await lireMentionsDesEvenements([])).toEqual([])
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('lit les mentions des événements donnés', async () => {
    const faux = client({})
    await lireMentionsDesEvenements(['e1', 'e2'])
    expect(appelsDe(faux.de('evenement_mention')[0])).toEqual([
      'select("evenement_id, ministere_id")',
      'in("evenement_id", ["e1","e2"])',
    ])
  })
})

describe('lireEvenementsAConfirmer', () => {
  it('lit les lignes à confirmer, par date puis titre, sans aucune date du navigateur', async () => {
    const faux = client({})
    await lireEvenementsAConfirmer()
    expect(appelsDe(faux.de('v_evenement')[0])).toEqual([
      'select("id, ministere_id, titre, date, statut, jours, a_confirmer, reporte_du")',
      'eq("a_confirmer", true)',
      'order("date", {"ascending":true})',
      'order("titre", {"ascending":true})',
    ])
  })

  it('une erreur de la base remonte', async () => {
    client({ v_evenement: ECHEC })
    await expect(lireEvenementsAConfirmer()).rejects.toMatchObject({ code: '42501' })
  })
})
