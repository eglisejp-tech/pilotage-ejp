import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Écran 05 « Points d'attention » et « Mes points » (lot P3) sur l'aperçu /apercu/points, sans
// base ni écriture : les points d'exemple lus par chaque profil, les onglets, le filtre par
// ministère et les états. Trois formats par les projets Playwright. Les parcours avec la base sont
// dans e2e/base/points.spec.ts.

type Ecran = { profil?: string; etat?: string; vue?: string; ministere?: string }

function adresse({ profil = 'berger', etat, vue, ministere }: Ecran): string {
  const parametres = new URLSearchParams({ profil })
  if (etat) parametres.set('etat', etat)
  if (vue) parametres.set('vue', vue)
  if (ministere) parametres.set('ministere', ministere)
  return `/apercu/points?${parametres.toString()}`
}

async function ouvrir(page: Page, ecran: Ecran) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const nomDe = ({ profil = 'berger', etat = 'liste', vue = 'ouverts', ministere }: Ecran) =>
  [profil, etat, vue, ministere].filter(Boolean).join('-')

const TOUS: Ecran[] = [
  { profil: 'berger' },
  { profil: 'berger', vue: 'traites' },
  { profil: 'berger', vue: 'tous' },
  { profil: 'berger', ministere: 'min-coordination' },
  { profil: 'conseil' },
  { profil: 'admin_plateforme' },
  { profil: 'ministere' },
  { profil: 'ministere', vue: 'traites' },
  { profil: 'admin_eglise' },
  { profil: 'berger', etat: 'vide' },
  { profil: 'berger', etat: 'vide', vue: 'traites' },
  { profil: 'ministere', etat: 'vide', vue: 'tous' },
  { profil: 'berger', etat: 'chargement' },
  { profil: 'berger', etat: 'erreur' },
]

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

const articles = (page: Page) => page.getByRole('article')

test.describe('écran 05 lu par le berger (aperçu)', () => {
  test('le titre, les onglets avec leur nombre et le tableau par priorité', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await expect(page.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    const onglets = page.getByRole('navigation', { name: 'Vues des points' }).getByRole('link')
    await expect(onglets).toHaveText(['Ouverts (5)', 'Traités (4)', 'Tous (9)'])
    await expect(onglets.first()).toHaveAttribute('aria-current', 'page')
    await expect(articles(page).getByRole('heading', { level: 3 })).toHaveText([
      'Financement de Welcome Prodiges',
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
      'Visuels pour Welcome Prodiges',
      'Renfort de 4 STARs pour la sortie',
    ])
  })

  test('« dépassée » : en rouge, avec le mot ; « @Social (désactivé) » nommé en entier', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    const planning = page.getByRole('article', { name: 'Planning du trimestre à valider' })
    const echeance = planning.getByText('28 sept., dépassée')
    await expect(echeance).toBeVisible()
    await expect(echeance).toHaveCSS('color', 'rgb(180, 35, 24)')
    await expect(page.getByText('@Social (désactivé)')).toBeVisible()
  })

  test('« Traités récemment » sous Ouverts : les 4 traités, avec leur auteur', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    const recents = page.getByRole('region', { name: 'Traités récemment' })
    await expect(recents.getByRole('listitem')).toHaveCount(4)
    await expect(recents).toContainText('Traité le 26 sept. par Berger')
    await expect(recents).toContainText('Traité le 21 sept. par Coordination')
  })

  test('l’onglet Traités : « Traité le … par … » et le commentaire entre guillemets', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    await page.getByRole('link', { name: /^Traités/ }).click()
    await expect(page).toHaveURL(/vue=traites/)
    await expect(page.getByRole('link', { name: /^Traités/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(articles(page)).toHaveCount(4)
    await expect(
      page.getByRole('article', { name: 'Transport des Prodiges Junior' }),
    ).toContainText(
      "Traité le 24 sept. par Conseil, compte 3 « Deux véhicules de l'église assurent le transport jusqu'à fin octobre. »",
    )
    await expect(page.getByRole('region', { name: 'Traités récemment' })).toHaveCount(0)
    await expect(page.getByText('[texte masqué par EJP Tech]')).toBeVisible()
  })

  test('le filtre : les points créés par le ministère ou qui le mentionnent, les nombres suivent', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    const filtre = page.getByRole('combobox', { name: 'Filtrer par ministère' })
    await filtre.selectOption({ label: 'Coordination' })
    await expect(page).toHaveURL(/ministere=min-coordination/)
    await expect(page.getByRole('link', { name: /^Ouverts/ })).toHaveText('Ouverts (2)')
    await expect(articles(page).getByRole('heading', { level: 3 })).toHaveText([
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
    ])
    // L'onglet garde le ministère dans l'adresse.
    await page.getByRole('link', { name: /^Tous/ }).click()
    await expect(page).toHaveURL(/ministere=min-coordination/)
    await expect(page).toHaveURL(/vue=tous/)
    await expect(articles(page)).toHaveCount(4)
    await filtre.selectOption({ label: 'Tous les ministères' })
    await expect(page).not.toHaveURL(/ministere=/)
    await expect(articles(page)).toHaveCount(9)
  })

  test('l’aide du filtre s’ouvre et se ferme à Échap, le focus reste sur le bouton', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    const aide = page.getByRole('button', { name: 'Aide : Filtrer par ministère' })
    await aide.click()
    await expect(
      page.getByText('Les points créés par le ministère choisi et ceux qui le mentionnent.'),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByText('Les points créés par le ministère choisi et ceux qui le mentionnent.'),
    ).toBeHidden()
    await expect(aide).toBeFocused()
  })

  test('au clavier : Tab atteint les onglets puis le filtre', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await page.getByRole('link', { name: /^Ouverts/ }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /^Traités/ })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /^Tous/ })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('combobox', { name: 'Filtrer par ministère' })).toBeFocused()
  })
})

test.describe('« Mes points » du ministère, EJP Tech et l’administration (aperçu)', () => {
  test('le ministère : « Mes points », ses points seulement, sans filtre', async ({ page }) => {
    await ouvrir(page, { profil: 'ministere' })
    await expect(page.getByRole('heading', { level: 1, name: 'Mes points' })).toBeVisible()
    await expect(articles(page)).toHaveCount(2)
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Traités/ })).toHaveText('Traités (1)')
  })

  test('EJP Tech lit tous les points sans aucun bouton ni lien d’action (T29)', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'admin_plateforme' })
    await expect(articles(page)).toHaveCount(5)
    const contenu = page.getByRole('main')
    await expect(contenu.getByRole('button', { name: ACTIONS })).toHaveCount(0)
    await expect(contenu.getByRole('link', { name: ACTIONS })).toHaveCount(0)
    // Les boutons « ? » informent, ils n'agissent pas.
    await expect(contenu.getByRole('button', { name: /^(?!Aide : )/ })).toHaveCount(0)
  })

  test('l’administration de l’église reçoit la page non disponible, sans aucun point', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'admin_eglise' })
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeVisible()
    await expect(articles(page)).toHaveCount(0)
  })
})

test.describe('états vides et problèmes (T36)', () => {
  test('premier usage : une phrase par onglet, jamais un zéro seul', async ({ page }) => {
    await ouvrir(page, { etat: 'vide' })
    await expect(page.getByText('Aucun point ouvert.')).toBeVisible()
    await expect(page.getByRole('link', { name: /^Ouverts/ })).toHaveText('Ouverts (0)')
    await ouvrir(page, { etat: 'vide', vue: 'traites' })
    await expect(page.getByText("Aucun point traité pour l'instant.")).toBeVisible()
    await ouvrir(page, { profil: 'ministere', etat: 'vide', vue: 'tous' })
    await expect(page.getByText("Aucun point pour l'instant.")).toBeVisible()
    await expect(
      page.getByText('Les points que vous créez, et ceux qui vous mentionnent, apparaîtront ici.'),
    ).toBeVisible()
  })

  test('un ministère choisi sans point traité : son nom dans la phrase', async ({ page }) => {
    await ouvrir(page, { vue: 'traites', ministere: 'min-jeunesse' })
    await expect(page.getByText('Aucun point traité pour Jeunesse.')).toBeVisible()
  })

  test('chargement : le titre est déjà là, « Chargement » après 300 ms', async ({ page }) => {
    await ouvrir(page, { etat: 'chargement' })
    await expect(page.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    await expect(page.getByText('Chargement', { exact: true })).toBeVisible()
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1)
  })

  test('problème passager : le bandeau et « Réessayer »', async ({ page }) => {
    await ouvrir(page, { etat: 'erreur' })
    await expect(page.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(/La connexion a échoué. Réessayez./)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('accessibilité', () => {
  for (const ecran of TOUS) {
    test(`audit axe : ${nomDe(ecran)}`, async ({ page }) => {
      await ouvrir(page, ecran)
      if (ecran.etat === undefined && ecran.profil === 'berger' && ecran.vue === undefined) {
        await page.getByRole('button', { name: 'Aide : Filtrer par ministère' }).click()
      }
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test('liens et boutons du contenu : 44 px de haut et de large au moins', async ({ page }) => {
    for (const ecran of [{ profil: 'berger' }, { profil: 'ministere' }, { etat: 'erreur' }]) {
      await ouvrir(page, ecran)
      const cibles = page.getByRole('main').locator('a:visible, button:visible, select:visible')
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
    test.slow()
    await page.setViewportSize({ width: 360, height: 800 })
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nomDe(ecran)).toBeLessThanOrEqual(0)
    }
  })

  test('à 200 % de zoom (720 px de large), rien ne déborde', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 800 })
    for (const ecran of TOUS.slice(0, 4)) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nomDe(ecran)).toBeLessThanOrEqual(0)
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.slow()
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/points-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
})
