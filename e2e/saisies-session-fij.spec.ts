import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Saisies du lot E4 sur les aperçus (/apercu/saisies?ecran=...), sans base ni écriture : saisie
// d'une session (09), « Choisir la session », carte des FIJ, chiffres par département et bloc
// « Chiffres par département » de la fiche de Coordo FIJ, avec leurs états vides. Trois formats
// par les projets Playwright ; les écritures sont dans e2e/base/*.ecriture.spec.ts.

type Ecran = { ecran: string; profil?: string; etat?: string }

const adresse = ({ ecran, profil = 'ministere', etat }: Ecran) =>
  `/apercu/saisies?ecran=${ecran}&profil=${profil}${etat ? `&etat=${etat}` : ''}`

async function ouvrir(page: Page, ecran: Ecran) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const boutonsAide = (page: Page) => page.getByRole('button', { name: /^Aide : / })

const FORMULAIRES: (Ecran & { aides: number })[] = [
  { ecran: 'session', aides: 3 },
  { ecran: 'carte-fij', aides: 1 },
  { ecran: 'chiffres-departement', aides: 1 },
]

const TOUS: Ecran[] = [
  { ecran: 'session' },
  { ecran: 'session', etat: 'correction' },
  { ecran: 'choix-session' },
  { ecran: 'choix-session', etat: 'vide' },
  { ecran: 'choix-session', etat: 'toutes-saisies' },
  { ecran: 'carte-fij' },
  { ecran: 'carte-fij', etat: 'premier-usage' },
  { ecran: 'chiffres-departement' },
  { ecran: 'chiffres-departement', etat: 'premier-usage' },
  { ecran: 'bloc-departements', profil: 'berger' },
  { ecran: 'bloc-departements', profil: 'berger', etat: 'semaine-vide' },
  { ecran: 'bloc-departements', profil: 'ministere', etat: 'premier-usage' },
  { ecran: 'bloc-departements', profil: 'admin_plateforme', etat: 'premier-usage' },
  { ecran: 'bloc-departements', profil: 'berger', etat: 'erreur' },
]

const nomDe = ({ ecran, profil, etat }: Ecran) =>
  [ecran, profil && ecran === 'bloc-departements' ? profil : null, etat].filter(Boolean).join('-')

test.describe('saisie d’une session (aperçu, maquette 09)', () => {
  test('les deux champs, la ligne calculée en direct, la complétude et ses manquants', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'session' })
    await expect(
      page.getByRole('heading', { level: 1, name: "Bâtir l'Église, samedi 26 septembre" }),
    ).toBeVisible()
    await expect(page.getByText('Session précédente : 12')).toBeVisible()
    await page.getByLabel('STARs de votre ministère présents', { exact: true }).fill('13')
    await page
      .getByLabel('Dont déjà comptés par leur ministère principal', { exact: true })
      .fill('2')
    await expect(page.getByText("Comptés dans le total de l'église : 11.")).toBeVisible()
    await expect(page.getByText('Coordination et Intégration')).toBeVisible()
  })

  test('envoi : « Présence enregistrée pour Bâtir l’Église du 26 sept. »', async ({ page }) => {
    await ouvrir(page, { ecran: 'session' })
    await page.getByLabel('STARs de votre ministère présents', { exact: true }).fill('13')
    await page.getByRole('button', { name: 'Enregistrer la présence' }).click()
    await expect(
      page.getByRole('status').getByText("Présence enregistrée pour Bâtir l'Église du 26 sept."),
    ).toBeVisible()
  })

  test('coupure : le message de LISEZMOI, les valeurs restent', async ({ page }) => {
    await ouvrir(page, { ecran: 'session', etat: 'erreur' })
    const presents = page.getByLabel('STARs de votre ministère présents', { exact: true })
    await presents.fill('9')
    await page.getByRole('button', { name: 'Enregistrer la présence' }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
    )
    await expect(presents).toHaveValue('9')
  })

  test('« Choisir la session » : en attente de l’administration, sans action', async ({ page }) => {
    await ouvrir(page, { ecran: 'choix-session', etat: 'vide' })
    await expect(page.getByText('Aucune session à saisir.')).toBeVisible()
    await expect(page.getByText("L'administration de l'église déclare les sessions.")).toBeVisible()
  })
})

test.describe('saisies FIJ (aperçu)', () => {
  test('carte : « Total : 29 FIJ », puis la complétude quand un département manque', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'carte-fij' })
    await expect(page.getByText('Total : 29 FIJ')).toBeVisible()
    await page.getByLabel('77 Seine-et-Marne', { exact: true }).fill('')
    await expect(page.getByText('Total : 26 FIJ, 7 dép. sur 8')).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer la carte' }).click()
    await expect(page.getByText('Saisissez un nombre, 0 si aucun.')).toBeVisible()
  })

  test('chiffres par département : 4 rubriques de 8 champs, total en direct', async ({ page }) => {
    await ouvrir(page, { ecran: 'chiffres-departement', etat: 'premier-usage' })
    const rubriques = page.getByRole('group')
    await expect(rubriques).toHaveCount(4)
    await expect(rubriques.first().getByRole('textbox')).toHaveCount(8)
    await rubriques.first().getByLabel('75 Paris', { exact: true }).fill('12')
    await expect(rubriques.first().getByText('Total : 12, 1 dép. sur 8')).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer les chiffres' }).click()
    await expect(
      page.getByRole('status').getByText('Chiffres par département de la semaine 39 enregistrés.'),
    ).toBeVisible()
  })
})

test.describe('bloc « Chiffres par département » de la fiche (aperçu)', () => {
  test('total de chaque rubrique avec « 6 dép. sur 8 », jamais 0 pour un absent', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'bloc-departements', profil: 'berger' })
    await expect(page.getByRole('heading', { name: 'Chiffres par département' })).toBeVisible()
    await expect(page.getByText('6 dép. sur 8')).toHaveCount(4)
    await expect(page.getByText('Pas de saisie').first()).toBeVisible()
    await expect(page.getByRole('img')).toHaveCount(4)
  })

  test('premier usage : l’action pour le ministère FIJ seulement, rien pour EJP Tech', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'bloc-departements', profil: 'ministere', etat: 'premier-usage' })
    await expect(
      page.getByRole('link', { name: 'Saisir les chiffres par département' }),
    ).toBeVisible()
    for (const profil of ['admin_plateforme', 'berger', 'conseil']) {
      await ouvrir(page, { ecran: 'bloc-departements', profil, etat: 'premier-usage' })
      await expect(page.getByText('Pas encore de saisie par département.')).toBeVisible()
      await expect(page.getByRole('main').getByRole('link')).toHaveCount(0)
      await expect(page.getByRole('main').getByRole('button', { name: /Saisir/ })).toHaveCount(0)
    }
  })

  test('problème passager : « Réessayer », le bloc garde son titre', async ({ page }) => {
    await ouvrir(page, { ecran: 'bloc-departements', profil: 'berger', etat: 'erreur' })
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Chiffres par département' })).toBeVisible()
  })
})

test.describe('aides et accessibilité', () => {
  for (const formulaire of FORMULAIRES) {
    test(`${formulaire.ecran} : ${formulaire.aides} aide(s), au clavier`, async ({ page }) => {
      await ouvrir(page, formulaire)
      const boutons = boutonsAide(page)
      await expect(boutons).toHaveCount(formulaire.aides)
      const premier = boutons.first()
      await premier.focus()
      await page.keyboard.press('Enter')
      await expect(premier).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(premier).toHaveAttribute('aria-expanded', 'false')
      await expect(premier).toBeFocused()
      await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toBeVisible()
    })
  }

  test('bloc de la fiche : une aide flottante, sur la première rubrique', async ({ page }) => {
    await ouvrir(page, { ecran: 'bloc-departements', profil: 'berger' })
    await expect(boutonsAide(page)).toHaveCount(1)
  })

  for (const ecran of TOUS) {
    test(`audit axe : ${nomDe(ecran)}`, async ({ page }) => {
      await ouvrir(page, ecran)
      const aide = boutonsAide(page).first()
      if ((await aide.count()) > 0) {
        await aide.scrollIntoViewIfNeeded()
        await aide.click()
      }
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test('à 360 px, aucun défilement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nomDe(ecran)).toBeLessThanOrEqual(0)
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/saisies-e4-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
})
