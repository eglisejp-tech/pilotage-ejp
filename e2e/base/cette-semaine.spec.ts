import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import type { CompteTest } from '../comptes.ts'

// « Cette semaine » avec la base locale et le jeu d'exemple (job « e2e » de la CI, E2E_BASE=1),
// pour chaque profil qui a la vue de l'église (BRIEF sections 9 et 13), EJP Tech compris (en
// lecture seule, T29). Le jeu d'exemple suit le dimanche de référence : aucune vérification ne
// dépend de la date du jour (ni « 27 sept. », ni numéro de semaine), seulement des nombres et des
// phrases qui en sont indépendants.

type Profil = CompteTest['profil']
const PROFILS: Profil[] = ['berger', 'conseil', 'ministere', 'admin_eglise', 'admin_plateforme']

const phraseSemaine =
  "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et un point attend votre décision."
const phraseEglise = "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi."

/** Ouvre « / » et attend la vue : ni chargement, ni erreur de page. */
async function ouvrir(page: Page, adresse = '/') {
  await page.goto(adresse)
  await expect(page).toHaveTitle('Cette semaine, Pilotage EJP')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
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

// EJP Tech lit la même vue que le berger, en lecture seule (T29).
for (const profil of ['berger', 'conseil', 'admin_plateforme'] as const) {
  test.describe(`${profil} : la vue de la semaine`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('phrase surlignée, chiffres, « À décider », session, carte et ministères', async ({
      page,
    }) => {
      await ouvrir(page)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseSemaine)
      await expect(page.locator('h1 mark')).toHaveText('un point attend votre décision')

      const chiffres = page.getByRole('region', { name: "Les chiffres de l'église" })
      for (const texte of ['52', '83', '77', '29', '58', '61', '6 sur 8', '8 sur 8', '8 dép.']) {
        await expect(chiffres).toContainText(texte)
      }
      await expect(chiffres).toContainText(
        '+3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois',
      )
      await expect(chiffres).toContainText(/\+1 par rapport à la session du /)

      const aDecider = page.getByRole('region', { name: 'À décider' })
      await expect(aDecider.getByRole('heading', { level: 3 })).toHaveText([
        'Financement de Welcome Prodiges',
        'Planning du trimestre à valider',
        'Salle pour la soirée de louange',
      ])
      // EJP Tech lit sans aucun bouton (T29). Le berger et le conseil n'ont que « Marquer traité »
      // sous un point (étape 5) : jamais « Changer le statut », qui revient aux ministères.
      const boutons = aDecider.getByRole('button')
      if (profil === 'admin_plateforme') await expect(boutons).toHaveCount(0)
      else {
        await expect(
          boutons.filter({ hasNotText: /^(Marquer traité|Modifier les mentions)$/ }),
        ).toHaveCount(0)
      }
      await expect(aDecider.getByRole('link', { name: 'Tous les points' })).toBeVisible()

      const batir = page.getByRole('region', { name: /^Bâtir l'Église, / })
      await expect(batir).toContainText('58')
      await expect(batir).toContainText('STARs présents, selon 6 ministères sur 8')
      await batir.getByRole('link', { name: 'Voir Anti-Dispersion' }).click()
      await expect(page).toHaveURL((url) => url.searchParams.get('session') === 'anti_dispersion')
      const antiDispersion = page.getByRole('region', { name: /^Anti-Dispersion, / })
      await expect(antiDispersion).toContainText('61')
      await expect(antiDispersion).toContainText('STARs présents, selon 8 ministères sur 8')

      const carte = page.getByRole('region', { name: 'FIJ en Île-de-France' })
      await expect(carte.getByRole('listitem')).toHaveCount(8)
      await expect(carte).toContainText('29 FIJ')

      const liens = page.getByRole('region', { name: 'Les ministères' }).getByRole('link')
      await expect(liens).toHaveCount(8)
      for (const href of await liens.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href')),
      )) {
        expect(href).toMatch(/^\/ministeres\/[^/]+$/)
      }
    })
  })
}

test.describe('ministère (Communication) : « L’église cette semaine »', () => {
  test.use({ storageState: fichierSession('ministere') })

  // L'ouverture de 07 (phrase, boutons, « Vos saisies », « Vos points ») : accueil-ministere.spec.ts.
  test('les blocs de l’église, sans « À décider », seul son nom ouvre « Ma fiche »', async ({
    page,
  }, infos) => {
    await ouvrir(page)
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(phraseEglise)
    await expect(
      page.getByRole('heading', { level: 2, name: "L'église cette semaine" }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'À décider' })).toHaveCount(0)

    if (infos.project.name === 'telephone') {
      await expect(
        page.getByRole('region', { name: "L'église cette semaine" }).getByRole('listitem'),
      ).toHaveCount(3)
      await expect(page.getByRole('button', { name: 'Tout voir' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      await toutVoirSiBesoin(page)
    } else {
      await expect(page.getByRole('button', { name: 'Tout voir' })).toHaveCount(0)
      await expect(
        page.getByRole('region', { name: 'Les ministères' }).getByRole('columnheader'),
      ).toHaveText(['Ministère', 'Mise à jour', 'Prochain événement'])
    }

    const liens = page.getByRole('region', { name: 'Les ministères' }).getByRole('link')
    await expect(liens).toHaveCount(1)
    await expect(liens).toHaveText('Communication')
    await expect(liens).toHaveAttribute('href', '/ma-fiche')
  })
})

test.describe("administration de l'église : la vue de l'église, sans action", () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('phrase sans surligneur, ni « À décider », ni lien, ni « Marquer traité »', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseEglise)
    await expect(page.locator('mark')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'À décider' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: 'Les ministères' }).getByRole('link'),
    ).toHaveCount(0)
  })
})

for (const profil of PROFILS) {
  test.describe(`${profil} : accessibilité, largeur et captures`, () => {
    test.use({ storageState: fichierSession(profil) })

    test("aucune violation d'accessibilité détectée par axe", async ({ page }) => {
      await ouvrir(page)
      await toutVoirSiBesoin(page)
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })

    for (const largeur of [360, 390]) {
      test(`ne défile pas horizontalement à ${largeur} px`, async ({ page }, infos) => {
        test.skip(infos.project.name !== 'telephone', 'Largeurs de téléphone')
        await page.setViewportSize({ width: largeur, height: 800 })
        await ouvrir(page)
        await toutVoirSiBesoin(page)
        const debordement = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debordement).toBeLessThanOrEqual(0)
      })
    }

    test('capture de la page entière', { tag: '@captures' }, async ({ page }) => {
      const largeur = page.viewportSize()?.width ?? 0
      await ouvrir(page)
      await page.screenshot({
        path: `test-results/captures/base-cette-semaine-${profil}-${largeur}.png`,
        fullPage: true,
      })
      if (await page.getByRole('button', { name: 'Tout voir' }).isVisible()) {
        await toutVoirSiBesoin(page)
        await page.screenshot({
          path: `test-results/captures/base-cette-semaine-${profil}-tout-voir-${largeur}.png`,
          fullPage: true,
        })
      }
    })
  })
}
