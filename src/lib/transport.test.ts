import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'

// Transport des appels (T76) : ce que `fetchAvecDelai` sait d'un envoi et le dit plus loin. Les
// tests passent par le vrai client Supabase, avec un `fetch` simulé : ce sont les erreurs que
// postgrest-js rend vraiment à l'écran (code vide, statut perdu).

function configurer() {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
}

/** Arguments d'un ajout d'événement : le cas réel de Coordination (huit mentions). */
const AJOUT = {
  p_titre: 'Réunion des responsables',
  p_date: '2026-10-26',
  p_statut: 'attente_validation' as const,
  p_mentions: Array.from({ length: 8 }, (_, rang) => `10000000-0000-4000-8000-00000000010${rang}`),
  p_heure_prevue: null,
  p_cle: 'a1000000-0000-4000-8000-000000000001',
}

beforeEach(configurer)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchAvecDelai : notre délai de 10 s', () => {
  it('reconnu à notre signal, même quand le navigateur rejette avec AbortError (Safari)', async () => {
    const delai = new AbortController()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(delai.signal)
    const appels = vi.fn(
      (_entree: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resoudre, rejeter) => {
          init?.signal?.addEventListener('abort', () => {
            rejeter(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }),
    )
    vi.stubGlobal('fetch', appels)
    const appel = Promise.resolve(supabase().rpc('ajouter_evenement', AJOUT))
    await vi.waitFor(() => expect(appels).toHaveBeenCalledTimes(1))
    delai.abort(new DOMException('signal timed out', 'TimeoutError'))
    const { error } = await appel
    expect(error?.message).toMatch(/^TimeoutError: /)
  })
})

describe('fetchAvecDelai : réponse arrivée, corps perdu', () => {
  it('un 200 dont le corps se perd est une réponse perdue, pas une coupure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(controleur) {
                controleur.error(new TypeError('Load failed'))
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    )
    const { error } = await supabase().rpc('ajouter_evenement', AJOUT)
    expect(error?.message).toMatch(/^ReponsePerdue: /)
  })

  it('un corps lu ne change rien à la réponse : données, statut et en-têtes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify('20000000-0000-4000-8000-000000000001'), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    )
    const { data, error, status } = await supabase().rpc('ajouter_evenement', AJOUT)
    expect(error).toBeNull()
    expect(status).toBe(200)
    expect(data).toBe('20000000-0000-4000-8000-000000000001')
  })
})

describe('fetchAvecDelai : version du site dans X-Client-Info', () => {
  it('complète l’en-tête de supabase-js par « pilotage=<version> », sur une lecture comme sur une écriture', async () => {
    const appels = vi.fn<(entree: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response('[]', { status: 200 })),
    )
    vi.stubGlobal('fetch', appels)
    await supabase().from('ministere').select('id')
    await supabase().rpc('ajouter_evenement', AJOUT)
    expect(appels).toHaveBeenCalledTimes(2)
    for (const [, init] of appels.mock.calls) {
      const entete = new Headers(init?.headers).get('X-Client-Info') ?? ''
      expect(entete).toMatch(/^supabase-js\//)
      expect(entete).toMatch(/; pilotage=([0-9a-f]{7}|local)(;|$)/)
    }
  })
})
