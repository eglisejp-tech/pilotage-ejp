import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('accueil (échafaudage)', () => {
  test("affiche le nom de l'outil et l'accueil", async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Pilotage EJP')
    await expect(page.getByRole('link', { name: 'Pilotage EJP' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Cette semaine' })).toBeVisible()
  })

  test("ne présente aucune violation d'accessibilité détectée par axe", async ({ page }) => {
    await page.goto('/')
    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(resultat.violations).toEqual([])
  })

  test('ne défile pas horizontalement', async ({ page }) => {
    await page.goto('/')
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debordement).toBeLessThanOrEqual(0)
  })

  test('charge les trois polices de la direction C', async ({ page }) => {
    await page.goto('/')
    // document.fonts.load renvoie une liste vide si la police n'est pas déclarée par @font-face.
    const polices = await page.evaluate(async () => {
      const demandes = [
        '400 16px "Newsreader"',
        '800 16px "Big Shoulders Display"',
        '400 16px "Public Sans"',
      ]
      const chargees = await Promise.all(demandes.map((police) => document.fonts.load(police)))
      return chargees.map((faces) => faces.length > 0)
    })
    expect(polices).toEqual([true, true, true])
  })

  test('affiche la page introuvable pour une adresse inconnue', async ({ page }) => {
    await page.goto('/adresse-inconnue')
    await expect(page.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeVisible()
  })
})
