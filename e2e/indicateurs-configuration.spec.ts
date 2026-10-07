import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Configuration des indicateurs (lot L3a) sur l'aperçu /apercu/indicateurs, sans base ni écriture :
// `/indicateurs` (phrases, tableau ou liste, « Créer ») et `/indicateurs/:id` (prévus, sections,
// retirés), pour l'administration de l'église et EJP Tech. « Créer » est simulé comme la base
// (tout ou rien, sans doublon). Trois formats par les projets Playwright : 1440, 834 et 390 px.
// Les parcours avec la base (création réelle, page non disponible sans requête) sont dans
// e2e/base/indicateurs-configuration*.spec.ts.

type Ecran = { vue?: string; profil?: string; envoi?: string }

const adresse = ({ vue = 'liste', profil = 'admin_eglise', envoi }: Ecran) =>
  `/apercu/indicateurs?vue=${vue}&profil=${profil}${envoi ? `&envoi=${envoi}` : ''}`

async function ouvrir(page: Page, ecran: Ecran = {}) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const nomDe = ({ vue = 'liste', profil = 'admin_eglise', envoi }: Ecran) =>
  `${vue}-${profil}${envoi ? `-${envoi}` : ''}`

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

const TOUS: Ecran[] = [
  { vue: 'liste', profil: 'admin_eglise' },
  { vue: 'liste', profil: 'admin_plateforme' },
  { vue: 'liste-vide' },
  { vue: 'liste-chargement' },
  { vue: 'liste-probleme' },
  { vue: 'communication' },
  { vue: 'kumi' },
  { vue: 'kumi', profil: 'admin_plateforme' },
  { vue: 'eagles' },
  { vue: 'jeunesse' },
  { vue: 'protocole' },
  { vue: 'introuvable' },
  { vue: 'chargement' },
  { vue: 'probleme' },
]

const PHRASES_ADMIN = [
  '8 indicateurs actifs pour 5 ministères.',
  "1 ajout attend la validation d'EJP Tech, depuis plus de 7 jours. Prévenez EJP Tech.",
]

test.describe('/indicateurs (aperçu)', () => {
  test('titre, phrases, tableau ou liste selon la largeur, un ministère désactivé absent', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle('Indicateurs, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs' })).toBeVisible()
    for (const phrase of PHRASES_ADMIN) await expect(page.getByText(phrase)).toBeVisible()
    const largeur = page.viewportSize()?.width ?? 0
    if (largeur >= 600) {
      await expect(page.getByRole('table', { name: 'Indicateurs' })).toBeVisible()
      await expect(page.getByRole('row')).toHaveCount(6)
    } else {
      await expect(page.getByRole('table')).toHaveCount(0)
      await expect(
        page.getByRole('listitem').filter({ hasText: 'Dernier changement' }),
      ).toHaveCount(5)
    }
    await expect(page.getByText('Ancien ministère')).toHaveCount(0)
  })

  test('EJP Tech ne lit pas le rappel « Prévenez EJP Tech »', async ({ page }) => {
    await ouvrir(page, { profil: 'admin_plateforme' })
    await expect(page.getByText(/^8 indicateurs actifs pour 5 ministères\./)).toBeVisible()
    await expect(page.getByText(/Prévenez EJP Tech/)).toHaveCount(0)
  })

  test('colonne « Prévus » : « 6 à créer », « Créés », « À choisir », « Aucun prévu »', async ({
    page,
  }) => {
    await ouvrir(page)
    const ligne = (nom: string) =>
      page
        .getByRole('link', { name: nom, exact: true })
        .locator('xpath=ancestor::*[self::tr or self::li][1]')
    await expect(ligne('Kumi')).toContainText('6 à créer')
    await expect(ligne('Communication')).toContainText('Créés')
    await expect(ligne('Eagles')).toContainText('Créés')
    await expect(ligne('Jeunesse')).toContainText('À choisir')
    await expect(ligne('Protocole')).toContainText('Aucun prévu')
    await expect(ligne('Communication')).toContainText('2 peu saisis')
    await expect(ligne('Communication')).toContainText('5 sur 30, dont 1 ajouté par Communication')
  })

  test('« Créer » : la création est simulée, « 6 indicateurs prévus créés. », la cellule devient « Créés »', async ({
    page,
  }) => {
    await ouvrir(page)
    const bouton = page.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' })
    await bouton.click()
    await expect(page.getByText('6 indicateurs prévus créés.')).toBeVisible()
    await expect(bouton).toHaveCount(0)
    const kumi = page
      .getByRole('link', { name: 'Kumi', exact: true })
      .locator('xpath=ancestor::*[self::tr or self::li][1]')
    await expect(kumi).toContainText('Créés')
    await expect(kumi).toContainText('6 sur 30')
  })

  test('connexion perdue : « La connexion a échoué. Réessayez. », le bouton reste', async ({
    page,
  }) => {
    await ouvrir(page, { envoi: 'echec' })
    await page.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' }).click()
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(
      page.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' }),
    ).toBeVisible()
  })

  test('refus de la base : son texte tel quel', async ({ page }) => {
    await ouvrir(page, { envoi: 'refus' })
    const bouton = page.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' })
    await bouton.click()
    const alerte = page.getByRole('alert')
    await expect(alerte).toContainText('La fiche a déjà « Activités réalisées »')
    // Le refus suit le bouton qui l'a provoqué : sous sa ligne, à quelques centimètres de lui.
    const boiteBouton = await bouton.boundingBox()
    const boiteAlerte = await alerte.boundingBox()
    expect(boiteBouton).not.toBeNull()
    expect(boiteAlerte).not.toBeNull()
    expect(boiteAlerte!.y).toBeGreaterThan(boiteBouton!.y)
    expect(boiteAlerte!.y - boiteBouton!.y).toBeLessThan(200)
  })

  test('aucun ministère : la phrase et l’action vers Ministères et comptes (administration)', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'liste-vide' })
    await expect(
      page.getByText("Aucun ministère. Créez d'abord les ministères dans Ministères et comptes."),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ouvrir Ministères et comptes' })).toBeVisible()
    await ouvrir(page, { vue: 'liste-vide', profil: 'admin_plateforme' })
    await expect(page.getByRole('link', { name: 'Ouvrir Ministères et comptes' })).toHaveCount(0)
  })

  test('problème passager : bandeau et « Réessayer »', async ({ page }) => {
    await ouvrir(page, { vue: 'liste-probleme' })
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  test('les autres profils reçoivent la page non disponible', async ({ page }) => {
    for (const profil of ['ministere', 'berger', 'conseil']) {
      await ouvrir(page, { profil })
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeVisible()
      await expect(page.getByRole('table')).toHaveCount(0)
    }
  })

  test('aucune valeur d’indicateur, aucun bouton d’écriture hors « Créer »', async ({ page }) => {
    await ouvrir(page)
    await expect(page.getByText(/valeur/i)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /Ajouter|Corriger|Remplacer|Retirer|Valider|Refuser/ }),
    ).toHaveCount(0)
  })
})

test.describe('/indicateurs/:id (aperçu)', () => {
  test('Communication : titre, phrase, sections, mentions, usage, « Voir dans À valider »', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'communication' })
    await expect(page).toHaveTitle('Indicateurs de Communication, Pilotage EJP')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Indicateurs de Communication' }),
    ).toBeVisible()
    await expect(
      page.getByText(
        'Communication suit 5 indicateurs sur 30 au plus : 4 prévus par la coordination et 1 ajouté par Communication.',
      ),
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Chaque mois',
      'À ce jour',
      'Calculs',
    ])
    await expect(page.getByText('Saisi 4 mois sur 5, dernier le 2 oct.')).toBeVisible()
    await expect(page.getByText('Peu saisi : 1 mois sur 4')).toBeVisible()
    await expect(page.getByText('Libellé corrigé le 5 oct.')).toBeVisible()
    await expect(page.getByText(/À valider par EJP Tech depuis 9 jours/)).toBeVisible()
    await expect(page.getByText(/calcul : /)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Voir dans À valider' })).toHaveAttribute(
      'href',
      '/indicateurs#a-valider',
    )
    await expect(page.getByText('Se calcule tout seul')).toBeVisible()
  })

  test('« Retirés (2) » est replié, puis montre la date et le motif', async ({ page }) => {
    await ouvrir(page, { vue: 'communication' })
    await expect(page.getByText('Retiré le 3 oct. : doublon.')).toBeHidden()
    await page.getByText('Retirés (2)').click()
    await expect(page.getByText('Retiré le 3 oct. : doublon.')).toBeVisible()
    await expect(page.getByText('Refusé le 1 oct.')).toBeVisible()
  })

  test('Kumi : 6 prévus à créer, « Créer ces 6 indicateurs » crée tout et le bloc disparaît', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'kumi' })
    const bloc = page.getByRole('region', { name: 'Prévus par la coordination' })
    await expect(bloc.getByRole('listitem')).toHaveCount(6)
    await expect(bloc.getByRole('combobox')).toHaveCount(0)
    await bloc.getByRole('button', { name: 'Créer ces 6 indicateurs' }).click()
    await expect(page.getByText('6 indicateurs prévus créés.')).toBeVisible()
    await expect(bloc).toHaveCount(0)
    await expect(
      page.getByText('Kumi suit 6 indicateurs sur 30 au plus : 6 prévus par la coordination.'),
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Chaque dimanche',
      'Chaque mois',
      'À ce jour',
      'Calculs',
    ])
  })

  test('Jeunesse : nom non reconnu, choix dans la liste de la coordination puis « Créer ces 3 indicateurs »', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'jeunesse' })
    await expect(
      page.getByText(
        "Choisissez le nom de ce ministère dans la liste. Les indicateurs prévus s'afficheront ensuite.",
      ),
    ).toBeVisible()
    const choix = page.getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
    await expect(choix.locator('option')).toHaveText([
      'Choisissez un ministère de la liste',
      'Communication',
      'Eagles',
      'Film',
      'Kumi',
      'Aucun prévu',
    ])
    await expect(page.getByRole('button', { name: /^Créer/ })).toHaveCount(0)
    await choix.selectOption({ label: 'Film' })
    await page.getByRole('button', { name: 'Créer ces 3 indicateurs' }).click()
    await expect(page.getByText('3 indicateurs prévus créés.')).toBeVisible()
    await expect(page.getByRole('combobox')).toHaveCount(0)
  })

  test('Jeunesse : « Aucun prévu » enregistre la réponse, le bloc disparaît', async ({ page }) => {
    await ouvrir(page, { vue: 'jeunesse' })
    await page
      .getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
      .selectOption({ label: 'Aucun prévu' })
    await page.getByRole('button', { name: 'Enregistrer : aucun prévu' }).click()
    await expect(page.getByText('Noté : aucun indicateur prévu pour Jeunesse.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Prévus par la coordination' })).toHaveCount(0)
  })

  test('Protocole : « Aucun indicateur pour Protocole. Il saisit les chiffres communs. »', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'protocole' })
    await expect(
      page.getByText('Aucun indicateur pour Protocole. Il saisit les chiffres communs.'),
    ).toBeVisible()
  })

  test('ministère introuvable : la phrase et le retour', async ({ page }) => {
    await ouvrir(page, { vue: 'introuvable' })
    await expect(page.getByText("Ce ministère n'existe pas ou n'est plus actif.")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir aux indicateurs' })).toBeVisible()
  })

  test('aides : prévus, choix du modèle, usage', async ({ page }) => {
    await ouvrir(page, { vue: 'jeunesse' })
    await page
      .getByRole('button', { name: 'Aide : Choisir dans la liste de la coordination' })
      .click()
    await expect(
      page.getByText(
        'La liste de la coordination nomme les ministères à sa façon. Choisissez le nom qui correspond à ce ministère.',
      ),
    ).toBeVisible()
    await ouvrir(page, { vue: 'communication' })
    await expect(page.getByRole('button', { name: 'Aide : Usage' })).toHaveCount(1)
  })
})

test.describe('accessibilité et petits écrans', () => {
  test('axe, WCAG 2.2 AA : chaque écran, chaque profil', async ({ page }) => {
    test.setTimeout(120_000)
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      if (ecran.vue === 'communication') await page.getByText('Retirés (2)').click()
      try {
        await auditer(page)
      } catch (erreur) {
        throw new Error(`${nomDe(ecran)} : ${String(erreur)}`, { cause: erreur })
      }
    }
  })

  test('axe avec la bulle d’aide ouverte et un message de réussite', async ({ page }) => {
    await ouvrir(page, { vue: 'kumi' })
    await page.getByRole('button', { name: 'Aide : Prévus par la coordination' }).click()
    await auditer(page)
    await page.getByRole('button', { name: 'Créer ces 6 indicateurs' }).click()
    await expect(page.getByText('6 indicateurs prévus créés.')).toBeVisible()
    await auditer(page)
  })

  test('cibles de 44 px : boutons, liens et champ de choix', async ({ page }) => {
    for (const ecran of [{ vue: 'liste' }, { vue: 'jeunesse' }, { vue: 'communication' }]) {
      await ouvrir(page, ecran)
      const cibles = page
        .locator('main')
        .locator('button:visible, a:visible, select:visible, summary:visible')
      const total = await cibles.count()
      for (let rang = 0; rang < total; rang += 1) {
        const boite = await cibles.nth(rang).boundingBox()
        if (boite === null) continue
        expect(boite.height, `${nomDe(ecran)}, cible ${rang}, hauteur`).toBeGreaterThanOrEqual(43.5)
      }
    }
  })

  test('à 360 px, aucun défilement horizontal', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 360, height: 800 })
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nomDe(ecran)).toBeLessThanOrEqual(0)
    }
  })

  test('à 360 px, le tableau devient une liste et « Créer » reste utilisable', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await ouvrir(page)
    await expect(page.getByRole('table')).toHaveCount(0)
    await page.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' }).click()
    await expect(page.getByText('6 indicateurs prévus créés.')).toBeVisible()
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(120_000)
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/indicateurs-configuration-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
})
