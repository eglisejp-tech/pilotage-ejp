import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Écran 15, « Modération » (lot L6) sur l'aperçu de développement : les vrais composants, données
// d'exemple, décisions simulées comme la base (aucune base, aucune écriture). Trois formats par
// les projets Playwright : 1440, 834 et 390 px.

const VUES = [
  'ecran',
  'sans-indicateur',
  'file-vide',
  'file-chargement',
  'file-probleme',
  'lien-long',
] as const
const TEXTE_MASQUE = '[texte masqué par EJP Tech]'

async function ouvrir(page: Page, requete = '') {
  await page.goto(`/apercu/moderation?profil=admin_plateforme${requete}`)
  await page.evaluate(() => document.fonts.ready)
}

const file = (page: Page) => page.getByRole('region', { name: 'Champs libres à relire' })
const signalements = (page: Page) => page.getByRole('region', { name: 'Signalements', exact: true })
const ligne = (page: Page, entete: string) => file(page).getByRole('article', { name: entete })
const fenetre = (page: Page) => page.getByRole('dialog', { name: 'Masquer le texte' })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('Écran Modération (EJP Tech), aperçu', () => {
  test('titre, en-tête des indicateurs, bloc « Signalements », puis la file', async ({ page }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle('Modération, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modération')
    await expect(page.getByText('Administration de la plateforme')).toBeVisible()
    await expect(
      page.getByText('2 indicateurs attendent votre validation, le plus ancien depuis 4 jours.'),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Ouvrir les indicateurs à valider' }),
    ).toHaveAttribute('href', '/indicateurs#a-valider')
    await expect(signalements(page).getByText('2 signalements ouverts')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Signalements',
      'Champs libres à relire',
    ])
    await expect(file(page).getByText('4 textes en attente')).toBeVisible()
    await expect(file(page).getByText(/^EJP Tech relit les textes libres/)).toBeVisible()
  })

  test("les textes à relire d'abord (précisions en tête, puis du plus ancien au plus récent), puis les décisions", async ({
    page,
  }) => {
    await ouvrir(page)
    const entetes = file(page).getByRole('article').getByRole('heading', { level: 3 })
    await expect(entetes).toHaveText([
      "Précision d'un chiffre, Social",
      "Point d'attention, Intégration",
      'Événement, Jeunesse',
      "Point d'attention, Communication",
      "Point d'attention, Social",
      'Réunion, Berger',
      "Point d'attention, Coordination",
    ])
    const jeunesse = ligne(page, 'Événement, Jeunesse')
    await expect(jeunesse).toContainText('29 sept., 18 h 20')
    await expect(jeunesse).toContainText('« Sortie jeunesse au parc de Sceaux, départ 10 h. »')
    await expect(jeunesse.getByRole('button', { name: 'Rien à signaler' })).toBeVisible()
    await expect(jeunesse.getByRole('button', { name: 'Masquer le texte' })).toBeVisible()
    await expect(ligne(page, "Point d'attention, Social")).toContainText(
      "Masqué le 30 sept. : nom d'une personne",
    )
    await expect(ligne(page, "Point d'attention, Coordination")).toContainText(
      'Relu le 29 sept. : rien à signaler',
    )
    // Un texte relu garde « Masquer le texte », jamais « Rien à signaler ».
    const coordination = ligne(page, "Point d'attention, Coordination")
    await expect(coordination.getByRole('button')).toHaveCount(1)
    await expect(coordination.getByRole('button', { name: 'Masquer le texte' })).toBeVisible()
  })

  test('un point montre tous ses champs libres, avec leur nom', async ({ page }) => {
    await ouvrir(page)
    const point = ligne(page, "Point d'attention, Communication")
    await expect(point.getByText('Titre', { exact: true })).toBeVisible()
    await expect(point.getByText('Ce qui se passe', { exact: true })).toBeVisible()
    await expect(point.getByText('Ce qui est attendu', { exact: true })).toBeVisible()
    await expect(point).toContainText('Trois versions circulent')
  })

  test("une précision dit l'indicateur et le mois, jamais une valeur", async ({ page }) => {
    await ouvrir(page)
    const precision = ligne(page, "Précision d'un chiffre, Social")
    await expect(precision).toContainText('Personnes accompagnées, septembre 2026')
    await expect(precision).toContainText("Plus de demandes que d'habitude ce mois-ci")
    // Ni total, ni répartition : aucun chiffre en dehors de la date et de l'année.
    const texte = (await precision.innerText()).replace(/\d{1,2} \S+, \d{1,2} h( \d{2})?/, '')
    expect(texte.replace(/2026/, '')).not.toMatch(/\d/)
  })

  test('« Rien à signaler » : la ligne passe à « Relu », le compte baisse, le message est annoncé', async ({
    page,
  }) => {
    await ouvrir(page)
    const jeunesse = ligne(page, 'Événement, Jeunesse')
    await jeunesse.getByRole('button', { name: 'Rien à signaler' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'relu' })).toHaveText(
      'Texte marqué comme relu.',
    )
    await expect(jeunesse).toContainText('Relu le 6 oct. : rien à signaler')
    await expect(jeunesse.getByRole('button', { name: 'Rien à signaler' })).toHaveCount(0)
    await expect(jeunesse.getByRole('button', { name: 'Masquer le texte' })).toBeVisible()
    await expect(file(page).getByText('3 textes en attente')).toBeVisible()
    await expect(file(page).getByRole('heading', { level: 2 })).toBeFocused()
  })

  test('« Masquer le texte » : motif obligatoire, puis le champ est remplacé et la ligne datée', async ({
    page,
  }) => {
    await ouvrir(page)
    const integration = ligne(page, "Point d'attention, Intégration")
    await integration.getByRole('button', { name: 'Masquer le texte' }).click()
    const boite = fenetre(page)
    await expect(boite).toBeVisible()
    await expect(boite.getByText("Point d'attention, Intégration")).toBeVisible()
    await expect(boite.getByRole('radio')).toHaveCount(4)
    await expect(boite.getByRole('radio').first()).toHaveAccessibleName("Nom d'une personne")
    await expect(boite.getByText('Coordonnées (téléphone, adresse, email)')).toBeVisible()
    await expect(boite.getByText('Santé ou situation personnelle')).toBeVisible()
    await expect(boite.getByText('Autre information personnelle')).toBeVisible()
    await expect(boite.getByText(`Le texte sera remplacé par « ${TEXTE_MASQUE} ».`)).toContainText(
      'Cette action ne peut pas être annulée.',
    )
    // Un seul champ : cité, déjà choisi.
    await expect(boite.getByText("« Affiche et flyer de l'accueil du 15 octobre. »")).toBeVisible()

    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(boite.getByText('Choisissez un motif dans la liste.')).toBeVisible()

    await boite.getByRole('radio', { name: "Nom d'une personne" }).check()
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(fenetre(page)).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'masqué' })).toHaveText('Texte masqué.')
    await expect(integration).toContainText(`« ${TEXTE_MASQUE} »`)
    await expect(integration).toContainText("Masqué le 6 oct. : nom d'une personne")
    await expect(integration.getByRole('button')).toHaveCount(0)
    await expect(file(page).getByText('3 textes en attente')).toBeVisible()
  })

  test('plusieurs champs : le choix du champ, puis seuls les autres restent à masquer', async ({
    page,
  }) => {
    await ouvrir(page)
    const point = ligne(page, "Point d'attention, Communication")
    await point.getByRole('button', { name: 'Masquer le texte' }).click()
    const boite = fenetre(page)
    await expect(
      boite.getByRole('group', { name: 'Champ à masquer' }).getByRole('radio'),
    ).toHaveCount(3)
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(boite.getByText('Choisissez le champ à masquer.')).toBeVisible()
    await boite.getByRole('radio', { name: /Ce qui se passe/ }).check()
    await boite.getByRole('radio', { name: 'Coordonnées (téléphone, adresse, email)' }).check()
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(point).toContainText('Masqué le 6 oct. : coordonnées')
    await expect(point.getByText(TEXTE_MASQUE)).toHaveCount(1)
    // Les deux autres champs restent : « Masquer le texte » reste là, sans « Rien à signaler ».
    await expect(point.getByRole('button', { name: 'Rien à signaler' })).toHaveCount(0)
    await point.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(
      fenetre(page).getByRole('group', { name: 'Champ à masquer' }).getByRole('radio'),
    ).toHaveCount(2)
  })

  test('Échap et « Annuler » ferment la fenêtre sans rien écrire, le focus revient au bouton', async ({
    page,
  }) => {
    await ouvrir(page)
    const bouton = ligne(page, 'Événement, Jeunesse').getByRole('button', {
      name: 'Masquer le texte',
    })
    await bouton.click()
    await expect(fenetre(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(fenetre(page)).toHaveCount(0)
    await expect(bouton).toBeFocused()
    await bouton.click()
    await fenetre(page).getByRole('button', { name: 'Annuler' }).click()
    await expect(fenetre(page)).toHaveCount(0)
    await expect(ligne(page, 'Événement, Jeunesse')).not.toContainText('Masqué')
  })

  test("connexion perdue : l'erreur sous les boutons, la fenêtre reste ouverte", async ({
    page,
  }) => {
    await ouvrir(page, '&envoi=echec')
    await ligne(page, 'Événement, Jeunesse')
      .getByRole('button', { name: 'Rien à signaler' })
      .click()
    await expect(ligne(page, 'Événement, Jeunesse').getByRole('alert')).toHaveText(
      'La connexion a échoué. Réessayez.',
    )
    await ligne(page, 'Événement, Jeunesse')
      .getByRole('button', { name: 'Masquer le texte' })
      .click()
    await fenetre(page).getByRole('radio', { name: 'Autre information personnelle' }).check()
    await fenetre(page).getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(fenetre(page).getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(
      fenetre(page).getByRole('radio', { name: 'Autre information personnelle' }),
    ).toBeChecked()
  })

  test("masquer le texte d'un signalement ouvert, puis le commentaire d'un signalement clos", async ({
    page,
  }) => {
    await ouvrir(page)
    const ouvert = signalements(page).getByRole('article', { name: 'Intégration' })
    await ouvert.getByRole('button', { name: 'Masquer le texte' }).click()
    await fenetre(page).getByRole('radio', { name: "Nom d'une personne" }).check()
    await fenetre(page).getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'masqué' })).toHaveText('Texte masqué.')
    await expect(ouvert).toContainText(`« ${TEXTE_MASQUE} »`)
    // Plus rien à masquer sur ce signalement : le bouton a disparu, « Clore » reste.
    await expect(ouvert.getByRole('button', { name: 'Masquer le texte' })).toHaveCount(0)
    await expect(ouvert.getByRole('button', { name: 'Clore le signalement' })).toBeVisible()
    await expect(signalements(page).getByRole('heading', { level: 2 })).toBeFocused()

    // Le signalement clos : son texte et le commentaire de clôture, deux champs.
    const clos = page.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    await clos.getByRole('button', { name: 'Masquer le texte' }).click()
    const boite = fenetre(page)
    await expect(boite.getByRole('radio', { name: /Signalement/ })).toBeVisible()
    await boite.getByRole('radio', { name: /Commentaire de clôture/ }).check()
    await boite.getByRole('radio', { name: 'Autre information personnelle' }).check()
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(clos).toContainText(`Commentaire : ${TEXTE_MASQUE}`)
    await expect(clos).toContainText('Le bouton Envoyer reste grisé')
  })

  test('états : file vide, chargement, problème passager, sans indicateur', async ({ page }) => {
    await ouvrir(page, '&vue=file-vide')
    await expect(file(page).getByText('Aucun texte à relire.')).toBeVisible()
    await expect(file(page).getByText('Aucun texte en attente')).toBeVisible()

    await ouvrir(page, '&vue=file-chargement')
    await expect(file(page).getByText('Chargement')).toBeVisible()

    await ouvrir(page, '&vue=file-probleme')
    await expect(file(page).getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(file(page).getByRole('button', { name: 'Réessayer' })).toBeVisible()

    await ouvrir(page, '&vue=sans-indicateur')
    await expect(page.getByText(/attend(ent)? votre validation/)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ouvrir les indicateurs à valider' })).toHaveCount(
      0,
    )
  })

  for (const profil of ['ministere', 'berger', 'conseil', 'admin_eglise']) {
    test(`profil ${profil} : page non disponible, ni file ni signalement`, async ({ page }) => {
      await page.goto(`/apercu/moderation?profil=${profil}`)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeVisible()
      await expect(page.getByRole('main').getByText(/relire|signalement|masquer/i)).toHaveCount(0)
    })
  }
})

test.describe('accessibilité et largeurs', () => {
  for (const vue of VUES) {
    test(`audit axe : ${vue}`, async ({ page }) => {
      await ouvrir(page, `&vue=${vue}`)
      if (vue === 'file-chargement') await expect(page.getByText('Chargement')).toBeVisible()
      await auditer(page)
    })
  }

  test('audit axe avec la fenêtre « Masquer le texte » ouverte (un champ, puis plusieurs)', async ({
    page,
  }) => {
    await ouvrir(page)
    await ligne(page, 'Événement, Jeunesse')
      .getByRole('button', { name: 'Masquer le texte' })
      .click()
    await expect(fenetre(page)).toBeVisible()
    await auditer(page)
    await page.keyboard.press('Escape')
    await ligne(page, "Point d'attention, Communication")
      .getByRole('button', { name: 'Masquer le texte' })
      .click()
    await fenetre(page).getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(fenetre(page).getByText('Choisissez le champ à masquer.')).toBeVisible()
    await auditer(page)
  })

  test('les boutons et les choix de la fenêtre font 44 px de haut au moins', async ({ page }) => {
    await ouvrir(page)
    const boutons = file(page).getByRole('button')
    for (const bouton of await boutons.all()) {
      const boite = await bouton.boundingBox()
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    await ligne(page, "Point d'attention, Communication")
      .getByRole('button', { name: 'Masquer le texte' })
      .click()
    for (const choix of await fenetre(page).locator('label').all()) {
      const boite = await choix.boundingBox()
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    for (const bouton of await fenetre(page).getByRole('button').all()) {
      const boite = await bouton.boundingBox()
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('à 360 px, aucun défilement horizontal (écran, lien long, fenêtre ouverte)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'Largeur de téléphone')
    await page.setViewportSize({ width: 360, height: 800 })
    for (const vue of ['ecran', 'lien-long', 'file-vide']) {
      await ouvrir(page, `&vue=${vue}`)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, vue).toBeLessThanOrEqual(0)
    }
    await ouvrir(page, '&vue=lien-long')
    await file(page).getByRole('button', { name: 'Masquer le texte' }).first().click()
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debord, 'fenêtre ouverte').toBeLessThanOrEqual(0)
    const boite = await fenetre(page).boundingBox()
    expect((boite?.x ?? -1) >= 0 && (boite?.width ?? 999) <= 360).toBe(true)
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(90_000)
  const largeur = page.viewportSize()?.width ?? 0
  const capturer = (nom: string) =>
    page.screenshot({
      path: `test-results/captures/moderation-${nom}-${largeur}.png`,
      fullPage: true,
    })
  for (const vue of VUES) {
    await ouvrir(page, `&vue=${vue}`)
    if (vue === 'file-chargement') await expect(page.getByText('Chargement')).toBeVisible()
    await capturer(vue)
  }
  await ouvrir(page)
  await ligne(page, "Point d'attention, Communication")
    .getByRole('button', { name: 'Masquer le texte' })
    .click()
  await capturer('fenetre-champs')
  await page.keyboard.press('Escape')
  await ligne(page, 'Événement, Jeunesse').getByRole('button', { name: 'Masquer le texte' }).click()
  await fenetre(page).getByRole('button', { name: 'Masquer définitivement' }).click()
  await capturer('fenetre-erreur')
  await ouvrir(page)
  await signalements(page).getByRole('button', { name: 'Masquer le texte' }).first().click()
  await capturer('fenetre-signalement')
})
