import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { classer, lireEchec } from '@/data/echecEnvoi'
import type { NatureEnvoi } from '@/data/echecEnvoi'
import { envoyer } from '@/data/envoi'
import { MESSAGES_COMMUNS } from '@/data/messagesBase'
import { erreurDeConnexion } from '@/features/saisie/textes'
import { supabase } from '@/lib/supabase'

// Classement unique des échecs d'envoi (T76). Le cas réel du 26 octobre 2026 d'abord :
// Coordination ajoute un événement, la base enregistre, la réponse se perd. Puis chaque issue,
// avec les faits que le transport a vus (vrai client Supabase, fetch simulé) ou, sans eux, le nom
// et le message de l'erreur.

const REFERENCE = /^[2-9A-HJKMNP-Z]{6}$/
const CONNEXION = erreurDeConnexion('saisie')
const AJOUT = {
  p_titre: 'Réunion des responsables',
  p_date: '2026-10-26',
  p_statut: 'attente_validation' as const,
  p_mentions: Array.from({ length: 8 }, (_, rang) => `10000000-0000-4000-8000-00000000010${rang}`),
  p_heure_prevue: null,
}

/** Envoie l'ajout de Coordination par `envoyer`, avec un fetch simulé ; rend l'erreur reçue. */
async function ajouterAvec(repondre: () => Promise<Response>): Promise<unknown> {
  vi.stubGlobal('fetch', vi.fn(repondre))
  const { error } = await envoyer('rpc/ajouter_evenement', () =>
    supabase().rpc('ajouter_evenement', AJOUT),
  )
  return error
}

function corpsQuiSePerd(statut: number): Response {
  return new Response(
    new ReadableStream({
      start(controleur) {
        controleur.error(new TypeError('Load failed'))
      },
    }),
    { status: statut, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('cas réel du 26 octobre 2026 : Coordination, huit mentions dont FIJ', () => {
  it('« Load failed » sans réponse : issue inconnue, « Vérifiez la liste », la liste relue, une référence', async () => {
    const erreur = await ajouterAvec(() => Promise.reject(new TypeError('Load failed')))
    expect(classer(erreur)).toMatchObject({ genre: 'sans_reponse', issue: 'inconnue' })
    const lu = lireEchec(erreur, { nature: 'creation' })
    expect(lu.message).toBe(MESSAGES_COMMUNS.peutEtreFait)
    expect(lu.relire).toBe(true)
    expect(lu.reference).toMatch(REFERENCE)
  })

  it('la base répond 200, le corps se perd : la base a enregistré ; jamais « réessayez »', async () => {
    const erreur = await ajouterAvec(() => Promise.resolve(corpsQuiSePerd(200)))
    expect(classer(erreur)).toMatchObject({
      genre: 'reponse_perdue',
      issue: 'enregistre',
      statut: 200,
    })
    const lu = lireEchec(erreur, { nature: 'creation' })
    expect(lu.message).toBe(MESSAGES_COMMUNS.peutEtreFait)
    expect(lu.relire).toBe(true)
  })

  it('la référence de l’écran est celle partie dans X-Client-Info', async () => {
    const appels = vi.fn<(entree: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(() =>
      Promise.reject(new TypeError('Load failed')),
    )
    vi.stubGlobal('fetch', appels)
    const { error } = await envoyer('rpc/ajouter_evenement', () =>
      supabase().rpc('ajouter_evenement', AJOUT),
    )
    const entete = new Headers(appels.mock.calls[0]?.[1]?.headers).get('X-Client-Info') ?? ''
    const reference = lireEchec(error, { nature: 'creation' }).reference
    expect(reference).toMatch(REFERENCE)
    expect(entete).toContain(`; ref=${reference ?? ''}`)
  })
})

describe('classer : les faits de l’envoi d’abord', () => {
  it('passerelle en panne (502, page HTML) : réponse illisible, issue inconnue', async () => {
    const erreur = await ajouterAvec(() =>
      Promise.resolve(new Response('<html>502 Bad Gateway</html>', { status: 502 })),
    )
    expect(classer(erreur)).toMatchObject({
      genre: 'reponse_illisible',
      issue: 'inconnue',
      statut: 502,
    })
    expect(lireEchec(erreur, { nature: 'creation' }).message).toBe(MESSAGES_COMMUNS.peutEtreFait)
    expect(lireEchec(erreur, { nature: 'reprise' }).message).toBe(CONNEXION)
  })

  it('réponse 400 au corps illisible : rien d’enregistré, le repli avec sa référence', async () => {
    const erreur = await ajouterAvec(() =>
      Promise.resolve(new Response('<html>400</html>', { status: 400 })),
    )
    expect(classer(erreur)).toMatchObject({ genre: 'reponse_illisible', issue: 'rien_enregistre' })
    const lu = lireEchec(erreur, { nature: 'creation' })
    expect(lu.message).toBe(MESSAGES_COMMUNS.repliSaisie)
    expect(lu.reference).toMatch(REFERENCE)
    expect(lu.relire).toBe(false)
  })

  it('corps perdu après un 503 : issue inconnue', async () => {
    const erreur = await ajouterAvec(() => Promise.resolve(corpsQuiSePerd(503)))
    expect(classer(erreur)).toMatchObject({ genre: 'reponse_perdue', issue: 'inconnue' })
  })

  it('notre délai de 10 s, même rejeté en AbortError par Safari : délai, issue inconnue', async () => {
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
    const appel = envoyer('rpc/ajouter_evenement', () => supabase().rpc('ajouter_evenement', AJOUT))
    await vi.waitFor(() => expect(appels).toHaveBeenCalledTimes(1))
    delai.abort(new DOMException('signal timed out', 'TimeoutError'))
    const { error } = await appel
    expect(classer(error)).toMatchObject({ genre: 'delai', issue: 'inconnue' })
    expect(lireEchec(error, { nature: 'creation' }).message).toBe(MESSAGES_COMMUNS.peutEtreFait)
  })

  it('hors ligne au départ : rien n’est parti, « réessayez » même pour une création (Q9)', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const erreur = await ajouterAvec(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(classer(erreur)).toMatchObject({ genre: 'sans_reponse', issue: 'rien_enregistre' })
    const lu = lireEchec(erreur, { nature: 'creation' })
    expect(lu.message).toBe(CONNEXION)
    expect(lu.reference).toMatch(REFERENCE)
    expect(lu.relire).toBe(false)
  })

  it('refus connu de la base : sa phrase, sous son champ, sans référence ni relecture', async () => {
    const erreur = await ajouterAvec(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: 'P0001', message: 'La date ne peut pas être passée.' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )
    const lu = lireEchec(erreur, { nature: 'creation' })
    expect(lu).toMatchObject({ genre: 'refus', issue: 'rien_enregistre', champ: 'date' })
    expect(lu.reference).toBeNull()
    expect(lu.relire).toBe(false)
  })
})

describe('classer : sans les faits de l’envoi (aperçus, erreurs levées par le code)', () => {
  it.each<[string, unknown, string, string]>([
    [
      'fetch rejeté (Chrome)',
      { code: '', message: 'TypeError: Failed to fetch' },
      'sans_reponse',
      'inconnue',
    ],
    [
      'fetch rejeté (Safari)',
      { code: '', message: 'TypeError: Load failed' },
      'sans_reponse',
      'inconnue',
    ],
    [
      'Edge Function injoignable',
      Object.assign(new Error('x'), { name: 'FunctionsFetchError' }),
      'sans_reponse',
      'inconnue',
    ],
    [
      'annulation (application en arrière-plan)',
      { code: '', message: 'AbortError: aborted' },
      'sans_reponse',
      'inconnue',
    ],
    ['délai', { code: '', message: 'TimeoutError: signal timed out' }, 'delai', 'inconnue'],
    [
      'corps perdu après un 200',
      { code: '', message: 'ReponsePerdue: statut 200, corps perdu' },
      'reponse_perdue',
      'enregistre',
    ],
    [
      'page HTML d’une passerelle',
      { message: '<html>502</html>' },
      'reponse_illisible',
      'inconnue',
    ],
    [
      'bogue sous postgrest-js',
      { code: '', message: "TypeError: undefined is not an object (evaluating 'x.y')" },
      'bogue',
      'rien_enregistre',
    ],
    ['Error levée par le code', new Error('Limites absentes.'), 'bogue', 'rien_enregistre'],
    ['valeur levée', 'boom', 'bogue', 'rien_enregistre'],
    [
      'consigne de Zod imprévue',
      new z.ZodError([{ code: 'custom', message: 'Invalid input', path: [] }]),
      'bogue',
      'rien_enregistre',
    ],
    [
      'P0001 absent de la table',
      { code: 'P0001', message: 'Un refus inconnu.' },
      'refus_inconnu',
      'rien_enregistre',
    ],
    [
      'clé en double',
      { code: '23505', message: 'duplicate key' },
      'refus_inconnu',
      'rien_enregistre',
    ],
    [
      'temps d’instruction dépassé',
      { code: '57014', message: 'canceling statement' },
      'refus_inconnu',
      'rien_enregistre',
    ],
    [
      'Edge Function qui n’a pas tourné',
      Object.assign(new Error('x'), { name: 'FunctionsRelayError' }),
      'refus_inconnu',
      'rien_enregistre',
    ],
    [
      'refus connu',
      { code: 'P0001', message: 'La date ne peut pas être passée.' },
      'refus',
      'rien_enregistre',
    ],
    [
      'requête sans jeton (Q8)',
      { code: '42501', message: 'permission denied for function ajouter_evenement' },
      'session',
      'rien_enregistre',
    ],
    [
      'double authentification',
      { code: '42501', message: 'Double authentification requise.' },
      'session',
      'rien_enregistre',
    ],
    [
      'compte désactivé',
      { code: '42501', message: 'Compte inactif ou inconnu.' },
      'desactive',
      'rien_enregistre',
    ],
    [
      'refus d’accès',
      { code: '42501', message: 'new row violates row-level security policy' },
      'acces',
      'rien_enregistre',
    ],
  ])('%s', (_cas, erreur, genre, issue) => {
    expect(classer(erreur)).toMatchObject({ genre, issue })
  })

  it('la même erreur garde la même référence d’une lecture à l’autre', () => {
    const erreur = { code: '', message: 'TypeError: Load failed' }
    expect(classer(erreur).reference).toBe(lireEchec(erreur, { nature: 'creation' }).reference)
  })
})

describe('lireEchec : la phrase selon la nature de l’envoi', () => {
  const natures: NatureEnvoi[] = ['creation', 'reprise', 'action']

  it('un bogue ou un refus inattendu : le repli, jamais « La connexion a échoué »', () => {
    for (const erreur of [
      { code: '', message: "TypeError: Cannot read properties of null (reading 'map')" },
      { code: '23505', message: 'duplicate key' },
    ]) {
      for (const nature of natures) {
        const lu = lireEchec(erreur, { nature })
        expect(lu.message).not.toMatch(/La connexion a échoué/)
        expect(lu.message).toBe(
          nature === 'action' ? MESSAGES_COMMUNS.repliAction : MESSAGES_COMMUNS.repliSaisie,
        )
        expect(lu.reference).toMatch(REFERENCE)
      }
    }
  })

  it('une issue inconnue : « Vérifiez la liste » pour une création, la phrase de l’écran sinon', () => {
    const erreur = { code: '', message: 'TypeError: Load failed' }
    expect(lireEchec(erreur, { nature: 'creation' }).message).toBe(MESSAGES_COMMUNS.peutEtreFait)
    expect(lireEchec(erreur, { nature: 'reprise' }).message).toBe(CONNEXION)
    expect(lireEchec(erreur, { nature: 'action', connexion: 'Phrase de l’écran.' }).message).toBe(
      'Phrase de l’écran.',
    )
  })

  it('connexion expirée : sa phrase, sans référence ; refus d’accès : la phrase de l’écran', () => {
    const expiree = lireEchec({ code: 'PGRST303', message: 'JWT expired' }, { nature: 'creation' })
    expect(expiree).toMatchObject({ message: MESSAGES_COMMUNS.connexionExpiree, reference: null })
    expect(
      lireEchec(
        { code: '42501', message: 'new row violates row-level security policy' },
        { nature: 'reprise', acces: 'Accès propre.' },
      ).message,
    ).toBe('Accès propre.')
  })
})
