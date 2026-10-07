import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReponseFausse } from '@/test/fauxRequete'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  creerIndicateursPrevus,
  LIMITE_CHANGEMENTS,
  lireChangementsConfiguration,
  lireCreationsPrevus,
  lireIndicateursPropres,
  lireUsageConfiguration,
  TAILLE_PAGE,
} from './indicateursConfiguration'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const MINISTERE = '10000000-0000-4000-8000-000000000002'

beforeEach(() => {
  courant.client = undefined
})

/** `n` lignes d'indicateur, numérotées à partir de `depuis`. */
function lignes(n: number, depuis = 0) {
  return Array.from({ length: n }, (_, rang) => ({ id: `i${depuis + rang}` }))
}

/** Faux client dont chaque lecture d'une table rend la réponse suivante de la liste. */
function installer(reponsesParTable: Record<string, ReponseFausse[]>) {
  const suites = Object.fromEntries(
    Object.entries(reponsesParTable).map(([table, reponses]) => [table, [...reponses]]),
  )
  const faux = fauxRequete(
    Object.fromEntries(
      Object.keys(suites).map((table) => [
        table,
        () => suites[table]!.shift() ?? { data: [], error: null },
      ]),
    ),
  )
  const appelsRpc: { nom: string; args: unknown }[] = []
  courant.client = {
    from: faux.from,
    rpc: (nom: string, args: unknown) => {
      appelsRpc.push({ nom, args })
      return Promise.resolve({ data: 6, error: null })
    },
  }
  return { faux, appelsRpc }
}

describe('lecture page par page', () => {
  it('une seule page : ordre stable et bornes de la première page', async () => {
    const { faux } = installer({ indicateur: [{ data: lignes(40), error: null }] })
    expect(await lireIndicateursPropres()).toHaveLength(40)
    const appels = appelsDe(faux.de('indicateur')[0])
    expect(appels).toContain('order("id")')
    expect(appels).toContain(`range(0, ${TAILLE_PAGE - 1})`)
    expect(faux.de('indicateur')).toHaveLength(1)
  })

  it('au-delà d’une page : lit la suivante jusqu’à la page incomplète, sans rien perdre', async () => {
    const { faux } = installer({
      indicateur: [
        { data: lignes(TAILLE_PAGE), error: null },
        { data: lignes(TAILLE_PAGE, TAILLE_PAGE), error: null },
        { data: lignes(120, 2 * TAILLE_PAGE), error: null },
      ],
    })
    const toutes = await lireIndicateursPropres()
    expect(toutes).toHaveLength(2 * TAILLE_PAGE + 120)
    expect(new Set(toutes.map((ligne) => ligne.id)).size).toBe(toutes.length)
    expect(appelsDe(faux.de('indicateur')[1])).toContain(
      `range(${TAILLE_PAGE}, ${2 * TAILLE_PAGE - 1})`,
    )
    expect(appelsDe(faux.de('indicateur')[2])).toContain(
      `range(${2 * TAILLE_PAGE}, ${3 * TAILLE_PAGE - 1})`,
    )
  })

  it('une page pleine suivie d’une page vide : fin de lecture', async () => {
    const { faux } = installer({
      v_usage_indicateurs: [
        { data: lignes(TAILLE_PAGE), error: null },
        { data: [], error: null },
      ],
    })
    expect(await lireUsageConfiguration()).toHaveLength(TAILLE_PAGE)
    expect(faux.de('v_usage_indicateurs')).toHaveLength(2)
    expect(appelsDe(faux.de('v_usage_indicateurs')[0])).toContain('order("indicateur_id")')
  })

  it('les créations de prévus se lisent aussi page par page, dans l’ordre du journal', async () => {
    const ligne = (rang: number) => ({
      ministere_id: MINISTERE,
      le: '2026-10-05T10:00:00+00:00',
      action: 'indicateurs_prevus_crees',
      detail: { rang },
    })
    const { faux } = installer({
      v_journal: [
        { data: Array.from({ length: TAILLE_PAGE }, (_, rang) => ligne(rang)), error: null },
        { data: [ligne(TAILLE_PAGE), { ...ligne(0), ministere_id: null }], error: null },
      ],
    })
    expect(await lireCreationsPrevus()).toHaveLength(TAILLE_PAGE + 1)
    expect(appelsDe(faux.de('v_journal')[0])).toContain('order("id")')
  })

  it('une erreur de lecture, même sur une page suivante, arrête tout', async () => {
    installer({
      indicateur: [
        { data: lignes(TAILLE_PAGE), error: null },
        { data: null, error: { code: 'PGRST000', message: 'Lecture refusée.' } },
      ],
    })
    await expect(lireIndicateursPropres()).rejects.toMatchObject({ code: 'PGRST000' })
  })
})

describe('lireChangementsConfiguration', () => {
  it('lit les plus récents gestes, dans la limite connue de l’écran', async () => {
    const { faux } = installer({ v_journal: [{ data: [], error: null }] })
    await lireChangementsConfiguration()
    const appels = appelsDe(faux.de('v_journal')[0])
    expect(appels).toContain('order("le", {"ascending":false})')
    expect(appels).toContain(`limit(${LIMITE_CHANGEMENTS})`)
  })
})

describe('creerIndicateursPrevus', () => {
  it('appelle creer_indicateurs_prevus avec le ministère et le modèle, et rend le nombre créé', async () => {
    const { appelsRpc } = installer({})
    expect(await creerIndicateursPrevus(MINISTERE, 'coordo fij')).toBe(6)
    expect(appelsRpc).toEqual([
      {
        nom: 'creer_indicateurs_prevus',
        args: { p_ministere_id: MINISTERE, p_modele: 'coordo fij' },
      },
    ])
  })

  it('« aucun » est un modèle valide', async () => {
    const { appelsRpc } = installer({})
    await creerIndicateursPrevus(MINISTERE, 'aucun')
    expect(appelsRpc[0]?.args).toEqual({ p_ministere_id: MINISTERE, p_modele: 'aucun' })
  })

  it('un identifiant mal formé ou un modèle vide : refusé avant tout appel à la base', async () => {
    const { appelsRpc } = installer({})
    await expect(creerIndicateursPrevus('pas-un-identifiant', 'kumi')).rejects.toThrow()
    await expect(creerIndicateursPrevus(MINISTERE, '   ')).rejects.toThrow()
    await expect(creerIndicateursPrevus(MINISTERE, '')).rejects.toThrow()
    expect(appelsRpc).toEqual([])
  })
})
