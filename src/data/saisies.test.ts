import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  enregistrerChiffresDimanche,
  enregistrerChiffresMois,
  lireIndicateursASaisir,
  lirePrecisions,
  lireRepartitions,
  lireTotauxDuMois,
} from './saisies'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

function client(
  reponses: Parameters<typeof fauxRequete>[0] = {},
  rpc: () => { data: unknown; error: unknown } = () => ({ data: 1, error: null }),
) {
  const faux = fauxRequete(reponses)
  const appelsRpc: { nom: string; args: unknown }[] = []
  courant.client = {
    from: faux.from,
    rpc: (nom: string, args: unknown) => {
      appelsRpc.push({ nom, args })
      return Promise.resolve(rpc())
    },
  }
  return { faux, appelsRpc }
}

const MINISTERE = '10000000-0000-4000-8000-000000000005'
const ID = '4c8f3e7a-1b2d-4e5f-8a9b-0c1d2e3f4a5b'

describe('lectures des saisies des chiffres', () => {
  it('indicateurs à saisir : communs et ceux du ministère, actifs ou à valider, jamais un calcul', async () => {
    const { faux } = client({ indicateur: { data: [{ id: ID }], error: null } })
    expect(await lireIndicateursASaisir(MINISTERE)).toEqual([{ id: ID }])
    const appels = appelsDe(faux.de('indicateur')[0])
    expect(appels[0]).toContain('saisi_dimanche_matin, modele_code')
    expect(appels).toContain(`or("ministere_id.is.null,ministere_id.eq.${MINISTERE}")`)
    expect(appels).toContain('in("etat", ["actif","en_attente"])')
    expect(appels).toContain('is("calcul", null)')
  })

  it('totaux du mois : lignes brutes du ministère, la plus récente d’abord (règle 2)', async () => {
    const { faux } = client()
    await lireTotauxDuMois(MINISTERE, '2026-09', [ID])
    expect(appelsDe(faux.de('mesure')[0])).toEqual([
      'select("id, indicateur_id, valeur, saisi_le")',
      `eq("ministere_id", "${MINISTERE}")`,
      'eq("date_ref", "2026-09-01")',
      `in("indicateur_id", ["${ID}"])`,
      'order("saisi_le", {"ascending":false})',
      'order("id", {"ascending":false})',
    ])
  })

  it('sans indicateur ni total, aucune requête', async () => {
    const { faux } = client()
    expect(await lireTotauxDuMois(MINISTERE, '2026-09', [])).toEqual([])
    expect(await lireRepartitions([])).toEqual([])
    expect(await lirePrecisions([])).toEqual([])
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('répartitions et précisions des totaux qui font foi', async () => {
    const { faux } = client()
    await lireRepartitions([30])
    await lirePrecisions([30])
    expect(appelsDe(faux.de('ventilation_sensible')[0])).toEqual([
      'select("mesure_id, categorie, valeur")',
      'in("mesure_id", [30])',
    ])
    expect(appelsDe(faux.de('precision_sensible')[0])).toEqual([
      'select("mesure_id, texte")',
      'in("mesure_id", [30])',
    ])
  })

  it('une lecture en échec rejette', async () => {
    client({ mesure: { data: null, error: { message: 'refus', code: '42501' } } })
    await expect(lireTotauxDuMois(MINISTERE, '2026-09', [ID])).rejects.toMatchObject({
      code: '42501',
    })
  })
})

describe('envois', () => {
  it('le dimanche : une seule instruction insert, sans saisi_le ni saisi_par', async () => {
    const { faux } = client()
    await enregistrerChiffresDimanche({
      ministereId: MINISTERE,
      dimanche: '2026-09-27',
      lignes: [
        { indicateurId: ID, valeur: 10 },
        { indicateurId: 'autre-indicateur', valeur: 14 },
      ],
    })
    const requetes = faux.de('mesure')
    expect(requetes).toHaveLength(1)
    expect(appelsDe(requetes[0])).toEqual([
      `insert([{"indicateur_id":"${ID}","ministere_id":"${MINISTERE}","date_ref":"2026-09-27","valeur":10},{"indicateur_id":"autre-indicateur","ministere_id":"${MINISTERE}","date_ref":"2026-09-27","valeur":14}])`,
    ])
  })

  it('le dimanche : un envoi qui n’est pas un dimanche ne part pas', async () => {
    const { faux } = client()
    await expect(
      enregistrerChiffresDimanche({
        ministereId: MINISTERE,
        dimanche: '2026-09-28',
        lignes: [{ indicateurId: ID, valeur: 1 }],
      }),
    ).rejects.toThrow()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('le mois : un seul appel de saisir_chiffres_mois, au 1er du mois, précision sans blancs', async () => {
    const { appelsRpc } = client()
    expect(
      await enregistrerChiffresMois({
        mois: '2026-09',
        lignes: [
          {
            indicateur_id: ID,
            valeur: 7,
            categories: { malaise: 4, blessure: 3 },
            precision: '  Une précision du mois.  ',
          },
        ],
      }),
    ).toBe(1)
    expect(appelsRpc).toEqual([
      {
        nom: 'saisir_chiffres_mois',
        args: {
          p_mois: '2026-09-01',
          p_lignes: [
            {
              indicateur_id: ID,
              valeur: 7,
              categories: { malaise: 4, blessure: 3 },
              precision: 'Une précision du mois.',
            },
          ],
        },
      },
    ])
  })

  it('le mois : une somme au-dessus du total ne part pas', async () => {
    const { appelsRpc } = client()
    await expect(
      enregistrerChiffresMois({
        mois: '2026-09',
        lignes: [{ indicateur_id: ID, valeur: 7, categories: { malaise: 9 } }],
      }),
    ).rejects.toThrow('La somme des catégories (9) dépasse le total du mois (7).')
    expect(appelsRpc).toEqual([])
  })

  it('le mois : un refus de la base remonte tel quel', async () => {
    client({}, () => ({
      data: null,
      error: { code: 'P0001', message: "N'écrivez aucun nom ni information personnelle." },
    }))
    await expect(
      enregistrerChiffresMois({
        mois: '2026-09',
        lignes: [{ indicateur_id: ID, valeur: 7, precision: 'Un texte refusé.' }],
      }),
    ).rejects.toMatchObject({ code: 'P0001' })
  })
})
