import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// En-tête et menu de chaque profil (maquette 00, BRIEF_DESIGN section 7), sur l'aperçu de
// développement : l'en-tête réel, sans base. Trois formats par les projets Playwright.

const PROFILS = [
  {
    profil: 'ministere',
    libelle: 'Ministère Communication',
    onglets: ['Cette semaine', 'Ma fiche', 'Mes points', 'Mon journal'],
  },
  {
    profil: 'berger',
    libelle: 'Berger',
    onglets: ['Cette semaine', 'Ministères', "Points d'attention", 'Journal'],
  },
  {
    profil: 'conseil',
    libelle: 'Conseil, compte 1',
    onglets: ['Cette semaine', 'Ministères', "Points d'attention", 'Journal'],
  },
  {
    profil: 'admin_eglise',
    libelle: "Administration de l'église",
    onglets: ['Cette semaine', 'Ministères et comptes', 'Sessions', 'Journal'],
  },
  {
    profil: 'admin_plateforme',
    libelle: 'EJP Tech, compte 1',
    onglets: ['Modération', 'Cette semaine', 'Journal technique'],
  },
] as const

async function ouvrir(page: Page, profil: string) {
  await page.goto(`/apercu/navigation?profil=${profil}`)
  await page.evaluate(() => document.fonts.ready)
}

const estLarge = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024

test.describe('en-tête et menu (aperçu)', () => {
  for (const { profil, libelle, onglets } of PROFILS) {
    test(`${profil} : ses onglets seulement, le premier actif, son libellé visible`, async ({
      page,
    }) => {
      await ouvrir(page, profil)
      const entete = page.getByRole('banner')
      await expect(entete.getByText(libelle).filter({ visible: true })).toBeVisible()
      if (!estLarge(page)) {
        await expect(page.getByRole('navigation')).toHaveCount(0)
        await entete.getByRole('button', { name: 'Ouvrir le menu' }).click()
      }
      const navigation = page.getByRole('navigation', { name: 'Navigation principale' })
      await expect(navigation.getByRole('link')).toHaveText([...onglets])
      await expect(navigation.getByRole('link', { name: onglets[0] })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(entete.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
    })
  }

  test("l'onglet actif est souligné par la lumière", async ({ page }) => {
    await ouvrir(page, 'berger')
    if (!estLarge(page)) await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    const actif = page
      .getByRole('navigation', { name: 'Navigation principale' })
      .locator('[aria-current="page"]')
    const ombre = await actif.evaluate((lien) => {
      const cible = lien.querySelector('span') ?? lien
      return getComputedStyle(cible).boxShadow
    })
    expect(ombre).toContain('rgb(255, 210, 63)')
    expect(ombre).toContain('inset')
  })

  test('sous 1024 px : bouton menu de 44 px, fermeture par Échap et par la navigation', async ({
    page,
  }) => {
    test.skip(estLarge(page), 'Le menu ne sert que sous 1024 px.')
    await ouvrir(page, 'ministere')
    const bouton = page.getByRole('button', { name: 'Ouvrir le menu' })
    const cadre = await bouton.boundingBox()
    expect(cadre?.width).toBeGreaterThanOrEqual(44)
    expect(cadre?.height).toBeGreaterThanOrEqual(44)
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')

    await bouton.click()
    const fermer = page.getByRole('button', { name: 'Fermer le menu' })
    await expect(fermer).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Confidentialité' }).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('navigation')).toHaveCount(0)
    await expect(bouton).toBeFocused()

    await bouton.click()
    await page.getByRole('link', { name: 'Ma fiche' }).click()
    // Sans session, la garde renvoie vers la connexion en gardant l'adresse demandée.
    await expect(page).toHaveURL(/ma-fiche/)
  })

  test('à partir de 1024 px : pas de bouton menu, le libellé et « Se déconnecter » à droite', async ({
    page,
  }) => {
    test.skip(!estLarge(page), 'Format ordinateur seulement.')
    await ouvrir(page, 'admin_eglise')
    await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeHidden()
    const nav = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox()
    const compte = await page
      .getByRole('banner')
      .getByText("Administration de l'église")
      .filter({ visible: true })
      .boundingBox()
    expect(nav && compte && compte.x).toBeGreaterThan((nav?.x ?? 0) + (nav?.width ?? 0))
  })

  test("aucune violation d'accessibilité, menu fermé et ouvert", async ({ page }) => {
    for (const { profil } of PROFILS) {
      await ouvrir(page, profil)
      const menu = page.getByRole('button', { name: 'Ouvrir le menu' })
      if (await menu.isVisible()) await menu.click()
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations, profil).toEqual([])
    }
  })

  test("les cibles de l'en-tête font 44 px au moins", async ({ page }) => {
    await ouvrir(page, 'admin_eglise')
    const menu = page.getByRole('button', { name: 'Ouvrir le menu' })
    if (await menu.isVisible()) await menu.click()
    const tailles = await page
      .getByRole('banner')
      .locator('a, button')
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            texte: element.textContent,
            cadre: element.getBoundingClientRect(),
          }))
          .filter(({ cadre }) => cadre.width > 0 && cadre.height > 0)
          .map(({ texte, cadre }) => ({ texte, hauteur: Math.round(cadre.height) })),
      )
    // Le nom de l'outil, lien vers l'accueil, compte comme les autres cibles.
    expect(tailles.map(({ texte }) => texte)).toContain('Pilotage EJP')
    expect(tailles.length).toBeGreaterThan(2)
    expect(tailles.filter(({ hauteur }) => hauteur < 44)).toEqual([])
  })

  test('ne défile pas horizontalement, même à 360 px', async ({ page }) => {
    const largeurs = estLarge(page) ? [1024, 1440] : [360, page.viewportSize()?.width ?? 390]
    for (const largeur of largeurs) {
      await page.setViewportSize({ width: largeur, height: 800 })
      for (const { profil } of PROFILS) {
        await ouvrir(page, profil)
        const debordement = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debordement, `${profil} à ${largeur} px`).toBeLessThanOrEqual(0)
      }
    }
  })

  test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    for (const { profil } of PROFILS) {
      await ouvrir(page, profil)
      await page.screenshot({ path: `test-results/captures/entete-${profil}-${largeur}.png` })
      const menu = page.getByRole('button', { name: 'Ouvrir le menu' })
      if (await menu.isVisible()) {
        await menu.click()
        await page.screenshot({ path: `test-results/captures/menu-${profil}-${largeur}.png` })
      }
    }
    if (largeur === 1440) {
      // Le format le plus serré de l'en-tête large.
      await page.setViewportSize({ width: 1024, height: 768 })
      await ouvrir(page, 'admin_eglise')
      await page.screenshot({ path: 'test-results/captures/entete-admin_eglise-1024.png' })
    }
  })
})
