import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Observabilité des personnes (T56) sur les aperçus de développement, sans base : l'écran « Qui
// utilise l'outil ? », l'en-tête « Vous : Marie D. » avec « Ce n'est pas moi », et l'onglet
// « Personnes » d'EJP Tech. Trois formats par les projets Playwright : 1440, 834 et 390 px.

async function ouvrir(page: Page, adresse: string) {
  await page.goto(adresse)
  await page.evaluate(() => document.fonts.ready)
}

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

/** Aucun défilement horizontal à 360 px, puis retour au format du projet. */
async function sansDebordementA360(page: Page) {
  const format = page.viewportSize()
  await page.setViewportSize({ width: 360, height: 800 })
  const debord = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(debord).toBeLessThanOrEqual(0)
  if (format) await page.setViewportSize(format)
}

const TITRE = "Qui utilise l'outil ?"

test.describe('« Qui utilise l’outil ? » (aperçu)', () => {
  test('la question, le compte, le champ, l’information et « Se déconnecter »', async ({
    page,
  }) => {
    await ouvrir(page, '/apercu/qui-utilise')
    await expect(page).toHaveTitle(`${TITRE}, Pilotage EJP`)
    await expect(page.getByRole('heading', { level: 1, name: TITRE })).toBeVisible()
    await expect(page.getByText('Ministère Communication')).toBeVisible()
    await expect(page.getByText('Ce compte est partagé. Indiquez votre prénom.')).toBeVisible()
    await expect(page.getByLabel('Votre prénom')).toHaveAttribute('autocomplete', 'given-name')
    await expect(
      page.getByText("EJP Tech le voit, pour suivre l'utilisation de l'outil."),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Confidentialité (nouvel onglet)' }),
    ).toHaveAttribute('href', '/confidentialite')
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0)
    await auditer(page)
    await sansDebordementA360(page)
  })

  test('refuse un champ vide ou un email, accepte « Marie D. » ; cibles de 44 px', async ({
    page,
  }) => {
    await ouvrir(page, '/apercu/qui-utilise')
    const bouton = page.getByRole('button', { name: 'Continuer' })
    await bouton.click()
    await expect(page.getByText('Indiquez votre prénom.', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Votre prénom')).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Votre prénom').fill('marie@exemple.test')
    await bouton.click()
    await expect(page.getByText('Écrivez seulement votre prénom, en lettres.')).toBeVisible()
    await auditer(page)
    await page.getByLabel('Votre prénom').fill('Marie D.')
    await bouton.click()
    await expect(page.getByText('Déclaration simulée : Marie D.')).toBeVisible()
    for (const cible of [
      bouton,
      page.getByRole('button', { name: 'Se déconnecter' }),
      page.getByRole('link', { name: 'Confidentialité (nouvel onglet)' }),
    ]) {
      const boite = await cible.boundingBox()
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('« Ce n’est pas moi » : « Annuler » en plus ; erreur d’enregistrement', async ({ page }) => {
    await ouvrir(page, '/apercu/qui-utilise?changer=1')
    await expect(page.getByRole('button', { name: 'Annuler' })).toBeVisible()
    await ouvrir(page, '/apercu/qui-utilise?etat=erreur')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await auditer(page)
  })

  test('rappel du jour (T63) : le prénom de la veille proposé, un seul appui le confirme', async ({
    page,
  }) => {
    await ouvrir(page, '/apercu/qui-utilise?etat=rappel')
    await expect(
      page.getByText('Ce compte est partagé. Confirmez votre prénom, ou changez-le.'),
    ).toBeVisible()
    await expect(page.getByLabel('Votre prénom')).toHaveValue('Marie D.')
    await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0)
    await auditer(page)
    await sansDebordementA360(page)
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page.getByText('Déclaration simulée : Marie D.')).toBeVisible()
  })
})

test.describe('conditions acceptées par la personne déclarée (T61, aperçu)', () => {
  test('« Vous : Marie D. » et « Ce n’est pas moi » sur l’écran des conditions', async ({
    page,
  }) => {
    await ouvrir(page, '/apercu/connexion?ecran=acceptation&outils=non')
    await expect(
      page.getByRole('heading', { level: 1, name: "Conditions d'utilisation" }),
    ).toBeVisible()
    await expect(
      page.getByText(
        "Ce compte est partagé : chaque personne qui l'utilise accepte elle-même les conditions.",
      ),
    ).toBeVisible()
    await expect(page.getByText('Vous : Marie D.')).toBeVisible()
    const lien = page.getByRole('link', { name: "Ce n'est pas moi" })
    await expect(lien).toHaveAttribute('href', '/apercu/qui-utilise?changer=1')
    const boite = await lien.boundingBox()
    expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44)
    await auditer(page)
    await sansDebordementA360(page)
  })
})

test.describe('en-tête d’un compte de ministère : « Vous : Marie D. » (aperçu)', () => {
  test('le prénom et « Ce n’est pas moi », près de « Se déconnecter »', async ({ page }) => {
    await ouvrir(page, '/apercu/navigation?profil=ministere&vous=Marie%20D.')
    const bouton = page.getByRole('button', { name: 'Ouvrir le menu' })
    if (await bouton.isVisible()) await bouton.click()
    const entete = page.getByRole('banner')
    await expect(entete.getByText('Vous : Marie D.').filter({ visible: true })).toBeVisible()
    const lien = entete.getByRole('link', { name: "Ce n'est pas moi" }).filter({ visible: true })
    await expect(lien).toHaveAttribute('href', '/apercu/qui-utilise?changer=1')
    const boite = await lien.boundingBox()
    expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44)
    await auditer(page)
    await sansDebordementA360(page)
  })

  test('sous 1024 px, le prénom suit le compte sans ouvrir le menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await ouvrir(page, '/apercu/navigation?profil=ministere&vous=Marie%20D.')
    await expect(
      page
        .getByRole('banner')
        .getByText('Ministère Communication, Marie D.')
        .filter({ visible: true }),
    ).toBeVisible()
  })

  test('aucun débordement de l’en-tête de 1024 à 1536 px, même avec un long prénom', async ({
    page,
  }) => {
    for (const vous of ['Marie%20D.', 'Marie-Bérénice%20Anne-Sophie%20D.']) {
      await ouvrir(page, `/apercu/navigation?profil=ministere&vous=${vous}`)
      for (const largeur of [1024, 1280, 1300, 1366, 1440, 1536]) {
        await page.setViewportSize({ width: largeur, height: 900 })
        const debord = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debord, `${decodeURIComponent(vous)} à ${largeur} px`).toBeLessThanOrEqual(0)
      }
    }
  })

  test('les autres profils n’ont ni prénom ni « Ce n’est pas moi »', async ({ page }) => {
    await ouvrir(page, '/apercu/navigation?profil=berger&vous=Marie')
    await expect(page.getByText(/Vous :/)).toHaveCount(0)
    await expect(page.getByRole('link', { name: "Ce n'est pas moi" })).toHaveCount(0)
  })
})

test.describe('onglet « Personnes » d’EJP Tech (aperçu)', () => {
  test('les personnes actives par compte, les connexions, l’effacement', async ({ page }) => {
    await ouvrir(page, '/apercu/personnes?profil=admin_plateforme')
    await expect(page).toHaveTitle('Personnes, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1, name: 'Personnes' })).toBeVisible()
    const actives = page.getByRole('region', { name: 'Actives sur 30 jours' })
    await expect(actives.getByRole('heading', { level: 3 })).toHaveText([
      'Ministère Communication',
      'Ministère Intégration',
    ])
    const connexions = page.getByRole('region', { name: 'Dernières connexions' })
    await expect(connexions.getByRole('listitem')).toHaveCount(50)
    await expect(
      connexions.getByText('Dim. 11 oct., 11 h : Ministère Communication, Marie D.'),
    ).toBeVisible()
    await auditer(page)
    await sansDebordementA360(page)

    await page.getByRole('button', { name: 'Afficher 50 de plus' }).click()
    await expect(connexions.getByRole('listitem')).toHaveCount(55)

    await actives
      .getByRole('button', { name: 'Effacer ce prénom (Marie D., Ministère Communication)' })
      .click()
    const fenetre = page.getByRole('dialog', { name: 'Effacer ce prénom' })
    await expect(fenetre).toContainText(
      'Ce prénom sera remplacé par « [prénom effacé] » partout. Cette action ne peut pas être annulée.',
    )
    await auditer(page)
    await fenetre.getByRole('button', { name: 'Effacer définitivement' }).click()
    await expect(page.getByText('Prénom effacé.')).toBeVisible()
    await expect(fenetre).toHaveCount(0)
  })

  test('les prénoms de plus de 12 mois', async ({ page }) => {
    await ouvrir(page, '/apercu/personnes?profil=admin_plateforme')
    await expect(page.getByText('2 prénoms ont plus de 12 mois.')).toBeVisible()
    await page.getByRole('button', { name: 'Effacer les prénoms de plus de 12 mois' }).click()
    await page
      .getByRole('dialog', { name: 'Effacer les prénoms de plus de 12 mois' })
      .getByRole('button', { name: 'Effacer définitivement' })
      .click()
    await expect(page.getByText('2 prénoms effacés.')).toBeVisible()
  })

  test('une personne sans activité depuis 30 jours s’efface aussi ; cibles de 44 px', async ({
    page,
  }) => {
    await ouvrir(page, '/apercu/personnes?profil=admin_plateforme')
    const sansActivite = page.getByRole('region', { name: 'Sans activité depuis 30 jours' })
    const bouton = sansActivite.getByRole('button', {
      name: 'Effacer ce prénom (Ancien, Ministère Intégration)',
    })
    expect((await bouton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    await bouton.click()
    await page
      .getByRole('dialog', { name: 'Effacer ce prénom' })
      .getByRole('button', { name: 'Effacer définitivement' })
      .click()
    await expect(page.getByText('Prénom effacé.')).toBeVisible()
    await expect(sansActivite).toHaveCount(0)
  })

  test('vide, chargement et erreur', async ({ page }) => {
    await ouvrir(page, '/apercu/personnes?profil=admin_plateforme&etat=vide')
    await expect(
      page.getByText("Personne n'a utilisé un compte de ministère depuis 30 jours."),
    ).toBeVisible()
    await expect(page.getByText('Aucune connexion pour le moment.')).toBeVisible()
    await auditer(page)
    await ouvrir(page, '/apercu/personnes?profil=admin_plateforme&etat=erreur')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await ouvrir(page, '/apercu/personnes?profil=admin_plateforme&etat=chargement')
    await expect(page.getByRole('status').filter({ hasText: 'Chargement' })).toBeVisible()
  })

  test('« Personnes » est le dernier onglet d’EJP Tech, et le Journal technique nomme la personne', async ({
    page,
  }) => {
    await ouvrir(page, '/apercu/journal?profil=admin_plateforme&periode=tout')
    const bouton = page.getByRole('button', { name: 'Ouvrir le menu' })
    if (await bouton.isVisible()) await bouton.click()
    await expect(
      page
        .getByRole('navigation', { name: 'Navigation principale' })
        .filter({ visible: true })
        .getByRole('link')
        .last(),
    ).toHaveText('Personnes')
    const lignes = page.getByRole('list', { name: 'Lignes du journal' })
    await expect(
      lignes.getByText(/\((Marie D\.|Paul|personne non déclarée)\)/).first(),
    ).toBeVisible()
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(90_000)
  const largeur = page.viewportSize()?.width ?? 0
  const ecrans = [
    ['qui-utilise', '/apercu/qui-utilise'],
    ['qui-utilise-changement', '/apercu/qui-utilise?changer=1'],
    ['qui-utilise-rappel', '/apercu/qui-utilise?etat=rappel'],
    ['conditions-personne', '/apercu/connexion?ecran=acceptation&outils=non'],
    ['conditions-compte', '/apercu/connexion?ecran=acceptation&compte=personnel&outils=non'],
    ['en-tete-ministere', '/apercu/navigation?profil=ministere&vous=Marie%20D.'],
    ['personnes', '/apercu/personnes?profil=admin_plateforme'],
    ['journal-technique', '/apercu/journal?profil=admin_plateforme'],
  ] as const
  for (const [nom, adresse] of ecrans) {
    await ouvrir(page, adresse)
    await page.screenshot({
      path: `test-results/captures/personnes-${nom}-${largeur}.png`,
      fullPage: true,
    })
  }
})
