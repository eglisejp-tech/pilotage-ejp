import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import { lireMinisteres, lireTableauMinisteres } from './ministeres'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

describe('lectures des ministères', () => {
  it('lireTableauMinisteres : v_tableau_ministeres, colonnes du tableau', async () => {
    const faux = fauxRequete({
      v_tableau_ministeres: { data: [{ ministere_id: 'soc', nom: 'Social' }], error: null },
    })
    courant.client = faux.client
    expect(await lireTableauMinisteres()).toEqual([{ ministere_id: 'soc', nom: 'Social' }])
    expect(appelsDe(faux.de('v_tableau_ministeres')[0])).toEqual([
      'select("ministere_id, nom, description, derniere_saisie, prochain_evenement_date, prochain_evenement_titre, prochaine_reunion_date, prochaine_reunion_heure, point_ouvert_priorite")',
    ])
  })

  it('lireMinisteres : tous les ministères, désactivés compris (aucun filtre)', async () => {
    const faux = fauxRequete({ ministere: { data: [], error: null } })
    courant.client = faux.client
    await lireMinisteres()
    expect(appelsDe(faux.de('ministere')[0])).toEqual(['select("id, code, nom, desactive_le")'])
  })

  it('une erreur de la base est relancée', async () => {
    courant.client = fauxRequete({
      v_tableau_ministeres: { data: null, error: new Error('refusé') },
      ministere: { data: null, error: new Error('refusé') },
    }).client
    await expect(lireTableauMinisteres()).rejects.toThrow('refusé')
    await expect(lireMinisteres()).rejects.toThrow('refusé')
  })
})
