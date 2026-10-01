import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Sans session (aucune base nécessaire) : toute adresse de l'application mène à la connexion,
// avec l'adresse demandée en paramètre ; les pages publiques s'affichent.

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('sans session', () => {
  test("l'accueil renvoie vers la connexion", async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/connexion$/)
    await expect(page).toHaveTitle('Connexion, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuer avec Google' })).toBeVisible()
    await auditer(page)
  })

  test("une adresse de l'application garde l'adresse demandée pour après la connexion", async ({
    page,
  }) => {
    await page.goto('/points?vue=traites')
    await expect(page).toHaveURL(/\/connexion\?retour=%2Fpoints%3Fvue%3Dtraites$/)
    await page.goto('/adresse-inconnue')
    await expect(page).toHaveURL(/\/connexion\?retour=%2Fadresse-inconnue$/)
  })

  test('les écrans de double authentification renvoient vers la connexion', async ({ page }) => {
    await page.goto('/double-authentification')
    await expect(page).toHaveURL(/\/connexion$/)
    await page.goto('/acces/mot-de-passe')
    await expect(page).toHaveURL(/\/connexion$/)
  })

  test("un lien d'accès sans jeton est refusé, sans appel au serveur", async ({ page }) => {
    await page.goto('/acces?type=invite')
    await expect(
      page.getByRole('heading', { level: 1, name: "Ce lien n'est plus valable" }),
    ).toBeVisible()
    await auditer(page)
  })

  test('la page Confidentialité se lit sans connexion', async ({ page }) => {
    await page.goto('/connexion')
    await page.getByRole('link', { name: 'Confidentialité' }).click()
    await expect(page).toHaveURL(/\/confidentialite$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Confidentialité' })).toBeVisible()
    await auditer(page)
  })

  test('ne défile pas horizontalement', async ({ page }) => {
    for (const adresse of ['/connexion', '/confidentialite', '/compte-desactive']) {
      await page.goto(adresse)
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debordement, adresse).toBeLessThanOrEqual(0)
    }
  })

  test('charge les trois polices de la direction C et Roboto pour le bouton Google', async ({
    page,
  }) => {
    await page.goto('/connexion')
    // document.fonts.load renvoie une liste vide si la police n'est pas déclarée par @font-face.
    const polices = await page.evaluate(async () => {
      const demandes = [
        '400 16px "Newsreader"',
        '800 16px "Big Shoulders Display"',
        '400 16px "Public Sans"',
        '500 16px "Roboto"',
      ]
      const chargees = await Promise.all(demandes.map((police) => document.fonts.load(police)))
      return chargees.map((faces) => faces.length > 0)
    })
    expect(polices).toEqual([true, true, true, true])
  })

  test('le bouton Google suit le thème clair officiel de Google', async ({ page }) => {
    await page.goto('/connexion')
    const styles = await page
      .getByRole('button', { name: 'Continuer avec Google' })
      .evaluate((bouton) => {
        const calcule = getComputedStyle(bouton)
        return {
          fond: calcule.backgroundColor,
          bordure: `${calcule.borderTopWidth} ${calcule.borderTopColor}`,
          texte: calcule.color,
          police: calcule.fontFamily,
          graisse: calcule.fontWeight,
        }
      })
    expect(styles).toEqual({
      fond: 'rgb(255, 255, 255)',
      bordure: '1px rgb(116, 119, 117)',
      texte: 'rgb(31, 31, 31)',
      police: 'Roboto, arial, sans-serif',
      graisse: '500',
    })
  })
})
