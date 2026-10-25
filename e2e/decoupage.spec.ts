import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { enregistrerSession, simulerBase } from './outils/session-simulee.ts'

// Découpage du code par écran (veille du 25 octobre, priorité 3) : le code d'un écran arrive la
// première fois qu'il s'ouvre (src/app/AffichageEcran.tsx). Sans base : une session de berger
// simulée, et des lectures de la base sans réponse (les écrans restent dans leur chargement, sous
// leur titre). Le serveur de développement sert chaque page à part (/src/pages/Page….tsx), comme le
// build le fait avec ses fichiers : retarder ou couper sa réponse simule un réseau lent, une
// coupure ou une nouvelle version en ligne. Trois formats par les projets Playwright.

const CHARGEMENT = 'Chargement de la page'
const ECHEC = 'La connexion a échoué. Réessayez.'
const CODE_JOURNAL = '**/src/pages/PageJournal.tsx*'

/** Un onglet du berger, par la ligne d'onglets ou par le menu (tablette, téléphone). */
async function allerA(page: Page, onglet: string) {
  const ouvrirMenu = page.getByRole('banner').getByRole('button', { name: 'Ouvrir le menu' })
  if (await ouvrirMenu.isVisible()) await ouvrirMenu.click()
  await page
    .getByRole('navigation', { name: 'Menu principal' })
    .getByRole('link', { name: onglet })
    .click()
}

const titre = (page: Page, nom: string) => page.getByRole('heading', { level: 1, name: nom })

/** Ouvre l'outil sur « Cette semaine » (la garde a lu la session simulée). */
async function ouvrirOutil(page: Page) {
  await enregistrerSession(page)
  await simulerBase(page, 'silence')
  await page.goto('/')
  await expect(titre(page, 'Cette semaine')).toBeAttached()
  await expect(page.getByRole('banner')).toBeVisible()
}

/**
 * Note, dans la page, quand « Chargement de la page » paraît et disparaît (ms, `performance.now`),
 * à partir de l'appel : la règle de temps de T65 se mesure dans le navigateur, pas dans le test.
 */
async function observerChargement(page: Page) {
  await page.evaluate((texte) => {
    const etat: { depart: number; apparu?: number; parti?: number } = { depart: performance.now() }
    Object.assign(window, { __chargement: etat })
    const present = () => document.body.innerText.includes(texte)
    new MutationObserver(() => {
      if (etat.apparu === undefined && present()) etat.apparu = performance.now()
      if (etat.apparu !== undefined && etat.parti === undefined && !present()) {
        etat.parti = performance.now()
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true })
  }, CHARGEMENT)
}

function lireChargement(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __chargement: { depart: number; apparu?: number; parti?: number } })
        .__chargement,
  )
}

test.describe('découpage du code par écran', () => {
  test('navigation entre les écrans : chacun arrive, l’en-tête reste, rien ne se recharge', async ({
    page,
  }) => {
    const demandes: string[] = []
    page.on('request', (requete) => {
      const chemin = new URL(requete.url()).pathname
      if (/^\/src\/pages\/Page\w+\.tsx$/.test(chemin)) demandes.push(chemin)
    })
    await ouvrirOutil(page)

    for (const [onglet, nom] of [
      ['Ministères', 'Ministères'],
      ["Points d'attention", "Points d'attention"],
      ['Journal', 'Journal'],
      ['Cette semaine', 'Cette semaine'],
      ['Ministères', 'Ministères'],
      ['Journal', 'Journal'],
    ] as const) {
      await allerA(page, onglet)
      await expect(titre(page, nom)).toBeAttached()
      await expect(page).toHaveTitle(`${nom}, Pilotage EJP`)
      await expect(page.getByRole('banner')).toBeVisible()
    }
    // Chaque écran n'a été demandé qu'une fois : un écran déjà ouvert ne se recharge pas.
    expect(new Set(demandes).size, demandes.join(', ')).toBe(demandes.length)
    // (Les pages communes, comme ErreurDePage, sont aussi des fichiers à part en développement.)
    expect(demandes).toEqual(
      expect.arrayContaining([
        '/src/pages/PageCetteSemaine.tsx',
        '/src/pages/PageJournal.tsx',
        '/src/pages/PageMinisteres.tsx',
        '/src/pages/PagePoints.tsx',
      ]),
    )
  })

  test('code lent : rien pendant 300 ms, puis « Chargement de la page » au moins 600 ms', async ({
    page,
  }) => {
    await ouvrirOutil(page)
    await page.route(CODE_JOURNAL, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
    await observerChargement(page)
    await allerA(page, 'Journal')
    await expect(page.getByRole('status').filter({ hasText: CHARGEMENT })).toBeVisible()
    await expect(titre(page, 'Journal')).toBeVisible({ timeout: 10_000 })
    const temps = await lireChargement(page)
    expect(temps.apparu, 'le chargement a paru').toBeDefined()
    expect(temps.parti, 'le chargement est parti').toBeDefined()
    // Rien pendant 300 ms (le clic compte dans le délai), puis au moins 600 ms à l'écran.
    expect(temps.apparu! - temps.depart).toBeGreaterThanOrEqual(290)
    expect(temps.parti! - temps.apparu!).toBeGreaterThanOrEqual(590)

    // Revenir au journal : il est déjà là, aucun chargement de page.
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await simulerBase(page, 'silence')
    await allerA(page, 'Cette semaine')
    await expect(titre(page, 'Cette semaine')).toBeAttached()
    await observerChargement(page)
    await allerA(page, 'Journal')
    await expect(titre(page, 'Journal')).toBeVisible()
    expect((await lireChargement(page)).apparu).toBeUndefined()
  })

  test('code qui n’arrive pas, serveur muet : l’erreur et « Réessayer », jamais de page blanche', async ({
    page,
  }) => {
    await ouvrirOutil(page)
    await page.route(CODE_JOURNAL, (route) => route.abort('failed'))
    // Le serveur ne répond pas non plus : l'outil ne se recharge pas.
    await page.route('/', (route) =>
      route.request().resourceType() === 'fetch' ? route.abort('failed') : route.fallback(),
    )
    await allerA(page, 'Journal')
    await expect(page.getByRole('alert')).toHaveText(ECHEC)
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page).toHaveURL(/\/journal$/)
    await expect(titre(page, 'Journal')).toBeAttached()

    await page.unroute(CODE_JOURNAL)
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(titre(page, 'Journal')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('nouvelle version en ligne (ancien code absent) : l’outil se recharge sur l’écran demandé', async ({
    page,
  }) => {
    await ouvrirOutil(page)
    let premiere = true
    await page.route(CODE_JOURNAL, (route) => {
      if (!premiere) return route.fallback()
      premiere = false
      return route.fulfill({ status: 404, body: 'absent' })
    })
    const rechargement = page.waitForEvent('load')
    await allerA(page, 'Journal')
    await rechargement
    await expect(page).toHaveURL(/\/journal$/)
    await expect(titre(page, 'Journal')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(premiere).toBe(false)
  })

  test('hors ligne : l’erreur sous le bandeau ; au retour du réseau, l’écran arrive seul', async ({
    page,
    context,
  }) => {
    await ouvrirOutil(page)
    await context.setOffline(true)
    await allerA(page, 'Journal')
    await expect(page.getByRole('alert')).toHaveText(ECHEC)
    await expect(
      page.getByRole('status').filter({ hasText: 'Pas de connexion internet' }),
    ).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()

    // Comme une lecture en erreur se relit seule (reseau.spec.ts), sans clic sur « Réessayer ».
    await context.setOffline(false)
    await expect(titre(page, 'Journal')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
