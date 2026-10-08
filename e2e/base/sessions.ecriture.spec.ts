import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { AVEC_BASE, fichierSession } from '../comptes.ts'
import { aujourdhuiDeLaBase, appeler, compter, lire } from './outils-evenements.ts'

// Écran 14, « Sessions » (lot L2), avec la base locale (job « e2e » de la CI, E2E_BASE=1), dans
// le projet « ecritures » : en série, à 1440 px, après les parcours de lecture. L'administration
// de l'église déclare une session du jour (« Autre rassemblement », au nom suffixé pour ne
// jamais heurter le jeu d'exemple), corrige ses ministères attendus, un ministère attendu
// (Communication) la voit dans « Choisir la session », puis l'administration la supprime : la
// base ne garde rien. Le ministère et le berger reçoivent la page non disponible, sans appel
// possible aux trois fonctions. À la fin (test.afterAll, même après un échec), la session
// d'essai est supprimée par la fonction, au nom de l'administration.

// Le suffixe s'écrit en lettres : 5 chiffres de suite ressemblent à une donnée personnelle.
const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const NOM = `Essai sessions ${SUFFIXE}`
const NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

test.describe.configure({ mode: 'serial' })
test.skip(!AVEC_BASE, 'Parcours avec la base locale seulement (E2E_BASE=1).')

const reussite = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ })
const ligneDe = (page: Page) =>
  page.getByRole('region', { name: 'Sessions déclarées' }).locator('tr').filter({ hasText: NOM })

async function ouvrirSessions(page: Page) {
  await page.goto('/sessions')
  await expect(page.getByRole('heading', { level: 1, name: 'Sessions' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sessions déclarées' })).toBeVisible()
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

/** Sessions d'essai lisibles par le compte de la page. */
const sessionsDuTest = (page: Page) =>
  lire<{ id: string }>(page, `session?select=id&intitule=eq.${encodeURIComponent(NOM)}`)

test.describe("l'administration déclare, modifie et supprime une session", () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test.afterAll(async ({ browser }) => {
    if (!AVEC_BASE) return
    const contexte = await browser.newContext({ storageState: fichierSession('admin_eglise') })
    try {
      const page = await contexte.newPage()
      await page.goto('/sessions')
      for (const session of await sessionsDuTest(page)) {
        await appeler(page, 'supprimer_session', { p_session_id: session.id })
      }
    } finally {
      await contexte.close()
    }
  })

  test('déclare une session du jour : huit ministères cochés, la ligne et le journal', async ({
    page,
  }) => {
    await ouvrirSessions(page)
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const journalAvant = await compter(page, 'journal?select=id&action=eq.session_declaree')
    const colonne = page.getByRole('complementary', { name: 'Déclarer une session' })
    await colonne.locator('label').filter({ hasText: 'Autre rassemblement' }).click()
    await colonne.getByLabel('Date', { exact: true }).fill(aujourdhui)
    await colonne.getByLabel('Nom du rassemblement').fill(NOM)
    const cases = colonne.getByRole('checkbox')
    const nombreDeMinisteres = await cases.count()
    expect(nombreDeMinisteres).toBeGreaterThanOrEqual(8)
    await expect(colonne.getByText(`${nombreDeMinisteres} sur ${nombreDeMinisteres}`)).toBeVisible()
    await colonne.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(reussite(page)).toContainText(`Session ${NOM} du`)
    await expect(ligneDe(page)).toHaveCount(1)
    await expect(ligneDe(page)).toContainText('Manquent :')
    expect(await sessionsDuTest(page)).toHaveLength(1)
    expect(await compter(page, 'journal?select=id&action=eq.session_declaree')).toBe(
      journalAvant + 1,
    )
  })

  test('la même session ne se déclare pas deux fois : la base le dit sous le bouton', async ({
    page,
  }) => {
    await ouvrirSessions(page)
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const colonne = page.getByRole('complementary', { name: 'Déclarer une session' })
    await colonne.locator('label').filter({ hasText: 'Autre rassemblement' }).click()
    await colonne.getByLabel('Date', { exact: true }).fill(aujourdhui)
    await colonne.getByLabel('Nom du rassemblement').fill(NOM)
    await colonne.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(colonne.getByRole('alert')).toContainText(
      `Une session « ${NOM} » est déjà déclarée le`,
    )
    expect(await sessionsDuTest(page)).toHaveLength(1)
  })

  test('corrige les ministères attendus : Social n’est plus attendu', async ({ page }) => {
    await ouvrirSessions(page)
    const attendusAvant = await compter(
      page,
      `session_attendu?select=ministere_id&session_id=eq.${(await sessionsDuTest(page))[0]?.id}`,
    )
    await ligneDe(page)
      .getByRole('button', { name: /^Modifier / })
      .click()
    const panneau = page.getByRole('dialog', { name: new RegExp(`^Modifier ${NOM}`) })
    await expect(panneau).toBeVisible()
    await expect(panneau.getByText(`${attendusAvant} sur`)).toBeVisible()
    await panneau.getByRole('checkbox', { name: 'Social' }).uncheck()
    await panneau.getByRole('button', { name: 'Enregistrer les ministères attendus' }).click()
    await expect(reussite(page)).toContainText('Ministères attendus de')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const [session] = await sessionsDuTest(page)
    expect(
      await compter(page, `session_attendu?select=ministere_id&session_id=eq.${session?.id}`),
    ).toBe(attendusAvant - 1)
    await expect(ligneDe(page)).toContainText(String(attendusAvant - 1))
  })

  test('le ministère attendu voit la session dans « Choisir la session »', async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: fichierSession('ministere') })
    try {
      const page = await contexte.newPage()
      await page.goto('/saisir/session/choisir')
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
      const lien = page.locator('[data-colonne]').getByRole('link', { name: new RegExp(NOM) })
      await expect(lien).toBeVisible()
      await expect(lien).toContainText('à saisir')
    } finally {
      await contexte.close()
    }
  })

  test('supprime la session après confirmation : la base ne garde rien', async ({ page }) => {
    await ouvrirSessions(page)
    const [session] = await sessionsDuTest(page)
    await ligneDe(page)
      .getByRole('button', { name: /^Supprimer / })
      .click()
    const fenetre = page.getByRole('alertdialog')
    await expect(fenetre).toBeVisible()
    await fenetre.getByRole('button', { name: 'Supprimer la session' }).click()
    await expect(reussite(page)).toContainText(`Session ${NOM} du`)
    await expect(ligneDe(page)).toHaveCount(0)
    expect(await sessionsDuTest(page)).toHaveLength(0)
    expect(
      await compter(page, `session_attendu?select=ministere_id&session_id=eq.${session?.id}`),
    ).toBe(0)
  })
})

for (const profil of ['ministere', 'berger'] as const) {
  test.describe(`profil ${profil}`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('la page non disponible, et aucune fonction de session ne répond', async ({ page }) => {
      await page.goto('/sessions')
      await expect(page.getByText(NON_DISPONIBLE)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Déclarer la session' })).toHaveCount(0)
      const reponse = await appeler(page, 'declarer_session', {
        p_type: 'batir',
        p_date: '2031-01-04',
        p_intitule: null,
        p_ministeres: [],
      })
      expect(reponse.status()).toBeGreaterThanOrEqual(400)
      expect(await compter(page, 'session?select=id&date=eq.2031-01-04')).toBe(0)
    })
  })
}
