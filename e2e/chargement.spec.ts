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
  liste: '/apercu/chargement?moment=liste&profil=berger&onglet=/journal',
  bloc: '/apercu/chargement?moment=bloc&profil=ministere&onglet=/ma-fiche',
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

/**
 * L'onglet de l'écran montré est actif dans l'en-tête, comme dans l'application, et l'accueil ne
 * l'est pas. Les onglets (1024 px et plus) et le menu du téléphone portent chacun le lien.
 */
async function verifierOngletActif(page: Page, libelle: string) {
  const actifs = page.locator('a[aria-current="page"]')
  await expect(actifs.filter({ hasText: libelle }).first()).toBeAttached()
  await expect(actifs.filter({ hasText: /^(Cette semaine|Ma semaine)$/ })).toHaveCount(0)
}

/**
 * La zone `status` qui annonce le chargement n'est dans aucun élément `aria-busy` : certains
 * lecteurs d'écran n'annoncent pas ce qui change dans une zone occupée.
 */
async function annonceHorsZoneOccupee(page: Page, texte: string) {
  const annonce = page.getByRole('status').filter({ hasText: texte })
  await expect(annonce).toHaveCount(1)
  await expect(annonce.locator('xpath=ancestor-or-self::*[@aria-busy="true"]')).toHaveCount(0)
  // L'attente reste marquée (aria-busy), sur le dessin ou les places réservées.
  expect(await page.locator('[aria-busy="true"]').count()).toBeGreaterThan(0)
}

test.describe('animations de chargement (T65)', () => {
  // Les autres parcours réduisent les animations (playwright.config.ts) : ici, on les veut.
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

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
    await expect(page.getByText('Chargement de Ma semaine', { exact: true })).toBeVisible()
    await annonceHorsZoneOccupee(page, 'Chargement de Ma semaine')
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
    await annonceHorsZoneOccupee(page, 'Chargement du journal')
    // L'onglet de l'écran montré est actif, comme dans l'application.
    await verifierOngletActif(page, 'Journal')
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
    await annonceHorsZoneOccupee(page, 'Chargement du calendrier')
    await verifierOngletActif(page, 'Ma fiche')
  })

  test('4. envoi, « … en cours » plus court : le bouton garde exactement sa largeur', async ({
    page,
  }) => {
    await ouvrir(page, MOMENTS.envoi)
    const bouton = page.getByRole('button', { name: "Renvoyer l'invitation", exact: true })
    const avant = (await bouton.boundingBox())?.width ?? 0
    await bouton.click()
    const enCours = page.getByRole('button', { name: 'Envoi en cours' })
    await expect(enCours).toBeVisible()
    // Sans la largeur gardée, « Envoi en cours » ferait rétrécir le bouton.
    const largeurLibre = await enCours.evaluate((element) => {
      const copie = element.cloneNode(true) as HTMLElement
      copie.style.minWidth = ''
      copie.style.position = 'absolute'
      element.parentElement?.append(copie)
      const largeur = copie.getBoundingClientRect().width
      copie.remove()
      return largeur
    })
    expect(largeurLibre).toBeLessThan(avant - 1)
    expect(Math.abs(((await enCours.boundingBox())?.width ?? 0) - avant)).toBeLessThanOrEqual(0.5)
    await expect(enCours.locator('[data-flamme="petite"]')).toHaveAttribute('aria-hidden', 'true')
    // L'envoi simulé finit : le libellé revient, et le bouton reprend sa largeur libre.
    await expect(bouton).toBeVisible({ timeout: 5_000 })
    expect(Math.abs(((await bouton.boundingBox())?.width ?? 0) - avant)).toBeLessThanOrEqual(0.5)
  })

  test('4. envoi, « … en cours » plus long : le bouton ne rétrécit pas, il s’élargit pour le texte entier', async ({
    page,
  }) => {
    // Écart consigné dans T65 : « Valider » devient « Validation en cours », plus long ; le
    // bouton s'élargit (il ne coupe pas le texte), sans déborder de la page.
    await ouvrir(page, MOMENTS.envoi)
    const bouton = page.getByRole('button', { name: 'Valider', exact: true })
    const avant = (await bouton.boundingBox())?.width ?? 0
    await bouton.click()
    const enCours = page.getByRole('button', { name: 'Validation en cours' })
    await expect(enCours).toBeVisible()
    const pendant = await enCours.boundingBox()
    expect(pendant?.width ?? 0).toBeGreaterThan(avant + 1)
    expect((pendant?.x ?? 0) + (pendant?.width ?? 0)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    )
    // Le texte tient sur une ligne : pas de retour à la ligne dans le bouton.
    expect(pendant?.height ?? 0).toBeLessThan(60)
    await expect(enCours.locator('[data-flamme="petite"]')).toHaveAttribute('aria-hidden', 'true')
    await expect(bouton).toBeVisible({ timeout: 5_000 })
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
      // « Pilotage EJP » arrive en fondu pendant l'ouverture : l'audit attend la flamme vivante,
      // pour ne jamais mesurer le contraste d'un texte à moitié transparent.
      if (nom === 'ouverture')
        await expect(page.locator('svg[data-ouverture]')).toHaveAttribute(
          'data-ouverture',
          'vivante',
          { timeout: 5_000 },
        )
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

// L'attente de chaque écran touché par T65, sur son aperçu figé dans son chargement, aux trois
// largeurs : la flamme vivante et les places réservées d'une page ou d'un panneau (moment 2), la
// petite flamme d'un bloc (moment 3). Les animations sont réduites (playwright.config.ts) : la
// capture est nette, le dessin entier et immobile.
const ATTENTES = {
  'cette-semaine': '/apercu/cette-semaine?profil=berger&etat=chargement',
  'ma-semaine': '/apercu/cette-semaine?profil=ministere&etat=chargement',
  fiche: '/apercu/fiche?profil=berger&ecran=chargement',
  ministeres: '/apercu/fiche?profil=berger&ecran=ministeres-chargement',
  journal: '/apercu/journal?profil=berger&etat=chargement',
  points: '/apercu/points?profil=berger&etat=chargement',
  comptes: '/apercu/comptes?profil=admin_plateforme&vue=chargement',
  sessions: '/apercu/sessions?profil=admin_plateforme&vue=chargement',
  indicateurs: '/apercu/indicateurs?profil=admin_plateforme&vue=liste-chargement',
  'indicateurs-ministere': '/apercu/indicateurs?profil=admin_plateforme&vue=chargement',
  'mes-indicateurs': '/apercu/mes-indicateurs?profil=ministere&vue=chargement',
  personnes: '/apercu/personnes?profil=admin_plateforme&etat=chargement',
  'saisie-evenement': '/apercu/evenements?profil=ministere&ecran=chargement',
  'saisie-point': '/apercu/nouveau-point?profil=ministere&ecran=chargement',
  'choix-session': '/apercu/saisies-e4?profil=ministere&ecran=choix-session&etat=chargement',
  'chiffres-departement':
    '/apercu/saisies-e4?profil=ministere&ecran=bloc-departements&etat=chargement',
  calendrier: '/apercu/calendrier?profil=ministere&ecran=fiche-chargement',
  'a-valider': '/apercu/validation-indicateurs?profil=admin_plateforme&vue=chargement',
  signalements: '/apercu/signalements?profil=admin_plateforme&vue=bloc-chargement',
  moderation: '/apercu/moderation?profil=admin_plateforme&vue=file-chargement',
  'qr-code': '/apercu/connexion?ecran=activation&etat=chargement',
} as const

test(
  'captures des attentes des écrans en 1440, 834 et 390 px',
  { tag: '@captures' },
  async ({ page }) => {
    test.setTimeout(180_000)
    const largeur = page.viewportSize()?.width ?? 0
    for (const [nom, adresse] of Object.entries(ATTENTES)) {
      await ouvrir(page, adresse)
      // Le texte qui dit ce qui charge, dans sa zone status, avec la flamme (après 300 ms).
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: /^Chargement (de |du |des )/ })
          .first(),
        nom,
      ).toBeVisible()
      await expect(page.locator('[data-flamme]').first(), nom).toBeVisible()
      await page.screenshot({
        path: `test-results/captures/attente-${nom}-${largeur}.png`,
        fullPage: true,
      })
    }
  },
)
