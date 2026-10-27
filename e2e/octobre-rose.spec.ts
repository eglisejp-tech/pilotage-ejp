import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { CLE_MASQUE } from '../src/features/octobre-rose/memoire.ts'
import { ciblesTropPetites, debordementHorizontal } from './outils/controles.ts'

// Octobre rose (27 octobre 2026) : le ruban à côté de « Pilotage EJP » et le bandeau sous
// l'en-tête, sur les aperçus de développement, sans base. L'horloge de la page est fixée : ces
// parcours donnent le même résultat en octobre et le reste de l'année. Les aperçus n'ont le
// bandeau qu'avec ?octobre-rose=1 ; l'application connectée l'a toujours, en octobre.

const OCTOBRE = new Date('2026-10-27T10:00:00+01:00')
const DERNIERE_MINUTE = new Date('2026-10-31T23:59:00+01:00')
const NOVEMBRE = new Date('2026-11-01T00:00:00+01:00')

// Page « Les dépistages » de l'Institut national du cancer (vérifiée le 27 octobre 2026). Les
// parcours ne lisent pas src/features/octobre-rose/octobreRose.ts, qui importe par l'alias « @ ».
const ADRESSE_DEPISTAGE =
  'https://www.cancer.fr/toute-l-information-sur-les-cancers/se-faire-depister/les-depistages'
const ECRAN = '/apercu/cette-semaine?profil=berger&octobre-rose=1'
const PROFILS = ['ministere', 'berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const

async function ouvrir(page: Page, quand: Date, adresse = ECRAN) {
  await page.clock.setFixedTime(quand)
  await page.goto(adresse)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

const ruban = (page: Page) => page.getByRole('banner').getByRole('img', { name: 'Octobre rose' })
const bandeau = (page: Page) => page.getByRole('region', { name: 'Octobre rose' })

test.describe('Octobre rose (aperçu)', () => {
  test('en octobre : le ruban à côté du nom, le bandeau et son lien sous l’en-tête', async ({
    page,
  }) => {
    await ouvrir(page, OCTOBRE)
    // Un seul en-tête affiché à la fois (ordinateur ou menu) : un seul ruban visible.
    await expect(ruban(page)).toHaveCount(1)
    await expect(ruban(page)).toBeVisible()
    await expect(bandeau(page)).toHaveText(
      /^Octobre rose : le dépistage du cancer sauve des vies\. Parlez-en autour de vous\./,
    )
    const lien = bandeau(page).getByRole('link', { name: 'En savoir plus (nouvel onglet)' })
    await expect(lien).toHaveAttribute('href', ADRESSE_DEPISTAGE)
    await expect(lien).toHaveAttribute('target', '_blank')
    await expect(lien).toHaveAttribute('rel', 'noopener noreferrer')
    const entete = await page.getByRole('banner').boundingBox()
    const cadre = await bandeau(page).boundingBox()
    expect(cadre?.y).toBeGreaterThanOrEqual((entete?.y ?? 0) + (entete?.height ?? 0) - 1)
  })

  for (const profil of PROFILS) {
    test(`${profil} : le ruban ne change ni la hauteur de l’en-tête ni sa largeur`, async ({
      page,
    }) => {
      const adresse = `/apercu/navigation?profil=${profil}`
      await ouvrir(page, NOVEMBRE, adresse)
      await expect(ruban(page)).toHaveCount(0)
      const avant = await page.getByRole('banner').boundingBox()

      await ouvrir(page, OCTOBRE, adresse)
      await expect(ruban(page)).toBeVisible()
      const apres = await page.getByRole('banner').boundingBox()
      expect(apres?.height).toBe(avant?.height)
      expect(await debordementHorizontal(page)).toBeLessThanOrEqual(0)

      // À la hauteur du texte du nom, centré sur lui, et dans l'en-tête.
      const nom = await page
        .getByRole('banner')
        .getByRole('link', { name: 'Pilotage EJP' })
        .filter({ visible: true })
        .boundingBox()
      const dessin = await ruban(page).boundingBox()
      expect(dessin?.height).toBeGreaterThanOrEqual(16)
      expect(dessin?.height).toBeLessThanOrEqual(22)
      const milieu = (cadre: typeof dessin) => (cadre?.y ?? 0) + (cadre?.height ?? 0) / 2
      expect(Math.abs(milieu(dessin) - milieu(nom))).toBeLessThanOrEqual(3)
      expect(dessin?.x).toBeGreaterThan((nom?.x ?? 0) + (nom?.width ?? 0))
    })
  }

  test('« Masquer » cache le bandeau, rend le focus au contenu et s’en souvient', async ({
    page,
  }) => {
    await ouvrir(page, OCTOBRE)
    await bandeau(page).getByRole('button', { name: 'Masquer le bandeau Octobre rose' }).click()
    await expect(bandeau(page)).toHaveCount(0)
    await expect(page.locator('#contenu')).toBeFocused()
    expect(await page.evaluate((cle) => window.localStorage.getItem(cle), CLE_MASQUE)).toBe('2026')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(bandeau(page)).toHaveCount(0)
    // Le ruban reste : « Masquer » ne vaut que pour le bandeau.
    await expect(ruban(page)).toBeVisible()
  })

  test('aucune anomalie d’accessibilité, des cibles de 44 px, pas de défilement à 360 px', async ({
    page,
  }) => {
    await ouvrir(page, OCTOBRE)
    const resultat = await new AxeBuilder({ page })
      .include('header')
      .include('section[aria-label="Octobre rose"]')
      .analyze()
    expect(resultat.violations).toEqual([])
    expect(await ciblesTropPetites(page, ['main'])).toEqual([])
    await page.setViewportSize({ width: 360, height: 800 })
    expect(await debordementHorizontal(page)).toBeLessThanOrEqual(0)
  })

  test('à partir du 1er novembre 0 h (Paris) : ni ruban ni bandeau, même sur une page restée ouverte', async ({
    page,
  }) => {
    await ouvrir(page, DERNIERE_MINUTE)
    await expect(ruban(page)).toBeVisible()
    await expect(bandeau(page)).toBeVisible()
    // La nuit passe, la personne revient sur l'onglet.
    await page.clock.setFixedTime(NOVEMBRE)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(ruban(page)).toHaveCount(0)
    await expect(bandeau(page)).toHaveCount(0)

    await ouvrir(page, NOVEMBRE)
    await expect(ruban(page)).toHaveCount(0)
    await expect(bandeau(page)).toHaveCount(0)
  })

  test('capture d’un écran connecté en octobre', { tag: '@captures' }, async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    await ouvrir(page, OCTOBRE)
    await expect(bandeau(page)).toBeVisible()
    await page.screenshot({ path: `test-results/captures/octobre-rose-${largeur}.png` })
  })
})
