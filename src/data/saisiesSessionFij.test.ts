import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  enregistrerCarteFij,
  enregistrerStatistiquesFij,
  lireCodeMinistere,
  lireStatistiquesFij,
} from './fij'
import {
  enregistrerParticipation,
  lireMesParticipations,
  lireSession,
  lireSessionPrecedente,
  lireSessionsAttendues,
  lireSessionsRecentes,
} from './participations'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

function client(
  reponses: Parameters<typeof fauxRequete>[0] = {},
  rpc: () => { data: unknown; error: unknown } = () => ({ data: null, error: null }),
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

const CARTE = (['75', '77', '78', '91', '92', '93', '94', '95'] as const).map((departement) => ({
  departement,
  valeur: 3,
}))

const ID_SESSION = '3f1c0a54-0d3b-4c1f-9a53-0d6a7a6f2a11'

describe('participations', () => {
  it('lit une session avec sa complétude (`v_session_completude`)', async () => {
    const { faux } = client({
      v_session_completude: { data: { session_id: ID_SESSION }, error: null },
    })
    expect(await lireSession(ID_SESSION)).toEqual({ session_id: ID_SESSION })
    const appels = appelsDe(faux.de('v_session_completude')[0])
    expect(appels[0]).toContain('a_eu_lieu, nb_attendus, nb_saisis')
    expect(appels).toContain(`eq("session_id", "${ID_SESSION}")`)
    expect(appels).toContain('maybeSingle()')
  })

  it('un identifiant qui n’est pas un uuid : null, sans aucune requête (la base répondrait 400)', async () => {
    const { faux } = client()
    expect(await lireSession('inconnue')).toBeNull()
    expect(faux.de('v_session_completude')).toHaveLength(0)
  })

  it('les 8 dernières sessions passées ou du jour, à l’heure de Paris (`a_eu_lieu`)', async () => {
    const { faux } = client()
    await lireSessionsRecentes()
    expect(appelsDe(faux.de('v_session_completude')[0])).toEqual(
      expect.arrayContaining([
        'eq("a_eu_lieu", true)',
        'order("date", {"ascending":false})',
        'limit(8)',
      ]),
    )
  })

  it('session précédente du même type ; aucune requête pour un autre rassemblement', async () => {
    const { faux } = client()
    expect(await lireSessionPrecedente('autre', '2026-09-26')).toBeNull()
    expect(faux.from).not.toHaveBeenCalled()
    await lireSessionPrecedente('batir', '2026-09-26')
    expect(appelsDe(faux.de('v_session_completude')[0])).toEqual(
      expect.arrayContaining(['eq("type", "batir")', 'lt("date", "2026-09-26")', 'limit(1)']),
    )
  })

  it('saisies du ministère : rien à lire sans session, sinon `v_participation_courante`', async () => {
    const { faux } = client()
    expect(await lireMesParticipations('m1', [])).toEqual([])
    expect(faux.from).not.toHaveBeenCalled()
    await lireMesParticipations('m1', ['s1', 's2'])
    expect(appelsDe(faux.de('v_participation_courante')[0])).toEqual(
      expect.arrayContaining(['eq("ministere_id", "m1")', 'in("session_id", ["s1","s2"])']),
    )
  })

  it('sessions attendues du ministère (`session_attendu`)', async () => {
    client({ session_attendu: { data: [{ session_id: 's1' }], error: null } })
    expect(await lireSessionsAttendues('m1')).toEqual(['s1'])
  })

  it('une présence : une seule ligne de `participation`, sans `saisi_le` ni `saisi_par`', async () => {
    const { faux } = client()
    await enregistrerParticipation({
      sessionId: 's1',
      ministereId: 'm1',
      valeur: 13,
      dejaComptes: 2,
    })
    expect(appelsDe(faux.de('participation')[0])).toEqual([
      'insert({"session_id":"s1","ministere_id":"m1","valeur":13,"deja_comptes":2})',
    ])
  })

  it('refuse sans appel une présence que le schéma refuse', async () => {
    const { faux } = client()
    await expect(
      enregistrerParticipation({ sessionId: 's1', ministereId: 'm1', valeur: 2, dejaComptes: 3 }),
    ).rejects.toThrow()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('rend l’erreur de la base (session future, autre ministère)', async () => {
    const erreur = { code: '42501', message: 'new row violates row-level security policy' }
    client({ participation: { data: null, error: erreur } })
    await expect(
      enregistrerParticipation({ sessionId: 's1', ministereId: 'm1', valeur: 1, dejaComptes: 0 }),
    ).rejects.toBe(erreur)
  })
})

describe('fij', () => {
  it('lit le code du ministère du compte', async () => {
    const { faux } = client({ ministere: { data: { code: 'fij' }, error: null } })
    expect(await lireCodeMinistere('m-fij')).toBe('fij')
    expect(appelsDe(faux.de('ministere')[0])).toEqual([
      'select("code")',
      'eq("id", "m-fij")',
      'maybeSingle()',
    ])
  })

  it('lit `v_fij_statistique` du plus ancien dimanche au plus récent', async () => {
    const { faux } = client()
    await lireStatistiquesFij()
    const appels = appelsDe(faux.de('v_fij_statistique')[0])
    expect(appels[0]).toContain('total, nb_departements, departements')
    expect(appels).toContain('order("dimanche", {"ascending":true})')
  })

  it('la carte : les 8 départements en une seule instruction insert', async () => {
    const { faux } = client()
    await enregistrerCarteFij('m-fij', CARTE)
    const appels = appelsDe(faux.de('fij_departement')[0])
    expect(appels).toHaveLength(1)
    expect(appels[0]).toMatch(/^insert\(\[/)
    expect(appels[0]).toContain('{"ministere_id":"m-fij","departement":"75","valeur":3}')
    expect(appels[0]).not.toContain('saisi_')
  })

  it('refuse sans appel une carte incomplète', async () => {
    const { faux } = client()
    await expect(enregistrerCarteFij('m-fij', CARTE.slice(1))).rejects.toThrow()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('les chiffres d’une semaine : un seul appel de `saisir_fij_statistiques`', async () => {
    const { appelsRpc } = client()
    const valeurs = [{ rubrique: 'culte_ejp' as const, departement: '75' as const, valeur: 12 }]
    await enregistrerStatistiquesFij({ dimanche: '2026-09-27', valeurs })
    expect(appelsRpc).toEqual([
      { nom: 'saisir_fij_statistiques', args: { p_dimanche: '2026-09-27', p_valeurs: valeurs } },
    ])
  })

  it('rend le refus de la base (EJP Tech, autre ministère)', async () => {
    const erreur = {
      code: '42501',
      message: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    }
    client({}, () => ({ data: null, error: erreur }))
    await expect(
      enregistrerStatistiquesFij({
        dimanche: '2026-09-27',
        valeurs: [{ rubrique: 'culte_ejp', departement: '75', valeur: 1 }],
      }),
    ).rejects.toBe(erreur)
  })
})
