import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// « Changer le statut » et « Marquer traité » (lot P1) sur l'aperçu de développement : le vrai
// composant `ActionsPoint`, un point d'exemple, des écritures simulées (aucune base, aucune
// écriture). Trois formats par les projets Playwright : 1440, 834 et 390 px. Les parcours avec la
// base (un ministère mentionné marque un point traité, un autre ne le voit pas) sont dans
// `e2e/points.ecriture.spec.ts`.

const RAPPEL =
  "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech."
const TITRE = 'Salle pour la soirée de louange'

async function ouvrir(page: Page, requete = '') {
  await page.goto(`/apercu/points-actions${requete ? `?${requete}` : ''}`)
  await page.evaluate(() => document.fonts.ready)
}

const boutonDuPoint = (page: Page, nom: string) =>
  page.getByRole('button', { name: nom, description: TITRE })
const fenetre = (page: Page) => page.getByRole('dialog')
const messageDe = (page: Page, texte: string) => page.getByRole('status').filter({ hasText: texte })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('boutons selon le profil', () => {
  for (const requete of [
    'profil=ministere&lien=createur',
    'profil=ministere&lien=mentionne',
    'profil=ministere',
  ]) {
    test(`ministère lié au point (${requete}) : les deux boutons`, async ({ page }) => {
      await ouvrir(page, requete)
      await expect(boutonDuPoint(page, 'Changer le statut')).toBeVisible()
      await expect(boutonDuPoint(page, 'Marquer traité')).toBeVisible()
      await auditer(page)
    })
  }

  for (const profil of ['berger', 'conseil']) {
    test(`${profil} : « Marquer traité » seulement`, async ({ page }) => {
      await ouvrir(page, `profil=${profil}`)
      await expect(boutonDuPoint(page, 'Marquer traité')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Changer le statut' })).toHaveCount(0)
    })
  }

  for (const requete of [
    'profil=admin_eglise',
    'profil=admin_plateforme',
    'profil=ministere&lien=aucun',
    'profil=ministere&statut=traite',
    'profil=berger&statut=traite',
  ]) {
    test(`aucun bouton (${requete})`, async ({ page }) => {
      await ouvrir(page, requete)
      await expect(page.getByRole('heading', { level: 2, name: TITRE })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Changer le statut' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0)
    })
  }
})

test.describe('Marquer traité', () => {
  test('ministère : commentaire obligatoire, refus sous le champ, puis point traité', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere&lien=mentionne')
    await boutonDuPoint(page, 'Marquer traité').click()

    const boite = fenetre(page)
    await expect(boite).toBeVisible()
    await expect(boite).toBeFocused()
    await expect(boite.getByRole('heading', { name: 'Marquer traité' })).toBeVisible()
    await expect(boite).toContainText(`« ${TITRE} »`)
    await expect(boite.getByText(RAPPEL)).toHaveCount(1)
    await expect(boite.getByText('0 sur 280')).toBeVisible()
    await expect(boite.getByText('Un point traité ne se rouvre pas.')).toBeVisible()
    await auditer(page)

    const champ = boite.getByLabel('Ce qui a été traité, et comment')
    const valider = boite.getByRole('button', { name: 'Marquer traité' })
    // Jamais grisé : le texte manquant se dit sous le champ.
    await valider.click()
    const message = 'Expliquez ce qui a été traité et comment (10 caractères au moins).'
    await expect(boite.getByText(message)).toBeVisible()
    await expect(champ).toBeFocused()
    await expect(champ).toHaveAttribute('aria-invalid', 'true')
    await auditer(page)

    await champ.fill('123456789')
    await valider.click()
    await expect(boite.getByText(message)).toBeVisible()

    await champ.fill('Salle confirmée pour le 10 octobre.')
    await valider.click()
    await expect(boite).toHaveCount(0)
    await expect(messageDe(page, 'Point marqué traité.')).toHaveText('Point marqué traité.')
    // Un point traité n'a plus aucun bouton, mais le message reste affiché.
    await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Changer le statut' })).toHaveCount(0)
    await expect(messageDe(page, 'Point marqué traité.')).toBeVisible()
    // Le bouton a disparu : le focus passe au bloc de la page, il ne tombe pas sur le corps.
    await expect(page.locator('[data-repli-focus]')).toBeFocused()
    await auditer(page)
  })

  test('berger : commentaire facultatif, envoi sans commentaire', async ({ page }) => {
    await ouvrir(page, 'profil=berger')
    await boutonDuPoint(page, 'Marquer traité').click()
    const boite = fenetre(page)
    await expect(boite.getByLabel('Commentaire (facultatif)')).toBeVisible()
    await expect(boite.getByText(RAPPEL)).toHaveCount(1)
    await boite.getByRole('button', { name: 'Marquer traité' }).click()
    await expect(boite).toHaveCount(0)
    await expect(messageDe(page, 'Point marqué traité.')).toBeVisible()
  })

  test('« Annuler », « Retour » et Échap ferment sans rien écrire, le focus revient au bouton', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=conseil')
    const ouvrirFenetre = boutonDuPoint(page, 'Marquer traité')
    await ouvrirFenetre.click()
    await fenetre(page).getByRole('button', { name: 'Annuler' }).click()
    await expect(fenetre(page)).toHaveCount(0)
    await expect(ouvrirFenetre).toBeFocused()

    await ouvrirFenetre.click()
    await fenetre(page).getByRole('button', { name: 'Retour' }).click()
    await expect(fenetre(page)).toHaveCount(0)

    await ouvrirFenetre.click()
    await page.keyboard.press('Escape')
    await expect(fenetre(page)).toHaveCount(0)
    await expect(ouvrirFenetre).toBeFocused()
    await expect(page.locator('[data-annonce-point]')).toHaveCount(0)
  })

  test('connexion perdue : le texte reste, un message le dit', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&envoi=echec')
    await boutonDuPoint(page, 'Marquer traité').click()
    const boite = fenetre(page)
    const champ = boite.getByLabel('Ce qui a été traité, et comment')
    await champ.fill('Salle confirmée pour le 10 octobre.')
    await boite.getByRole('button', { name: 'Marquer traité' }).click()
    await expect(boite.getByRole('alert')).toHaveText(
      'La connexion a échoué. Votre commentaire est encore dans le formulaire : réessayez.',
    )
    await expect(champ).toHaveValue('Salle confirmée pour le 10 octobre.')
    await auditer(page)
  })

  test('refus de la base : son message, tel quel', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&envoi=refus')
    await boutonDuPoint(page, 'Marquer traité').click()
    const boite = fenetre(page)
    await boite.getByLabel('Ce qui a été traité, et comment').fill('Salle confirmée le 10.')
    await boite.getByRole('button', { name: 'Marquer traité' }).click()
    const alerte = boite.getByRole('alert')
    await expect(alerte).toHaveText('Ce point est déjà traité.')
    // L'erreur est sous le bouton d'enregistrement, avant « Annuler » : elle reste à l'écran.
    const boiteAlerte = await alerte.boundingBox()
    const boiteAnnuler = await boite.getByRole('button', { name: 'Annuler' }).boundingBox()
    expect(boiteAlerte).not.toBeNull()
    expect(boiteAnnuler).not.toBeNull()
    expect(boiteAlerte?.y ?? 0).toBeLessThan(boiteAnnuler?.y ?? 0)
  })

  test('titre masqué par EJP Tech : rappelé tel quel, sans guillemets', async ({ page }) => {
    await ouvrir(page, 'profil=berger&titre=masque')
    await page.getByRole('button', { name: 'Marquer traité' }).click()
    await expect(fenetre(page)).toContainText('[texte masqué par EJP Tech]')
    await expect(fenetre(page)).not.toContainText('«')
  })
})

test.describe('Changer le statut', () => {
  test('trois boutons radio, statut actuel choisi, aide, enregistrement', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&statut=attente_decision')
    await boutonDuPoint(page, 'Changer le statut').click()
    const boite = fenetre(page)
    await expect(boite.getByRole('heading', { name: 'Changer le statut' })).toBeVisible()
    await expect(boite).toContainText(`« ${TITRE} »`)
    await expect(boite.getByRole('radio')).toHaveCount(3)
    await expect(boite.getByRole('radio', { name: 'En attente de décision' })).toBeChecked()
    await expect(
      boite.getByText('Un point « En attente de décision » passe avant les autres'),
    ).toBeVisible()
    await expect(boite.getByRole('button', { name: 'Aide : Statut' })).toBeVisible()
    await expect(boite.getByText(RAPPEL)).toHaveCount(0)
    await auditer(page)

    await boite.getByText('En cours', { exact: true }).click()
    await expect(boite.getByRole('radio', { name: 'En cours' })).toBeChecked()
    await boite.getByRole('button', { name: 'Enregistrer le statut' }).click()
    await expect(boite).toHaveCount(0)
    await expect(messageDe(page, 'Statut enregistré')).toHaveText('Statut enregistré : En cours.')
    await expect(page.getByText('En cours', { exact: true })).toBeVisible()
    // Le point reste ouvert : ses boutons restent.
    await expect(boutonDuPoint(page, 'Changer le statut')).toBeVisible()
  })

  test('enregistrer le statut déjà en place ferme la fenêtre sans message', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&statut=en_cours')
    await boutonDuPoint(page, 'Changer le statut').click()
    const boite = fenetre(page)
    await expect(boite.getByRole('radio', { name: 'En cours' })).toBeChecked()
    await boite.getByRole('button', { name: 'Enregistrer le statut' }).click()
    await expect(boite).toHaveCount(0)
    await expect(boutonDuPoint(page, 'Changer le statut')).toBeFocused()
    await expect(page.locator('[data-annonce-point]')).toHaveCount(0)
  })

  test('les flèches du clavier changent de statut', async ({ page }) => {
    await ouvrir(page, 'profil=ministere')
    await boutonDuPoint(page, 'Changer le statut').click()
    const boite = fenetre(page)
    await boite.getByRole('radio', { name: 'À traiter' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(boite.getByRole('radio', { name: 'En cours' })).toBeChecked()
  })

  test('connexion perdue : le choix reste', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&envoi=echec')
    await boutonDuPoint(page, 'Changer le statut').click()
    const boite = fenetre(page)
    await boite.getByText('En cours', { exact: true }).click()
    await boite.getByRole('button', { name: 'Enregistrer le statut' }).click()
    await expect(boite.getByRole('alert')).toHaveText(
      'La connexion a échoué. Votre choix est encore dans le formulaire : réessayez.',
    )
    await expect(boite.getByRole('radio', { name: 'En cours' })).toBeChecked()
  })
})

test.describe('largeurs', () => {
  test('sous 600 px plein écran, à partir de 600 px un panneau de 460 px', async ({ page }) => {
    await ouvrir(page, 'profil=ministere')
    await boutonDuPoint(page, 'Marquer traité').click()
    const taille = page.viewportSize()
    const boite = await fenetre(page).boundingBox()
    if (!taille || !boite) throw new Error('Fenêtre ou taille de page absente.')
    if (taille.width < 600) {
      expect(boite.width).toBe(taille.width)
      expect(boite.height).toBe(taille.height)
    } else {
      expect(boite.width).toBe(460)
      expect(boite.x + boite.width).toBe(taille.width)
    }
  })

  test('à 360 px, aucun défilement horizontal, fenêtre fermée et ouverte', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'Largeur de téléphone')
    await page.setViewportSize({ width: 360, height: 800 })
    await ouvrir(page, 'profil=ministere')
    const debord = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
    expect(await debord()).toBeLessThanOrEqual(0)
    for (const nom of ['Changer le statut', 'Marquer traité']) {
      await boutonDuPoint(page, nom).click()
      expect(await debord()).toBeLessThanOrEqual(0)
      const boite = fenetre(page)
      const contenu = await boite.evaluate((element) => element.scrollWidth - element.clientWidth)
      expect(contenu).toBeLessThanOrEqual(0)
      await auditer(page)
      await page.keyboard.press('Escape')
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  const largeur = page.viewportSize()?.width ?? 0
  await ouvrir(page, 'profil=ministere&lien=mentionne')
  await page.screenshot({ path: `test-results/captures/points-actions-point-${largeur}.png` })
  await boutonDuPoint(page, 'Changer le statut').click()
  await page.screenshot({ path: `test-results/captures/points-actions-statut-${largeur}.png` })
  await page.keyboard.press('Escape')
  await boutonDuPoint(page, 'Marquer traité').click()
  await page.getByRole('button', { name: 'Marquer traité' }).last().click()
  await page.screenshot({ path: `test-results/captures/points-actions-traite-${largeur}.png` })
})
