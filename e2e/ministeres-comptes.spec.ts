import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Écran 13, « Ministères et comptes » (lot L1), sur l'aperçu de développement : le vrai écran,
// des données d'exemple, des actions simulées comme les Edge Functions (aucune base, aucune
// écriture). Trois formats par les projets Playwright : 1440, 834 et 390 px. Le parcours avec la
// base locale et les fonctions est dans comptes.ecriture.spec.ts.

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

async function ouvrir(page: Page, requete = '') {
  await page.goto(`/apercu/comptes?profil=admin_eglise${requete ? `&${requete}` : ''}`)
  await page.evaluate(() => document.fonts.ready)
}

const section = (page: Page, titre: string) =>
  page.getByRole('region', { name: titre, exact: true })
const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true })
/** Un champ par son libellé (le bouton d'aide voisin porte « Aide : <libellé> »). */
const champ = (page: Page, nom: string) => page.getByRole('textbox', { name: nom, exact: true })
const fenetre = (page: Page) => page.getByRole('alertdialog')
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('Ministères et comptes (administration), aperçu', () => {
  test('titre, trois sections, états des comptes, sans le compte de l’administration', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle('Ministères et comptes, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ministères et comptes')
    const ministeres = section(page, 'Ministères')
    await expect(ministeres.getByText('8 actifs, un email partagé chacun')).toBeVisible()
    await expect(ministeres).toContainText('communication@exemple.test')
    await expect(ministeres).toContainText('Activée')
    await expect(ministeres).toContainText('À activer')
    await expect(ministeres).toContainText('Désactivé le 2 oct.')
    await expect(ministeres).toContainText('Pas encore de compte')
    await expect(bouton(page, 'Créer le compte Coordination')).toBeVisible()
    await expect(bouton(page, 'Réactiver Merch')).toBeVisible()
    await expect(bouton(page, 'Désactiver Social')).toBeVisible()
    await expect(bouton(page, "Refaire l'activation Social")).toHaveCount(0)
    const lien = page.getByRole('link', { name: '2 indicateurs pour Communication' })
    await expect(lien).toHaveAttribute('href', /^\/indicateurs\/10000000-/)
    await expect(ministeres).toContainText('et FIJ par département')

    const personnes = section(page, 'Berger et conseil')
    await expect(personnes).toContainText('Invitation envoyée')
    await expect(bouton(page, "Relancer l'invitation Conseil, compte 3")).toBeVisible()
    await expect(bouton(page, 'Ajouter le compte du berger')).toHaveCount(0)
    await expect(section(page, 'EJP Tech')).toContainText('ejptech1@exemple.test')
    await expect(page.getByRole('main')).not.toContainText('administration@exemple.test')
    await expect(section(page, 'Listes')).toContainText('En attente de validation')
  })

  test('« Ajouter un ministère » : champs obligatoires, puis le ministère Tech d’EJP Tech (T48)', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un ministère').click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ajouter un ministère' }),
    ).toBeVisible()
    await expect(page.getByText("N'écrivez aucun nom ni information personnelle.")).toHaveCount(1)
    await bouton(page, "Créer le ministère et envoyer l'invitation").click()
    await expect(champ(page, 'Nom du ministère')).toHaveAccessibleDescription(
      'Donnez un nom au ministère.',
    )
    await expect(champ(page, 'Email partagé du ministère')).toHaveAccessibleDescription(
      'Saisissez une adresse email valide.',
    )

    await champ(page, 'Nom du ministère').fill('Tech')
    await champ(page, 'Email partagé du ministère').fill('EJPTech1+ministere@exemple.test')
    await bouton(page, "Créer le ministère et envoyer l'invitation").click()
    await expect(reussite(page)).toHaveText(
      'Ministère Tech créé. Invitation envoyée à ejptech1+ministere@exemple.test.',
    )
    await expect(
      section(page, 'Ministères').getByText('9 actifs, un email partagé chacun'),
    ).toBeVisible()
    await expect(bouton(page, "Relancer l'invitation Tech")).toBeVisible()
  })

  test('nom déjà pris et adresse déjà utilisée : sous leur champ, valeurs gardées', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un ministère').click()
    await champ(page, 'Nom du ministère').fill('communication')
    await champ(page, 'Email partagé du ministère').fill('nouveau@exemple.test')
    await bouton(page, "Créer le ministère et envoyer l'invitation").click()
    await expect(champ(page, 'Nom du ministère')).toHaveAccessibleDescription(
      'Un ministère porte déjà ce nom. Choisissez un autre nom.',
    )
    await champ(page, 'Nom du ministère').fill('Accueil')
    await champ(page, 'Email partagé du ministère').fill('social@exemple.test')
    await bouton(page, "Créer le ministère et envoyer l'invitation").click()
    await expect(champ(page, 'Email partagé du ministère')).toHaveAccessibleDescription(
      'Cette adresse a déjà un compte. Choisissez une autre adresse.',
    )
    await expect(champ(page, 'Nom du ministère')).toHaveValue('Accueil')
  })

  test('« Créer le compte » d’un ministère sans compte (Coordination)', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Créer le compte Coordination').click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Créer le compte de Coordination' }),
    ).toBeVisible()
    await champ(page, 'Email partagé du ministère').fill('coordination@exemple.test')
    await bouton(page, "Créer le compte et envoyer l'invitation").click()
    await expect(reussite(page)).toHaveText(
      'Compte créé. Invitation envoyée à coordination@exemple.test.',
    )
    await expect(bouton(page, "Relancer l'invitation Coordination")).toBeVisible()
  })

  test('« Ajouter un membre du conseil » annonce le nom affiché, jamais tapé', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un membre du conseil').click()
    await expect(page.getByText('Nom affiché : Conseil, compte 5')).toBeVisible()
    await champ(page, 'Email personnel').fill('conseil5@exemple.test')
    await bouton(page, "Créer le compte et envoyer l'invitation").click()
    await expect(bouton(page, "Relancer l'invitation Conseil, compte 5")).toBeVisible()
  })

  test('« Relancer l’invitation » : réussite, puis refus traduit', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, "Relancer l'invitation Conseil, compte 3").click()
    await expect(reussite(page)).toHaveText('Invitation renvoyée à conseil3@exemple.test.')
    await ouvrir(page, 'refus=invitation_trop_recente')
    await bouton(page, "Relancer l'invitation Conseil, compte 3").click()
    await expect(page.getByRole('alert')).toHaveText(
      'Une invitation vient de partir vers cette adresse. Attendez une minute, puis réessayez.',
    )
  })

  test('désactiver un ministère : fenêtre, « Annuler » ne change rien, puis réactiver', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Désactiver Communication').click()
    await expect(fenetre(page).getByRole('heading')).toHaveText('Désactiver Communication ?')
    await expect(fenetre(page)).toContainText(
      'Plus personne ne pourra se connecter avec communication@exemple.test.',
    )
    await page.keyboard.press('Escape')
    await expect(fenetre(page)).toHaveCount(0)
    await expect(bouton(page, 'Désactiver Communication')).toBeFocused()

    await bouton(page, 'Désactiver Communication').click()
    await fenetre(page).getByRole('button', { name: 'Désactiver le ministère' }).click()
    await expect(reussite(page)).toHaveText('Ministère Communication désactivé.')
    await expect(section(page, 'Ministères')).toContainText('Désactivé le 7 oct.')
    await expect(
      section(page, 'Ministères').getByText('7 actifs, un email partagé chacun'),
    ).toBeVisible()

    await bouton(page, 'Réactiver Communication').click()
    await expect(reussite(page)).toHaveText('Ministère Communication réactivé.')
    await expect(bouton(page, 'Désactiver Communication')).toBeVisible()
  })

  test('refaire l’activation : texte du ministère, puis « À activer »', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, "Refaire l'activation Communication").click()
    await expect(fenetre(page)).toContainText(
      "Changez d'abord le mot de passe de la boîte mail du ministère.",
    )
    await fenetre(page).getByRole('button', { name: "Refaire l'activation" }).click()
    await expect(reussite(page)).toContainText('Activation à refaire pour Ministère Communication.')
    await expect(bouton(page, "Refaire l'activation Communication")).toHaveCount(0)
  })

  test('désactiver le berger : « Désactiver le compte », puis « Ajouter le compte du berger »', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Désactiver Berger').click()
    await expect(fenetre(page).getByRole('heading')).toHaveText('Désactiver Berger ?')
    await fenetre(page).getByRole('button', { name: 'Désactiver le compte' }).click()
    await expect(reussite(page)).toHaveText('Berger désactivé.')
    await expect(bouton(page, 'Ajouter le compte du berger')).toBeVisible()
  })

  test('connexion perdue : la fenêtre reste ouverte avec l’erreur', async ({ page }) => {
    await ouvrir(page, 'envoi=echec')
    await bouton(page, 'Désactiver Conseil, compte 1').click()
    await fenetre(page).getByRole('button', { name: 'Désactiver le compte' }).click()
    await expect(fenetre(page).getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
  })

  test('états : premier usage, chargement, problème passager', async ({ page }) => {
    await ouvrir(page, 'vue=premier-usage')
    await expect(section(page, 'Ministères')).toContainText('Aucun ministère pour le moment.')
    await expect(section(page, 'Berger et conseil')).toContainText(
      "Aucun compte pour le berger ni pour le conseil pour l'instant.",
    )
    await expect(bouton(page, 'Ajouter le compte du berger')).toBeVisible()
    await ouvrir(page, 'vue=chargement')
    await expect(page.getByText('Chargement')).toBeVisible()
    await ouvrir(page, 'vue=probleme')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(bouton(page, 'Réessayer')).toBeVisible()
  })

  for (const profil of ['ministere', 'berger', 'conseil', 'admin_plateforme']) {
    test(`profil ${profil} : page non disponible, aucun compte`, async ({ page }) => {
      await page.goto(`/apercu/comptes?profil=${profil}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE_NON_DISPONIBLE)
      await expect(page.getByRole('main')).not.toContainText('@exemple.test')
    })
  }
})

test.describe('Ministères et comptes : accessibilité et tailles (aperçu)', () => {
  test('audit axe : page, panneau ouvert, fenêtre ouverte', async ({ page }) => {
    await ouvrir(page)
    await auditer(page)
    await bouton(page, 'Ajouter un ministère').click()
    await auditer(page)
    await ouvrir(page)
    await bouton(page, 'Désactiver Communication').click()
    await auditer(page)
  })

  test('audit axe : premier usage et problème passager', async ({ page }) => {
    await ouvrir(page, 'vue=premier-usage')
    await auditer(page)
    await ouvrir(page, 'vue=probleme')
    await auditer(page)
  })

  test('boutons du contenu : 44 px de haut au moins', async ({ page }) => {
    await ouvrir(page)
    const cibles = page.getByRole('main').locator('button:visible')
    for (let rang = 0; rang < (await cibles.count()); rang++) {
      const boite = await cibles.nth(rang).boundingBox()
      expect(boite?.height ?? 0, `bouton ${rang}`).toBeGreaterThanOrEqual(44)
    }
  })

  test('à 360 px, aucun défilement horizontal (page et panneau)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    for (const requete of ['', 'vue=premier-usage']) {
      await ouvrir(page, requete)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, requete || 'données').toBeLessThanOrEqual(0)
    }
    await bouton(page, 'Ajouter un ministère').click()
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debord, 'panneau').toBeLessThanOrEqual(0)
  })

  test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    const dossier = 'test-results/captures'
    await ouvrir(page)
    await page.screenshot({ path: `${dossier}/comptes-page-${largeur}.png`, fullPage: true })
    await bouton(page, 'Ajouter un ministère').click()
    await page.screenshot({ path: `${dossier}/comptes-panneau-${largeur}.png`, fullPage: true })
    await ouvrir(page)
    await bouton(page, 'Désactiver Communication').click()
    await page.screenshot({ path: `${dossier}/comptes-fenetre-${largeur}.png` })
    await ouvrir(page, 'vue=premier-usage')
    await page.screenshot({
      path: `${dossier}/comptes-premier-usage-${largeur}.png`,
      fullPage: true,
    })
  })
})
