import type { Page, Route } from '@playwright/test'

// Session de berger simulée, sans base : la session est écrite dans le stockage local, et les
// lectures que la garde exige sont simulées au niveau du navigateur (page.route) sur l'adresse
// locale factice du client Supabase. Partagé par e2e/reseau.spec.ts et e2e/decoupage.spec.ts ;
// les parcours avec la vraie base (e2e/base/) ne s'en servent pas.

// Adresse du client Supabase : celle de playwright.config.ts (variable VITE_SUPABASE_URL, sinon la
// base locale par défaut). Le client range sa session sous « sb-<premier mot du nom d'hôte>-auth-token ».
export const SERVEUR = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const CLE_STOCKAGE = `sb-${new URL(SERVEUR).hostname.split('.')[0]}-auth-token`
const UTILISATEUR = '00000000-0000-4000-8000-000000000001'

function base64Url(objet: object): string {
  return Buffer.from(JSON.stringify(objet)).toString('base64url')
}

/**
 * Une session enregistrée de berger, en double authentification (aal2). Le client la lit dans le
 * stockage local, sans appel au serveur : il ne vérifie pas la signature du jeton.
 */
export async function enregistrerSession(page: Page) {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const jeton = [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({
      sub: UTILISATEUR,
      role: 'authenticated',
      aal: 'aal2',
      amr: [{ method: 'totp', timestamp: expiration - 60 }],
      exp: expiration,
    }),
    // Une signature en base64url de longueur valide : le client refuse un jeton mal formé.
    'c2lnbmF0dXJl',
  ].join('.')
  const session = {
    access_token: jeton,
    refresh_token: 'jeton-de-renouvellement',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiration,
    user: {
      id: UTILISATEUR,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'berger@exemple.test',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }
  await page.addInitScript(([cle, valeur]) => window.localStorage.setItem(cle, valeur), [
    CLE_STOCKAGE,
    JSON.stringify(session),
  ] as const)
}

// Le serveur factice est une autre origine que la page : sans ces en-têtes (et sans réponse à la
// requête de vérification OPTIONS), le navigateur refuse la réponse simulée.
export const ENTETES_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
}

const repondreCompte = (route: Route) =>
  route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: ENTETES_CORS })
    : route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: ENTETES_CORS,
        json: {
          user_id: UTILISATEUR,
          type: 'berger',
          ministere_id: null,
          libelle: 'Berger',
          desactive_le: null,
        },
      })

/**
 * Lectures de la session : la ligne de compte du compte connecté (filtrée sur `user_id`, la liste
 * des comptes d'un écran comme le journal n'en est pas une), puis (en aal2) l'acceptation des
 * conditions (T53).
 */
export const estLectureDeSession = (route: Route) => {
  const adresse = new URL(route.request().url())
  if (adresse.pathname.endsWith('/acceptation_conditions')) return true
  return adresse.pathname.endsWith('/compte') && adresse.searchParams.has('user_id')
}

export const repondreSession = (route: Route) =>
  new URL(route.request().url()).pathname.endsWith('/acceptation_conditions') &&
  route.request().method() !== 'OPTIONS'
    ? route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: ENTETES_CORS,
        json: [{ id: 'acceptation-1' }],
      })
    : repondreCompte(route)

/** Les lectures de la base : le compte répond, tout le reste échoue ou reste sans réponse. */
export async function simulerBase(page: Page, autres: 'echec' | 'silence') {
  await page.route(`${SERVEUR}/rest/v1/**`, (route) => {
    if (estLectureDeSession(route)) return repondreSession(route)
    return autres === 'echec' ? route.abort('failed') : new Promise<void>(() => {})
  })
}
