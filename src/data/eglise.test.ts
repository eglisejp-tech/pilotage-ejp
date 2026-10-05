import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  lireCarteFij,
  lireEcartsDimanche,
  lireEcartsSessions,
  lireIndicateursCommuns,
  lireParticipations,
  lirePourcentageFij,
  lireSemaine,
  lireSessionsPassees,
  lireTotauxACeJour,
  lireTotauxDimanche,
} from './eglise'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

function brancher(reponses: Parameters<typeof fauxRequete>[0] = {}) {
  const faux = fauxRequete(reponses)
  courant.client = faux.client
  return faux
}

beforeEach(() => {
  courant.client = undefined
})

describe("lectures de la vue de l'église", () => {
  it('lireSemaine : une ligne de v_semaine, ou null', async () => {
    const ligne = {
      aujourdhui: '2026-09-30',
      dimanche: '2026-09-27',
      lundi: '2026-09-21',
      numero: 39,
    }
    const faux = brancher({ v_semaine: { data: ligne, error: null } })
    expect(await lireSemaine()).toEqual(ligne)
    expect(appelsDe(faux.de('v_semaine')[0])).toEqual([
      'select("aujourdhui, dimanche, lundi, numero")',
      'maybeSingle()',
    ])
    brancher({ v_semaine: { data: null, error: null } })
    expect(await lireSemaine()).toBeNull()
  })

  it('lireIndicateursCommuns : les indicateurs sans ministère', async () => {
    const faux = brancher({
      indicateur: { data: [{ id: 'i1', code: 'service', nature: 'dimanche' }], error: null },
    })
    expect(await lireIndicateursCommuns()).toHaveLength(1)
    expect(appelsDe(faux.de('indicateur')[0])).toEqual([
      'select("id, code, nature")',
      'is("ministere_id", null)',
    ])
  })

  it('lireTotauxDimanche : v_total_dimanche du plus ancien au plus récent', async () => {
    const faux = brancher()
    await lireTotauxDimanche()
    expect(appelsDe(faux.de('v_total_dimanche')[0])).toEqual([
      'select("indicateur_id, dimanche, total, nb_saisis, nb_attendus")',
      'order("dimanche", {"ascending":true})',
    ])
  })

  it('lireEcartsDimanche : filtré sur le dimanche de référence', async () => {
    const faux = brancher()
    await lireEcartsDimanche('2026-09-27')
    expect(appelsDe(faux.de('v_ecart_dimanche')[0])).toEqual([
      'select("indicateur_id, dimanche, ecart, nb_comparables")',
      'eq("dimanche", "2026-09-27")',
    ])
  })

  it('lireTotauxACeJour : la complétude vient de la vue', async () => {
    const faux = brancher()
    await lireTotauxACeJour()
    expect(appelsDe(faux.de('v_total_a_ce_jour')[0])).toEqual([
      'select("indicateur_id, code, total, nb_saisis, nb_actifs, plus_ancienne, nb_plus_de_30_jours")',
    ])
  })

  it('lirePourcentageFij : aucune ligne rend null', async () => {
    const faux = brancher({ v_pourcentage_fij: { data: null, error: null } })
    expect(await lirePourcentageFij()).toBeNull()
    expect(appelsDe(faux.de('v_pourcentage_fij')[0])).toEqual([
      'select("en_fij, actifs, nb_ministeres, pourcentage")',
      'maybeSingle()',
    ])
  })

  it('lireCarteFij : v_carte_fij par département', async () => {
    const faux = brancher()
    await lireCarteFij()
    expect(appelsDe(faux.de('v_carte_fij')[0])).toEqual([
      'select("departement, valeur, saisi_le")',
      'order("departement", {"ascending":true})',
    ])
  })

  it("lireSessionsPassees : seulement les sessions qui ont eu lieu, la plus récente d'abord", async () => {
    const faux = brancher()
    await lireSessionsPassees()
    expect(appelsDe(faux.de('v_session_completude')[0])).toEqual([
      'select("session_id, type, date, intitule, a_eu_lieu, nb_attendus, nb_saisis, total_saisi, total, manquants")',
      'eq("a_eu_lieu", true)',
      'order("date", {"ascending":false})',
    ])
  })

  it('lireEcartsSessions : v_ecart_session', async () => {
    const faux = brancher()
    await lireEcartsSessions()
    expect(appelsDe(faux.de('v_ecart_session')[0])).toEqual([
      'select("session_id, ecart, nb_comparables")',
    ])
  })

  it('lireParticipations : filtré sur les sessions données', async () => {
    const faux = brancher()
    await lireParticipations(['s-1', 's-2'])
    expect(appelsDe(faux.de('v_participation_courante')[0])).toEqual([
      'select("session_id, ministere_id, valeur, deja_comptes, compte_dans_total, saisi_le")',
      'in("session_id", ["s-1","s-2"])',
    ])
  })

  it('une erreur de la base est relancée', async () => {
    brancher({ v_carte_fij: { data: null, error: new Error('refusé') } })
    await expect(lireCarteFij()).rejects.toThrow('refusé')
    brancher({ v_semaine: { data: null, error: new Error('refusé') } })
    await expect(lireSemaine()).rejects.toThrow('refusé')
  })
})
