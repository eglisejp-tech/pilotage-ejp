import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

// Réseau (plan de l'étape 7, lot F1) : bandeau hors ligne, lecture interrompue, envoi en échec et
// route sans réponse. Aucune base : les aperçus et l'écran de connexion se passent du serveur, et
// les lectures que le parcours exige sont simulées au niveau du navigateur (page.route) sur
// l'adresse locale factice du client Supabase. Les parcours avec la vraie base (e2e/base/) ne
// sont pas touchés.

const TEXTE_HORS_LIGNE = 'Pas de connexion internet. Les chiffres affichés peuvent dater.'
const ECHEC = 'La connexion a échoué. Réessayez.'
// Adresse du client Supabase : celle de playwright.config.ts (variable VITE_SUPABASE_URL, sinon la
// base locale par défaut). Le client range sa session sous « sb-<premier mot du nom d'hôte>-auth-token ».
const SERVEUR = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const CLE_STOCKAGE = `sb-${new URL(SERVEUR).hostname.split('.')[0]}-auth-token`
const UTILISATEUR = '00000000-0000-4000-8000-000000000001'

const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Pas de connexion internet' })
/** La région « status » du bandeau : toujours là, vide tant que la connexion est là. */
const regionBandeau = (page: Page) => page.locator('#root > [role="status"]')

function base64Url(objet: object): string {
  return Buffer.from(JSON.stringify(objet)).toString('base64url')
}

/**
 * Une session enregistrée de berger, en double authentification (aal2). Le client la lit dans le
 * stockage local, sans appel au serveur : il ne vérifie pas la signature du jeton.
 */
async function enregistrerSession(page: Page) {
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
const ENTETES_CORS = {
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

/** Les lectures de la base : le compte répond, tout le reste échoue ou reste sans réponse. */
async function simulerBase(page: Page, autres: 'echec' | 'silence') {
  await page.route(`${SERVEUR}/rest/v1/**`, (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/compte')) return repondreCompte(route)
    return autres === 'echec' ? route.abort('failed') : new Promise<void>(() => {})
  })
}

test.describe('bandeau hors ligne', () => {
  test('paraît quand la connexion tombe, disparaît quand elle revient, sur la connexion', async ({
    page,
    context,
  }) => {
    await page.goto('/connexion')
    await expect(page.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeVisible()
    // La région existe déjà, vide : un lecteur d'écran annonce le texte quand il y entre.
    await expect(regionBandeau(page)).toHaveCount(1)
    await expect(regionBandeau(page)).toHaveText('')

    await context.setOffline(true)
    await expect(regionBandeau(page)).toHaveText(TEXTE_HORS_LIGNE)
    // Il informe seulement : le formulaire reste là.
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()

    await context.setOffline(false)
    await expect(regionBandeau(page)).toHaveText('')
    await expect(regionBandeau(page)).toHaveCount(1)
  })

  test('paraît aussi sur un aperçu et sur une page publique', async ({ page, context }) => {
    for (const adresse of ['/apercu/cette-semaine', '/confidentialite']) {
      await page.goto(adresse)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await context.setOffline(true)
      await expect(bandeau(page)).toBeVisible()
      await context.setOffline(false)
      await expect(regionBandeau(page)).toHaveText('')
    }
  })

  test('sans faute axe et sans défilement horizontal, bandeau affiché', async ({
    page,
    context,
  }) => {
    await page.goto('/connexion')
    await expect(page.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeVisible()
    await context.setOffline(true)
    await expect(bandeau(page)).toBeVisible()
    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(resultat.violations).toEqual([])
    for (const largeur of [360, 390]) {
      await page.setViewportSize({ width: largeur, height: 800 })
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debordement, `à ${largeur} px`).toBeLessThanOrEqual(0)
    }
  })
})

test.describe('lecture interrompue', () => {
  test('la lecture de la session qui échoue dit « La connexion a échoué », puis Réessayer relit', async ({
    page,
  }) => {
    await enregistrerSession(page)
    let compteDisponible = false
    let lecturesDuCompte = 0
    await page.route(`${SERVEUR}/rest/v1/**`, (route) => {
      if (!new URL(route.request().url()).pathname.endsWith('/compte')) {
        return route.abort('failed')
      }
      if (route.request().method() !== 'OPTIONS') lecturesDuCompte += 1
      return compteDisponible ? repondreCompte(route) : route.abort('failed')
    })

    await page.goto('/')
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toBeVisible()
    await expect(page.getByText('Chargement')).toHaveCount(0)
    const avantLeClic = lecturesDuCompte
    expect(avantLeClic).toBeGreaterThanOrEqual(1)

    compteDisponible = true
    await page.getByRole('button', { name: 'Réessayer' }).click()
    // L'écran d'erreur de la session cède la place à l'application. Les autres lectures de la
    // page d'accueil échouent encore (la base factice ne répond qu'au compte) et leur erreur porte
    // le même texte : on contrôle donc l'écran de session, pas l'alerte.
    await expect(
      page.getByText("Vos informations de connexion n'ont pas pu être vérifiées"),
    ).toHaveCount(0)
    await expect(page.getByRole('banner')).toBeVisible()
    // Une seconde lecture du compte est bien partie après le clic.
    expect(lecturesDuCompte).toBeGreaterThan(avantLeClic)
  })

  test('au retour du réseau, une page en erreur se relit seule, sans clic sur « Réessayer »', async ({
    page,
    context,
  }, infos) => {
    test.skip(infos.project.name !== 'ordinateur', 'Navigation par les onglets : ordinateur.')
    await enregistrerSession(page)
    let reseauRetabli = false
    await page.route(`${SERVEUR}/rest/v1/**`, (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/compte')) return repondreCompte(route)
      if (!reseauRetabli) return route.abort('failed')
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: ENTETES_CORS })
      }
      // Le jour de Paris se lit en un seul objet ; les autres lectures rendent une liste vide.
      const semaine = new URL(route.request().url()).pathname.endsWith('/v_semaine')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: ENTETES_CORS,
        json: semaine
          ? { aujourdhui: '2026-10-07', dimanche: '2026-10-04', lundi: '2026-10-05', numero: 41 }
          : [],
      })
    })
    await page.goto('/')
    const onglets = page.getByRole('navigation').first()
    await expect(onglets).toBeVisible()

    await context.setOffline(true)
    await expect(bandeau(page)).toBeVisible()
    await onglets.getByRole('link', { name: 'Ministères' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ministères' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toBeVisible()

    reseauRetabli = true
    await context.setOffline(false)
    await expect(regionBandeau(page)).toHaveText('')
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
  })

  test('hors ligne, une lecture de page échoue au lieu de rester en « Chargement »', async ({
    page,
    context,
  }, infos) => {
    test.skip(infos.project.name !== 'ordinateur', 'Navigation par les onglets : ordinateur.')
    await enregistrerSession(page)
    await simulerBase(page, 'echec')
    await page.goto('/')
    const onglets = page.getByRole('navigation').first()
    await expect(onglets).toBeVisible()

    await context.setOffline(true)
    await expect(bandeau(page)).toBeVisible()
    await onglets.getByRole('link', { name: 'Ministères' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ministères' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await expect(page.getByText('Chargement')).toHaveCount(0)
  })
})

test.describe('envoi en échec', () => {
  async function remplir(page: Page) {
    await page.goto('/connexion')
    await page.getByLabel('Email').fill('berger@exemple.test')
    await page.getByLabel('Mot de passe').fill('un-mot-de-passe-long')
  }

  async function verifierValeursEtBouton(page: Page) {
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toBeVisible()
    await expect(page.getByLabel('Email')).toHaveValue('berger@exemple.test')
    await expect(page.getByLabel('Mot de passe')).toHaveValue('un-mot-de-passe-long')
    const bouton = page.getByRole('button', { name: 'Se connecter' })
    await expect(bouton).toBeVisible()
    await expect(bouton).not.toHaveAttribute('aria-disabled', 'true')
    await expect(bouton).toBeEnabled()
  }

  test('une requête interrompue garde les valeurs et réactive le bouton', async ({ page }) => {
    await page.route(`${SERVEUR}/auth/v1/**`, (route) => route.abort('failed'))
    await remplir(page)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await verifierValeursEtBouton(page)

    // Le bouton répond à un second essai.
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await verifierValeursEtBouton(page)
  })

  test('hors ligne, le bouton n’est jamais grisé : l’envoi échoue et le dit', async ({
    page,
    context,
  }) => {
    await remplir(page)
    await context.setOffline(true)
    await expect(bandeau(page)).toBeVisible()
    const bouton = page.getByRole('button', { name: 'Se connecter' })
    await expect(bouton).toBeEnabled()
    await expect(bouton).not.toHaveAttribute('aria-disabled', 'true')
    await bouton.click()
    await verifierValeursEtBouton(page)
  })
})

test.describe('route sans réponse', () => {
  test('la lecture de la session sans réponse donne l’erreur de page après 10 s', async ({
    page,
  }, infos) => {
    test.skip(infos.project.name !== 'ordinateur', 'Attente de 10 s : un seul format.')
    test.setTimeout(40_000)
    await enregistrerSession(page)
    // Le compte ne répond jamais : la lecture de la session s'arrête au bout de 10 s.
    await page.route(`${SERVEUR}/rest/v1/**`, () => new Promise<void>(() => {}))

    const debut = Date.now()
    await page.goto('/')
    await expect(page.getByText('Chargement')).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toBeVisible({
      timeout: 20_000,
    })
    const duree = Date.now() - debut
    expect(duree).toBeGreaterThanOrEqual(9_000)
    expect(duree).toBeLessThan(15_000)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  test('une page dont la lecture ne répond pas finit par son erreur et son bouton', async ({
    page,
  }, infos) => {
    test.skip(infos.project.name !== 'ordinateur', 'Attente de 10 s : un seul format.')
    test.setTimeout(40_000)
    await enregistrerSession(page)
    await simulerBase(page, 'silence')
    const debut = Date.now()
    await page.goto('/ministeres')
    await expect(page.getByRole('heading', { level: 1, name: 'Ministères' })).toBeVisible()
    // Comme la lecture de la session : 10 s, sans nouvel essai après un délai dépassé.
    await expect(page.getByRole('alert').filter({ hasText: ECHEC })).toBeVisible({
      timeout: 20_000,
    })
    const duree = Date.now() - debut
    expect(duree).toBeGreaterThanOrEqual(9_000)
    expect(duree).toBeLessThan(15_000)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})
