import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Écran 14, « Sessions » (lot L2), sur l'aperçu de développement : le vrai écran, des données
// d'exemple, des actions simulées comme les fonctions de la base (aucune base, aucune écriture).
// Trois formats par les projets Playwright : 1440, 834 et 390 px. Le parcours avec la base locale
// (« Choisir la session » du ministère attendu) est dans sessions.ecriture.spec.ts.

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

async function ouvrir(page: Page, requete = '') {
  await page.goto(`/apercu/sessions?profil=admin_eglise${requete ? `&${requete}` : ''}`)
  await page.evaluate(() => document.fonts.ready)
}

const largeur = (page: Page) => page.viewportSize()?.width ?? 0
const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true })
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ })
const liste = (page: Page) => page.getByRole('region', { name: 'Sessions déclarées' })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

/** Le formulaire de déclaration : la colonne à partir de 1024 px, sinon le panneau du bouton. */
async function ouvrirDeclaration(page: Page): Promise<Locator> {
  if (largeur(page) < 1024) await bouton(page, 'Déclarer une session').click()
  const formulaire = page.locator('form')
  await expect(formulaire).toHaveCount(1)
  return formulaire
}

/** Le panneau « Modifier » : fenêtre à partir de 600 px, page entière en dessous. */
const panneauModifier = (page: Page, designation: string) =>
  page.getByRole(largeur(page) >= 600 ? 'dialog' : 'region', { name: `Modifier ${designation}` })

test.describe('Sessions (administration), aperçu', () => {
  test('titre, liste des sessions, complétude et ministères qui manquent', async ({ page }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle('Sessions, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sessions')
    const sessions = liste(page)
    await expect(sessions).toContainText('Pas encore eu lieu')
    await expect(sessions).toContainText('6 sur 8')
    await expect(sessions).toContainText('Manquent : Intégration et Social')
    await expect(sessions.getByText('8 sur 8')).toHaveCount(4)
    await expect(sessions).toContainText("Bâtir l'Église")
    await expect(sessions).toContainText('Anti-Dispersion')
    // Seule une session sans saisie se supprime.
    await expect(page.getByRole('button', { name: /^Supprimer / })).toHaveCount(1)
    await expect(bouton(page, 'Supprimer Anti-Dispersion du 10 oct.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Modifier / })).toHaveCount(6)
  })

  test('à partir de 1024 px, la colonne « Déclarer une session » ; en dessous, un bouton', async ({
    page,
  }) => {
    await ouvrir(page)
    const colonne = page.getByRole('complementary', { name: 'Déclarer une session' })
    if (largeur(page) >= 1024) {
      await expect(colonne).toBeVisible()
      await expect(bouton(page, 'Déclarer une session')).toHaveCount(0)
      await expect(colonne.getByText('8 sur 8')).toBeVisible()
      await expect(colonne.getByLabel('Date', { exact: true })).toHaveValue('2026-10-10')
    } else {
      await expect(colonne).toHaveCount(0)
      await expect(bouton(page, 'Déclarer une session')).toBeVisible()
    }
  })

  test('déclare une session : Bâtir l’Église, huit ministères cochés, puis la ligne apparaît', async ({
    page,
  }) => {
    await ouvrir(page)
    const formulaire = await ouvrirDeclaration(page)
    await expect(formulaire.getByRole('radio', { name: "Bâtir l'Église" })).toBeChecked()
    await expect(formulaire.getByRole('checkbox')).toHaveCount(8)
    await expect(formulaire.getByText('8 sur 8')).toBeVisible()
    await formulaire.getByLabel('Date', { exact: true }).fill('2026-10-17')
    await expect(formulaire.getByText('samedi 17 octobre 2026')).toBeVisible()
    await formulaire.getByRole('checkbox', { name: 'Social' }).uncheck()
    await expect(formulaire.getByText('7 sur 8')).toBeVisible()
    await formulaire.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(reussite(page)).toHaveText("Session Bâtir l'Église du 17 oct. déclarée.")
    await expect(liste(page)).toContainText('Sam. 17 oct.')
    await expect(
      page.getByRole('button', { name: "Modifier Bâtir l'Église du 17 oct." }),
    ).toBeVisible()
  })

  test('une session déjà déclarée est refusée sous le bouton, les valeurs restent', async ({
    page,
  }) => {
    await ouvrir(page)
    const formulaire = await ouvrirDeclaration(page)
    await formulaire.locator('label').filter({ hasText: 'Anti-Dispersion' }).click()
    await formulaire.getByRole('checkbox', { name: 'Social' }).uncheck()
    await formulaire.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(formulaire.getByRole('alert')).toHaveText(
      'Une session Anti-Dispersion est déjà déclarée le samedi 10 octobre.',
    )
    await expect(formulaire.getByText('7 sur 8')).toBeVisible()
  })

  test('« Autre rassemblement » : le nom est obligatoire, le rappel s’affiche une fois', async ({
    page,
  }) => {
    await ouvrir(page)
    const formulaire = await ouvrirDeclaration(page)
    await expect(formulaire.getByLabel('Nom du rassemblement')).toHaveCount(0)
    await formulaire.locator('label').filter({ hasText: 'Autre rassemblement' }).click()
    await expect(page.getByText("N'écrivez aucun nom ni information personnelle.")).toHaveCount(1)
    await formulaire.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(formulaire.getByLabel('Nom du rassemblement')).toHaveAccessibleDescription(
      /Donnez un nom au rassemblement\./,
    )
    await formulaire.getByLabel('Nom du rassemblement').fill('Soirée de louange')
    await formulaire.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(reussite(page)).toHaveText('Session Soirée de louange du 10 oct. déclarée.')
    await expect(liste(page)).toContainText('Soirée de louange')
  })

  test('« Modifier » : les ministères attendus se corrigent, le type et la date ne changent plus', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, "Modifier Bâtir l'Église du 3 oct.").click()
    const panneau = panneauModifier(page, "Bâtir l'Église du 3 oct.")
    await expect(panneau).toBeVisible()
    await expect(panneau.getByRole('radio')).toHaveCount(0)
    await expect(panneau.getByText('8 sur 8')).toBeVisible()
    await panneau.getByRole('checkbox', { name: 'Social' }).uncheck()
    await panneau.getByRole('checkbox', { name: 'Jeunesse' }).uncheck()
    await panneau.getByRole('button', { name: 'Enregistrer les ministères attendus' }).click()
    await expect(reussite(page)).toHaveText(
      "Ministères attendus de Bâtir l'Église du 3 oct. enregistrés.",
    )
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      liste(page)
        .locator('tr, li')
        .filter({ hasText: "Bâtir l'Église" })
        .filter({ hasText: 'Sam. 3 oct.' }),
    ).toContainText('6')
  })

  test('« Supprimer » passe par une confirmation, puis la session quitte la liste', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Supprimer Anti-Dispersion du 10 oct.').click()
    const fenetre = page.getByRole('alertdialog', {
      name: 'Supprimer Anti-Dispersion du 10 oct. ?',
    })
    await expect(fenetre).toBeVisible()
    await fenetre.getByRole('button', { name: 'Annuler' }).click()
    await expect(fenetre).toHaveCount(0)
    await expect(liste(page)).toContainText('Sam. 10 oct.')
    await bouton(page, 'Supprimer Anti-Dispersion du 10 oct.').click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Supprimer la session' })
      .click()
    await expect(reussite(page)).toHaveText('Session Anti-Dispersion du 10 oct. supprimée.')
    await expect(liste(page)).not.toContainText('Sam. 10 oct.')
  })

  test('état vide : la phrase et la déclaration possible', async ({ page }) => {
    await ouvrir(page, 'vue=vide')
    await expect(
      page.getByText('Aucune session déclarée. Déclarez la première avec le panneau.'),
    ).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sessions')
    await auditer(page)
  })

  test('connexion perdue : l’erreur de formulaire garde les choix', async ({ page }) => {
    await ouvrir(page, 'envoi=echec')
    const formulaire = await ouvrirDeclaration(page)
    await formulaire.getByRole('button', { name: 'Déclarer la session' }).click()
    await expect(formulaire.getByRole('alert')).toHaveText(
      'La connexion a échoué. Vos choix sont encore dans le formulaire : réessayez.',
    )
    await expect(formulaire.getByText('8 sur 8')).toBeVisible()
  })

  test('les autres profils reçoivent la page non disponible', async ({ page }) => {
    for (const profil of ['ministere', 'berger', 'conseil', 'admin_plateforme']) {
      await page.goto(`/apercu/sessions?profil=${profil}`)
      await expect(page.getByText(PAGE_NON_DISPONIBLE)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Déclarer la session' })).toHaveCount(0)
    }
  })

  test('aide : la bulle de « Ministères attendus »', async ({ page }) => {
    await ouvrir(page)
    const formulaire = await ouvrirDeclaration(page)
    await formulaire.getByRole('button', { name: 'Aide : Ministères attendus' }).click()
    await expect(formulaire.getByText('Gardez cochés ceux qui y participent.')).toBeVisible()
  })

  test('aucun défaut d’accessibilité : page, panneau et fenêtre', async ({ page }) => {
    await ouvrir(page)
    await auditer(page)
    await bouton(page, "Modifier Bâtir l'Église du 3 oct.").click()
    await expect(panneauModifier(page, "Bâtir l'Église du 3 oct.")).toBeVisible()
    await auditer(page)
    await page.keyboard.press('Escape')
    if (largeur(page) < 600) await page.getByRole('button', { name: 'Retour' }).click()
    await bouton(page, 'Supprimer Anti-Dispersion du 10 oct.').click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await auditer(page)
  })

  test('cibles de 44 px et aucun défilement horizontal à 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await ouvrir(page)
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debord).toBeLessThanOrEqual(0)
    for (const cible of await page.getByRole('button').all()) {
      if (!(await cible.isVisible())) continue
      const boite = await cible.boundingBox()
      expect(boite?.height ?? 0, (await cible.textContent()) ?? '').toBeGreaterThanOrEqual(43.5)
    }
    await bouton(page, 'Déclarer une session').click()
    const debordPanneau = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debordPanneau).toBeLessThanOrEqual(0)
  })

  test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
    const taille = largeur(page)
    const dossier = 'test-results/captures'
    await ouvrir(page)
    await page.screenshot({ path: `${dossier}/sessions-page-${taille}.png`, fullPage: true })
    if (taille < 1024) {
      await bouton(page, 'Déclarer une session').click()
      await page.screenshot({ path: `${dossier}/sessions-declarer-${taille}.png`, fullPage: true })
      await page.keyboard.press('Escape')
      if (taille < 600) await page.getByRole('button', { name: 'Retour' }).click()
    }
    await bouton(page, "Modifier Bâtir l'Église du 3 oct.").click()
    await page.screenshot({ path: `${dossier}/sessions-modifier-${taille}.png`, fullPage: true })
    await ouvrir(page)
    await bouton(page, 'Supprimer Anti-Dispersion du 10 oct.').click()
    await page.screenshot({ path: `${dossier}/sessions-fenetre-${taille}.png` })
    await ouvrir(page, 'vue=vide')
    await page.screenshot({ path: `${dossier}/sessions-vide-${taille}.png`, fullPage: true })
  })
})
