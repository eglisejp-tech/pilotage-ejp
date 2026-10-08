import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { CLE_FERMETURE } from '../src/features/avancement/memoire.ts'

// Bandeau d'avancement (T50), sur l'aperçu de développement : l'en-tête réel, sans base.
// Chaque test part d'un contexte neuf, donc sans fermeture retenue.

const ADRESSE = '/apercu/avancement?profil=berger'

test.describe("bandeau d'avancement", () => {
  test("visible, s'ouvre, se ferme, et le choix est retenu", async ({ page }) => {
    await page.goto(ADRESSE)
    const bandeau = page.getByRole('region', { name: "Avancement de l'outil" })
    await expect(bandeau).toBeVisible()
    await expect(bandeau).toContainText('6 étapes sur 8 en ligne.')

    const voir = bandeau.getByRole('button', { name: 'Voir les étapes' })
    await voir.click()
    await expect(bandeau.getByRole('listitem')).toHaveCount(8)
    await expect(bandeau.getByRole('button', { name: 'Masquer les étapes' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(voir).toHaveAttribute('aria-expanded', 'false')
    await expect(voir).toBeFocused()

    await bandeau.getByRole('button', { name: "Fermer le bandeau d'avancement" }).click()
    await expect(bandeau).toHaveCount(0)
    await expect(page.locator('#contenu')).toBeFocused()

    await page.reload()
    await expect(page.getByRole('heading', { name: "Bandeau d'avancement" })).toBeVisible()
    await expect(page.getByRole('region', { name: "Avancement de l'outil" })).toHaveCount(0)
  })

  test('revient une fois quand la version change', async ({ page }) => {
    await page.addInitScript((cle) => window.localStorage.setItem(cle, '2020-01-01'), CLE_FERMETURE)
    await page.goto(ADRESSE)
    await expect(page.getByRole('region', { name: "Avancement de l'outil" })).toBeVisible()
  })

  test("aucune anomalie d'accessibilité, panneau ouvert, et pas de défilement horizontal", async ({
    page,
  }) => {
    await page.goto(ADRESSE)
    await page.getByRole('button', { name: 'Voir les étapes' }).click()
    await page.evaluate(() => document.fonts.ready)
    const resultat = await new AxeBuilder({ page }).analyze()
    expect(resultat.violations).toEqual([])
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debordement).toBeLessThanOrEqual(0)
  })

  test('pas de défilement horizontal à 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(ADRESSE)
    await page.getByRole('button', { name: 'Voir les étapes' }).click()
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debordement).toBeLessThanOrEqual(0)
  })

  test('capture', { tag: '@captures' }, async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    await page.goto(ADRESSE)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `test-results/captures/avancement-ferme-${largeur}.png` })
    await page.getByRole('button', { name: 'Voir les étapes' }).click()
    await page.screenshot({ path: `test-results/captures/avancement-ouvert-${largeur}.png` })
  })
})
