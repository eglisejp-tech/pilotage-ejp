import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { classer } from '@/data/echecEnvoi'
import { envoyer, numeroDepuisOctets, surEchecEnvoi, tirerNumero } from '@/data/envoi'
import type { EchecVu } from '@/data/envoi'
import { supabase } from '@/lib/supabase'

// Garde-fou du classement unique (T76) : toute écriture de `src/data/` passe par `envoyer`, avec
// la cible de sa requête. Sinon son échec ne serait classé que d'après son message (un 200 au corps
// perdu passerait pour une coupure), et sa référence ne partirait pas dans X-Client-Info.

const SOURCES = import.meta.glob<string>(['./*.ts', '!./*.test.ts', '!./envoi.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Fonctions de la base qui lisent seulement : elles ne passent pas par `envoyer`. */
const LECTURES = new Set([
  'conditions_acceptees',
  'evenements_eglise_mois',
  'incidents_recents',
  'limites_indicateurs',
  'verifier_libelle',
  // L'envoi des incidents (T76, lot C) écrit sans `envoyer` : pas de référence, et jamais
  // d'incident sur lui-même (conception erreurs-envoi, 6.3).
  'noter_incidents',
])

/** Les écritures d'un fichier : `rpc/<nom>`, `table/<nom>` et `functions/...`, dans l'ordre. */
function ecritures(source: string): string[] {
  const trouvees: string[] = []
  for (const appel of source.matchAll(
    /\.rpc\('([a-z_]+)'|\.from\('([a-z_]+)'\)\s*\.(?:insert|upsert)\(|\.functions\.invoke\(/g,
  )) {
    if (appel[1] && LECTURES.has(appel[1])) continue
    trouvees.push(appel[1] ? `rpc/${appel[1]}` : appel[2] ? `table/${appel[2]}` : 'functions')
  }
  return trouvees
}

/** Les cibles annoncées à `envoyer`, dans l'ordre. */
function envois(source: string): string[] {
  return Array.from(
    source.matchAll(/envoyer\(\s*['`]((?:rpc|table|functions)\/[^'`$]*)/g),
    (envoi) => (envoi[1]?.startsWith('functions/') ? 'functions' : (envoi[1] ?? '')),
  )
}

describe('toute écriture passe par envoyer (T76)', () => {
  it('lit bien les fichiers de src/data/', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20)
    expect(Object.values(SOURCES).flatMap(ecritures)).toContain('rpc/ajouter_evenement')
  })

  it.each(Object.entries(SOURCES))('%s', (_fichier, source) => {
    expect(envois(source)).toEqual(ecritures(source))
  })
})

// Nouvel essai automatique des créations à numéro (T76, lot B ; Proposé, Q1), avec le vrai client
// Supabase et un fetch simulé. Le cas réel d'abord : Coordination ajoute un événement, la base
// enregistre, la réponse se perd (Safari, « Load failed ») ; l'outil renvoie seul, une fois, le
// même envoi : la base reconnaît le numéro et rend le même événement.
describe('nouvel essai automatique (Q1)', () => {
  const EVENEMENT = '20000000-0000-4000-8000-000000000001'
  const AJOUT = {
    p_titre: 'Réunion des responsables',
    p_date: '2026-10-26',
    p_statut: 'attente_validation' as const,
    p_mentions: Array.from(
      { length: 8 },
      (_, rang) => `10000000-0000-4000-8000-00000000010${rang}`,
    ),
    p_heure_prevue: null,
    p_cle: 'a1000000-0000-4000-8000-000000000001',
  }
  type Fetch = (entree: RequestInfo | URL, init?: RequestInit) => Promise<Response>

  const reussite = () =>
    Promise.resolve(
      new Response(JSON.stringify(EVENEMENT), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  const corpsQuiSePerd = (statut: number) =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start(controleur) {
            controleur.error(new TypeError('Load failed'))
          },
        }),
        { status: statut, headers: { 'Content-Type': 'application/json' } },
      ),
    )
  const ajouter = (nouvelEssai = true) =>
    envoyer('rpc/ajouter_evenement', () => supabase().rpc('ajouter_evenement', AJOUT), {
      nouvelEssai,
    })
  const reference = (appel: Parameters<Fetch> | undefined) =>
    /ref=([2-9A-HJKMNP-Z]{6})/.exec(
      new Headers(appel?.[1]?.headers).get('X-Client-Info') ?? '',
    )?.[1]
  const corps = (appel: Parameters<Fetch> | undefined) =>
    JSON.parse(typeof appel?.[1]?.body === 'string' ? appel[1].body : '{}') as { p_cle?: string }

  let echecs: EchecVu[] = []
  let desabonner = () => {}

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    echecs = []
    desabonner = surEchecEnvoi((echec) => echecs.push(echec))
  })

  afterEach(() => {
    desabonner()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('« Load failed » puis la base rend l’événement : un seul toucher, même numéro, autre référence', async () => {
    const appels = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockImplementationOnce(reussite)
    vi.stubGlobal('fetch', appels)
    const { data, error } = await ajouter()
    expect(error).toBeNull()
    expect(data).toBe(EVENEMENT)
    expect(appels).toHaveBeenCalledTimes(2)
    const [premier, second] = appels.mock.calls
    expect(corps(premier).p_cle).toBe(AJOUT.p_cle)
    expect(corps(second).p_cle).toBe(AJOUT.p_cle)
    expect(reference(premier)).toBeDefined()
    expect(reference(second)).toBeDefined()
    expect(reference(second)).not.toBe(reference(premier))
    // L'échec du premier essai est vu, rattrapé (lot C : incident « rattrapé »).
    expect(echecs).toHaveLength(1)
    expect(echecs[0]?.rattrape).toBe(true)
    expect(echecs[0]?.suivi.reference).toBe(reference(premier))
  })

  it('corps perdu après un 503 : un nouvel essai', async () => {
    const appels = vi
      .fn<Fetch>()
      .mockImplementationOnce(() => corpsQuiSePerd(503))
      .mockImplementationOnce(reussite)
    vi.stubGlobal('fetch', appels)
    const { error } = await ajouter()
    expect(error).toBeNull()
    expect(appels).toHaveBeenCalledTimes(2)
  })

  it('les deux essais échouent : l’erreur du second, issue inconnue ; deux échecs vus', async () => {
    const appels = vi.fn<Fetch>(() => Promise.reject(new TypeError('Load failed')))
    vi.stubGlobal('fetch', appels)
    const { error } = await ajouter()
    expect(appels).toHaveBeenCalledTimes(2)
    expect(classer(error)).toMatchObject({ genre: 'sans_reponse', issue: 'inconnue' })
    expect(classer(error).reference).toBe(reference(appels.mock.calls[1]))
    expect(echecs.map((echec) => echec.rattrape)).toEqual([false, false])
  })

  it('jamais après un 2xx au corps perdu : la base a enregistré', async () => {
    const appels = vi.fn<Fetch>(() => corpsQuiSePerd(200))
    vi.stubGlobal('fetch', appels)
    const { error } = await ajouter()
    expect(appels).toHaveBeenCalledTimes(1)
    expect(classer(error)).toMatchObject({ genre: 'reponse_perdue', issue: 'enregistre' })
  })

  it('jamais hors ligne au départ : rien n’est parti', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const appels = vi.fn<Fetch>(() => Promise.reject(new TypeError('Failed to fetch')))
    vi.stubGlobal('fetch', appels)
    const { error } = await ajouter()
    expect(appels).toHaveBeenCalledTimes(1)
    expect(classer(error)).toMatchObject({ genre: 'sans_reponse', issue: 'rien_enregistre' })
  })

  it('jamais après notre délai de 10 s (l’attente doublerait)', async () => {
    const delai = new AbortController()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(delai.signal)
    const appels = vi.fn<Fetch>(
      (_entree, init) =>
        new Promise<Response>((_resoudre, rejeter) => {
          init?.signal?.addEventListener('abort', () => {
            rejeter(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }),
    )
    vi.stubGlobal('fetch', appels)
    const appel = ajouter()
    await vi.waitFor(() => expect(appels).toHaveBeenCalledTimes(1))
    delai.abort(new DOMException('signal timed out', 'TimeoutError'))
    const { error } = await appel
    expect(appels).toHaveBeenCalledTimes(1)
    expect(classer(error)).toMatchObject({ genre: 'delai' })
  })

  it('jamais après un refus de la base, ni sans l’option', async () => {
    const appels = vi.fn<Fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: 'P0001', message: 'La date ne peut pas être passée.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    vi.stubGlobal('fetch', appels)
    await ajouter()
    expect(appels).toHaveBeenCalledTimes(1)
    const sansOption = vi.fn<Fetch>(() => Promise.reject(new TypeError('Load failed')))
    vi.stubGlobal('fetch', sansOption)
    await ajouter(false)
    expect(sansOption).toHaveBeenCalledTimes(1)
  })
})

describe('tirerNumero (T76, lot B)', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('un uuid de version 4, un autre à chaque tirage', () => {
    const premier = tirerNumero()
    expect(premier).toMatch(UUID)
    expect(tirerNumero()).not.toBe(premier)
  })

  it('repli d’un iOS ancien (sans randomUUID) : un uuid de version 4 écrit depuis 16 octets', () => {
    expect(numeroDepuisOctets(new Uint8Array(16).fill(0xff))).toBe(
      'ffffffff-ffff-4fff-bfff-ffffffffffff',
    )
    expect(numeroDepuisOctets(new Uint8Array(16))).toMatch(UUID)
    expect(numeroDepuisOctets(crypto.getRandomValues(new Uint8Array(16)))).toMatch(UUID)
  })
})
