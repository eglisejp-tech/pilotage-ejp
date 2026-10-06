import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Saisies des chiffres du lot E3 sur les aperçus (/apercu/saisies?ecran=...), sans base ni
// écriture : la saisie du dimanche (08) et « Chiffres du mois », avec leurs états vides, la grille
// de répartition et le champ « Précision » d'un sensible. Trois formats par les projets
// Playwright ; les écritures sont dans e2e/base/saisies-chiffres.ecriture.spec.ts.

type Ecran = { ecran: 'dimanche' | 'mois'; etat?: string; profil?: string }

const adresse = ({ ecran, etat, profil = 'ministere' }: Ecran) =>
  `/apercu/saisies?ecran=${ecran}&profil=${profil}${etat ? `&etat=${etat}` : ''}`

async function ouvrir(page: Page, ecran: Ecran) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const boutonsAide = (page: Page) => page.getByRole('button', { name: /^Aide : / })

const TOUS: Ecran[] = [
  { ecran: 'dimanche' },
  { ecran: 'dimanche', etat: 'correction' },
  { ecran: 'dimanche', etat: 'matin' },
  { ecran: 'dimanche', etat: 'matin-vide' },
  { ecran: 'dimanche', etat: 'refuse' },
  { ecran: 'dimanche', etat: 'erreur' },
  { ecran: 'mois' },
  { ecran: 'mois', etat: 'correction' },
  { ecran: 'mois', etat: 'masquee' },
  { ecran: 'mois', etat: 'sans-categories' },
  { ecran: 'mois', etat: 'sans-indicateur' },
  { ecran: 'mois', etat: 'refuse' },
  { ecran: 'mois', etat: 'erreur' },
]

const nomDe = ({ ecran, etat }: Ecran) => [ecran, etat].filter(Boolean).join('-')

test.describe('saisie du dimanche (aperçu, maquette 08)', () => {
  test('le dimanche de référence, les communs, « 79 % des actifs » et quatre aides', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'dimanche' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dimanche 27 septembre' }),
    ).toBeVisible()
    await expect(page.getByText('Dimanche dernier : 9')).toBeVisible()
    await expect(page.getByText('Saisi le 24 sept.')).toBeVisible()
    await expect(page.getByText(/^79\s% des actifs$/)).toBeVisible()
    await expect(boutonsAide(page)).toHaveCount(4)
  })

  test('envoi : « Chiffres du dimanche 27 sept. enregistrés. »', async ({ page }) => {
    await ouvrir(page, { ecran: 'dimanche' })
    await page.getByLabel('STARs au service ce dimanche', { exact: true }).fill('10')
    await page.getByRole('button', { name: 'Enregistrer les chiffres' }).click()
    await expect(
      page.getByRole('status').getByText('Chiffres du dimanche 27 sept. enregistrés.'),
    ).toBeVisible()
  })

  test('coupure : le message de LISEZMOI, les valeurs restent', async ({ page }) => {
    await ouvrir(page, { ecran: 'dimanche', etat: 'coupure' })
    const service = page.getByLabel('STARs au service ce dimanche', { exact: true })
    await service.fill('9')
    await page.getByRole('button', { name: 'Enregistrer les chiffres' }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
    )
    await expect(service).toHaveValue('9')
  })

  test('correction : surtitre, « Déjà saisi » et « Enregistrer la correction »', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'dimanche', etat: 'correction' })
    await expect(page.getByText('Corriger les chiffres du dimanche')).toBeVisible()
    await expect(
      page.getByText(
        'Déjà saisi : 10, le 27 sept. à 12 h 41. Votre saisie la remplacera dans les totaux.',
      ),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enregistrer la correction' })).toBeVisible()
  })
})

test.describe('« Chiffres du mois » (aperçu)', () => {
  test('la grille : « Non réparti » en direct ; une somme trop grande n’enregistre rien', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'mois' })
    await page.getByLabel('Bénéficiaires (passages)', { exact: true }).fill('7')
    await page.getByLabel('Malaise', { exact: true }).fill('4')
    await page.getByLabel('Blessure', { exact: true }).fill('2')
    await expect(page.getByText('Non réparti : 1')).toBeVisible()
    await page.getByLabel('Malaise', { exact: true }).fill('9')
    await expect(
      page.getByText('La somme des catégories (11) dépasse le total du mois (7).'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer les chiffres du mois' }).click()
    await expect(page.getByRole('status').getByText(/enregistrés\.$/)).toHaveCount(0)
  })

  test('la précision : qui la lit, le rappel une fois, « 0 sur 280 », 9 caractères refusés', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'mois' })
    await expect(
      page.getByText('Lue par votre ministère, le berger, le conseil et EJP Tech.'),
    ).toBeVisible()
    await expect(
      page.getByText(
        "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech.",
      ),
    ).toHaveCount(1)
    await expect(page.getByText('0 sur 280')).toBeVisible()
    await page.getByLabel('Bénéficiaires (passages)', { exact: true }).fill('3')
    await page.getByLabel('Précision (facultatif)', { exact: true }).fill('Neuf cara')
    await page.getByRole('button', { name: 'Enregistrer les chiffres du mois' }).click()
    await expect(
      page.getByText('Écrivez au moins 10 caractères, ou laissez la précision vide.'),
    ).toBeVisible()
  })

  test('correction : total, précision et grille repris ; envoi « Chiffres de septembre 2026 enregistrés. »', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'mois', etat: 'correction' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Septembre 2026, en cours' }),
    ).toBeVisible()
    await expect(page.getByLabel('Bénéficiaires (passages)', { exact: true })).toHaveValue('7')
    await expect(page.getByLabel('Malaise', { exact: true })).toHaveValue('4')
    await expect(page.getByLabel('Précision (facultatif)', { exact: true })).toHaveValue(
      /^Plus de passages/,
    )
    await page.getByLabel('Bénéficiaires (passages)', { exact: true }).fill('8')
    await page.getByRole('button', { name: 'Enregistrer les chiffres du mois' }).click()
    await expect(
      page.getByRole('status').getByText('Chiffres de septembre 2026 enregistrés.'),
    ).toBeVisible()
  })

  test('un refus de la base sur le texte s’affiche sous le champ « Précision »', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'mois', etat: 'refus-precision' })
    const precision = page.getByLabel('Précision (facultatif)', { exact: true })
    await precision.fill('Texte modifié pour ce mois.')
    await page.getByRole('button', { name: 'Enregistrer les chiffres du mois' }).click()
    await expect(page.getByText("N'écrivez aucun nom ni information personnelle.")).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(precision).toHaveValue('Texte modifié pour ce mois.')
  })

  test('sans indicateur du mois : la phrase et « Revenir à ma fiche »', async ({ page }) => {
    await ouvrir(page, { ecran: 'mois', etat: 'sans-indicateur' })
    await expect(page.getByText("Votre ministère n'a pas d'indicateur du mois.")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toBeVisible()
  })
})

test.describe('profils sans saisie', () => {
  for (const profil of ['admin_plateforme', 'berger', 'conseil', 'admin_eglise']) {
    test(`${profil} : la page non disponible, aucun bouton de saisie`, async ({ page }) => {
      for (const ecran of ['dimanche', 'mois'] as const) {
        await ouvrir(page, { ecran, profil })
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: "Cette page n'est pas disponible avec votre compte.",
          }),
        ).toBeVisible()
        await expect(page.getByRole('button', { name: /^Enregistrer/ })).toHaveCount(0)
      }
    })
  }
})

test.describe('accessibilité et formats', () => {
  test('aides au clavier : Entrée ouvre, Échap ferme, le focus reste', async ({ page }) => {
    await ouvrir(page, { ecran: 'mois' })
    const aides = boutonsAide(page)
    await expect(aides).toHaveCount(4)
    for (let rang = 0; rang < 4; rang++) {
      const aide = aides.nth(rang)
      await aide.focus()
      await page.keyboard.press('Enter')
      await expect(aide).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(aide).toHaveAttribute('aria-expanded', 'false')
      await expect(aide).toBeFocused()
    }
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

  test('cibles de 44 px au moins : boutons, liens et champs des formulaires', async ({ page }) => {
    for (const ecran of [{ ecran: 'dimanche' }, { ecran: 'mois' }] as const) {
      await ouvrir(page, ecran)
      const cibles = page.locator(
        '[data-colonne] button:visible, [data-colonne] a:visible, [data-colonne] input:visible',
      )
      for (let rang = 0; rang < (await cibles.count()); rang++) {
        const boite = await cibles.nth(rang).boundingBox()
        expect(boite?.height ?? 0, `${nomDe(ecran)} ${rang}`).toBeGreaterThanOrEqual(44)
      }
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/saisies-e3-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
  // La grille et le champ « Précision » remplis, avec la ligne « Non réparti ».
  await ouvrir(page, { ecran: 'mois' })
  await page.getByLabel('Bénéficiaires (passages)', { exact: true }).fill('7')
  await page.getByLabel('Malaise', { exact: true }).fill('4')
  await page.getByLabel('Blessure', { exact: true }).fill('2')
  await page
    .getByLabel('Précision (facultatif)', { exact: true })
    .fill('Plus de passages pendant la collecte de rentrée.')
  await page.screenshot({
    path: `test-results/captures/saisies-e3-mois-grille-remplie-${largeur}.png`,
    fullPage: true,
  })
})
