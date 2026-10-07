import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Calendrier, prochaine réunion et alerte des événements à confirmer (lot E6) sur l'aperçu
// /apercu/calendrier, sans base ni écriture : « aujourd'hui » y est le mercredi 7 octobre 2026.
// Trois formats par les projets Playwright : 1440, 834 et 390 px. Les parcours avec la base sont
// dans e2e/base/evenements-alerte.ecriture.spec.ts.

type Ecran = { ecran?: string; profil?: string }

const adresse = ({ ecran = 'fiche', profil = 'berger' }: Ecran) =>
  `/apercu/calendrier?ecran=${ecran}&profil=${profil}`

async function ouvrir(page: Page, ecran: Ecran) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const nomDe = ({ ecran = 'fiche', profil = 'berger' }: Ecran) => `${ecran}-${profil}`

const TOUS: Ecran[] = [
  { profil: 'berger' },
  { profil: 'ministere' },
  { ecran: 'fiche-alerte', profil: 'berger' },
  { ecran: 'fiche-alerte', profil: 'ministere' },
  { ecran: 'fiche-alerte', profil: 'admin_plateforme' },
  { ecran: 'fiche-vide', profil: 'berger' },
  { ecran: 'fiche-vide', profil: 'ministere' },
  { ecran: 'fiche-erreur', profil: 'berger' },
  { ecran: 'fiche-chargement', profil: 'berger' },
  { ecran: 'a-confirmer', profil: 'berger' },
  { ecran: 'a-confirmer-un', profil: 'conseil' },
  { ecran: 'a-confirmer-vide', profil: 'berger' },
  { ecran: 'a-confirmer-erreur', profil: 'berger' },
  { ecran: 'a-confirmer', profil: 'ministere' },
]

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

test.describe('calendrier de la fiche (aperçu)', () => {
  test('le berger : calendrier par date, statuts en mots, aucun bouton', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await expect(
      page.getByRole('heading', { level: 2, name: 'Calendrier prévisionnel' }),
    ).toBeVisible()
    const calendrier = page.getByRole('region', { name: 'Calendrier prévisionnel' })
    await expect(calendrier.getByRole('listitem').first()).toContainText('Sam. 3 oct.')
    await expect(calendrier.getByText('En attente de validation')).toBeVisible()
    await expect(calendrier.getByText('Annulé')).toBeVisible()
    await expect(calendrier.getByText('Reporté du dim. 1 nov.')).toBeVisible()
    await expect(page.locator('[data-alerte-fiche]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: ACTIONS })).toHaveCount(0)
  })

  test('la prochaine réunion sous la fraîcheur, avec l’objet et la décision attendue', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    await expect(page.getByText(/Prochaine réunion :/)).toContainText('lundi 12 oct., 20 h')
    await expect(page.getByText('Décision attendue : Choisir le lieu de stockage')).toBeVisible()
  })

  test('le ministère : « Ajouter un événement », « Modifier » pour la réunion', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'ministere' })
    await expect(page.getByRole('link', { name: 'Ajouter un événement' })).toHaveAttribute(
      'href',
      '/saisir/evenement',
    )
    await expect(page.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/saisir/reunion',
    )
    await expect(page.getByRole('link', { name: /^Mettre à jour/ }).first()).toBeVisible()
  })

  test('avec l’alerte, ministère : bandeau, « Mettre à jour » du porteur, mention sans bouton', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'fiche-alerte', profil: 'ministere' })
    const bandeau = page.locator('[data-alerte-fiche]')
    await expect(bandeau).toContainText('À confirmer')
    await expect(bandeau).toContainText(
      'Deux événements sont encore en attente de validation et leur date approche ou est passée. Mettez à jour leur statut.',
    )
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText('dans 3 jours')).toBeVisible()
    await expect(page.getByText('date passée depuis 11 jours')).toBeVisible()
    await expect(page.getByText('@Coordination').first()).toBeVisible()
    const mentionne = page.getByRole('listitem').filter({ hasText: 'Planning du trimestre' })
    await expect(mentionne).toContainText('Mentionné par Coordination.')
    await expect(mentionne.getByRole('link')).toHaveCount(0)
  })

  test('avec l’alerte, EJP Tech et le berger : le bandeau, jamais un bouton de saisie', async ({
    page,
  }) => {
    for (const profil of ['admin_plateforme', 'berger']) {
      await ouvrir(page, { ecran: 'fiche-alerte', profil })
      await expect(page.locator('[data-alerte-fiche]')).toBeVisible()
      await expect(page.getByRole('link', { name: ACTIONS })).toHaveCount(0)
    }
  })

  test('vide : « Aucun événement prévu. », réunion « Non renseignée. »', async ({ page }) => {
    await ouvrir(page, { ecran: 'fiche-vide', profil: 'berger' })
    await expect(page.getByText('Aucun événement prévu.')).toBeVisible()
    await expect(page.getByText('Non renseignée.')).toBeVisible()
    await expect(page.getByRole('link', { name: ACTIONS })).toHaveCount(0)
    await ouvrir(page, { ecran: 'fiche-vide', profil: 'ministere' })
    await expect(page.getByRole('link', { name: 'Ajouter un événement' })).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Renseigner' })).toBeVisible()
  })
})

test.describe('bloc « Événements à confirmer » (aperçu)', () => {
  test('5 lignes, puis « Voir les 8 événements à confirmer » qui déplie sur place', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'a-confirmer', profil: 'berger' })
    await expect(
      page.getByRole('heading', { level: 2, name: 'Événements à confirmer' }),
    ).toBeVisible()
    const liste = page.getByRole('main').getByRole('list')
    await expect(liste.getByRole('listitem')).toHaveCount(5)
    await expect(liste.getByRole('listitem').first()).toContainText(
      '« Sortie des Prodiges », Prodiges Junior : samedi 26 sept., date passée depuis 11 jours',
    )
    const bouton = page.getByRole('button', { name: 'Voir les 8 événements à confirmer' })
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await bouton.click()
    await expect(liste.getByRole('listitem')).toHaveCount(8)
    await expect(page.getByRole('button', { name: 'Voir moins' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  test('aucun bouton d’action, le ministère mène à sa fiche', async ({ page }) => {
    await ouvrir(page, { ecran: 'a-confirmer', profil: 'admin_plateforme' })
    await expect(page.getByRole('link', { name: ACTIONS })).toHaveCount(0)
    await expect(page.getByRole('button', { name: ACTIONS })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Communication' }).first()).toHaveAttribute(
      'href',
      /\/ministeres\/10000000-/,
    )
  })

  test('l’aide du titre se lit sans survol', async ({ page }) => {
    await ouvrir(page, { ecran: 'a-confirmer', profil: 'berger' })
    const aide = page.getByRole('button', { name: 'Aide : Événements à confirmer' })
    await aide.click()
    await expect(aide).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(/à 3 jours ou moins de leur date, ou déjà passés/)).toBeVisible()
  })

  test('rien à confirmer : ni titre ni cadre', async ({ page }) => {
    await ouvrir(page, { ecran: 'a-confirmer-vide', profil: 'berger' })
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('list')).toHaveCount(0)
  })

  test('un ministère ne voit pas le bloc', async ({ page }) => {
    await ouvrir(page, { ecran: 'a-confirmer', profil: 'ministere' })
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  })

  test('problème passager : dit, avec « Réessayer »', async ({ page }) => {
    await ouvrir(page, { ecran: 'a-confirmer-erreur', profil: 'berger' })
    await expect(page.getByRole('alert')).toContainText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('accessibilité et tailles (aperçu)', () => {
  for (const ecran of TOUS) {
    test(`audit axe : ${nomDe(ecran)}`, async ({ page }) => {
      await ouvrir(page, ecran)
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test('liens et boutons du contenu : 44 px de haut et de large au moins', async ({ page }) => {
    for (const ecran of [
      { ecran: 'fiche-alerte', profil: 'ministere' },
      { ecran: 'a-confirmer', profil: 'berger' },
    ]) {
      await ouvrir(page, ecran)
      const cibles = page.getByRole('main').locator('a:visible, button:visible')
      for (let rang = 0; rang < (await cibles.count()); rang++) {
        const boite = await cibles.nth(rang).boundingBox()
        expect(
          boite?.height ?? 0,
          `${nomDe(ecran)}, cible ${rang}, hauteur`,
        ).toBeGreaterThanOrEqual(44)
        expect(boite?.width ?? 0, `${nomDe(ecran)}, cible ${rang}, largeur`).toBeGreaterThanOrEqual(
          44,
        )
      }
    }
  })

  test('à 360 px, aucun défilement horizontal', async ({ page }) => {
    // Quatorze écrans à charger l'un après l'autre : plus que les 30 s d'un test ordinaire.
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
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  // Quatorze écrans à charger, polices comprises : plus que les 30 s d'un test ordinaire.
  test.setTimeout(120_000)
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/calendrier-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
})
