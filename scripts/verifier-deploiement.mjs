// Contrôle d'un déploiement, en lecture seule (plan de l'étape 8, lot D2).
//
//   node scripts/verifier-deploiement.mjs <url-du-site> <url-supabase> <cle-publique> [--google=oui|non] [--dist=dist]
//
// Il vérifie : les en-têtes du site, la page /ma-fiche, les réglages Auth (inscription fermée,
// connexion par email, Google selon le choix), les 5 Edge Functions de comptes (OPTIONS puis POST
// sans jeton) et l'absence de clé secrète dans le dossier dist/. Il n'écrit rien nulle part et
// n'accepte jamais de clé secrète : seulement la clé publique (sb_publishable_...). Sortie : code 0
// si tout est au vert, 1 si un contrôle échoue, 2 si les arguments sont faux.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Les 5 fonctions de supabase/functions (verify_jwt = false dans config.toml).
export const FONCTIONS = [
  'creer-compte',
  'desactiver-compte',
  'reactiver-compte',
  'reinitialiser-2fa',
  'relancer-invitation',
]

const DELAI_MS = 15000
const HSTS_MIN = 15552000 // 180 jours
const MOTIF_CLE_SECRETE = /sb_secret_[A-Za-z0-9_-]{20,}/
const MOTIF_JWT = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g
const MOTIF_NOMS_SECRETS = /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/
const EXTENSIONS_TEXTE = /\.(js|mjs|css|html|json|map|txt|svg|webmanifest)$/i

// ---------------------------------------------------------------- aides

function resultat(nom, ok, detail) {
  return { nom, ok, detail }
}

function estLocal(url) {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
}

function nettoyerUrl(texte, etiquette) {
  let url
  try {
    url = new URL(texte)
  } catch {
    throw new Error(`${etiquette} : adresse illisible.`)
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && estLocal(url))) {
    throw new Error(
      `${etiquette} : l'adresse doit commencer par https:// (http:// seulement en local).`,
    )
  }
  return url
}

function racineDe(url) {
  return url.origin
}

// Une clé secrète ne doit jamais passer par ce script : ni le format sb_secret_, ni une ancienne
// clé JWT dont le rôle est service_role.
function jwtServiceRole(jeton) {
  const morceaux = jeton.split('.')
  if (morceaux.length !== 3) return false
  try {
    const charge = JSON.parse(Buffer.from(morceaux[1] ?? '', 'base64url').toString('utf8'))
    return charge?.role === 'service_role'
  } catch {
    return false
  }
}

export function verifierCle(cle) {
  if (typeof cle !== 'string' || cle.trim() === '') throw new Error('Clé publique manquante.')
  if (cle.startsWith('sb_secret_') || jwtServiceRole(cle)) {
    throw new Error(
      'Clé refusée : c’est une clé secrète. Ce script n’accepte que la clé publique (sb_publishable_...).',
    )
  }
  return cle.trim()
}

export function analyserArguments(argv) {
  const positions = []
  const options = { google: true, dist: 'dist' }
  for (const argument of argv) {
    if (argument.startsWith('--google=')) {
      const valeur = argument.slice('--google='.length)
      if (valeur !== 'oui' && valeur !== 'non') throw new Error('--google accepte oui ou non.')
      options.google = valeur === 'oui'
    } else if (argument.startsWith('--dist=')) {
      options.dist = argument.slice('--dist='.length)
    } else if (argument.startsWith('--')) {
      throw new Error(`Option inconnue : ${argument.split('=')[0]}.`)
    } else {
      positions.push(argument)
    }
  }
  if (positions.length !== 3) {
    throw new Error(
      'Trois arguments attendus : URL du site, URL Supabase, clé publique (jamais une clé secrète).',
    )
  }
  const [site, supabase, cle] = positions
  return {
    siteUrl: nettoyerUrl(site, 'URL du site'),
    supabaseUrl: nettoyerUrl(supabase, 'URL Supabase'),
    cle: verifierCle(cle),
    google: options.google,
    dist: options.dist,
  }
}

// Appel réseau borné dans le temps, sans suivre les redirections (une redirection est un écart).
async function appeler(fetchImpl, url, init = {}) {
  return fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(DELAI_MS), ...init })
}

async function essayer(nom, action) {
  try {
    return await action()
  } catch (erreur) {
    const code = erreur instanceof Error ? erreur.name : 'erreur'
    return [resultat(nom, false, `appel impossible (${code})`)]
  }
}

// ---------------------------------------------------------------- le site

function lireCsp(valeur) {
  const directives = new Map()
  for (const partie of valeur.split(';')) {
    const [nom, ...sources] = partie.trim().split(/\s+/)
    if (nom) directives.set(nom.toLowerCase(), sources)
  }
  return directives
}

function controlerCsp(valeur, supabaseUrl) {
  if (!valeur) return [resultat('CSP présente', false, 'en-tête Content-Security-Policy absent')]
  const directives = lireCsp(valeur)
  const sans = (nom) => directives.get(nom) ?? []
  const toutes = [...directives.values()].flat()
  const connexions = sans('connect-src')
  const origineSupabase = racineDe(supabaseUrl)
  const connexionsEtrangeres = connexions.filter(
    (source) => source !== "'self'" && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(source),
  )
  const exactement = (nom, attendu) => {
    const sources = sans(nom)
    return sources.length === 1 && sources[0] === attendu
  }
  return [
    resultat('CSP présente', true),
    resultat(
      'CSP sans unsafe-eval ni joker',
      !toutes.includes("'unsafe-eval'") && !toutes.includes('*'),
      toutes.includes('*')
        ? 'joker * trouvé'
        : toutes.includes("'unsafe-eval'")
          ? 'unsafe-eval trouvé'
          : undefined,
    ),
    resultat("CSP : scripts de l'application seulement", exactement('script-src', "'self'")),
    resultat("CSP : default-src 'self'", exactement('default-src', "'self'")),
    resultat(
      'CSP : connect-src limité au site et à Supabase',
      connexions.includes("'self'") &&
        (connexions.includes(origineSupabase) || estLocal(supabaseUrl)) &&
        connexionsEtrangeres.length === 0,
      `connect-src : ${connexions.join(' ') || 'absent'}`,
    ),
    resultat("CSP : frame-ancestors 'none'", exactement('frame-ancestors', "'none'")),
    resultat("CSP : object-src 'none'", exactement('object-src', "'none'")),
    resultat("CSP : base-uri 'self'", exactement('base-uri', "'self'")),
    resultat("CSP : form-action 'self'", exactement('form-action', "'self'")),
  ]
}

function controlerEntetes(entetes, siteUrl) {
  const resultats = []
  if (siteUrl.protocol === 'https:') {
    const hsts = entetes.get('strict-transport-security') ?? ''
    const age = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? '0')
    resultats.push(
      resultat(
        'HSTS',
        age >= HSTS_MIN,
        hsts ? `Strict-Transport-Security : ${hsts}` : 'en-tête absent',
      ),
    )
  }
  resultats.push(
    resultat(
      'X-Content-Type-Options: nosniff',
      (entetes.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff',
    ),
    resultat(
      'Referrer-Policy: no-referrer',
      (entetes.get('referrer-policy') ?? '').toLowerCase() === 'no-referrer',
      "le jeton de /acces est dans l'adresse",
    ),
    resultat(
      'Permissions-Policy présente',
      (entetes.get('permissions-policy') ?? '').trim() !== '',
    ),
    resultat('X-Robots-Tag: noindex', /noindex/i.test(entetes.get('x-robots-tag') ?? '')),
  )
  return resultats
}

export async function verifierSite({ siteUrl, supabaseUrl, fetchImpl = fetch }) {
  const adresse = new URL('/ma-fiche', siteUrl).href
  const premiere = await essayer('Page /ma-fiche', async () => {
    const reponse = await appeler(fetchImpl, adresse, { method: 'GET' })
    return { reponse, corps: reponse.status === 200 ? await reponse.text() : '' }
  })
  if (Array.isArray(premiere)) return premiere
  const { reponse, corps } = premiere

  const resultats = [
    resultat('/ma-fiche répond 200', reponse.status === 200, `statut ${reponse.status}`),
    resultat(
      '/ma-fiche renvoie la page de l’application',
      /text\/html/i.test(reponse.headers.get('content-type') ?? '') && /<div id="root"/.test(corps),
    ),
    ...controlerCsp(reponse.headers.get('content-security-policy'), supabaseUrl),
    ...controlerEntetes(reponse.headers, siteUrl),
  ]

  const asset = /(?:src|href)="(\/assets\/[^"]+)"/.exec(corps)?.[1]
  if (!asset) {
    resultats.push(
      resultat('Cache immuable de /assets/*', false, 'aucun fichier /assets/ dans la page'),
    )
  } else {
    const cache = await essayer('Cache immuable de /assets/*', async () => {
      const rep = await appeler(fetchImpl, new URL(asset, siteUrl).href, { method: 'HEAD' })
      const controle = rep.headers.get('cache-control') ?? ''
      return [
        resultat(
          'Cache immuable de /assets/*',
          rep.status === 200 && /immutable/i.test(controle),
          `statut ${rep.status}, Cache-Control : ${controle || 'absent'}`,
        ),
      ]
    })
    resultats.push(...cache)
  }
  return resultats
}

// ---------------------------------------------------------------- Auth

export async function verifierAuth({ supabaseUrl, cle, google, fetchImpl = fetch }) {
  return essayer('Réglages Auth', async () => {
    const reponse = await appeler(fetchImpl, new URL('/auth/v1/settings', supabaseUrl).href, {
      method: 'GET',
      headers: { apikey: cle },
    })
    if (reponse.status !== 200) {
      return [resultat('Réglages Auth lisibles', false, `statut ${reponse.status}`)]
    }
    const reglages = await reponse.json()
    const externes = reglages?.external ?? {}
    return [
      resultat('Réglages Auth lisibles', true),
      resultat('Inscription désactivée (disable_signup)', reglages?.disable_signup === true),
      resultat('Connexion par email activée (external.email)', externes.email === true),
      resultat(
        google
          ? 'Connexion Google activée (external.google)'
          : 'Connexion Google désactivée (external.google)',
        externes.google === google,
      ),
    ]
  })
}

// ---------------------------------------------------------------- Edge Functions

export async function verifierFonctions({ siteUrl, supabaseUrl, cle, fetchImpl = fetch }) {
  const resultats = []
  for (const fonction of FONCTIONS) {
    const adresse = new URL(`/functions/v1/${fonction}`, supabaseUrl).href
    const options = await essayer(`${fonction} : OPTIONS`, async () => {
      const reponse = await appeler(fetchImpl, adresse, {
        method: 'OPTIONS',
        headers: {
          Origin: racineDe(siteUrl),
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization, apikey, content-type',
        },
      })
      return [
        resultat(
          `${fonction} : OPTIONS répond 204`,
          reponse.status === 204,
          `statut ${reponse.status}`,
        ),
      ]
    })
    resultats.push(...options)

    const sansJeton = await essayer(`${fonction} : POST sans jeton`, async () => {
      const reponse = await appeler(fetchImpl, adresse, {
        method: 'POST',
        headers: { apikey: cle, 'Content-Type': 'application/json' },
        body: '{}',
      })
      let code = '(corps illisible)'
      try {
        code = (await reponse.json())?.erreur ?? '(sans code)'
      } catch {
        // le corps n'est pas du JSON : le contrôle échoue ci-dessous
      }
      return [
        resultat(
          `${fonction} : POST sans jeton répond 401 non_authentifie`,
          reponse.status === 401 && code === 'non_authentifie',
          `statut ${reponse.status}, code ${code}`,
        ),
      ]
    })
    resultats.push(...sansJeton)
  }
  return resultats
}

// ---------------------------------------------------------------- dist/

const systemeDisque = {
  lister(dossier) {
    const fichiers = []
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name)
      if (entree.isDirectory()) fichiers.push(...this.lister(chemin))
      else fichiers.push(chemin)
    }
    return fichiers
  },
  lire(chemin) {
    return readFileSync(chemin, 'utf8')
  },
}

// Les bibliothèques et la garde de src/lib/supabase.ts contiennent les mots « sb_secret_ » et
// « service_role » (elles servent à refuser ces clés) : on cherche donc une clé qui en a la
// forme, pas le mot seul.
export function trouverSecrets(texte) {
  const trouvailles = []
  if (MOTIF_CLE_SECRETE.test(texte)) trouvailles.push('clé au format sb_secret_')
  for (const [, charge] of texte.matchAll(MOTIF_JWT)) {
    try {
      const revendications = JSON.parse(Buffer.from(charge ?? '', 'base64url').toString('utf8'))
      if (revendications?.role === 'service_role')
        trouvailles.push('jeton avec le rôle service_role')
    } catch {
      // ce n'est pas un jeton lisible
    }
  }
  if (MOTIF_NOMS_SECRETS.test(texte)) trouvailles.push('nom de variable de clé secrète')
  return trouvailles
}

export function verifierDist({ dossier = 'dist', systeme = systemeDisque } = {}) {
  const nom = `Aucune clé secrète dans ${dossier}/`
  let fichiers
  try {
    fichiers = systeme.lister(dossier).filter((chemin) => EXTENSIONS_TEXTE.test(chemin))
  } catch {
    return [resultat(nom, false, `dossier ${dossier}/ introuvable : lancer npm run build`)]
  }
  if (fichiers.length === 0) return [resultat(nom, false, `${dossier}/ ne contient aucun fichier`)]
  const fautes = []
  for (const chemin of fichiers) {
    for (const trouvaille of trouverSecrets(systeme.lire(chemin))) {
      fautes.push(`${chemin} : ${trouvaille}`)
    }
  }
  return [
    resultat(
      nom,
      fautes.length === 0,
      fautes.length === 0 ? `${fichiers.length} fichiers lus` : fautes.join(' ; '),
    ),
  ]
}

// ---------------------------------------------------------------- ensemble

export async function verifierDeploiement({
  siteUrl,
  supabaseUrl,
  cle,
  google = true,
  dist = 'dist',
  fetchImpl = fetch,
  systeme,
}) {
  return [
    ...(await verifierSite({ siteUrl, supabaseUrl, fetchImpl })),
    ...(await verifierAuth({ supabaseUrl, cle, google, fetchImpl })),
    ...(await verifierFonctions({ siteUrl, supabaseUrl, cle, fetchImpl })),
    ...verifierDist({ dossier: dist, systeme }),
  ]
}

export function formaterResultats(resultats) {
  const lignes = resultats.map(
    ({ nom, ok, detail }) =>
      `${ok ? 'OK    ' : 'ECHEC '} ${nom}${!ok && detail ? ` (${detail})` : ''}`,
  )
  const echecs = resultats.filter((r) => !r.ok).length
  lignes.push(
    '',
    echecs === 0
      ? `Tout est au vert (${resultats.length} contrôles).`
      : `${echecs} contrôle(s) en échec sur ${resultats.length}.`,
  )
  return lignes.join('\n')
}

async function principal() {
  let options
  try {
    options = analyserArguments(process.argv.slice(2))
  } catch (erreur) {
    console.error(erreur instanceof Error ? erreur.message : String(erreur))
    console.error(
      'Usage : node scripts/verifier-deploiement.mjs <url-du-site> <url-supabase> <cle-publique> [--google=oui|non] [--dist=dist]',
    )
    process.exit(2)
  }
  const resultats = await verifierDeploiement(options)
  console.log(formaterResultats(resultats))
  process.exit(resultats.every((r) => r.ok) ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal()
}
