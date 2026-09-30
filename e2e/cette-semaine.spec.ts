import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Vue « Cette semaine » (maquettes 01, 02, 03) sur l'aperçu de développement, avec les données
// d'exemple (aucune base). Trois formats par les projets Playwright : 1440, 834 et 390 px.

const profils = ['berger', 'ministere', 'admin_eglise'] as const
type Profil = (typeof profils)[number]

const adresse = (profil: Profil) => `/apercu/cette-semaine?profil=${profil}`

async function ouvrir(page: Page, profil: Profil) {
  await page.goto(adresse(profil))
  await page.evaluate(() => document.fonts.ready)
}

const phraseBerger =
  "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et un point attend votre décision."
const phraseEglise = "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi."

test.describe('Cette semaine, aperçu', () => {
  test('berger : phrase surlignée, chiffres, « À décider », session, carte et ministères', async ({
    page,
  }, testInfo) => {
    await ouvrir(page, 'berger')
    await expect(page).toHaveTitle('Aperçu, Cette semaine, Pilotage EJP')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseBerger)
    await expect(page.locator('h1 mark')).toHaveText('un point attend votre décision')
    await expect(page.getByText('Semaine 39, du 21 au 27 sept.')).toBeAttached()

    const chiffres = page.getByRole('region', { name: "Les chiffres de l'église" })
    await expect(chiffres).toBeVisible()
    for (const texte of ['52', '83', '77', '29', '58', '61', '6 sur 8', '8 dép.']) {
      await expect(chiffres).toContainText(texte)
    }
    await expect(
      chiffres.getByRole('img', { name: /^Dix derniers dimanches : 52, 57/ }),
    ).toBeVisible()

    const aDecider = page.getByRole('region', { name: 'À décider' })
    await expect(aDecider.getByRole('heading', { level: 3 })).toHaveText([
      'Financement de Welcome Prodiges',
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
    ])
    await expect(aDecider.getByRole('button', { name: 'Marquer traité' })).toHaveCount(3)
    await expect(aDecider.getByText('avant le 28 sept., dépassée')).toBeVisible()
    await expect(aDecider.getByRole('link', { name: 'Tous les points' })).toHaveAttribute(
      'href',
      '/points?vue=ouverts',
    )

    const session = page.getByRole('region', { name: "Bâtir l'Église, samedi 26 septembre" })
    await expect(session).toContainText('STARs présents, selon 6 ministères sur 8')
    const carte = page.getByRole('region', { name: 'FIJ en Île-de-France' })
    await expect(carte.getByRole('listitem')).toHaveCount(8)
    await expect(carte.getByText('Paris (75) : 4 FIJ')).toBeAttached()

    const ministeres = page.getByRole('region', { name: 'Les ministères' })
    await expect(ministeres.getByRole('link', { name: 'Social' })).toHaveAttribute(
      'href',
      '/ministeres/soc',
    )
    await expect(ministeres.getByText('Il y a 24 jours')).toBeVisible()

    // Ordre de lecture : sur téléphone, « À décider » remonte après la phrase (point urgent).
    const titres = await page.getByRole('heading', { level: 2 }).allTextContents()
    const attendu = [
      "Les chiffres de l'église",
      'À décider',
      "Bâtir l'Église, samedi 26 septembre",
      'FIJ en Île-de-France',
      'Les ministères',
    ]
    if (testInfo.project.name === 'telephone') {
      expect(titres).toEqual([attendu[1], attendu[0], ...attendu.slice(2)])
    } else {
      expect(titres).toEqual(attendu)
    }
  })

  test('berger : les colonnes « Prochaine réunion » et « Point ouvert » à partir de 1024 px', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'ordinateur', 'Colonnes propres au format ordinateur')
    await ouvrir(page, 'berger')
    const ministeres = page.getByRole('region', { name: 'Les ministères' })
    await expect(ministeres.getByRole('columnheader')).toHaveText([
      'Ministère',
      'Mise à jour',
      'Prochain événement',
      'Prochaine réunion',
      'Point ouvert',
    ])
    await expect(ministeres.getByRole('row', { name: /^Intégration/ })).toContainText('Urgente')
  })

  test('ministère : ni « À décider », ni surligneur, ni colonnes du conseil', async ({ page }) => {
    await ouvrir(page, 'ministere')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseEglise)
    await expect(page.locator('mark')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'À décider' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0)
    await expect(
      page.getByRole('heading', { level: 2, name: "L'église cette semaine" }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: "Bâtir l'Église, samedi 26 septembre" }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: 'FIJ en Île-de-France' }),
    ).toBeVisible()
    const ministeres = page.getByRole('region', { name: 'Les ministères' })
    await expect(ministeres.getByRole('columnheader', { name: 'Point ouvert' })).toHaveCount(0)
    await expect(ministeres.getByRole('link')).toHaveCount(1)
    await expect(ministeres.getByRole('link', { name: 'Communication' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
  })

  test("administration de l'église : la vue de l'église sans action", async ({ page }) => {
    await ouvrir(page, 'admin_eglise')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseEglise)
    await expect(page.locator('mark')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'À décider' })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
    await expect(
      page.getByRole('heading', { level: 2, name: "Les chiffres de l'église" }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Les ministères' }).getByRole('link'),
    ).toHaveCount(0)
  })

  for (const profil of profils) {
    test(`${profil} : aucune violation d'accessibilité détectée par axe`, async ({ page }) => {
      await ouvrir(page, profil)
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test("berger : chaque lien et chaque bouton offre une cible d'au moins 44 px", async ({
    page,
  }) => {
    await ouvrir(page, 'berger')
    const cibles = page.getByRole('main').locator('a, button')
    const tailles = await cibles.evaluateAll((elements) =>
      elements
        .map((element) => ({ texte: element.textContent, cadre: element.getBoundingClientRect() }))
        .filter(({ cadre }) => cadre.width > 0 && cadre.height > 0)
        .map(({ texte, cadre }) => ({
          texte,
          largeur: Math.round(cadre.width),
          hauteur: Math.round(cadre.height),
        })),
    )
    expect(tailles.length).toBeGreaterThan(10)
    expect(tailles.filter(({ largeur, hauteur }) => largeur < 44 || hauteur < 44)).toEqual([])
  })

  for (const largeur of [360, 390]) {
    test(`ne défile pas horizontalement à ${largeur} px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'telephone', 'Largeurs de téléphone')
      await page.setViewportSize({ width: largeur, height: 800 })
      for (const profil of profils) {
        await ouvrir(page, profil)
        const debordement = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debordement, profil).toBeLessThanOrEqual(0)
      }
    })
  }

  test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    for (const profil of profils) {
      await ouvrir(page, profil)
      await page.screenshot({
        path: `test-results/captures/cette-semaine-${profil}-${largeur}.png`,
        fullPage: true,
      })
    }
  })
})
