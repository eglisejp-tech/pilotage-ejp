import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Fiche d'un ministère (04, 12) et liste des ministères (lot E2) sur l'aperçu /apercu/fiche, sans
// base ni écriture : la fiche de Social, lue par chaque profil, et ses états vides. Trois formats
// par les projets Playwright. Les parcours avec la base sont dans e2e/base/fiche.spec.ts.

type Ecran = { ecran?: string; profil?: string }

const adresse = ({ ecran = 'fiche', profil = 'berger' }: Ecran) =>
  `/apercu/fiche?ecran=${ecran}&profil=${profil}`

async function ouvrir(page: Page, ecran: Ecran) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const boutonsAide = (page: Page) => page.getByRole('button', { name: /^Aide : / })

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS =
  /Marquer traité|Changer le statut|Nouveau point|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/
/**
 * Ce que le berger et le conseil n'ont pas : « Marquer traité » (étape 5) et « Modifier les
 * mentions » (T54) leur reviennent.
 */
const ACTIONS_SANS_TRAITE =
  /Changer le statut|Nouveau point|Saisir|Enregistrer|Ajouter|Modifier(?! les mentions)|Mettre à jour/

const TOUS: Ecran[] = [
  { profil: 'berger' },
  { profil: 'conseil' },
  { profil: 'admin_plateforme' },
  { profil: 'ministere' },
  { profil: 'admin_eglise' },
  { ecran: 'fiche-vide', profil: 'berger' },
  { ecran: 'fiche-vide', profil: 'ministere' },
  { ecran: 'fiche-erreur-bloc', profil: 'berger' },
  { ecran: 'fiche-erreur-points', profil: 'berger' },
  { ecran: 'fiche-erreur-details', profil: 'berger' },
  { ecran: 'chargement', profil: 'berger' },
  { ecran: 'erreur', profil: 'berger' },
  { ecran: 'introuvable', profil: 'berger' },
  { ecran: 'ministeres', profil: 'berger' },
  { ecran: 'ministeres', profil: 'admin_plateforme' },
  { ecran: 'ministeres-vide', profil: 'conseil' },
  { ecran: 'ministeres-erreur', profil: 'berger' },
]

const nomDe = ({ ecran = 'fiche', profil = 'berger' }: Ecran) => `${ecran}-${profil}`

async function ouvrirRepartition(page: Page) {
  const resume = page.getByText('Répartition par catégorie')
  await resume.scrollIntoViewIfNeeded()
  await resume.click()
}

test.describe('fiche 04 lue par le berger (aperçu)', () => {
  test('le nom, la phrase surlignée, les chiffres communs et la fraîcheur', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await expect(page.getByRole('heading', { level: 1, name: 'Social' })).toBeVisible()
    await expect(page.locator('mark')).toHaveText('Un point attend une décision')
    await expect(page.getByText('Mis à jour il y a 3 jours')).toBeVisible()
    await expect(page.getByText('11 sur 14, calculé')).toBeVisible()
  })

  test('un sensible à 2 s’affiche exact (P52), le mois en cours « en cours »', async ({ page }) => {
    for (const profil of ['berger', 'conseil', 'admin_plateforme']) {
      await ouvrir(page, { profil })
      await expect(page.getByText('moins de 3', { exact: true })).toHaveCount(0)
      await expect(page.getByText(/^Depuis juin : 9 /)).toBeVisible()
      await expect(page.getByText('Octobre en cours : 7')).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Aide : Bénéficiaires (passages)' }),
      ).toHaveCount(0)
    }
  })

  test('répartition exacte (P52) : « Non réparti », « Pas de répartition » ; précisions', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    await ouvrirRepartition(page)
    await expect(page.getByText('Pas de répartition pour septembre.')).toBeVisible()
    await expect(page.getByText('Malaise : 4')).toBeVisible()
    await expect(page.getByText('Blessure : 2')).toBeVisible()
    await expect(page.getByText(/Non réparti/)).toBeVisible()
    await expect(page.getByText('masqué', { exact: true })).toHaveCount(0)
    await expect(page.getByText('moins de 3', { exact: true })).toHaveCount(0)
    await expect(page.getByText(/^Précision d'octobre/)).toBeVisible()
  })

  test('aucun bouton de saisie, pour le berger comme pour EJP Tech', async ({ page }) => {
    for (const profil of ['berger', 'conseil', 'admin_plateforme']) {
      await ouvrir(page, { profil })
      const contenu = page.getByRole('main')
      await expect(contenu.getByRole('link', { name: ACTIONS })).toHaveCount(0)
      // Le berger et le conseil marquent un point traité (étape 5) : c'est le seul bouton qu'ils
      // ont sur la fiche. EJP Tech n'en a aucun, pas même celui-là (T29).
      const interdits = profil === 'admin_plateforme' ? ACTIONS : ACTIONS_SANS_TRAITE
      await expect(contenu.getByRole('button', { name: interdits })).toHaveCount(0)
    }
  })

  test('au clavier : la ligne repliée s’ouvre et se referme sans perdre le focus', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    const resume = page.getByText('Répartition par catégorie')
    await resume.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Malaise : 4')).toBeVisible()
    await expect(resume).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Malaise : 4')).toBeHidden()
    await expect(resume).toBeFocused()
  })

  test('les cadres des emplacements des autres lots se voient, dans l’ordre de la maquette', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger' })
    for (const emplacement of ['reunion', 'statistiquesFij', 'calendrier']) {
      await expect(page.locator(`[data-emplacement-apercu="${emplacement}"]`)).toBeVisible()
    }
    const bas = async (emplacement: string) =>
      (await page.locator(`[data-emplacement-apercu="${emplacement}"]`).boundingBox())?.y ?? 0
    expect(await bas('statistiquesFij')).toBeLessThan(await bas('calendrier'))
  })

  test('l’écart se lit sur téléphone avec ce à quoi il se compare', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    const texte = page.getByText('par rapport à dimanche dernier').first()
    if ((page.viewportSize()?.width ?? 0) < 768) {
      await expect(texte).toBeVisible()
    } else {
      // Dans la colonne étroite : « +1 » seul, la description reste pour les lecteurs d'écran.
      await expect(page.getByText('+1', { exact: true }).first()).toBeVisible()
    }
  })
})

test.describe('fiche 12 du ministère (aperçu)', () => {
  test('ses boutons de saisie, ses valeurs exactes, sans « moins de 3 » ni « masqué »', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'ministere' })
    await expect(page.getByText('Votre ministère')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Saisir les chiffres du dimanche' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Saisir les chiffres du mois' })).toHaveCount(1)
    await ouvrirRepartition(page)
    await expect(page.getByText('moins de 3', { exact: true })).toHaveCount(0)
    await expect(page.getByText('masqué', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Mentionné par Intégration.')).toBeVisible()
  })

  test('l’administration de l’église n’a pas de fiche', async ({ page }) => {
    await ouvrir(page, { profil: 'admin_eglise' })
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeVisible()
  })
})

test.describe('états vides de la fiche et de la liste (T36)', () => {
  test('premier usage : la ligne garde sa forme, jamais 0, le texte du profil', async ({
    page,
  }) => {
    await ouvrir(page, { ecran: 'fiche-vide', profil: 'berger' })
    await expect(page.getByText('Pas encore de saisie')).toHaveCount(3)
    await expect(
      page.getByText(
        "Ce ministère n'a pas encore d'indicateur à lui. Il saisit les chiffres communs.",
      ),
    ).toBeVisible()
    await expect(page.getByText('Aucun point ouvert pour Social.')).toBeVisible()
    await expect(page.getByText("Aucune saisie pour l'instant.")).toBeVisible()
  })

  test('problème passager d’un bloc, et de la page : « Réessayer »', async ({ page }) => {
    await ouvrir(page, { ecran: 'fiche-erreur-bloc' })
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('heading', { name: 'Dernières saisies' })).toBeVisible()
    await ouvrir(page, { ecran: 'fiche-erreur-points' })
    const points = page.getByRole('region', { name: "Points d'attention" })
    await expect(points.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(points.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await ouvrir(page, { ecran: 'fiche-erreur-details' })
    const chiffres = page.getByRole('region', { name: 'Les chiffres du ministère' })
    await expect(chiffres.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await ouvrir(page, { ecran: 'erreur' })
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  test('chargement : les titres de section et leurs filets sont déjà là', async ({ page }) => {
    await ouvrir(page, { ecran: 'chargement' })
    for (const titre of ['Les chiffres du ministère', "Points d'attention", 'Dernières saisies']) {
      await expect(page.getByRole('heading', { level: 2, name: titre })).toBeVisible()
    }
  })

  test('ministère inconnu : la phrase et « Revenir aux ministères »', async ({ page }) => {
    await ouvrir(page, { ecran: 'introuvable' })
    await expect(page.getByText("Ce ministère n'existe pas ou n'est plus actif.")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir aux ministères' })).toBeVisible()
  })

  test('liste : chaque nom ouvre la fiche ; vide, la phrase de premier usage', async ({ page }) => {
    await ouvrir(page, { ecran: 'ministeres' })
    await expect(page.getByRole('heading', { level: 1, name: 'Ministères' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Communication' })).toHaveAttribute(
      'href',
      '/ministeres/10000000-0000-4000-8000-000000000001',
    )
    await ouvrir(page, { ecran: 'ministeres-vide', profil: 'conseil' })
    await expect(
      page.getByText("Aucun ministère actif. L'administration de l'église crée les ministères."),
    ).toBeVisible()
  })
})

test.describe('accessibilité', () => {
  for (const ecran of TOUS) {
    test(`audit axe : ${nomDe(ecran)}`, async ({ page }) => {
      await ouvrir(page, ecran)
      if ((ecran.ecran ?? 'fiche') === 'fiche' && ecran.profil !== 'admin_eglise') {
        if ((await page.getByText('Répartition par catégorie').count()) > 0) {
          await ouvrirRepartition(page)
        }
        const aide = boutonsAide(page).first()
        await aide.scrollIntoViewIfNeeded()
        await aide.click()
      }
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test('liens et boutons du contenu : 44 px de haut et de large au moins', async ({ page }) => {
    for (const ecran of [{ profil: 'ministere' }, { profil: 'berger' }, { ecran: 'ministeres' }]) {
      await ouvrir(page, ecran)
      // La répartition repliée porte une aide et une ligne repliable : on les mesure ouvertes.
      if ((await page.getByText('Répartition par catégorie').count()) > 0) {
        await ouvrirRepartition(page)
      }
      const cibles = page.getByRole('main').locator('a:visible, button:visible, summary:visible')
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
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    if ((ecran.ecran ?? 'fiche') === 'fiche' && ecran.profil !== 'admin_eglise') {
      await ouvrirRepartition(page)
    }
    await page.screenshot({
      path: `test-results/captures/fiche-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
})
