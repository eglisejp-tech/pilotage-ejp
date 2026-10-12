// Tests du script de contrôle du déploiement (scripts/verifier-deploiement.mjs), avec un `fetch`
// simulé : aucun appel réseau, aucun fichier lu. Un faux déploiement correct est modifié
// contrôle par contrôle pour vérifier que chaque écart est bien signalé.
import { describe, expect, it } from 'vitest'
import {
  FONCTIONS,
  analyserArguments,
  formaterResultats,
  trouverSecrets,
  verifierAuth,
  verifierCle,
  verifierDeploiement,
  verifierDist,
  verifierFonctions,
  verifierSite,
  type Fetch,
  type Resultat,
  type SystemeFichiers,
} from '../../scripts/verifier-deploiement.mjs'

const SITE = new URL('https://pilotage.example.org')
const SUPABASE = new URL('https://abcdefghijklmnop.supabase.co')
const CLE = 'sb_publishable_cle_publique_de_test'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE.origin} https://ugbitornbspatpcowlvg.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const ENTETES_SITE: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': CSP,
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'x-robots-tag': 'noindex',
}

const PAGE =
  '<!doctype html><div id="root"></div><script type="module" src="/assets/index-AbC123.js"></script>'

interface Appel {
  methode: string
  url: string
  entetes: Record<string, string>
}

// Un déploiement correct ; `surcharges` remplace la réponse à une clé « METHODE chemin ».
function fauxDeploiement(surcharges: Record<string, () => Response | Promise<Response>> = {}) {
  const appels: Appel[] = []
  const json = (statut: number, corps: unknown) =>
    new Response(JSON.stringify(corps), {
      status: statut,
      headers: { 'content-type': 'application/json' },
    })
  const parDefaut: Record<string, () => Response> = {
    'GET /ma-fiche': () => new Response(PAGE, { status: 200, headers: ENTETES_SITE }),
    'HEAD /assets/index-AbC123.js': () =>
      new Response(null, {
        status: 200,
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      }),
    'GET /auth/v1/settings': () =>
      json(200, { disable_signup: true, external: { email: true, google: true, github: false } }),
  }
  for (const fonction of FONCTIONS) {
    parDefaut[`OPTIONS /functions/v1/${fonction}`] = () => new Response(null, { status: 204 })
    parDefaut[`POST /functions/v1/${fonction}`] = () => json(401, { erreur: 'non_authentifie' })
  }
  const fetchImpl: Fetch = async (url, init) => {
    const adresse = new URL(url)
    const methode = init?.method ?? 'GET'
    appels.push({ methode, url, entetes: { ...(init?.headers as Record<string, string>) } })
    const cle = `${methode} ${adresse.pathname}`
    const reponse = surcharges[cle] ?? parDefaut[cle]
    if (!reponse) return new Response('introuvable', { status: 404 })
    return reponse()
  }
  return { fetchImpl, appels }
}

function echecs(resultats: Resultat[]): string[] {
  return resultats.filter((r) => !r.ok).map((r) => r.nom)
}

function base64url(texte: string): string {
  return btoa(texte).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function jwt(revendications: Record<string, unknown>): string {
  const entete = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  return `${entete}.${base64url(JSON.stringify(revendications))}.signature_de_test_12345`
}

const optionsSite = { siteUrl: SITE, supabaseUrl: SUPABASE }

describe('FONCTIONS', () => {
  it('reprend exactement les 5 Edge Functions de supabase/functions', () => {
    const fichiers = Object.keys(import.meta.glob('../../supabase/functions/*/index.ts'))
    const dossiers = fichiers.map((chemin) => chemin.split('/').at(-2))
    expect([...FONCTIONS].sort()).toEqual([...dossiers].sort())
    expect(FONCTIONS).toHaveLength(5)
  })
})

describe('contrôle complet', () => {
  it('est au vert sur un déploiement correct', async () => {
    const { fetchImpl } = fauxDeploiement()
    const systeme: SystemeFichiers = {
      lister: () => ['dist/index.html', 'dist/assets/index-AbC123.js'],
      lire: () => 'const a = 1',
    }
    const resultats = await verifierDeploiement({
      ...optionsSite,
      cle: CLE,
      google: true,
      fetchImpl,
      systeme,
    })
    expect(echecs(resultats)).toEqual([])
    expect(formaterResultats(resultats)).toContain('Tout est au vert')
  })

  it("n'envoie que la clé publique, sans jeton, et ne l'écrit pas dans le compte rendu", async () => {
    const { fetchImpl, appels } = fauxDeploiement()
    const resultats = await verifierDeploiement({
      ...optionsSite,
      cle: CLE,
      fetchImpl,
      systeme: { lister: () => ['dist/index.html'], lire: () => '<html></html>' },
    })
    for (const appel of appels) {
      const noms = Object.keys(appel.entetes).map((nom) => nom.toLowerCase())
      expect(noms).not.toContain('authorization')
    }
    // Aucun appel n'écrit hors des 5 fonctions : POST sans jeton, refusé avant toute action.
    const ecritures = appels.filter((a) => !['GET', 'HEAD', 'OPTIONS'].includes(a.methode))
    expect(ecritures).toHaveLength(FONCTIONS.length)
    expect(ecritures.every((a) => new URL(a.url).pathname.startsWith('/functions/v1/'))).toBe(true)
    expect(JSON.stringify(resultats)).not.toContain(CLE)
    expect(formaterResultats(resultats)).not.toContain(CLE)
  })

  it('signale un échec avec un code de sortie utile dans le compte rendu', () => {
    const texte = formaterResultats([
      { nom: 'A', ok: true },
      { nom: 'B', ok: false, detail: 'statut 500' },
    ])
    expect(texte).toContain('ECHEC  B (statut 500)')
    expect(texte).toContain('1 contrôle(s) en échec sur 2')
  })
})

describe('en-têtes du site', () => {
  it('répond 200 sur /ma-fiche et renvoie la page de l’application', async () => {
    const { fetchImpl, appels } = fauxDeploiement()
    const resultats = await verifierSite({ ...optionsSite, fetchImpl })
    expect(echecs(resultats)).toEqual([])
    expect(appels[0]?.url).toBe('https://pilotage.example.org/ma-fiche')
  })

  it('échoue si /ma-fiche répond 404 ou redirige', async () => {
    for (const statut of [404, 301]) {
      const { fetchImpl } = fauxDeploiement({
        'GET /ma-fiche': () => new Response('x', { status: statut, headers: ENTETES_SITE }),
      })
      const resultats = await verifierSite({ ...optionsSite, fetchImpl })
      expect(echecs(resultats)).toContain('/ma-fiche répond 200')
    }
  })

  it('échoue si le site est injoignable, sans lever d’erreur', async () => {
    const fetchImpl: Fetch = async () => {
      throw new TypeError('fetch failed')
    }
    const resultats = await verifierSite({ ...optionsSite, fetchImpl })
    expect(echecs(resultats)).toEqual(['Page /ma-fiche'])
  })

  const ecartsCsp: Array<[string, string, string]> = [
    [
      'unsafe-eval',
      CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-eval'"),
      'CSP sans unsafe-eval ni joker',
    ],
    ['un joker', CSP.replace("img-src 'self' data:", 'img-src *'), 'CSP sans unsafe-eval ni joker'],
    [
      'des scripts en ligne',
      CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"),
      "CSP : scripts de l'application seulement",
    ],
    [
      'un autre domaine de connexion',
      CSP.replace(SUPABASE.origin, 'https://exemple.org'),
      'CSP : connect-src limité au site et à Supabase',
    ],
    [
      'une connexion sans le projet contrôlé',
      CSP.replace(SUPABASE.origin, 'https://zzzzzzzzzzzzzzzz.supabase.co'),
      'CSP : connect-src limité au site et à Supabase',
    ],
    [
      'un cadre autorisé',
      CSP.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
      "CSP : frame-ancestors 'none'",
    ],
  ]
  it.each(ecartsCsp)('échoue avec %s dans la CSP', async (_nom, csp, attendu) => {
    const { fetchImpl } = fauxDeploiement({
      'GET /ma-fiche': () =>
        new Response(PAGE, {
          status: 200,
          headers: { ...ENTETES_SITE, 'content-security-policy': csp },
        }),
    })
    const resultats = await verifierSite({ ...optionsSite, fetchImpl })
    expect(echecs(resultats)).toContain(attendu)
  })

  it('échoue sans CSP', async () => {
    const sansCsp = { ...ENTETES_SITE }
    delete sansCsp['content-security-policy']
    const { fetchImpl } = fauxDeploiement({
      'GET /ma-fiche': () => new Response(PAGE, { status: 200, headers: sansCsp }),
    })
    expect(echecs(await verifierSite({ ...optionsSite, fetchImpl }))).toContain('CSP présente')
  })

  const entetesManquants: Array<[string, string]> = [
    ['strict-transport-security', 'HSTS'],
    ['x-content-type-options', 'X-Content-Type-Options: nosniff'],
    ['referrer-policy', 'Referrer-Policy: no-referrer'],
    ['permissions-policy', 'Permissions-Policy présente'],
    ['x-robots-tag', 'X-Robots-Tag: noindex'],
  ]
  it.each(entetesManquants)('échoue sans l’en-tête %s', async (entete, attendu) => {
    const enTetes = { ...ENTETES_SITE }
    delete enTetes[entete]
    const { fetchImpl } = fauxDeploiement({
      'GET /ma-fiche': () => new Response(PAGE, { status: 200, headers: enTetes }),
    })
    expect(echecs(await verifierSite({ ...optionsSite, fetchImpl }))).toEqual([attendu])
  })

  it('échoue si Referrer-Policy est plus permissive ou si HSTS est trop court', async () => {
    const { fetchImpl } = fauxDeploiement({
      'GET /ma-fiche': () =>
        new Response(PAGE, {
          status: 200,
          headers: {
            ...ENTETES_SITE,
            'referrer-policy': 'origin',
            'strict-transport-security': 'max-age=60',
          },
        }),
    })
    expect(echecs(await verifierSite({ ...optionsSite, fetchImpl })).sort()).toEqual([
      'HSTS',
      'Referrer-Policy: no-referrer',
    ])
  })

  it('exige un cache immuable sur /assets/*', async () => {
    const { fetchImpl } = fauxDeploiement({
      'HEAD /assets/index-AbC123.js': () =>
        new Response(null, { status: 200, headers: { 'cache-control': 'max-age=0' } }),
    })
    expect(echecs(await verifierSite({ ...optionsSite, fetchImpl }))).toEqual([
      'Cache immuable de /assets/*',
    ])
  })

  it('échoue si la page ne cite aucun fichier /assets/', async () => {
    const { fetchImpl } = fauxDeploiement({
      'GET /ma-fiche': () =>
        new Response('<div id="root"></div>', { status: 200, headers: ENTETES_SITE }),
    })
    expect(echecs(await verifierSite({ ...optionsSite, fetchImpl }))).toEqual([
      'Cache immuable de /assets/*',
    ])
  })
})

describe('réglages Auth', () => {
  const reglages = (corps: unknown, statut = 200) => ({
    'GET /auth/v1/settings': () => new Response(JSON.stringify(corps), { status: statut }),
  })

  it('lit GET /auth/v1/settings avec la clé publique seulement', async () => {
    const { fetchImpl, appels } = fauxDeploiement()
    const resultats = await verifierAuth({
      supabaseUrl: SUPABASE,
      cle: CLE,
      google: true,
      fetchImpl,
    })
    expect(echecs(resultats)).toEqual([])
    expect(appels).toHaveLength(1)
    expect(appels[0]?.methode).toBe('GET')
    expect(appels[0]?.url).toBe('https://abcdefghijklmnop.supabase.co/auth/v1/settings')
    expect(appels[0]?.entetes).toEqual({ apikey: CLE })
  })

  it('échoue si l’inscription est ouverte', async () => {
    const { fetchImpl } = fauxDeploiement(
      reglages({ disable_signup: false, external: { email: true, google: true } }),
    )
    const resultats = await verifierAuth({
      supabaseUrl: SUPABASE,
      cle: CLE,
      google: true,
      fetchImpl,
    })
    expect(echecs(resultats)).toEqual(['Inscription désactivée (disable_signup)'])
  })

  it('échoue si la connexion par email est coupée', async () => {
    const { fetchImpl } = fauxDeploiement(
      reglages({ disable_signup: true, external: { email: false, google: true } }),
    )
    const resultats = await verifierAuth({
      supabaseUrl: SUPABASE,
      cle: CLE,
      google: true,
      fetchImpl,
    })
    expect(echecs(resultats)).toEqual(['Connexion par email activée (external.email)'])
  })

  it('suit le choix pour Google : activé ou désactivé', async () => {
    const avecGoogle = fauxDeploiement()
    const sansGoogle = fauxDeploiement(
      reglages({ disable_signup: true, external: { email: true, google: false } }),
    )
    const base = { supabaseUrl: SUPABASE, cle: CLE }
    expect(
      echecs(await verifierAuth({ ...base, google: true, fetchImpl: avecGoogle.fetchImpl })),
    ).toEqual([])
    expect(
      echecs(await verifierAuth({ ...base, google: false, fetchImpl: sansGoogle.fetchImpl })),
    ).toEqual([])
    expect(
      echecs(await verifierAuth({ ...base, google: false, fetchImpl: avecGoogle.fetchImpl })),
    ).toEqual(['Connexion Google désactivée (external.google)'])
    expect(
      echecs(await verifierAuth({ ...base, google: true, fetchImpl: sansGoogle.fetchImpl })),
    ).toEqual(['Connexion Google activée (external.google)'])
  })

  it('refuse une valeur qui n’est pas exactement true', async () => {
    const { fetchImpl } = fauxDeploiement(
      reglages({ disable_signup: 'true', external: { email: 1, google: true } }),
    )
    const resultats = await verifierAuth({
      supabaseUrl: SUPABASE,
      cle: CLE,
      google: true,
      fetchImpl,
    })
    expect(echecs(resultats)).toHaveLength(2)
  })

  it('échoue si les réglages ne sont pas lisibles', async () => {
    const { fetchImpl } = fauxDeploiement(reglages({ message: 'No API key found' }, 401))
    const resultats = await verifierAuth({
      supabaseUrl: SUPABASE,
      cle: CLE,
      google: true,
      fetchImpl,
    })
    expect(echecs(resultats)).toEqual(['Réglages Auth lisibles'])
  })

  it('échoue sans lever d’erreur si la réponse n’est pas du JSON', async () => {
    const { fetchImpl } = fauxDeploiement({
      'GET /auth/v1/settings': () => new Response('<html>', { status: 200 }),
    })
    const resultats = await verifierAuth({
      supabaseUrl: SUPABASE,
      cle: CLE,
      google: true,
      fetchImpl,
    })
    expect(echecs(resultats)).toEqual(['Réglages Auth'])
  })
})

describe('Edge Functions', () => {
  const base = { siteUrl: SITE, supabaseUrl: SUPABASE, cle: CLE }

  it('contrôle OPTIONS puis POST sans jeton pour chacune des 5 fonctions', async () => {
    const { fetchImpl, appels } = fauxDeploiement()
    const resultats = await verifierFonctions({ ...base, fetchImpl })
    expect(echecs(resultats)).toEqual([])
    expect(resultats).toHaveLength(10)
    for (const fonction of FONCTIONS) {
      const adresse = `https://abcdefghijklmnop.supabase.co/functions/v1/${fonction}`
      expect(appels.filter((a) => a.url === adresse).map((a) => a.methode)).toEqual([
        'OPTIONS',
        'POST',
      ])
    }
    const post = appels.find((a) => a.methode === 'POST')
    expect(post?.entetes['apikey']).toBe(CLE)
    expect(Object.keys(post?.entetes ?? {}).map((n) => n.toLowerCase())).not.toContain(
      'authorization',
    )
  })

  it.each(FONCTIONS)('échoue si %s répond 200 à OPTIONS au lieu de 204', async (fonction) => {
    const { fetchImpl } = fauxDeploiement({
      [`OPTIONS /functions/v1/${fonction}`]: () => new Response('', { status: 200 }),
    })
    expect(echecs(await verifierFonctions({ ...base, fetchImpl }))).toEqual([
      `${fonction} : OPTIONS répond 204`,
    ])
  })

  it('échoue si une fonction accepte un POST sans jeton', async () => {
    const { fetchImpl } = fauxDeploiement({
      'POST /functions/v1/creer-compte': () => new Response('{"ok":true}', { status: 200 }),
    })
    expect(echecs(await verifierFonctions({ ...base, fetchImpl }))).toEqual([
      'creer-compte : POST sans jeton répond 401 non_authentifie',
    ])
  })

  it('échoue si le 401 ne vient pas de la fonction (autre code, corps illisible)', async () => {
    for (const reponse of [
      () => new Response('{"code":401,"message":"Missing authorization header"}', { status: 401 }),
      () => new Response('Unauthorized', { status: 401 }),
      () => new Response('{"erreur":"acces_refuse"}', { status: 403 }),
    ]) {
      const { fetchImpl } = fauxDeploiement({ 'POST /functions/v1/reactiver-compte': reponse })
      expect(echecs(await verifierFonctions({ ...base, fetchImpl }))).toEqual([
        'reactiver-compte : POST sans jeton répond 401 non_authentifie',
      ])
    }
  })

  it('échoue pour une fonction non déployée (404) sans arrêter les autres', async () => {
    const { fetchImpl } = fauxDeploiement({
      'OPTIONS /functions/v1/relancer-invitation': () => new Response('', { status: 404 }),
      'POST /functions/v1/relancer-invitation': () => new Response('', { status: 404 }),
    })
    expect(echecs(await verifierFonctions({ ...base, fetchImpl }))).toHaveLength(2)
  })

  it('échoue sans lever d’erreur si le réseau tombe', async () => {
    const fetchImpl: Fetch = async () => {
      throw new TypeError('fetch failed')
    }
    expect(echecs(await verifierFonctions({ ...base, fetchImpl }))).toHaveLength(10)
  })
})

describe('dossier dist', () => {
  const systemeDe = (fichiers: Record<string, string>): SystemeFichiers => ({
    lister: () => Object.keys(fichiers),
    lire: (chemin) => fichiers[chemin] ?? '',
  })

  it('accepte une application qui nomme les clés secrètes pour les refuser', () => {
    // src/lib/supabase.ts et supabase-js contiennent ces mots : seule la forme d'une clé compte.
    const garde =
      'if(n.startsWith(`sb_secret_`)||JSON.parse(e).role===`service_role`)throw new Error("clé secrète")'
    const resultats = verifierDist({
      dossier: 'dist',
      systeme: systemeDe({ 'dist/assets/index.js': garde, 'dist/index.html': '<html></html>' }),
    })
    expect(echecs(resultats)).toEqual([])
    expect(trouverSecrets(garde)).toEqual([])
  })

  it('accepte la clé publique et une ancienne clé anon', () => {
    const anon = jwt({ role: 'anon', iss: 'supabase' })
    expect(trouverSecrets(`const cle="${CLE}"; const ancienne="${anon}"`)).toEqual([])
  })

  it('refuse une clé au format sb_secret_', () => {
    const secret = 'sb_secret_AbCdEfGhIjKlMnOpQrStUv'
    const resultats = verifierDist({
      systeme: systemeDe({ 'dist/assets/index.js': `x="${secret}"` }),
    })
    expect(echecs(resultats)).toEqual(['Aucune clé secrète dans dist/'])
    expect(resultats[0]?.detail).toContain('dist/assets/index.js')
    expect(resultats[0]?.detail).not.toContain(secret)
  })

  it('refuse un jeton dont le rôle est service_role', () => {
    const ancienneCleSecrete = jwt({ role: 'service_role', iss: 'supabase' })
    expect(trouverSecrets(`x="${ancienneCleSecrete}"`)).toEqual(['jeton avec le rôle service_role'])
    const resultats = verifierDist({
      systeme: systemeDe({ 'dist/assets/index.js': `x="${ancienneCleSecrete}"` }),
    })
    expect(resultats[0]?.detail).not.toContain(ancienneCleSecrete)
  })

  it('refuse le nom d’une variable de clé secrète', () => {
    expect(trouverSecrets('process.env.SUPABASE_SERVICE_ROLE_KEY')).toHaveLength(1)
    expect(trouverSecrets('Deno.env.get("SUPABASE_SECRET_KEYS")')).toHaveLength(1)
  })

  it('échoue si dist est introuvable ou vide', () => {
    const introuvable: SystemeFichiers = {
      lister: () => {
        throw new Error('ENOENT')
      },
      lire: () => '',
    }
    expect(echecs(verifierDist({ systeme: introuvable }))).toHaveLength(1)
    expect(echecs(verifierDist({ systeme: systemeDe({}) }))).toHaveLength(1)
    expect(echecs(verifierDist({ systeme: systemeDe({ 'dist/photo.png': 'x' }) }))).toHaveLength(1)
  })
})

describe('arguments', () => {
  const sûr = ['https://pilotage.example.org', 'https://abcdefghijklmnop.supabase.co', CLE]

  it('lit les trois arguments et le choix pour Google', () => {
    const options = analyserArguments(sûr)
    expect(options.siteUrl.origin).toBe('https://pilotage.example.org')
    expect(options.supabaseUrl.origin).toBe('https://abcdefghijklmnop.supabase.co')
    expect(options.cle).toBe(CLE)
    expect(options.google).toBe(true)
    expect(options.dist).toBe('dist')
    expect(analyserArguments([...sûr, '--google=non', '--dist=build']).google).toBe(false)
    expect(analyserArguments([...sûr, '--google=non', '--dist=build']).dist).toBe('build')
  })

  it('refuse une clé secrète sans la répéter dans le message', () => {
    const secrets = ['sb_secret_AbCdEfGhIjKlMnOpQrStUv', jwt({ role: 'service_role' })]
    for (const secret of secrets) {
      let message = ''
      try {
        analyserArguments([sûr[0] ?? '', sûr[1] ?? '', secret])
      } catch (erreur) {
        message = erreur instanceof Error ? erreur.message : ''
      }
      expect(message).toContain('clé secrète')
      expect(message).not.toContain(secret)
      expect(() => verifierCle(secret)).toThrow()
    }
  })

  it('refuse un nombre d’arguments faux, une option inconnue ou une adresse non sûre', () => {
    expect(() => analyserArguments(sûr.slice(0, 2))).toThrow('Trois arguments')
    expect(() => analyserArguments([...sûr, '--force'])).toThrow('Option inconnue')
    expect(() => analyserArguments([...sûr, '--google=peut-etre'])).toThrow('oui ou non')
    expect(() => analyserArguments(['http://pilotage.example.org', sûr[1] ?? '', CLE])).toThrow(
      'https',
    )
    expect(() => analyserArguments(['pas une adresse', sûr[1] ?? '', CLE])).toThrow('illisible')
    expect(() =>
      analyserArguments(['http://localhost:4173', 'http://127.0.0.1:54321', CLE]),
    ).not.toThrow()
  })
})
