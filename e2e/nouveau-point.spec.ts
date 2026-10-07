import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// « Nouveau point d'attention » (maquette 10, lot P2) sur l'aperçu de développement : le vrai
// panneau, données d'exemple, envoi simulé comme la base (aucune base, aucune écriture).
// « Aujourd'hui » y est le mardi 6 octobre 2026. Trois formats par les projets Playwright : 1440,
// 834 et 390 px. Le parcours avec la base est dans `e2e/base/nouveau-point.ecriture.spec.ts`.

const ECRANS = ['formulaire', 'sans-mention', 'chargement', 'probleme'] as const
type Ecran = (typeof ECRANS)[number]

const RAPPEL =
  "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech."

async function ouvrir(page: Page, ecran: Ecran = 'formulaire', envoi?: 'echec') {
  await page.goto(
    `/apercu/nouveau-point?profil=ministere&ecran=${ecran}${envoi ? `&envoi=${envoi}` : ''}`,
  )
  await page.evaluate(() => document.fonts.ready)
}

const titre = (page: Page) => page.getByLabel('Titre', { exact: true })
const echeance = (page: Page) => page.getByLabel('Échéance (facultatif)', { exact: true })
const creer = (page: Page) => page.getByRole('button', { name: 'Créer le point' })
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: 'Point créé.' })

/** Coche un ministère par son libellé (la case est cachée, comme les boutons de la maquette). */
async function mentionner(page: Page, nom: string) {
  await page
    .getByRole('group', { name: 'Mentionner un ministère (facultatif)' })
    .getByText(nom, { exact: true })
    .click()
  await expect(page.getByRole('checkbox', { name: nom })).toBeChecked()
}

test.describe("Nouveau point d'attention (maquette 10), aperçu", () => {
  test('champs dans l’ordre de la maquette, rappel sous le titre, trois aides, mentions et lien', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle("Nouveau point d'attention, Pilotage EJP")
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Nouveau point d'attention")
    await expect(page.getByText('Ministère Communication', { exact: true })).toBeVisible()
    await expect(titre(page)).toHaveAccessibleDescription(RAPPEL)
    await expect(page.getByText(RAPPEL)).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^Aide : / })).toHaveCount(3)
    // Ordre de haut en bas : titre, ce qui se passe, priorité, attendu, échéance, mentions.
    const ordre = await page
      .locator('input, textarea')
      .evaluateAll((champs) => champs.map((champ) => champ.id || (champ as HTMLInputElement).value))
    expect(ordre.slice(0, 7)).toEqual([
      'point-titre',
      'point-description',
      'normale',
      'haute',
      'urgente',
      'point-attendu',
      'point-echeance',
    ])
    await expect(echeance(page)).toHaveAttribute('min', '2026-10-06')
    await expect(page.getByRole('radio', { name: 'Normale' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Communication' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Coordination' })).toBeAttached()
    await expect(
      page.getByText(/^Le ministère mentionné verra ce point, et seulement ce point\./),
    ).toBeVisible()
    await expect(creer(page)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=autre',
    )
  })

  test('priorité : trois vrais boutons radio, les flèches du clavier changent le choix', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page.getByRole('radio')).toHaveCount(3)
    await page.getByRole('radio', { name: 'Normale' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Haute' })).toBeChecked()
    await page.getByText('Urgente', { exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Urgente' })).toBeChecked()
  })

  test('compteur « 51 sur 280 » sous « Ce qui se passe », écrit en direct', async ({ page }) => {
    await ouvrir(page)
    await expect(page.getByText('0 sur 280')).toBeVisible()
    await page.getByLabel('Ce qui se passe (facultatif)').fill('a'.repeat(51))
    await expect(page.getByText('51 sur 280')).toBeVisible()
  })

  test('titre vide : le message sous le champ, rien n’est envoyé', async ({ page }) => {
    await ouvrir(page)
    await creer(page).click()
    await expect(titre(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(titre(page)).toHaveAccessibleDescription(
      new RegExp('Donnez un titre au point \\(80 caractères au plus\\)\\.'),
    )
    await expect(reussite(page)).toHaveCount(0)
  })

  test('échéance passée : le message sous le champ, valeurs gardées', async ({ page }) => {
    await ouvrir(page)
    await titre(page).fill('Salle pour la soirée de louange')
    await echeance(page).fill('2026-10-05')
    await creer(page).click()
    await expect(echeance(page)).toHaveAccessibleDescription("L'échéance ne peut pas être passée.")
    await expect(titre(page)).toHaveValue('Salle pour la soirée de louange')
  })

  test('l’échéance choisie s’écrit en toutes lettres sous le champ', async ({ page }) => {
    await ouvrir(page)
    await echeance(page).fill('2026-10-10')
    await expect(page.getByText('samedi 10 octobre 2026')).toBeVisible()
  })

  test('envoi réussi : « Point créé. », formulaire vidé, priorité redevenue « Normale »', async ({
    page,
  }) => {
    await ouvrir(page)
    await titre(page).fill('Salle pour la soirée de louange')
    await page.getByLabel('Ce qui se passe (facultatif)').fill("La salle n'est pas confirmée.")
    await page.getByText('Haute', { exact: true }).click()
    await page
      .getByLabel('Ce qui est attendu (facultatif)', { exact: true })
      .fill('Confirmer la salle')
    await echeance(page).fill('2026-10-10')
    await mentionner(page, 'Coordination')
    await creer(page).click()
    await expect(reussite(page)).toHaveText('Point créé.')
    await expect(titre(page)).toHaveValue('')
    await expect(page.getByRole('radio', { name: 'Normale' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Coordination' })).not.toBeChecked()
  })

  test('connexion perdue : erreur de formulaire, valeurs gardées, bouton de nouveau actif', async ({
    page,
  }) => {
    await ouvrir(page, 'formulaire', 'echec')
    await titre(page).fill('Salle pour la soirée de louange')
    await mentionner(page, 'Intégration')
    await creer(page).click()
    await expect(page.getByRole('alert')).toHaveText(
      'La connexion a échoué. Votre point est encore dans le formulaire : réessayez.',
    )
    await expect(titre(page)).toHaveValue('Salle pour la soirée de louange')
    await expect(page.getByRole('checkbox', { name: 'Intégration' })).toBeChecked()
    await expect(creer(page)).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('aucun autre ministère actif : une phrase à la place des cases', async ({ page }) => {
    await ouvrir(page, 'sans-mention')
    await expect(page.getByText('Aucun autre ministère actif à mentionner.')).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })

  test('problème passager : « Réessayer » à la place du formulaire', async ({ page }) => {
    await ouvrir(page, 'probleme')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await expect(creer(page)).toHaveCount(0)
  })

  for (const profil of ['berger', 'conseil', 'admin_eglise', 'ejp_tech']) {
    test(`profil ${profil} : page non disponible, aucun bouton de création`, async ({ page }) => {
      await page.goto(`/apercu/nouveau-point?profil=${profil}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        "Cette page n'est pas disponible avec votre compte.",
      )
      await expect(creer(page)).toHaveCount(0)
    })
  }
})

test.describe('accessibilité et largeurs', () => {
  for (const ecran of ECRANS) {
    test(`audit axe : ${ecran}`, async ({ page }) => {
      await ouvrir(page, ecran)
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test('audit axe avec les messages de refus et une mention cochée', async ({ page }) => {
    await ouvrir(page)
    await mentionner(page, 'Coordination')
    await echeance(page).fill('2026-10-05')
    await creer(page).click()
    await expect(titre(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(echeance(page)).toHaveAttribute('aria-invalid', 'true')
    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(resultat.violations).toEqual([])
  })

  test('audit axe avec l’aide de la priorité ouverte', async ({ page }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Aide : Priorité' }).click()
    await expect(page.getByRole('button', { name: 'Aide : Priorité' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(resultat.violations).toEqual([])
  })

  test('à 360 px, aucun défilement horizontal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'Largeur de téléphone')
    await page.setViewportSize({ width: 360, height: 800 })
    for (const ecran of ECRANS) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, ecran).toBeLessThanOrEqual(0)
    }
    // Avec tous les ministères cochés et les messages affichés, le formulaire tient encore.
    await ouvrir(page)
    await echeance(page).fill('2026-10-05')
    await creer(page).click()
    await expect(titre(page)).toHaveAttribute('aria-invalid', 'true')
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debord).toBeLessThanOrEqual(0)
  })

  test('sous 600 px une page entière, à partir de 600 px un panneau de 460 px', async ({
    page,
  }) => {
    await ouvrir(page)
    const largeur = page.viewportSize()?.width ?? 0
    const fenetre = page.getByRole('dialog', { name: "Nouveau point d'attention" })
    if (largeur < 600) {
      await expect(fenetre).toHaveCount(0)
    } else {
      const boite = await fenetre.boundingBox()
      expect(boite?.width).toBe(460)
    }
  })

  test('cibles tactiles : boutons, cases et champs font 44 px au moins', async ({ page }) => {
    await ouvrir(page)
    const cibles = page.locator(
      'button[type="submit"], input[type="text"], input[type="date"], textarea, label:has(input[type="radio"]) > span, label:has(input[type="checkbox"]) > span',
    )
    const hauteurs = await cibles.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    )
    expect(hauteurs.length).toBeGreaterThan(10)
    for (const hauteur of hauteurs) expect(hauteur).toBeGreaterThanOrEqual(44)
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  const largeur = page.viewportSize()?.width ?? 0
  const capturer = (nom: string) =>
    page.screenshot({
      path: `test-results/captures/nouveau-point-${nom}-${largeur}.png`,
      fullPage: true,
    })
  for (const ecran of ECRANS) {
    await ouvrir(page, ecran)
    await capturer(ecran)
  }
  // Le formulaire rempli comme la maquette 10 : priorité Haute, une mention cochée.
  await ouvrir(page)
  await titre(page).fill('Salle pour la soirée de louange')
  await page
    .getByLabel('Ce qui se passe (facultatif)')
    .fill("La salle du 10 octobre n'est pas encore confirmée.")
  await page.getByText('Haute', { exact: true }).click()
  await page
    .getByLabel('Ce qui est attendu (facultatif)', { exact: true })
    .fill('Confirmer la salle')
  await echeance(page).fill('2026-10-10')
  await mentionner(page, 'Coordination')
  await capturer('rempli')
  // Messages de refus, puis aide de la priorité ouverte.
  await ouvrir(page)
  await echeance(page).fill('2026-10-05')
  await creer(page).click()
  await expect(titre(page)).toHaveAttribute('aria-invalid', 'true')
  await capturer('refus')
  await ouvrir(page)
  await page.getByRole('button', { name: 'Aide : Priorité' }).click()
  await capturer('aide-priorite')
})
