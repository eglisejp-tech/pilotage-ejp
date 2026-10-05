import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Vue « Cette semaine » (maquettes 01, 02, 03) sur l'aperçu de développement, avec les données
// d'exemple (aucune base). Trois formats par les projets Playwright : 1440, 834 et 390 px.

const profils = ['berger', 'ministere', 'admin_eglise'] as const
type Profil = (typeof profils)[number]
type Etat = 'semaine' | 'premier-dimanche' | 'session-jamais-tenue' | 'chargement' | 'erreur'

const adresse = (profil: Profil, etat: Etat = 'semaine') =>
  `/apercu/cette-semaine?profil=${profil}${etat === 'semaine' ? '' : `&etat=${etat}`}`

async function ouvrir(page: Page, profil: Profil, etat: Etat = 'semaine') {
  await page.goto(adresse(profil, etat))
  await page.evaluate(() => document.fonts.ready)
}

/** Ministère sous 600 px : « Tout voir » déplie les blocs de l'église. */
async function toutVoirSiBesoin(page: Page) {
  const bouton = page.getByRole('button', { name: 'Tout voir' })
  if (await bouton.isVisible()) {
    await bouton.click()
    await expect(page.getByRole('button', { name: 'Voir moins' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  }
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
    // « Marquer traité » arrive avec sa fenêtre à l'étape 5 (T19).
    await expect(aDecider.getByRole('button')).toHaveCount(0)
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

  test('ministère : ni « À décider », ni surligneur, ni colonnes du conseil', async ({
    page,
  }, testInfo) => {
    await ouvrir(page, 'ministere')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseEglise)
    await expect(page.locator('mark')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'À décider' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0)
    await expect(
      page.getByRole('heading', { level: 2, name: "L'église cette semaine" }),
    ).toBeVisible()

    if (testInfo.project.name === 'telephone') {
      // Sous 600 px : trois chiffres, puis « Tout voir » (BRIEF section 9, maquette 07).
      const eglise = page.getByRole('region', { name: "L'église cette semaine" })
      await expect(eglise.getByRole('listitem')).toHaveCount(3)
      await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1)
      await expect(page.getByRole('button', { name: 'Tout voir' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    } else {
      await expect(page.getByRole('button', { name: 'Tout voir' })).toHaveCount(0)
    }
    await toutVoirSiBesoin(page)

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

  test('sans « À décider », la carte remonte à côté des chiffres à partir de 1024 px', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'ordinateur', 'Disposition propre au format ordinateur')
    for (const profil of ['admin_eglise', 'ministere'] as const) {
      await ouvrir(page, profil)
      const titre = profil === 'ministere' ? "L'église cette semaine" : "Les chiffres de l'église"
      const chiffres = await page.getByRole('region', { name: titre }).boundingBox()
      const carte = await page.getByRole('region', { name: 'FIJ en Île-de-France' }).boundingBox()
      const session = await page
        .getByRole('region', { name: "Bâtir l'Église, samedi 26 septembre" })
        .boundingBox()
      if (!chiffres || !carte || !session) throw new Error(`${profil} : bloc absent`)
      // La carte à droite des chiffres, à la même hauteur ; la session dessous, sur toute la largeur.
      expect(carte.x, profil).toBeGreaterThan(chiffres.x + chiffres.width)
      expect(Math.abs(carte.y - chiffres.y), profil).toBeLessThan(2)
      expect(session.y, profil).toBeGreaterThan(chiffres.y + chiffres.height)
      expect(session.width, profil).toBeGreaterThan(chiffres.width + carte.width)
    }
  })

  test('premier dimanche : chaque bloc garde sa place et dit ce qui manque', async ({ page }) => {
    await ouvrir(page, 'berger', 'premier-dimanche')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept.",
    )
    const chiffres = page.getByRole('region', { name: "Les chiffres de l'église" })
    await expect(chiffres.getByText('Pas encore de saisie')).toHaveCount(6)
    await expect(chiffres.getByRole('img')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'À décider' })).toContainText(
      'Aucun point ouvert.',
    )
    await expect(page.getByRole('region', { name: 'Dernière session' })).toContainText(
      "Aucune session déclarée.L'administration de l'église déclare les sessions.",
    )
    const carte = page.getByRole('region', { name: 'FIJ en Île-de-France' })
    await expect(carte).toContainText("La carte s'affichera quand FIJ aura saisi ses chiffres.")
    await expect(carte.getByTestId('carte-en-attente')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Les ministères' })).toContainText(
      'Aucune saisie',
    )
  })

  test('rassemblement jamais tenu : son titre, sa phrase, les liens vers les autres sessions', async ({
    page,
  }) => {
    await ouvrir(page, 'admin_eglise', 'session-jamais-tenue')
    const session = page.getByRole('region', { name: 'Autre rassemblement' })
    await expect(session).toContainText("Aucun autre rassemblement pour l'instant.")
    await expect(session.getByRole('link', { name: 'Voir Anti-Dispersion' })).toBeVisible()
  })

  test('chargement : titres et filets tout de suite, « Chargement » après 300 ms', async ({
    page,
  }) => {
    await ouvrir(page, 'berger', 'chargement')
    await expect(page.locator('[aria-busy="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Les ministères' })).toBeVisible()
    await expect(
      page.locator('[aria-busy="true"]').getByText('Chargement', { exact: true }),
    ).toBeVisible()
  })

  test('erreur de page : bandeau et « Réessayer »', async ({ page }) => {
    await ouvrir(page, 'berger', 'erreur')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  const etatsAudites: [Profil, Etat][] = [
    ...profils.map((profil): [Profil, Etat] => [profil, 'semaine']),
    ['berger', 'premier-dimanche'],
    ['ministere', 'premier-dimanche'],
    ['berger', 'erreur'],
  ]
  for (const [profil, etat] of etatsAudites) {
    test(`${profil}, ${etat} : aucune violation d'accessibilité détectée par axe`, async ({
      page,
    }) => {
      await ouvrir(page, profil, etat)
      await toutVoirSiBesoin(page)
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
        for (const etat of ['semaine', 'premier-dimanche', 'erreur'] as const) {
          await ouvrir(page, profil, etat)
          await toutVoirSiBesoin(page)
          const debordement = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          )
          expect(debordement, `${profil}, ${etat}`).toBeLessThanOrEqual(0)
        }
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
      await ouvrir(page, profil, 'premier-dimanche')
      await page.screenshot({
        path: `test-results/captures/cette-semaine-${profil}-premier-dimanche-${largeur}.png`,
        fullPage: true,
      })
    }
    await ouvrir(page, 'ministere')
    if (await page.getByRole('button', { name: 'Tout voir' }).isVisible()) {
      await toutVoirSiBesoin(page)
      await page.screenshot({
        path: `test-results/captures/cette-semaine-ministere-tout-voir-${largeur}.png`,
        fullPage: true,
      })
    }
    for (const etat of ['chargement', 'erreur', 'session-jamais-tenue'] as const) {
      await ouvrir(page, 'berger', etat)
      if (etat === 'chargement') {
        await page.locator('[aria-busy="true"]').getByText('Chargement', { exact: true }).waitFor()
      }
      await page.screenshot({
        path: `test-results/captures/cette-semaine-berger-${etat}-${largeur}.png`,
        fullPage: true,
      })
    }
  })
})
