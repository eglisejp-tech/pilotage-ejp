import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Saisies d'événement et de réunion (maquette 11 et panneaux dérivés, lot E5) sur l'aperçu de
// développement : les vrais panneaux, données d'exemple, envois simulés comme la base (aucune
// base, aucune écriture). « Aujourd'hui » y est le mardi 6 octobre 2026. Trois formats par les
// projets Playwright : 1440, 834 et 390 px.

const ECRANS = [
  'ajout',
  'sans-mention',
  'mise-a-jour',
  'a-confirmer',
  // Un événement passé, Terminé sans heure de début (T68).
  'termine',
  'pas-porteur',
  'introuvable',
  'probleme',
  'reunion',
  'reunion-modifier',
] as const
type Ecran = (typeof ECRANS)[number] | 'chargement'

async function ouvrir(page: Page, ecran: Ecran, envoi?: 'echec') {
  await page.goto(
    `/apercu/evenements?profil=ministere&ecran=${ecran}${envoi ? `&envoi=${envoi}` : ''}`,
  )
  await page.evaluate(() => document.fonts.ready)
}

const titre = (page: Page) => page.getByRole('heading', { level: 1 })
const date = (page: Page) => page.getByLabel('Date', { exact: true })
const heurePrevue = (page: Page) => page.getByLabel('Heure prévue (facultatif)')
const heureDebut = (page: Page) => page.getByLabel('Heure de début (facultatif)')

test.describe('heures d’un événement (T68), aperçu', () => {
  test('ajout : « Heure prévue (facultatif) » sous la date, avec l’indication sur les cultes', async ({
    page,
  }) => {
    await ouvrir(page, 'ajout')
    await expect(heurePrevue(page)).toHaveAttribute('type', 'time')
    await expect(heurePrevue(page)).toHaveAccessibleDescription(
      'Les cultes du dimanche ne se déclarent pas ici.',
    )
    await expect(heureDebut(page)).toHaveCount(0)
    const bas = async (champ: ReturnType<Page['getByLabel']>) =>
      (await champ.boundingBox())?.y ?? Number.NaN
    expect(await bas(date(page))).toBeLessThan(await bas(heurePrevue(page)))
    expect(await bas(heurePrevue(page))).toBeLessThan(
      await bas(page.getByLabel("Nom de l'événement")),
    )
  })

  test('mise à jour d’un Terminé passé : heure prévue préremplie, heure de début, puis réussite', async ({
    page,
  }) => {
    await ouvrir(page, 'termine')
    await expect(heurePrevue(page)).toHaveValue('19:00')
    await expect(heureDebut(page)).toHaveValue('')
    await expect(heureDebut(page)).toHaveAccessibleDescription(
      "Une heure enregistrée se corrige, elle ne s'efface pas.",
    )
    await heureDebut(page).fill('19:12')
    const bouton = page.getByRole('button', { name: 'Enregistrer la mise à jour' })
    await bouton.click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement mis à jour.',
    )
    await expect(heureDebut(page)).toHaveValue('19:12')
  })

  test('mise à jour d’un événement à venir : pas d’heure de début, même Terminé', async ({
    page,
  }) => {
    await ouvrir(page, 'mise-a-jour')
    await expect(heurePrevue(page)).toHaveValue('19:00')
    await page.getByText('Terminé', { exact: true }).click()
    await expect(heureDebut(page)).toHaveCount(0)
  })
})

test.describe('Ajouter un événement (maquette 11), aperçu', () => {
  test('champs dans l’ordre de la maquette, rappel sous le nom, mentions et lien', async ({
    page,
  }) => {
    await ouvrir(page, 'ajout')
    await expect(page).toHaveTitle('Ajouter un événement, Pilotage EJP')
    await expect(titre(page)).toHaveText('Ajouter un événement')
    await expect(date(page)).toHaveAttribute('min', '2026-10-06')
    await expect(page.getByLabel("Nom de l'événement")).toHaveAccessibleDescription(
      "N'écrivez aucun nom ni information personnelle.",
    )
    await expect(page.getByRole('radio')).toHaveCount(6)
    await expect(page.getByRole('checkbox', { name: 'Communication' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Coordination' })).toBeVisible()
    await expect(page.getByText('Le ministère mentionné verra cet événement.')).toBeVisible()
    await expect(page.getByText('Vous ne pourrez plus changer les mentions.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ajouter au calendrier' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
  })

  test('date passée : le message sous le champ, puis « Signaler une difficulté »', async ({
    page,
  }) => {
    await ouvrir(page, 'ajout')
    await date(page).fill('2026-10-05')
    await page.getByLabel("Nom de l'événement").fill('Soirée de louange')
    await page.getByText('En attente de validation').click()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(date(page)).toHaveAccessibleDescription(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
    await expect(page.getByLabel("Nom de l'événement")).toHaveValue('Soirée de louange')
    // Deux liens : celui du message et celui du bas du formulaire.
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveCount(2)
  })

  test('envoi réussi : « Événement ajouté au calendrier. », formulaire vidé', async ({ page }) => {
    await ouvrir(page, 'ajout')
    await date(page).fill('2026-10-10')
    await page.getByLabel("Nom de l'événement").fill('Soirée de louange')
    await page.getByText('En attente de validation').click()
    await page.getByRole('checkbox', { name: 'Coordination' }).check()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )
    await expect(page.getByLabel("Nom de l'événement")).toHaveValue('')
  })

  test('connexion perdue : « Vérifiez la liste », une référence, valeurs gardées (T76)', async ({
    page,
  }) => {
    await ouvrir(page, 'ajout', 'echec')
    await date(page).fill('2026-10-10')
    await page.getByLabel("Nom de l'événement").fill('Soirée de louange')
    await page.getByText('Brouillon').click()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    )
    await expect(page.getByRole('alert')).toContainText(
      /Référence pour EJP Tech : [2-9A-HJKMNP-Z]{6}/,
    )
    await expect(page.getByLabel("Nom de l'événement")).toHaveValue('Soirée de louange')
  })

  test('aucun autre ministère actif : une phrase à la place des cases', async ({ page }) => {
    await ouvrir(page, 'sans-mention')
    await expect(page.getByText('Aucun autre ministère à mentionner.')).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })
})

test.describe("Mettre à jour l'événement, aperçu", () => {
  test('nom en lecture seule, ligne identique refusée sous le bouton, sans lien', async ({
    page,
  }) => {
    await ouvrir(page, 'mise-a-jour')
    await expect(titre(page)).toHaveText("Mettre à jour l'événement")
    // Le nom se lit, il ne se saisit plus : aucun champ « Nom de l'événement ».
    await expect(page.getByLabel("Nom de l'événement")).toHaveCount(0)
    await expect(page.getByText('Soirée de louange')).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    const alerte = page.getByRole('alert')
    await expect(alerte).toHaveText(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
    await expect(alerte.getByRole('link')).toHaveCount(0)
  })

  test('nouvelle date : « Report : du sam. 10 oct. au sam. 17 oct. », sans bulle, puis réussite', async ({
    page,
  }) => {
    await ouvrir(page, 'mise-a-jour')
    await date(page).fill('2026-10-17')
    await expect(page.getByText('Report : du sam. 10 oct. au sam. 17 oct.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Aide : / })).toHaveCount(1)
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement mis à jour.',
    )
  })

  test('nouvelle date passée : le message de la mise à jour sous le champ, avec le lien', async ({
    page,
  }) => {
    await ouvrir(page, 'mise-a-jour')
    await date(page).fill('2026-10-05')
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    // Une seule phrase de date passée, comme à l'ajout (T66, t140 et m125).
    await expect(date(page)).toHaveAccessibleDescription(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
  })

  test('événement à confirmer : la ligne au-dessus du statut', async ({ page }) => {
    await ouvrir(page, 'a-confirmer')
    await expect(
      page.getByText(
        'Cet événement attend toujours sa validation. Choisissez son nouveau statut ou changez sa date.',
      ),
    ).toBeVisible()
  })

  test('états : pas pour ce profil, aucun résultat, problème passager', async ({ page }) => {
    await ouvrir(page, 'pas-porteur')
    await expect(
      page.getByText('Seul Coordination peut mettre à jour cet événement.'),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)

    await ouvrir(page, 'introuvable')
    await expect(page.getByText('Cet événement est introuvable.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toBeVisible()

    await ouvrir(page, 'probleme')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('Prochaine réunion, aperçu', () => {
  test('champs, une aide, rappel sous l’objet, « Modifier » prérempli', async ({ page }) => {
    await ouvrir(page, 'reunion')
    await expect(titre(page)).toHaveText('Prochaine réunion')
    await expect(page.getByRole('button', { name: /^Aide : / })).toHaveCount(1)
    await expect(page.getByLabel('Objet (facultatif)')).toHaveAccessibleDescription(
      "N'écrivez aucun nom ni information personnelle.",
    )
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_reunion',
    )
    await ouvrir(page, 'reunion-modifier')
    await expect(date(page)).toHaveValue('2026-10-12')
    await expect(page.getByLabel('Décision attendue (facultatif)', { exact: true })).toHaveValue(
      'Choisir la salle',
    )
    await page.getByRole('button', { name: 'Enregistrer la réunion' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Réunion' })).toHaveText(
      'Réunion enregistrée.',
    )
  })
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

  test('audit axe avec les messages de refus affichés', async ({ page }) => {
    await ouvrir(page, 'mise-a-jour')
    await date(page).fill('2026-10-05')
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveCount(2)
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
  })

  test('sous 600 px une page entière, à partir de 600 px un panneau de 460 px', async ({
    page,
  }) => {
    await ouvrir(page, 'ajout')
    const largeur = page.viewportSize()?.width ?? 0
    const fenetre = page.getByRole('dialog', { name: 'Ajouter un événement' })
    if (largeur < 600) {
      await expect(fenetre).toHaveCount(0)
    } else {
      const boite = await fenetre.boundingBox()
      expect(boite?.width).toBe(460)
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  const largeur = page.viewportSize()?.width ?? 0
  const capturer = (nom: string) =>
    page.screenshot({
      path: `test-results/captures/evenement-${nom}-${largeur}.png`,
      fullPage: true,
    })
  for (const ecran of ECRANS) {
    await ouvrir(page, ecran)
    await capturer(ecran)
  }
  // Panneau 11 avec l'aide du statut ouverte (T66 : la date n'a plus de bulle).
  await ouvrir(page, 'ajout')
  await page.getByRole('button', { name: 'Aide : Statut' }).click()
  await expect(page.getByRole('button', { name: 'Aide : Statut' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await capturer('ajout-aide-statut')
  // Date refusée, avec son lien.
  await date(page).fill('2026-10-05')
  await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
  await expect(page.getByRole('link', { name: 'Signaler une difficulté' })).toHaveCount(2)
  await capturer('ajout-date-refusee')
  // Mise à jour : report en cours de saisie.
  await ouvrir(page, 'mise-a-jour')
  await date(page).fill('2026-10-17')
  await capturer('mise-a-jour-report')
})
