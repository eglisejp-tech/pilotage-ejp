import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession } from '../comptes.ts'

// Saisies des chiffres du lot E3 avec la base locale (job « e2e » de la CI, E2E_BASE=1), en
// lecture seulement : les profils sans saisie reçoivent la page non disponible, le ministère ouvre
// ses deux formulaires, et le berger lit la valeur exacte du sensible d'exemple à 2 (décision P52 ;
// seed/40 : « Bénéficiaires (passages) » de Social, le dernier mois fini). Les écritures sont dans
// saisies-chiffres.ecriture.spec.ts (projet « ecritures »).

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

/** Lignes lisibles par le compte de la page (API REST, clé publique et jeton de la page). */
async function lire<T>(page: Page, chemin: string): Promise<T[]> {
  const reponse = await page.request.get(`${URL_API}/rest/v1/${chemin}`, {
    headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${await jeton(page)}` },
  })
  expect(reponse.status(), chemin).toBeLessThan(300)
  return (await reponse.json()) as T[]
}

const attendreChargement = (page: Page) =>
  expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })

for (const compte of COMPTES_PROFILS.filter((c) => c.profil !== 'ministere')) {
  test.describe(`saisies des chiffres refusées : ${compte.libelle}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('page non disponible, aucun bouton de saisie', async ({ page }) => {
      for (const adresse of ['/saisir/dimanche', '/saisir/mois']) {
        await page.goto(adresse)
        await expect(page.getByRole('heading', { level: 1, name: NON_DISPONIBLE })).toBeVisible()
        await expect(page.getByRole('button', { name: /^Enregistrer/ })).toHaveCount(0)
      }
    })
  })
}

test.describe('ministère Communication, en lecture', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('la saisie du dimanche s’ouvre sur le dimanche de référence, quatre aides au plus', async ({
    page,
  }) => {
    await page.goto('/saisir/dimanche')
    await attendreChargement(page)
    await expect(page.getByRole('heading', { level: 1, name: /^Dimanche \d+ / })).toBeVisible()
    await expect(page.getByLabel('STARs au service ce dimanche', { exact: true })).toBeVisible()
    expect(await page.getByRole('button', { name: /^Aide : / }).count()).toBeLessThanOrEqual(4)
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_dimanche',
    )
  })

  test('« Chiffres du mois » s’ouvre, avec son lien « Signaler une difficulté »', async ({
    page,
  }) => {
    await page.goto('/saisir/mois')
    await attendreChargement(page)
    // Le surtitre, et aussi le titre si Communication n'a aucun indicateur du mois.
    await expect(page.getByText('Chiffres du mois', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_mois',
    )
  })
})

test.describe('valeur exacte : le sensible d’exemple à 2 (P52)', () => {
  test.use({ storageState: fichierSession('berger') })

  test('le berger lit la valeur exacte 2, sans « moins de 3 »', async ({ page }) => {
    await page.goto('/')
    const [semaine] = await lire<{ aujourdhui: string }>(page, 'v_semaine?select=aujourdhui')
    expect(semaine).toBeTruthy()
    const [annee, mois] = (semaine?.aujourdhui ?? '').split('-').map(Number)
    const precedent = new Date(Date.UTC(annee ?? 0, (mois ?? 1) - 2, 1)).toISOString().slice(0, 10)
    const [indicateur] = await lire<{ id: string }>(
      page,
      'indicateur?select=id&modele_code=eq.social_beneficiaires_passages',
    )
    expect(indicateur).toBeTruthy()
    const lignes = await lire<{ valeur: number | null; moins_de_3: boolean }>(
      page,
      `v_mesure_periode?select=valeur,moins_de_3&indicateur_id=eq.${indicateur?.id}&periode=eq.${precedent}`,
    )
    expect(lignes).toEqual([{ valeur: 2, moins_de_3: false }])
    // Les lignes brutes ne se lisent pas : la vue donne la valeur du mois, seul le ministère qui
    // saisit lit ses lignes une à une.
    expect(await lire(page, `mesure?select=valeur&indicateur_id=eq.${indicateur?.id}`)).toEqual([])
  })
})
