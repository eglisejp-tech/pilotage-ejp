import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// « Ma semaine », l'accueil d'un compte de ministère (maquette 07, décision T57), sur l'aperçu de
// développement avec les données d'exemple (aucune base). Trois formats par les projets
// Playwright : 1440, 834 et 390 px.

type Etat = 'semaine' | 'premier-dimanche' | 'fij' | 'chargement' | 'erreur'

const adresse = (etat: Etat = 'semaine') =>
  `/apercu/cette-semaine?profil=ministere${etat === 'semaine' ? '' : `&etat=${etat}`}`

async function ouvrir(page: Page, etat: Etat = 'semaine') {
  await page.goto(adresse(etat))
  await page.evaluate(() => document.fonts.ready)
}

const AUTRES_MINISTERES = ['Social', 'Coordination', 'Jeunesse', 'Prodiges Junior', 'EJP Formation']

test.describe('Ma semaine, aperçu', () => {
  test('l’ouverture de 07, puis ses saisies, ses chiffres, ses points et l’église', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle('Aperçu, Cette semaine, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Vos chiffres sont à jour. Il reste la date de la prochaine réunion.',
    )
    await expect(page.locator('h1 mark')).toHaveText('Il reste la date de la prochaine réunion')
    await expect(page.getByText('Semaine 39, du 21 au 27 sept.')).toBeAttached()
    await expect(page.getByRole('link', { name: 'Ajouter la prochaine réunion' })).toHaveAttribute(
      'href',
      '/saisir/reunion',
    )
    // L'onglet « Ma semaine » est vérifié par navigation.spec.ts.
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Vos saisies',
      'Vos chiffres de la semaine',
      'Mes points',
      "Dans l'église",
    ])
  })

  test('ses chiffres : service avec écart et courbe, actifs, % FIJ, session, indicateur propre', async ({
    page,
  }, testInfo) => {
    await ouvrir(page)
    const chiffres = page.getByRole('region', { name: 'Vos chiffres de la semaine' })
    for (const texte of [
      'STARs au service',
      'Dimanche 27 sept.',
      'STARs actifs',
      '11 sur 14 actifs',
      "Présents à Bâtir l'Église",
      'Visuels livrés ce mois',
    ]) {
      await expect(chiffres).toContainText(texte)
    }
    // Sous 768 px, la courbe se lit en texte (le détail et l'écart) : la colonne n'existe pas.
    await expect(chiffres.getByRole('img', { name: /^10 derniers dimanches : 8, 9/ })).toHaveCount(
      testInfo.project.name === 'telephone' ? 0 : 1,
    )
    await expect(
      chiffres.getByRole('link', { name: 'Tous vos chiffres dans Ma fiche' }),
    ).toHaveAttribute('href', '/ma-fiche')
  })

  test('« Dans l’église » : deux totaux avec « 6 sur 8 », sans aucun nom', async ({ page }) => {
    await ouvrir(page)
    const eglise = page.getByRole('region', { name: "Dans l'église" })
    await expect(eglise.getByRole('listitem')).toHaveCount(2)
    await expect(eglise).toContainText('52')
    await expect(eglise).toContainText('Dimanche 27 sept., 6 sur 8')
    await expect(eglise).toContainText('58')
    await expect(eglise).toContainText('Sam. 26 sept., 6 sur 8')
    await expect(eglise.getByRole('link')).toHaveCount(0)
    const chiffres = page.getByRole('region', { name: 'Vos chiffres de la semaine' })
    for (const nom of AUTRES_MINISTERES) {
      await expect(eglise, nom).not.toContainText(nom)
      await expect(chiffres, nom).not.toContainText(nom)
    }
  })

  test('aucun bloc du berger : ni session par ministère, ni tableau, ni carte, ni « Tout voir »', async ({
    page,
  }) => {
    await ouvrir(page)
    for (const nom of [
      'Les ministères',
      'À décider',
      'Dernière session',
      'FIJ en Île-de-France',
      "L'église cette semaine",
      "Les chiffres de l'église",
    ]) {
      await expect(page.getByRole('heading', { name: nom }), nom).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: 'Tout voir' })).toHaveCount(0)
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByText('À saisir')).toHaveCount(0)
  })

  test('la carte et les chiffres par département : le ministère FIJ seul', async ({ page }) => {
    await ouvrir(page)
    await expect(page.getByText('Total de la carte des FIJ', { exact: true })).toHaveCount(0)
    await ouvrir(page, 'fij')
    const chiffres = page.getByRole('region', { name: 'Vos chiffres de la semaine' })
    await expect(chiffres).toContainText('Total de la carte des FIJ')
    await expect(chiffres).toContainText('8 départements sur 8, saisi le 21 sept.')
    await expect(chiffres).toContainText('Chiffres par département saisis')
    await expect(chiffres).toContainText('sur 32, dimanche 27 sept.')
    await expect(page.getByRole('heading', { name: 'FIJ en Île-de-France' })).toHaveCount(0)
  })

  test('ordre de lecture : la même suite à toutes les tailles, deux colonnes à 1440 px', async ({
    page,
  }, testInfo) => {
    await ouvrir(page)
    const boite = async (nom: string) => {
      const cadre = await page.getByRole('region', { name: nom }).boundingBox()
      if (!cadre) throw new Error(`${nom} : bloc absent`)
      return cadre
    }
    const saisies = await boite('Vos saisies')
    const chiffres = await boite('Vos chiffres de la semaine')
    const points = await boite('Mes points')
    const eglise = await boite("Dans l'église")
    // À gauche, saisies puis chiffres ; à droite, points puis église (à partir de 1024 px).
    expect(chiffres.y).toBeGreaterThan(saisies.y)
    expect(eglise.y).toBeGreaterThan(points.y)
    if (testInfo.project.name === 'ordinateur') {
      expect(points.x).toBeGreaterThan(saisies.x + saisies.width)
      expect(Math.abs(points.y - saisies.y)).toBeLessThan(2)
      expect(eglise.x).toBeGreaterThan(chiffres.x + chiffres.width)
    } else {
      // Une colonne : saisies, chiffres, points, église.
      expect(points.y).toBeGreaterThan(chiffres.y)
      expect(eglise.y).toBeGreaterThan(points.y)
      expect(Math.abs(points.x - saisies.x)).toBeLessThan(2)
    }
  })

  test('premier dimanche : « Pas encore de saisie » et « 0 sur 8 », jamais un 0', async ({
    page,
  }) => {
    await ouvrir(page, 'premier-dimanche')
    const chiffres = page.getByRole('region', { name: 'Vos chiffres de la semaine' })
    await expect(chiffres.getByText('Pas encore de saisie')).toHaveCount(3)
    await expect(chiffres.getByRole('img')).toHaveCount(0)
    const eglise = page.getByRole('region', { name: "Dans l'église" })
    await expect(eglise).toContainText('Pas encore de saisie')
    await expect(eglise).toContainText('Dimanche 27 sept., 0 sur 8')
  })

  test('chargement : titres tout de suite, « Chargement de Ma semaine » après 300 ms (T65)', async ({
    page,
  }) => {
    await ouvrir(page, 'chargement')
    // Chaque section attend son contenu (aria-busy) ; la zone status qui annonce le chargement
    // n'est dans aucun élément occupé, pour être lue.
    await expect(page.locator('section[aria-busy="true"]')).toHaveCount(4)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Vos chiffres de la semaine' }),
    ).toBeVisible()
    const annonce = page.getByRole('status').filter({ hasText: 'Chargement de Ma semaine' })
    await expect(annonce).toBeVisible()
    await expect(annonce.locator('xpath=ancestor-or-self::*[@aria-busy="true"]')).toHaveCount(0)
  })

  test('erreur de page : bandeau et « Réessayer »', async ({ page }) => {
    await ouvrir(page, 'erreur')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  for (const etat of ['semaine', 'premier-dimanche', 'fij', 'chargement', 'erreur'] as const) {
    test(`${etat} : aucune violation d'accessibilité détectée par axe`, async ({ page }) => {
      await ouvrir(page, etat)
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test("chaque lien et chaque bouton offre une cible d'au moins 44 px", async ({ page }) => {
    await ouvrir(page, 'fij')
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
    expect(tailles.length).toBeGreaterThan(5)
    expect(tailles.filter(({ largeur, hauteur }) => largeur < 44 || hauteur < 44)).toEqual([])
  })

  for (const largeur of [360, 390]) {
    test(`ne défile pas horizontalement à ${largeur} px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'telephone', 'Largeurs de téléphone')
      await page.setViewportSize({ width: largeur, height: 800 })
      for (const etat of ['semaine', 'premier-dimanche', 'fij', 'erreur'] as const) {
        await ouvrir(page, etat)
        const debordement = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debordement, etat).toBeLessThanOrEqual(0)
      }
    })
  }

  test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
    test.setTimeout(90_000)
    const largeur = page.viewportSize()?.width ?? 0
    for (const etat of ['semaine', 'premier-dimanche', 'fij', 'chargement', 'erreur'] as const) {
      await ouvrir(page, etat)
      if (etat === 'chargement') {
        await page
          .getByRole('status')
          .getByText('Chargement de Ma semaine', { exact: true })
          .waitFor()
      }
      await page.screenshot({
        path: `test-results/captures/ma-semaine-${etat}-${largeur}.png`,
        fullPage: true,
      })
    }
  })
})
