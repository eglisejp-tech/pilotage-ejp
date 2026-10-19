import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { auditerAxe, decrireFautes } from './outils/axe.ts'
import { debordementHorizontal, LARGEUR_MINIMALE } from './outils/controles.ts'

// Animations de chargement (T65), sur les aperçus de développement, sans base : l'ouverture de
// l'outil (moment 1), une page et une liste qui chargent (moment 2), un bloc qui se relit
// (moment 3) et un envoi (moment 4). Les aperçus restent dans leur attente : rien ne la finit.

const OUVERTURE = '/apercu/ouverture'
const MOMENTS = {
  page: '/apercu/chargement?moment=page&profil=ministere',
  liste: '/apercu/chargement?moment=liste&profil=berger',
  bloc: '/apercu/chargement?moment=bloc&profil=ministere',
  envoi: '/apercu/chargement?moment=envoi&profil=ministere',
  'envoi-en-cours': '/apercu/chargement?moment=envoi&profil=ministere&etat=en-cours',
} as const

async function ouvrir(page: Page, adresse: string) {
  await page.goto(adresse)
  await page.evaluate(() => document.fonts.ready)
}

/** Les animations CSS en cours dans la page (les formes SMIL n'en font pas partie). */
function animationsCss(page: Page) {
  return page.evaluate(() => document.getAnimations().length)
}

test.describe('animations de chargement (T65)', () => {
  test('1. ouverture : le monogramme et la flamme, puis la flamme vivante ; le texte est lu', async ({
    page,
  }) => {
    await ouvrir(page, OUVERTURE)
    const zone = page.locator('#contenu').getByRole('status')
    await expect(zone).toContainText('Chargement de Pilotage EJP')
    // Le texte lu est caché à l'œil ; le nom de l'outil, visible, est un dessin pour les
    // lecteurs d'écran (il répéterait le texte).
    await expect(page.getByText('Pilotage EJP', { exact: true })).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    const dessin = page.locator('svg[data-ouverture]')
    await expect(dessin).toHaveAttribute('aria-hidden', 'true')
    await expect(dessin.locator('.ouverture-trace')).toHaveCount(4)
    // L'ouverture dure 1,2 s, puis la flamme vit (trois formes en boucle, lueur).
    await expect(dessin).toHaveAttribute('data-ouverture', 'vivante', { timeout: 5_000 })
    await expect(dessin.locator('animate[attributeName="d"]')).toHaveCount(1)
    expect(await animationsCss(page)).toBeGreaterThan(0)
  })

  test('1. ouverture, les fois suivantes : la flamme vit tout de suite', async ({ page }) => {
    await ouvrir(page, `${OUVERTURE}?fois=suivante`)
    await expect(page.locator('svg[data-ouverture]')).toHaveAttribute('data-ouverture', 'vivante')
    await expect(page.locator('.ouverture-allumage')).toHaveCount(0)
  })

  test('2. page : la flamme vivante et « Chargement de Ma semaine », places grises immobiles', async ({
    page,
  }) => {
    await ouvrir(page, MOMENTS.page)
    await expect(
      page.locator('[aria-busy="true"]').getByText('Chargement de Ma semaine', { exact: true }),
    ).toBeVisible()
    const flamme = page.locator('[data-flamme="vivante"]')
    await expect(flamme).toHaveAttribute('aria-hidden', 'true')
    const formes = await flamme.locator('animate').getAttribute('values')
    expect(formes?.split(';')).toHaveLength(4)
    expect(
      await page
        .locator('.flamme-lueur')
        .evaluate((lueur) => getComputedStyle(lueur).animationName),
    ).toBe('flamme-respirer')
    // Les places réservées : grises, et sans aucune animation (pas de scintillement).
    const places = page.locator('[data-place-reservee="visible"]')
    await expect(places.first()).toBeVisible()
    expect(
      await places.evaluateAll((elements) =>
        elements.reduce((total, element) => total + element.getAnimations().length, 0),
      ),
    ).toBe(0)
  })

  test('2. liste : le titre reste, la flamme et « Chargement du journal » à la place de la liste', async ({
    page,
  }) => {
    await ouvrir(page, MOMENTS.liste)
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible()
    await expect(page.getByText('Chargement du journal', { exact: true })).toBeVisible()
    await expect(page.locator('[data-flamme="vivante"]')).toHaveCount(1)
  })

  test('3. bloc : la petite flamme dans le bloc seulement, le reste de la page ne bouge pas', async ({
    page,
  }) => {
    await ouvrir(page, MOMENTS.bloc)
    const calendrier = page.getByRole('region', { name: 'Calendrier prévisionnel' })
    await expect(calendrier.getByText('Chargement du calendrier', { exact: true })).toBeVisible()
    await expect(calendrier.locator('[data-flamme="petite"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    await expect(page.locator('[data-flamme="vivante"]')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Dernières saisies' })).toContainText(
      'Chiffres du dimanche 11 oct. enregistrés',
    )
  })

  test('4. envoi : le bouton garde sa largeur, dit « … en cours » avec la petite flamme', async ({
    page,
  }) => {
    await ouvrir(page, MOMENTS.envoi)
    const bouton = page.getByRole('button', { name: 'Valider', exact: true })
    const avant = (await bouton.boundingBox())?.width ?? 0
    await bouton.click()
    const enCours = page.getByRole('button', { name: 'Validation en cours' })
    await expect(enCours).toBeVisible()
    expect((await enCours.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(avant - 0.5)
    await expect(enCours.locator('[data-flamme="petite"]')).toHaveAttribute('aria-hidden', 'true')
    // L'envoi simulé finit : le libellé revient.
    await expect(page.getByRole('button', { name: 'Valider', exact: true })).toBeVisible({
      timeout: 5_000,
    })
  })

  test('moins d’animations : la flamme et le monogramme restent, immobiles', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await ouvrir(page, OUVERTURE)
    const dessin = page.locator('svg[data-ouverture]')
    // Pas d'ouverture : le dessin est entier tout de suite, et les formes SMIL sont arrêtées.
    await expect(dessin).toHaveAttribute('data-ouverture', 'vivante')
    await expect(dessin).toHaveAttribute('data-immobile', '')
    expect(await dessin.evaluate((svg) => (svg as SVGSVGElement).animationsPaused())).toBe(true)
    expect(await animationsCss(page)).toBe(0)
    expect(
      await dessin
        .locator('.ouverture-trace')
        .first()
        .evaluate((trace) => getComputedStyle(trace).fillOpacity),
    ).toBe('1')

    await ouvrir(page, MOMENTS.page)
    const flamme = page.locator('[data-flamme="vivante"]')
    await expect(flamme).toHaveAttribute('data-immobile', '')
    expect(await flamme.evaluate((svg) => (svg as SVGSVGElement).animationsPaused())).toBe(true)
    expect(await animationsCss(page)).toBe(0)
  })

  for (const [nom, adresse] of Object.entries({ ouverture: OUVERTURE, ...MOMENTS })) {
    test(`axe et 360 px : ${nom}`, async ({ page }) => {
      await ouvrir(page, adresse)
      if (!nom.startsWith('envoi'))
        await expect(page.locator('[data-flamme], svg').first()).toBeVisible()
      expect(decrireFautes(await auditerAxe(page)), 'axe : WCAG 2.1 A et AA').toEqual([])
      await page.setViewportSize({ width: LARGEUR_MINIMALE, height: 800 })
      await ouvrir(page, adresse)
      expect(
        await debordementHorizontal(page),
        'défilement horizontal à 360 px',
      ).toBeLessThanOrEqual(0)
    })
  }

  test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
    test.setTimeout(90_000)
    const largeur = page.viewportSize()?.width ?? 0
    // L'ouverture une fois jouée (le monogramme dessiné, la flamme allumée et vivante).
    await ouvrir(page, OUVERTURE)
    await expect(page.locator('svg[data-ouverture]')).toHaveAttribute('data-ouverture', 'vivante', {
      timeout: 5_000,
    })
    await page.screenshot({ path: `test-results/captures/chargement-ouverture-${largeur}.png` })
    for (const [nom, adresse] of Object.entries(MOMENTS)) {
      await ouvrir(page, adresse)
      if (!nom.startsWith('envoi'))
        await expect(page.locator('[data-flamme]').first()).toBeVisible()
      await page.screenshot({
        path: `test-results/captures/chargement-${nom}-${largeur}.png`,
        fullPage: true,
      })
    }
  })
})
