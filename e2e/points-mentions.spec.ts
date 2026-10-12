import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// « Modifier les mentions » (T54) sur l'aperçu de développement : le vrai composant `ActionsPoint`,
// un point d'exemple (Communication, mentionne Intégration), des écritures simulées (aucune base,
// aucune écriture). Trois formats par les projets Playwright : 1440, 834 et 390 px. Le parcours
// avec la base (Communication ajoute Social et retire Intégration, Social voit le point,
// Intégration ne le voit plus, le berger retire une mention) est dans
// `e2e/base/mentions-point.ecriture.spec.ts`.

const TITRE = 'Salle pour la soirée de louange'
const BOUTON = 'Modifier les mentions'

async function ouvrir(page: Page, requete = '') {
  await page.goto(`/apercu/points-actions${requete ? `?${requete}` : ''}`)
  await page.evaluate(() => document.fonts.ready)
}

const boutonDuPoint = (page: Page, nom: string) =>
  page.getByRole('button', { name: nom, description: TITRE })
const fenetre = (page: Page) => page.getByRole('dialog', { name: BOUTON })
const messageDe = (page: Page, texte: string) => page.getByRole('status').filter({ hasText: texte })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

/** Bascule la case d'un ministère (la case est cachée : on clique son libellé). */
const basculer = (page: Page, boite: Locator, nom: string) =>
  boite
    .locator('label')
    .filter({ has: page.getByRole('checkbox', { name: nom, exact: true }) })
    .click()

/** Ouvre la fenêtre et attend les cases (la lecture des ministères est simulée). */
async function ouvrirFenetre(page: Page, requete = 'profil=ministere') {
  await ouvrir(page, requete)
  await boutonDuPoint(page, BOUTON).click()
  const boite = fenetre(page)
  await expect(boite.getByRole('checkbox').first()).toBeVisible()
  return boite
}

test.describe('le bouton selon le profil', () => {
  for (const requete of ['profil=ministere', 'profil=berger', 'profil=conseil']) {
    test(`${requete} : « ${BOUTON} » sur un point ouvert`, async ({ page }) => {
      await ouvrir(page, requete)
      await expect(boutonDuPoint(page, BOUTON)).toBeVisible()
      await auditer(page)
    })
  }

  for (const requete of [
    'profil=ministere&lien=mentionne',
    'profil=ministere&lien=aucun',
    'profil=admin_eglise',
    'profil=admin_plateforme',
    'profil=ministere&statut=traite',
    'profil=berger&statut=traite',
  ]) {
    test(`aucun bouton « ${BOUTON} » (${requete})`, async ({ page }) => {
      await ouvrir(page, requete)
      await expect(page.getByRole('heading', { level: 2, name: TITRE })).toBeVisible()
      await expect(page.getByRole('button', { name: BOUTON })).toHaveCount(0)
    })
  }
})

test.describe('la fenêtre', () => {
  test('cases des ministères actifs, mentions actuelles cochées, notes et boutons', async ({
    page,
  }) => {
    const boite = await ouvrirFenetre(page)
    await expect(boite).toBeFocused()
    await expect(boite.getByRole('heading', { name: BOUTON })).toBeVisible()
    await expect(boite).toContainText(`« ${TITRE} »`)
    await expect(boite.getByRole('group', { name: 'Ministères mentionnés' })).toBeVisible()
    // Le ministère créateur n'est pas proposé ; le désactivé non plus quand il n'est pas mentionné.
    await expect(boite.getByRole('checkbox', { name: 'Communication' })).toHaveCount(0)
    await expect(boite.getByRole('checkbox', { name: /Accueil/ })).toHaveCount(0)
    await expect(boite.getByRole('checkbox')).toHaveCount(7)
    await expect(boite.getByRole('checkbox', { name: 'Intégration' })).toBeChecked()
    await expect(boite.getByRole('checkbox', { name: 'Social' })).not.toBeChecked()
    await expect(boite.getByText(/Un ministère retiré ne le voit plus/)).toBeVisible()
    await expect(boite.getByRole('button', { name: 'Enregistrer les mentions' })).toBeVisible()
    await expect(boite.getByRole('button', { name: 'Annuler' })).toBeVisible()
    await auditer(page)
  })

  test('ajouter Social et retirer Intégration : message, mentions mises à jour, bouton gardé', async ({
    page,
  }) => {
    const boite = await ouvrirFenetre(page)
    await basculer(page, boite, 'Social')
    await basculer(page, boite, 'Intégration')
    await expect(boite.getByRole('checkbox', { name: 'Social' })).toBeChecked()
    await expect(boite.getByRole('checkbox', { name: 'Intégration' })).not.toBeChecked()
    await boite.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(boite).toHaveCount(0)
    await expect(messageDe(page, 'Mentions enregistrées.')).toHaveText('Mentions enregistrées.')
    await expect(page.getByText('Communication, mentions : Social')).toBeVisible()
    // Le point reste ouvert : le bouton reste, et le focus y revient.
    await expect(boutonDuPoint(page, BOUTON)).toBeFocused()
    await auditer(page)
  })

  test('une liste vide retire toutes les mentions', async ({ page }) => {
    const boite = await ouvrirFenetre(page, 'profil=berger')
    await basculer(page, boite, 'Intégration')
    await boite.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(boite).toHaveCount(0)
    await expect(page.getByText('Communication, mentions : aucune')).toBeVisible()
  })

  test('un ministère mentionné puis désactivé reste coché et se retire', async ({ page }) => {
    const boite = await ouvrirFenetre(page, 'profil=ministere&mentions=desactive')
    const accueil = boite.getByRole('checkbox', { name: 'Accueil (désactivé)' })
    await expect(accueil).toBeChecked()
    await auditer(page)
    await basculer(page, boite, 'Accueil (désactivé)')
    await boite.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(boite).toHaveCount(0)
    await expect(
      page.getByText('Communication, mentions : Intégration', { exact: true }),
    ).toBeVisible()
  })

  test('enregistrer la liste actuelle ferme la fenêtre sans message', async ({ page }) => {
    const boite = await ouvrirFenetre(page)
    await boite.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(boite).toHaveCount(0)
    await expect(boutonDuPoint(page, BOUTON)).toBeFocused()
    await expect(page.locator('[data-annonce-point]')).toHaveCount(0)
  })

  test('« Annuler », « Retour » et Échap ferment sans rien écrire', async ({ page }) => {
    const boite = await ouvrirFenetre(page)
    await basculer(page, boite, 'Social')
    await boite.getByRole('button', { name: 'Annuler' }).click()
    await expect(boite).toHaveCount(0)
    await expect(
      page.getByText('Communication, mentions : Intégration', { exact: true }),
    ).toBeVisible()

    await boutonDuPoint(page, BOUTON).click()
    await fenetre(page).getByRole('button', { name: 'Retour' }).click()
    await expect(fenetre(page)).toHaveCount(0)

    await boutonDuPoint(page, BOUTON).click()
    await page.keyboard.press('Escape')
    await expect(fenetre(page)).toHaveCount(0)
    await expect(boutonDuPoint(page, BOUTON)).toBeFocused()
    await expect(page.locator('[data-annonce-point]')).toHaveCount(0)
  })

  test('connexion perdue : les cases restent, un message le dit', async ({ page }) => {
    const boite = await ouvrirFenetre(page, 'profil=ministere&envoi=echec')
    await basculer(page, boite, 'Social')
    await boite.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(boite.getByRole('alert')).toHaveText(
      'La connexion a échoué. Vos choix sont encore dans le formulaire : réessayez.',
    )
    await expect(boite.getByRole('checkbox', { name: 'Social' })).toBeChecked()
    await auditer(page)
  })

  test('refus de la base : son message, tel quel, sous le bouton', async ({ page }) => {
    const boite = await ouvrirFenetre(page, 'profil=ministere&envoi=refus')
    await basculer(page, boite, 'Social')
    await boite.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    const alerte = boite.getByRole('alert')
    await expect(alerte).toHaveText('Ce point est traité : ses mentions ne changent plus.')
    const boiteAlerte = await alerte.boundingBox()
    const boiteAnnuler = await boite.getByRole('button', { name: 'Annuler' }).boundingBox()
    expect(boiteAlerte).not.toBeNull()
    expect(boiteAnnuler).not.toBeNull()
    expect(boiteAlerte?.y ?? 0).toBeLessThan(boiteAnnuler?.y ?? 0)
  })

  test('lecture des ministères en échec : « Réessayer » ; lente : « Chargement »', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere&ministeres=probleme')
    await boutonDuPoint(page, BOUTON).click()
    const boite = fenetre(page)
    await expect(boite.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await auditer(page)

    await ouvrir(page, 'profil=ministere&ministeres=lent')
    await boutonDuPoint(page, BOUTON).click()
    await expect(fenetre(page).getByRole('status')).toHaveText('Chargement')
    await expect(fenetre(page).getByRole('checkbox')).toHaveCount(0)
  })

  test('cibles de 44 px au moins : cases, boutons', async ({ page }) => {
    const boite = await ouvrirFenetre(page)
    const cibles = [
      ...(await boite.locator('label').all()),
      boite.getByRole('button', { name: 'Enregistrer les mentions' }),
      boite.getByRole('button', { name: 'Annuler' }),
      boite.getByRole('button', { name: 'Retour' }),
    ]
    for (const cible of cibles) {
      const taille = await cible.boundingBox()
      expect(taille?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('largeurs', () => {
  test('sous 600 px plein écran, à partir de 600 px un panneau de 460 px', async ({ page }) => {
    await ouvrirFenetre(page)
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
    await boutonDuPoint(page, BOUTON).click()
    await expect(fenetre(page).getByRole('checkbox').first()).toBeVisible()
    expect(await debord()).toBeLessThanOrEqual(0)
    const contenu = await fenetre(page).evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    )
    expect(contenu).toBeLessThanOrEqual(0)
    await auditer(page)
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  const largeur = page.viewportSize()?.width ?? 0
  await ouvrir(page, 'profil=ministere')
  await page.screenshot({ path: `test-results/captures/mentions-point-${largeur}.png` })
  await boutonDuPoint(page, BOUTON).click()
  await expect(fenetre(page).getByRole('checkbox').first()).toBeVisible()
  await page.screenshot({ path: `test-results/captures/mentions-fenetre-${largeur}.png` })
  await page.keyboard.press('Escape')
  await ouvrir(page, 'profil=berger&mentions=desactive')
  await boutonDuPoint(page, BOUTON).click()
  await expect(fenetre(page).getByRole('checkbox').first()).toBeVisible()
  await page.screenshot({ path: `test-results/captures/mentions-desactive-${largeur}.png` })
})
