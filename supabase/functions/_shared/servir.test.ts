// @vitest-environment node
// Tests unitaires (npm test) de l'enveloppe commune, sans pile Supabase : OPTIONS, méthode,
// vérification du JWT par @supabase/server (JWKS de test), aal2, et réponses sans détail
// interne. Les appels réels sont testés par npm run test:fonctions.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { schemaCibleCompte } from './schemas.ts'
import { servir } from './servir.ts'

const SECRET = 'sb_secret_essai_ne_doit_jamais_sortir'
const action = vi.fn<(demande: unknown, appelant: unknown) => Promise<void>>(async () => {})
const fonction = servir({ nom: 'essai', schema: schemaCibleCompte, action })
const corpsValide = JSON.stringify({ user_id: '7f1c2a54-3b6e-4d1a-9f0e-2c8b5a6d4e31' })

let cleDeTest: CryptoKey
let autreCle: CryptoKey

function base64url(valeur: Uint8Array | string): string {
  const octets = typeof valeur === 'string' ? new TextEncoder().encode(valeur) : valeur
  return btoa(String.fromCharCode(...octets))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function jeton(revendications: Record<string, unknown>, cle = cleDeTest): Promise<string> {
  const maintenant = Math.floor(Date.now() / 1000)
  const entete = base64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'essai' }))
  const charge = base64url(
    JSON.stringify({
      sub: '0b6c7d1e-2f3a-4b5c-8d6e-7f8091a2b3c4',
      session_id: '5d2e8f10-6a4b-4c3d-9e2f-1a0b9c8d7e6f',
      aud: 'authenticated',
      role: 'authenticated',
      aal: 'aal2',
      iat: maintenant,
      exp: maintenant + 600,
      ...revendications,
    }),
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cle,
    new TextEncoder().encode(`${entete}.${charge}`),
  )
  return `${entete}.${charge}.${base64url(new Uint8Array(signature))}`
}

function requete(methode: string, autorisation?: string, corps = corpsValide): Request {
  const enTetes: Record<string, string> = { 'Content-Type': 'application/json' }
  if (autorisation) enTetes['Authorization'] = `Bearer ${autorisation}`
  return new Request('http://127.0.0.1/functions/v1/essai', {
    method: methode,
    headers: enTetes,
    body: methode === 'GET' || methode === 'OPTIONS' ? undefined : corps,
  })
}

async function attendreErreur(reponse: Response, statut: number, code: string): Promise<void> {
  expect(reponse.status).toBe(statut)
  expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe('*')
  const texte = await reponse.text()
  expect(JSON.parse(texte)).toEqual({ erreur: code })
  expect(texte).not.toContain(SECRET)
}

beforeAll(async () => {
  const paire = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])
  cleDeTest = paire.privateKey
  autreCle = (
    await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])
  ).privateKey
  const publique = await crypto.subtle.exportKey('jwk', paire.publicKey)
  // Port 1 : la base est injoignable, la lecture du compte de l'appelant échoue aussitôt.
  vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:1')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEYS', JSON.stringify({ default: 'sb_publishable_essai' }))
  vi.stubEnv('SUPABASE_SECRET_KEYS', JSON.stringify({ default: SECRET }))
  vi.stubEnv(
    'SUPABASE_JWKS',
    JSON.stringify({ keys: [{ ...publique, kid: 'essai', alg: 'ES256', use: 'sig' }] }),
  )
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('servir', () => {
  it('répond à OPTIONS avec les en-têtes CORS', async () => {
    const reponse = await fonction.fetch(requete('OPTIONS'))
    expect(reponse.status).toBe(204)
    expect(reponse.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
    expect(reponse.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('refuse une autre méthode que POST', async () => {
    await attendreErreur(await fonction.fetch(requete('GET')), 405, 'methode_non_autorisee')
  })

  it('refuse sans JWT, avec un JWT illisible, mal signé, expiré ou d’une autre audience', async () => {
    await attendreErreur(await fonction.fetch(requete('POST')), 401, 'non_authentifie')
    await attendreErreur(
      await fonction.fetch(requete('POST', 'abc.def.ghi')),
      401,
      'non_authentifie',
    )
    const malSigne = await jeton({}, autreCle)
    await attendreErreur(await fonction.fetch(requete('POST', malSigne)), 401, 'non_authentifie')
    const expire = await jeton({ exp: Math.floor(Date.now() / 1000) - 60 })
    await attendreErreur(await fonction.fetch(requete('POST', expire)), 401, 'non_authentifie')
    const autreAudience = await jeton({ aud: 'autre' })
    await attendreErreur(
      await fonction.fetch(requete('POST', autreAudience)),
      401,
      'non_authentifie',
    )
    const anonyme = await jeton({ role: 'anon' })
    await attendreErreur(await fonction.fetch(requete('POST', anonyme)), 401, 'non_authentifie')
    const sansSession = await jeton({ session_id: undefined })
    await attendreErreur(await fonction.fetch(requete('POST', sansSession)), 401, 'non_authentifie')
    await attendreErreur(
      await fonction.fetch(requete('POST', 'sb_publishable_essai')),
      401,
      'non_authentifie',
    )
  })

  it('refuse un JWT valide de niveau aal1', async () => {
    const aal1 = await jeton({ aal: 'aal1' })
    await attendreErreur(
      await fonction.fetch(requete('POST', aal1)),
      403,
      'double_authentification_requise',
    )
  })

  it('répond 500 sans détail quand le compte de l’appelant ne peut pas être lu', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {})
    // La base répond une erreur interne avec un message détaillé, qui ne doit pas sortir.
    const appels: string[] = []
    vi.stubGlobal('fetch', async (adresse: string | URL | Request) => {
      appels.push(String(adresse instanceof Request ? adresse.url : adresse))
      return new Response(
        JSON.stringify({ code: 'XX000', message: 'détail interne de la base', details: SECRET }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    })
    try {
      const aal2 = await jeton({})
      await attendreErreur(await fonction.fetch(requete('POST', aal2)), 500, 'erreur_interne')
      expect(appels.some((adresse) => adresse.includes('/rest/v1/compte'))).toBe(true)
      expect(action).not.toHaveBeenCalled()
      const ecrit = journal.mock.calls.map((appel) => appel.join(' ')).join('\n')
      expect(ecrit).toContain('lecture_compte_appelant')
      expect(ecrit).not.toContain(SECRET)
      expect(ecrit).not.toContain('détail interne')
      expect(ecrit).not.toContain(aal2)
    } finally {
      vi.unstubAllGlobals()
      journal.mockRestore()
    }
  })

  it('refuse un appelant qui n’est pas une administration active', async () => {
    for (const ligne of [
      [],
      [{ type: 'conseil', desactive_le: null }],
      [{ type: 'admin_eglise', desactive_le: '2026-09-30T10:00:00Z' }],
    ]) {
      vi.stubGlobal(
        'fetch',
        async () =>
          new Response(JSON.stringify(ligne), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      )
      try {
        await attendreErreur(
          await fonction.fetch(requete('POST', await jeton({}))),
          403,
          'acces_refuse',
        )
      } finally {
        vi.unstubAllGlobals()
      }
    }
    expect(action).not.toHaveBeenCalled()
  })

  it('valide le corps après l’appelant, puis lance l’action avec l’identifiant de l’appelant', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify([{ type: 'admin_eglise', desactive_le: null }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    try {
      const aal2 = await jeton({})
      await attendreErreur(
        await fonction.fetch(requete('POST', aal2, '{"user_id": 3')),
        400,
        'requete_invalide',
      )
      await attendreErreur(
        await fonction.fetch(requete('POST', aal2, JSON.stringify({ user_id: 'x' }))),
        400,
        'requete_invalide',
      )
      await attendreErreur(
        await fonction.fetch(requete('POST', aal2, 'x'.repeat(5000))),
        400,
        'requete_invalide',
      )
      expect(action).not.toHaveBeenCalled()
      const reponse = await fonction.fetch(requete('POST', aal2))
      expect(reponse.status).toBe(200)
      expect(await reponse.json()).toEqual({ ok: true })
      expect(action).toHaveBeenCalledTimes(1)
      expect(action.mock.calls[0]?.[0]).toEqual(JSON.parse(corpsValide))
      expect(action.mock.calls[0]?.[1]).toMatchObject({
        id: '0b6c7d1e-2f3a-4b5c-8d6e-7f8091a2b3c4',
        session: '5d2e8f10-6a4b-4c3d-9e2f-1a0b9c8d7e6f',
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
