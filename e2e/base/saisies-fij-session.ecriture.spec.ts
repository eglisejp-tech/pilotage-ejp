import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, seConnecter } from '../comptes.ts'

// Saisies du lot E4 avec la base locale (job « e2e » de la CI, E2E_BASE=1), dans le projet
// « ecritures » : en série, à 1440 px, après les parcours de lecture. Chaque parcours compte les
// lignes avant et après, par l'API et avec la session du compte lui-même (clé publique, jamais
// la clé secrète) : une présence crée une ligne de `participation` et une ligne de journal ;
// 32 valeurs par département partent en un envoi et une ligne de journal. Les autres profils,
// EJP Tech compris, reçoivent la page non disponible.

const NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const URL_API = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const CLE_PUBLIQUE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

/** Jeton de la session ouverte dans la page (stockage du client Supabase). */
async function jeton(page: Page): Promise<string> {
  return page.evaluate(() => {
    const cle = Object.keys(localStorage).find(
      (nom) => nom.startsWith('sb-') && nom.endsWith('-auth-token'),
    )
    const session = cle ? (JSON.parse(localStorage.getItem(cle) ?? '{}') as unknown) : null
    if (typeof session === 'object' && session !== null && 'access_token' in session) {
      return String(session.access_token)
    }
    throw new Error('Aucune session dans la page.')
  })
}

/** Nombre de lignes lisibles par le compte (`Prefer: count=exact`), filtres PostgREST compris. */
async function compter(page: Page, chemin: string): Promise<number> {
  const reponse = await page.request.get(`${URL_API}/rest/v1/${chemin}`, {
    headers: {
      apikey: CLE_PUBLIQUE,
      Authorization: `Bearer ${await jeton(page)}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })
  expect(reponse.status(), chemin).toBeLessThan(300)
  const total = /\/(\d+)$/.exec(reponse.headers()['content-range'] ?? '')?.[1]
  return Number(total ?? Number.NaN)
}

const attendreChargement = (page: Page) =>
  expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })

/** Première session du panneau « Choisir la session » (pas un lien de l'en-tête). */
const premiereSession = (page: Page) =>
  page.locator('[data-colonne]').getByRole('list').getByRole('link').first()

test.describe('présence à une session, ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('une présence crée une ligne et une ligne de journal ; « Déjà saisi » la reprend', async ({
    page,
  }) => {
    await page.goto('/saisir/session/choisir')
    await attendreChargement(page)
    const premiere = premiereSession(page)
    await expect(premiere).toBeVisible()
    await premiere.click()
    await expect(page).toHaveURL(/\/saisir\/session\/[0-9a-f-]{36}$/)
    const sessionId = page.url().split('/').at(-1) ?? ''
    await attendreChargement(page)

    const lignesAvant = await compter(page, `participation?select=id&session_id=eq.${sessionId}`)
    const journalAvant = await compter(page, 'journal?select=id&action=eq.participation_saisie')

    const presents = page.getByLabel('STARs de votre ministère présents', { exact: true })
    const dejaComptes = page.getByLabel('Dont déjà comptés par leur ministère principal', {
      exact: true,
    })
    await presents.fill('17')
    await dejaComptes.fill('3')
    await expect(page.getByText("Comptés dans le total de l'église : 14.")).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer la présence' }).click()
    await expect(page.getByRole('status').getByText(/^Présence enregistrée pour /)).toBeVisible()

    expect(await compter(page, `participation?select=id&session_id=eq.${sessionId}`)).toBe(
      lignesAvant + 1,
    )
    expect(await compter(page, 'journal?select=id&action=eq.participation_saisie')).toBe(
      journalAvant + 1,
    )

    await page.reload()
    await attendreChargement(page)
    await expect(page.getByText(/^Déjà saisi : 17 présents, dont 3 déjà comptés/)).toBeVisible()
    await expect(presents).toHaveValue('17')
  })

  test('plus de déjà comptés que de présents : refusé avant tout envoi', async ({ page }) => {
    await page.goto('/saisir/session/choisir')
    await attendreChargement(page)
    await premiereSession(page).click()
    await attendreChargement(page)
    await page.getByLabel('STARs de votre ministère présents', { exact: true }).fill('2')
    await page
      .getByLabel('Dont déjà comptés par leur ministère principal', { exact: true })
      .fill('5')
    await page.getByRole('button', { name: 'Enregistrer la présence' }).click()
    await expect(page.getByText('Ce nombre ne peut pas dépasser les présents.')).toBeVisible()
  })

  test('les deux saisies FIJ : la page non disponible pour un autre ministère', async ({
    page,
  }) => {
    for (const adresse of ['/saisir/fij', '/saisir/fij-statistiques']) {
      await page.goto(adresse)
      await expect(page.getByRole('heading', { level: 1, name: NON_DISPONIBLE })).toBeVisible()
    }
  })
})

for (const compte of COMPTES_PROFILS.filter((c) => c.profil !== 'ministere')) {
  test.describe(`saisies du lot E4 refusées : ${compte.libelle}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('page non disponible, aucun bouton de saisie', async ({ page }) => {
      for (const adresse of [
        '/saisir/session/choisir',
        '/saisir/fij',
        '/saisir/fij-statistiques',
      ]) {
        await page.goto(adresse)
        await expect(page.getByRole('heading', { level: 1, name: NON_DISPONIBLE })).toBeVisible()
        await expect(page.getByRole('button', { name: /^Enregistrer/ })).toHaveCount(0)
      }
    })
  })
}

test.describe('ministère FIJ', () => {
  test('la carte (8 départements) puis 32 valeurs par département : une ligne de journal chacune', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await seConnecter(page, 'fij@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')

    // Carte des FIJ : 8 lignes en un envoi, une ligne de journal `fij_saisie`.
    await page.goto('/saisir/fij')
    await attendreChargement(page)
    const carteAvant = await compter(page, 'fij_departement?select=id')
    const journalCarteAvant = await compter(page, 'journal?select=id&action=eq.fij_saisie')
    const champsCarte = page.getByRole('textbox')
    await expect(champsCarte).toHaveCount(8)
    for (let rang = 0; rang < 8; rang++) await champsCarte.nth(rang).fill(String(rang + 1))
    await expect(page.getByText('Total : 36 FIJ')).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer la carte' }).click()
    await expect(page.getByRole('status').getByText('Carte des FIJ enregistrée.')).toBeVisible()
    expect(await compter(page, 'fij_departement?select=id')).toBe(carteAvant + 8)
    expect(await compter(page, 'journal?select=id&action=eq.fij_saisie')).toBe(
      journalCarteAvant + 1,
    )

    // Chiffres par département : 32 valeurs en un appel, une ligne de journal sans valeur.
    await page.goto('/saisir/fij-statistiques')
    await attendreChargement(page)
    const statistiquesAvant = await compter(page, 'fij_statistique?select=id')
    const journalAvant = await compter(page, 'journal?select=id&action=eq.fij_statistiques_saisies')
    const champs = page.getByRole('group').getByRole('textbox')
    await expect(champs).toHaveCount(32)
    for (let rang = 0; rang < 32; rang++) await champs.nth(rang).fill(String(rang % 9))
    await page.getByRole('button', { name: 'Enregistrer les chiffres' }).click()
    await expect(
      page
        .getByRole('status')
        .getByText(/^Chiffres par département de la semaine \d+ enregistrés\.$/),
    ).toBeVisible()
    expect(await compter(page, 'fij_statistique?select=id')).toBe(statistiquesAvant + 32)
    expect(await compter(page, 'journal?select=id&action=eq.fij_statistiques_saisies')).toBe(
      journalAvant + 1,
    )
  })
})
