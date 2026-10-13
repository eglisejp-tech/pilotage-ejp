import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// « Mes indicateurs » (lot L4, `/ma-fiche/indicateurs`) sur l'aperçu de développement : le vrai
// écran, des données d'exemple, des envois simulés comme les fonctions de la base (aucune base,
// aucune écriture). Trois formats par les projets Playwright : 1440, 834 et 390 px. Les parcours
// avec la base locale (trois suggestions, refus d'une quatrième, décision d'EJP Tech) sont dans
// e2e/base/validation-indicateurs.ecriture.spec.ts.

type Ecran = { vue?: string; envoi?: string; profil?: string }

const adresse = ({ vue = 'normal', envoi, profil = 'ministere' }: Ecran) =>
  `/apercu/mes-indicateurs?profil=${profil}&vue=${vue}${envoi ? `&envoi=${envoi}` : ''}`

async function ouvrir(page: Page, ecran: Ecran = {}) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const nomDe = ({ vue = 'normal', envoi }: Ecran) => `${vue}${envoi ? `-${envoi}` : ''}`
const largeur = (page: Page) => page.viewportSize()?.width ?? 0
const bouton = (page: Page, nom: string | RegExp) => page.getByRole('button', { name: nom })
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

/** Le panneau « Ajouter un indicateur » : fenêtre à partir de 600 px, page entière en dessous. */
async function ouvrirLePanneau(page: Page): Promise<Locator> {
  await bouton(page, 'Ajouter un indicateur').click()
  const enPanneau = largeur(page) >= 600
  const panneau = page.getByRole(enPanneau ? 'dialog' : 'region', { name: 'Ajouter un indicateur' })
  await expect(panneau).toBeVisible()
  return panneau
}

async function choisir(panneau: Locator, libelle: string) {
  await panneau.getByRole('button', { name: new RegExp(`^Choisir «\\s*${libelle}`) }).click()
}

const TOUS: Ecran[] = [
  { vue: 'normal' },
  { vue: 'vide' },
  { vue: 'limite' },
  { vue: 'toutes' },
  { vue: 'chargement' },
  { vue: 'probleme' },
]

test.describe('Mes indicateurs (ministère), aperçu', () => {
  test('titre, phrase, sections par rythme, lien vers « Ma fiche »', async ({ page }) => {
    await ouvrir(page)
    await expect(page).toHaveTitle('Mes indicateurs, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1, name: 'Mes indicateurs' })).toBeVisible()
    await expect(
      page.getByText(
        'Communication suit 7 indicateurs : 5 prévus par la coordination et 2 ajoutés par vous. Vous pouvez en ajouter 1 autre.',
      ),
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Chaque dimanche',
      'Chaque mois',
      'À ce jour',
      'Calculs',
    ])
    await expect(page.getByRole('link', { name: 'Retour à ma fiche' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
    await expect(page.getByText('Se calcule tout seul')).toBeVisible()
    await expect(page.getByText('Prévu par la coordination')).toHaveCount(5)
  })

  test('un ajout à valider dit son attente, puis ce qu’on peut déjà faire, en deux lignes', async ({
    page,
  }) => {
    await ouvrir(page)
    const attente = page.getByText('À valider par EJP Tech depuis 2 jours.', { exact: true })
    await expect(attente).toBeVisible()
    await expect(page.getByText('Vous pouvez déjà le saisir.', { exact: true })).toBeVisible()
    await expect(page.getByText(/le berger voit ses valeurs/)).toHaveCount(0)
    await expect(page.getByText('Suggestion ajoutée par vous le 8 oct.')).toBeVisible()
  })

  test('« Retirés (2) » s’ouvre de lui-même : il porte le motif d’un refus d’EJP Tech', async ({
    page,
  }) => {
    await ouvrir(page)
    const motif = page.getByText(/Refusé le 5 oct\. : «.*Publications\..*»\./)
    await expect(motif).toBeVisible()
    await expect(page.getByText('Retiré le 3 oct. : doublon.')).toBeVisible()
    // Le titre est souligné (on voit qu'il s'ouvre et se referme) ; un clic le replie.
    const titre = page.getByText('Retirés (2)')
    await expect(titre).toHaveCSS('text-decoration-line', 'underline')
    await titre.click()
    await expect(motif).toBeHidden()
    await titre.click()
    await expect(motif).toBeVisible()
  })

  test('« Ajouter un indicateur » : les suggestions, rythme et définition, « Rien ne convient ? »', async ({
    page,
  }) => {
    await ouvrir(page)
    const panneau = await ouvrirLePanneau(page)
    await expect(panneau.getByRole('heading', { level: 2, name: 'Suggestions' })).toBeVisible()
    await expect(panneau.getByRole('button', { name: /^Choisir «/ })).toHaveCount(3)
    await expect(panneau.getByText('chaque mois')).toHaveCount(3)
    // Contact : EJP Tech (T59).
    await expect(
      panneau.getByText('Rien ne convient ? Demandez un indicateur à EJP Tech.'),
    ).toBeVisible()
  })

  test('envoyer une suggestion : « Pourquoi » de 10 à 280 caractères, compteur, aucun rappel', async ({
    page,
  }) => {
    await ouvrir(page)
    const panneau = await ouvrirLePanneau(page)
    await choisir(panneau, 'Demandes traitées')
    const champ = panneau.getByRole('textbox', { name: 'Pourquoi cet indicateur ?' })
    await expect(panneau.getByText('0 sur 280')).toBeVisible()
    await expect(panneau.getByText(/N'écrivez aucun nom/)).toHaveCount(0)
    await expect(
      panneau.getByText('EJP Tech vérifie chaque ajout. En attendant, vous pouvez déjà le saisir.'),
    ).toBeVisible()

    await champ.fill('Neuf cara')
    await bouton(page, 'Envoyer pour validation').click()
    // Les phrases de la table de traduction (m233).
    await expect(panneau.getByText('Expliquez pourquoi (10 caractères au moins).')).toBeVisible()
    await champ.fill('a'.repeat(281))
    await expect(panneau.getByText('281 sur 280')).toBeVisible()
    await bouton(page, 'Envoyer pour validation').click()
    await expect(
      panneau.getByText('Raccourcissez ce texte : 280 caractères au plus.'),
    ).toBeVisible()

    await champ.fill('Voir ce que le ministère a mené à terme.')
    await bouton(page, 'Envoyer pour validation').click()
    await expect(
      reussite(page).getByText(
        /«\s*Demandes traitées\s*» envoyé pour validation : vous pouvez déjà le saisir dans vos chiffres du mois\./,
      ),
    ).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // La suggestion rejoint la liste, à valider ; il ne reste plus d'ajout permis.
    await expect(page.getByText(/Vous avez atteint le maximum de 3 ajouts\./)).toBeVisible()
    await expect(page.getByText(/^À valider par EJP Tech depuis aujourd'hui\./)).toBeVisible()
  })

  test('3 ajouts : le panneau ne montre que l’explication, le bouton qui l’ouvre reste actif', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'limite' })
    const panneau = await ouvrirLePanneau(page)
    await expect(panneau.getByText(/^Votre ministère a déjà 3 indicateurs à lui\./)).toBeVisible()
    await expect(panneau.getByText(/Demandez à EJP Tech/)).toBeVisible()
    await expect(panneau.getByRole('button', { name: /^Choisir «/ })).toHaveCount(0)
    await expect(panneau.getByRole('textbox')).toHaveCount(0)
    await panneau.getByRole('button', { name: 'Fermer' }).click()
    await expect(bouton(page, 'Ajouter un indicateur')).toBeEnabled()
  })

  test('toutes les suggestions sont déjà sur la fiche', async ({ page }) => {
    await ouvrir(page, { vue: 'toutes' })
    const panneau = await ouvrirLePanneau(page)
    await expect(
      panneau.getByText('Toutes les suggestions sont déjà sur votre fiche.'),
    ).toBeVisible()
  })

  test('un ministère sans indicateur : l’état vide, puis l’ajout reste possible', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'vide' })
    await expect(
      page.getByText(
        "Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et en FIJ se saisissent déjà chaque dimanche.",
      ),
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
    await expect(bouton(page, 'Ajouter un indicateur')).toBeVisible()
  })

  test('chargement, puis problème passager avec « Réessayer »', async ({ page }) => {
    await ouvrir(page, { vue: 'chargement' })
    await expect(page.locator('[aria-busy="true"]')).toBeVisible()
    await expect(bouton(page, 'Ajouter un indicateur')).toHaveCount(0)
    await ouvrir(page, { vue: 'probleme' })
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(bouton(page, 'Réessayer')).toBeVisible()
  })

  test('la base refuse l’envoi : limite sous le bouton, donnée personnelle sous le champ, connexion perdue', async ({
    page,
  }) => {
    await ouvrir(page, { envoi: 'limite' })
    let panneau = await ouvrirLePanneau(page)
    await choisir(panneau, 'Demandes traitées')
    const champ = panneau.getByRole('textbox')
    await champ.fill('Voir ce que le ministère a mené.')
    await bouton(page, 'Envoyer pour validation').click()
    await expect(panneau.getByRole('alert')).toContainText(
      'Votre ministère a déjà 3 indicateurs à lui.',
    )
    await expect(champ).toHaveValue('Voir ce que le ministère a mené.')

    await ouvrir(page, { envoi: 'motif' })
    panneau = await ouvrirLePanneau(page)
    await choisir(panneau, 'Demandes traitées')
    await panneau.getByRole('textbox').fill('Écrire à quelqu’un pour voir.')
    await bouton(page, 'Envoyer pour validation').click()
    await expect(panneau.getByText("N'écrivez aucun nom ni information personnelle.")).toBeVisible()
    await expect(panneau.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')

    await ouvrir(page, { envoi: 'echec' })
    panneau = await ouvrirLePanneau(page)
    await choisir(panneau, 'Demandes traitées')
    await panneau.getByRole('textbox').fill('Voir ce que le ministère a mené.')
    await bouton(page, 'Envoyer pour validation').click()
    await expect(panneau.getByRole('alert')).toContainText('La connexion a échoué.')
    await expect(panneau.getByRole('textbox')).toHaveValue('Voir ce que le ministère a mené.')
  })

  test('les autres profils reçoivent la page non disponible', async ({ page }) => {
    for (const profil of ['berger', 'conseil', 'admin_eglise', 'admin_plateforme']) {
      await ouvrir(page, { profil })
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeVisible()
    }
  })

  test('l’aide du champ « Pourquoi cet indicateur ? » dit à quoi il sert', async ({ page }) => {
    await ouvrir(page)
    const panneau = await ouvrirLePanneau(page)
    await choisir(panneau, 'Demandes traitées')
    await panneau.getByRole('button', { name: 'Aide : Pourquoi cet indicateur ?' }).click()
    await expect(
      panneau.getByText(
        'Ce que ce chiffre vous aidera à voir ou à décider. EJP Tech le lit avant de valider.',
      ),
    ).toBeVisible()
  })
})

test.describe('accessibilité et petits écrans', () => {
  test('axe, WCAG 2.2 AA : chaque écran, puis le panneau et son formulaire', async ({ page }) => {
    test.setTimeout(120_000)
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      // « Retirés (2) » est déjà ouvert sur la vue normale : l'audit lit aussi la liste.
      try {
        await auditer(page)
      } catch (erreur) {
        throw new Error(`${nomDe(ecran)} : ${String(erreur)}`, { cause: erreur })
      }
    }
    await ouvrir(page)
    const panneau = await ouvrirLePanneau(page)
    await auditer(page)
    await choisir(panneau, 'Demandes traitées')
    await bouton(page, 'Envoyer pour validation').click()
    await expect(panneau.getByText('Expliquez pourquoi (10 caractères au moins).')).toBeVisible()
    await panneau.getByRole('button', { name: 'Aide : Pourquoi cet indicateur ?' }).click()
    await auditer(page)
    await ouvrir(page, { vue: 'limite' })
    await ouvrirLePanneau(page)
    await auditer(page)
  })

  test('cibles de 44 px : boutons, liens et champs', async ({ page }) => {
    await ouvrir(page)
    const cibles = page.locator('main').locator('button:visible, a:visible, summary:visible')
    const total = await cibles.count()
    expect(total).toBeGreaterThan(2)
    for (let rang = 0; rang < total; rang += 1) {
      const boite = await cibles.nth(rang).boundingBox()
      if (boite === null) continue
      expect(boite.height, `cible ${rang}, hauteur`).toBeGreaterThanOrEqual(43.5)
    }
    const panneau = await ouvrirLePanneau(page)
    await choisir(panneau, 'Demandes traitées')
    for (const cible of await panneau.locator('button:visible, textarea:visible').all()) {
      const boite = await cible.boundingBox()
      if (boite === null) continue
      expect(boite.height).toBeGreaterThanOrEqual(43.5)
    }
  })

  test('à 360 px, aucun défilement horizontal, panneau compris', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 360, height: 800 })
    const debord = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      expect(await debord(), nomDe(ecran)).toBeLessThanOrEqual(0)
    }
    await ouvrir(page)
    const panneau = await ouvrirLePanneau(page)
    expect(await debord(), 'liste des suggestions').toBeLessThanOrEqual(0)
    await choisir(panneau, 'Demandes traitées')
    expect(await debord(), 'formulaire').toBeLessThanOrEqual(0)
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(120_000)
  const taille = largeur(page)
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/mes-indicateurs-${nomDe(ecran)}-${taille}.png`,
      fullPage: true,
    })
  }
  await ouvrir(page)
  const panneau = await ouvrirLePanneau(page)
  await page.screenshot({
    path: `test-results/captures/mes-indicateurs-panneau-suggestions-${taille}.png`,
  })
  await choisir(panneau, 'Demandes traitées')
  await page.screenshot({
    path: `test-results/captures/mes-indicateurs-panneau-pourquoi-${taille}.png`,
  })
})
