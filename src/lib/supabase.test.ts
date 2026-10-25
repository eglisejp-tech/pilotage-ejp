import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ecrituresEnVol,
  ErreurConfiguration,
  estEcriture,
  lireConfiguration,
  supabase,
} from '@/lib/supabase'

function jwt(charge: object): string {
  const encoder = (valeur: object) => btoa(JSON.stringify(valeur)).replace(/=+$/, '')
  return `${encoder({ alg: 'HS256' })}.${encoder(charge)}.signature`
}

describe('lireConfiguration', () => {
  it("accepte l'URL et la clé publique", () => {
    expect(
      lireConfiguration({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
      }),
    ).toEqual({ url: 'http://127.0.0.1:54321', cle: 'sb_publishable_abc' })
  })

  it('refuse une configuration incomplète', () => {
    expect(() => lireConfiguration({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })).toThrow(
      ErreurConfiguration,
    )
  })

  it('refuse toute clé secrète dans le navigateur', () => {
    for (const cle of ['sb_secret_abc', jwt({ role: 'service_role' })]) {
      expect(() =>
        lireConfiguration({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_PUBLISHABLE_KEY: cle }),
      ).toThrow(/clé secrète/)
    }
    expect(
      lireConfiguration({
        VITE_SUPABASE_URL: 'http://x',
        VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon' }),
      }).cle,
    ).toContain('.')
  })
})

// Le client n'ajoute aucun nouvel essai caché à ses lectures (option `db: { retry: false }`) :
// sinon postgrest-js relance seul un échec réseau ou un 503 (1, 2 puis 4 s), et une route sans
// réponse ferait attendre 47 s au lieu de 10 s. Le nouvel essai appartient à TanStack Query
// (src/lib/requetes.ts). Contrepartie : un 503 ou un 520 (cache de schéma de PostgREST pas encore
// rechargé après un déploiement) n'est relancé qu'une fois, à 1 s, par TanStack Query. Ce fichier
// n'est pas attribué à F1 par le plan : l'option est à faire acter par la personne responsable.
describe('supabase() : aucun nouvel essai caché', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ne relance pas une lecture qui échoue sur le réseau', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    const appels = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', appels)
    const { error } = await supabase().from('ministere').select('id')
    expect(error).not.toBeNull()
    expect(appels).toHaveBeenCalledTimes(1)
  })

  it('ne relance pas une lecture qui reçoit un 503', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    const appels = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('', { status: 503 })))
    vi.stubGlobal('fetch', appels)
    const { error } = await supabase().from('ministere').select('id')
    expect(error).not.toBeNull()
    expect(appels).toHaveBeenCalledTimes(1)
  })
})

// « Changer d'espace » (T73) attend la fin des écritures en vol : l'application écrit par des
// appels directs à la base (pas de useMutation), comptés ici.
describe('supabase() : écritures en vol', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reconnaît une écriture : tout sauf GET et HEAD, vers la base ou une Edge Function', () => {
    const base = 'http://127.0.0.1:54321'
    expect(estEcriture(`${base}/rest/v1/rpc/creer_point`, { method: 'POST' })).toBe(true)
    expect(estEcriture(new URL(`${base}/functions/v1/creer-compte`), { method: 'post' })).toBe(true)
    expect(estEcriture(`${base}/rest/v1/indicateur`, { method: 'PATCH' })).toBe(true)
    expect(estEcriture(`${base}/rest/v1/v_semaine`, { method: 'GET' })).toBe(false)
    expect(estEcriture(`${base}/rest/v1/v_semaine`)).toBe(false)
    expect(estEcriture(`${base}/auth/v1/token?grant_type=refresh_token`, { method: 'POST' })).toBe(
      false,
    )
  })

  it('compte une écriture tant que sa réponse n’est pas arrivée', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    let repondre: (reponse: Response) => void = () => undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resoudre) => {
            repondre = resoudre
          }),
      ),
    )
    const appel = supabase().rpc('declarer_intervenant', {
      p_prenom: 'Marie',
      p_motif: 'connexion',
    })
    const resultat = Promise.resolve(appel)
    await vi.waitFor(() => expect(ecrituresEnVol()).toBe(1))
    repondre(new Response('null', { status: 200 }))
    await resultat
    expect(ecrituresEnVol()).toBe(0)
  })
})
