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
  // T78 : un nom corrigé, un événement retiré (ancien lien), le panneau d'EJP Tech.
  'nom-corrige',
  'retire',
  'consultation',
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
    // T78 (Q15) : les mentions se changent jusqu'à la date de l'événement.
    await expect(
      page.getByText("Vous pourrez les changer jusqu'à la date de l'événement."),
    ).toBeVisible()
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
    await expect(page.getByText('Seul Coordination peut modifier cet événement.')).toBeVisible()
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

// T78, lot 1 (conception calendrier-evenements.md, 8.2) : les corrections du porteur et le
// panneau d'EJP Tech, sur l'aperçu (envois simulés). « Aujourd'hui » : mardi 6 octobre 2026.
test.describe('corrections d’un événement (T78), aperçu', () => {
  test('S4 : « Corriger le nom », la fenêtre, puis « Nom corrigé. »', async ({ page }) => {
    await ouvrir(page, 'mise-a-jour')
    await page.getByRole('button', { name: 'Corriger le nom' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Corriger le nom' })
    const champ = fenetre.getByLabel("Nom de l'événement")
    await expect(champ).toHaveValue('Soirée de louange')
    // Le rappel sur les données personnelles sous le seul champ libre de la fenêtre.
    await expect(champ).toHaveAccessibleDescription(
      "N'écrivez aucun nom ni information personnelle.",
    )
    await champ.fill('Soirée de louange et de prière')
    await fenetre.getByRole('button', { name: 'Enregistrer le nom' }).click()
    await expect(fenetre).toHaveCount(0)
    await expect(page.getByText('Nom corrigé.')).toBeVisible()
  })

  test('un nom corrigé : « Ancien nom : Soirée de lounge, corrigé le 6 oct. »', async ({
    page,
  }) => {
    await ouvrir(page, 'nom-corrige')
    await expect(page.getByText('Ancien nom : Soirée de lounge, corrigé le 6 oct.')).toBeVisible()
  })

  test('S5 : « Modifier les mentions », mentions actuelles cochées, puis « Mentions enregistrées. »', async ({
    page,
  }) => {
    await ouvrir(page, 'mise-a-jour')
    await page.getByRole('button', { name: 'Modifier les mentions' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Modifier les mentions' })
    await expect(fenetre.getByRole('checkbox', { name: /Coordination/ })).toBeChecked()
    await expect(fenetre.getByRole('checkbox', { name: /Communication/ })).toHaveCount(0)
    // La case est cachée : on clique son libellé (comme « Modifier les mentions » d'un point).
    for (const nom of ['Coordination', 'Social']) {
      await fenetre
        .locator('label')
        .filter({ has: page.getByRole('checkbox', { name: nom, exact: true }) })
        .click()
    }
    await expect(fenetre.getByRole('checkbox', { name: 'Social', exact: true })).toBeChecked()
    await fenetre.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(fenetre).toHaveCount(0)
    await expect(page.getByText('Mentions enregistrées.')).toBeVisible()
  })

  test('S3 : « Retirer l’événement », la fenêtre, « Garder », puis le retrait', async ({
    page,
  }) => {
    await ouvrir(page, 'mise-a-jour')
    await page.getByRole('button', { name: "Retirer l'événement" }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Retirer cet événement ?' })
    await expect(fenetre).toContainText('Ce retrait est définitif.')
    await expect(fenetre).toContainText('choisissez plutôt le statut Annulé')
    await fenetre.getByRole('button', { name: "Garder l'événement" }).click()
    await expect(fenetre).toHaveCount(0)
    await page.getByRole('button', { name: "Retirer l'événement" }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: "Retirer l'événement" }).click()
    await expect(page.getByRole('status').filter({ hasText: 'retiré' })).toContainText(
      'Événement retiré du calendrier.',
    )
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toBeVisible()
  })

  test('après la date : les mentions et le retrait disent leur raison, avec le lien', async ({
    page,
  }) => {
    await ouvrir(page, 'termine')
    await expect(page.getByRole('button', { name: 'Modifier les mentions' })).toHaveCount(0)
    await expect(
      page.getByText("Les mentions ne changent plus : la date de l'événement est passée."),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: "Retirer l'événement" })).toHaveCount(0)
    await expect(page.getByText(/^Un événement passé se retire par EJP Tech\./)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Corriger le nom' })).toBeVisible()
  })

  test('ancien lien : « Cet événement a été retiré le 5 oct. »', async ({ page }) => {
    await ouvrir(page, 'retire')
    await expect(page.getByText('Cet événement a été retiré le 5 oct.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toBeVisible()
  })

  test('EJP Tech : l’événement en lecture, « Retirer l’événement », sans formulaire', async ({
    page,
  }) => {
    await ouvrir(page, 'consultation')
    await expect(titre(page)).toHaveText('Événement')
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Corriger|Modifier|Enregistrer/ })).toHaveCount(0)
    await page.getByRole('button', { name: "Retirer l'événement" }).click()
    await expect(page.getByRole('alertdialog')).toContainText('chez le ministère qui le porte')
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
  // T78 : les trois fenêtres du porteur.
  await ouvrir(page, 'mise-a-jour')
  await page.getByRole('button', { name: 'Corriger le nom' }).click()
  await expect(page.getByRole('dialog', { name: 'Corriger le nom' })).toBeVisible()
  await capturer('corriger-nom')
  await ouvrir(page, 'mise-a-jour')
  await page.getByRole('button', { name: 'Modifier les mentions' }).click()
  await expect(page.getByRole('dialog', { name: 'Modifier les mentions' })).toBeVisible()
  await capturer('modifier-mentions')
  await ouvrir(page, 'mise-a-jour')
  await page.getByRole('button', { name: "Retirer l'événement" }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await capturer('retirer')
})
