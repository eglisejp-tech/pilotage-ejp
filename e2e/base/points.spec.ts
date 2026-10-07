import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'

// Écran 05 « Points d'attention » et « Mes points » (lot P3) avec la base locale (job « e2e » de
// la CI, E2E_BASE=1), en lecture seulement. Jeu d'exemple : supabase/seed.sql, dix points. Six
// ouverts (Financement, Planning, Salle, Visuels, Renfort, Réimpression) et quatre traités (Micros,
// Transport, Clés, Lieu de stockage, dont la description est masquée). Par profil : le berger et le
// conseil lisent tout, EJP Tech lit tout sans aucun bouton, Communication lit ses points et celui
// qui le mentionne, l'administration de l'église reçoit la page non disponible sans requête de
// données. Les dates se calculent sur le jour de Paris de la base : aucun test ne compare un jour.

const SOCIAL = '10000000-0000-4000-8000-000000000005'
const NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

const OUVERTS = [
  'Financement de Welcome Prodiges',
  'Planning du trimestre à valider',
  'Salle pour la soirée de louange',
  'Visuels pour Welcome Prodiges',
  'Renfort de 4 STARs pour la sortie',
  'Réimpression des supports',
]
const TRAITES = [
  "Micros pour Bâtir l'Église",
  'Transport des Prodiges Junior',
  'Clés de la salle annexe',
  'Lieu de stockage de la collecte',
]

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

const articles = (page: Page) => page.getByRole('article')
const titres = (page: Page) => articles(page).getByRole('heading', { level: 3 })
const onglets = (page: Page) =>
  page.getByRole('navigation', { name: 'Vues des points' }).getByRole('link')

async function ouvrirPoints(page: Page, adresse = '/points', titre = "Points d'attention") {
  await page.goto(adresse)
  await expect(page).toHaveTitle(`${titre}, Pilotage EJP`)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: titre })).toBeVisible()
}

async function sansDefilementHorizontal(page: Page) {
  const debord = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(debord).toBeLessThanOrEqual(0)
}

for (const profil of ['berger', 'conseil'] as const) {
  test.describe(`${profil} : écran 05`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('les onglets avec leur nombre, les ouverts par priorité puis échéance', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      await ouvrirPoints(page)
      await expect(onglets(page)).toHaveText(['Ouverts (6)', 'Traités (4)', 'Tous (10)'])
      await expect(onglets(page).first()).toHaveAttribute('aria-current', 'page')
      await expect(titres(page)).toHaveText(OUVERTS)
      const financement = page.getByRole('article', { name: 'Financement de Welcome Prodiges' })
      await expect(financement).toContainText('Urgente')
      await expect(financement).toContainText('En attente de décision')
      await expect(financement).toContainText('Intégration, mentions :')
      await expect(
        page.getByRole('article', { name: 'Salle pour la soirée de louange' }),
      ).toContainText('@Coordination')
      expect(requetes).toContain('/rest/v1/v_point')
      await sansDefilementHorizontal(page)
    })

    test('« Traités récemment » : les quatre traités, avec leur auteur', async ({ page }) => {
      await ouvrirPoints(page)
      const recents = page.getByRole('region', { name: 'Traités récemment' })
      await expect(recents.getByRole('listitem')).toHaveCount(4)
      await expect(recents.getByRole('listitem').first()).toContainText(TRAITES[0] ?? '')
      await expect(recents).toContainText(/Traité le \d{1,2} \S+ par Berger/)
      await expect(recents).toContainText(/Traité le \d{1,2} \S+ par Conseil, compte 3/)
      // Le compte du ministère Coordination se lit par le nom du ministère, pas par son libellé.
      await expect(recents).toContainText(/Traité le \d{1,2} \S+ par Coordination/)
      await expect(recents).not.toContainText('Ministère Coordination')
    })

    test('l’onglet Traités : du plus récent au plus ancien, commentaire entre guillemets, texte masqué en encre 3', async ({
      page,
    }) => {
      await ouvrirPoints(page, '/points?vue=traites')
      await expect(onglets(page).nth(1)).toHaveAttribute('aria-current', 'page')
      await expect(titres(page)).toHaveText(TRAITES)
      await expect(
        page.getByRole('article', { name: 'Transport des Prodiges Junior' }),
      ).toContainText("« Deux véhicules de l'église assurent le transport jusqu'à fin octobre. »")
      await expect(page.getByText('[texte masqué par EJP Tech]')).toBeVisible()
      await expect(page.getByRole('region', { name: 'Traités récemment' })).toHaveCount(0)
    })

    test('l’onglet Tous : les ouverts, puis les traités', async ({ page }) => {
      await ouvrirPoints(page, '/points?vue=tous')
      await expect(titres(page)).toHaveText([...OUVERTS, ...TRAITES])
    })

    test('le filtre : les points créés par le ministère ou qui le mentionnent', async ({
      page,
    }) => {
      await ouvrirPoints(page)
      await page
        .getByRole('combobox', { name: 'Filtrer par ministère' })
        .selectOption({ label: 'Coordination' })
      await expect(page).toHaveURL(/[?&]ministere=/)
      // Créés par Coordination : Planning, Clés. Qui la mentionnent : Salle, Lieu de stockage.
      await expect(onglets(page)).toHaveText(['Ouverts (2)', 'Traités (2)', 'Tous (4)'])
      await expect(titres(page)).toHaveText([
        'Planning du trimestre à valider',
        'Salle pour la soirée de louange',
      ])
      await onglets(page).nth(1).click()
      await expect(page).toHaveURL(/[?&]ministere=/)
      await expect(titres(page)).toHaveText([
        'Clés de la salle annexe',
        'Lieu de stockage de la collecte',
      ])
      await page
        .getByRole('combobox', { name: 'Filtrer par ministère' })
        .selectOption({ label: 'Tous les ministères' })
      await expect(page).not.toHaveURL(/[?&]ministere=/)
      await expect(titres(page)).toHaveText(TRAITES)
    })

    test('l’adresse garde la vue et le ministère après un rechargement', async ({ page }) => {
      await ouvrirPoints(page)
      await page
        .getByRole('combobox', { name: 'Filtrer par ministère' })
        .selectOption({ label: 'Coordination' })
      await onglets(page).nth(2).click()
      await page.reload()
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
      await expect(onglets(page).nth(2)).toHaveAttribute('aria-current', 'page')
      await expect(page.getByRole('combobox', { name: 'Filtrer par ministère' })).not.toHaveValue(
        '',
      )
      await expect(articles(page)).toHaveCount(4)
    })

    test('l’aide du filtre', async ({ page }) => {
      await ouvrirPoints(page)
      await page.getByRole('button', { name: 'Aide : Filtrer par ministère' }).click()
      await expect(
        page.getByText('Les points créés par le ministère choisi et ceux qui le mentionnent.'),
      ).toBeVisible()
    })
  })
}

test.describe('EJP Tech : écran 05 en lecture seule', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('lit tous les points, sans aucun bouton ni lien d’action (T29)', async ({ page }) => {
    await ouvrirPoints(page)
    await expect(onglets(page)).toHaveText(['Ouverts (6)', 'Traités (4)', 'Tous (10)'])
    await expect(titres(page)).toHaveText(OUVERTS)
    const contenu = page.getByRole('main')
    await expect(contenu.getByRole('button', { name: ACTIONS })).toHaveCount(0)
    await expect(contenu.getByRole('link', { name: ACTIONS })).toHaveCount(0)
    // Les boutons « ? » des aides informent, ils n'agissent pas : aucun autre bouton.
    await expect(contenu.getByRole('button', { name: /^(?!Aide : )/ })).toHaveCount(0)
    // Aucun bouton dans aucune rangée, ouverte ou traitée.
    await expect(articles(page).getByRole('button')).toHaveCount(0)
    await page.goto('/points?vue=traites')
    await expect(articles(page)).toHaveCount(4)
    await expect(articles(page).getByRole('button')).toHaveCount(0)
    await expect(contenu.getByRole('button', { name: ACTIONS })).toHaveCount(0)
  })
})

test.describe('ministère Communication : « Mes points »', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('ses points et celui qui le mentionne, sans filtre de ministère', async ({ page }) => {
    await ouvrirPoints(page, '/points', 'Mes points')
    // Créés : Salle (ouvert), Micros (traité). Mentionné : Visuels (ouvert).
    await expect(onglets(page)).toHaveText(['Ouverts (2)', 'Traités (1)', 'Tous (3)'])
    await expect(titres(page)).toHaveText([
      'Salle pour la soirée de louange',
      'Visuels pour Welcome Prodiges',
    ])
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByText('Financement de Welcome Prodiges')).toHaveCount(0)
    await expect(page.getByText('Planning du trimestre à valider')).toHaveCount(0)
    await sansDefilementHorizontal(page)
  })

  test('le point qui le mentionne se lit avec son ministère créateur', async ({ page }) => {
    await ouvrirPoints(page, '/points', 'Mes points')
    await expect(
      page.getByRole('article', { name: 'Visuels pour Welcome Prodiges' }),
    ).toContainText('Intégration, mentions :')
  })

  test('« Traités récemment » et l’onglet Traités : son point traité', async ({ page }) => {
    await ouvrirPoints(page, '/points', 'Mes points')
    const recents = page.getByRole('region', { name: 'Traités récemment' })
    await expect(recents).toContainText("Micros pour Bâtir l'Église")
    await expect(recents).toContainText('par Berger')
    await ouvrirPoints(page, '/points?vue=traites', 'Mes points')
    await expect(titres(page)).toHaveText(["Micros pour Bâtir l'Église"])
    await expect(articles(page).first()).toContainText(/Traité le \d{1,2} \S+ par Berger/)
  })

  test('le filtre de l’adresse est ignoré : un autre ministère ne se lit pas', async ({ page }) => {
    await ouvrirPoints(page, `/points?ministere=${SOCIAL}`, 'Mes points')
    await expect(onglets(page)).toHaveText(['Ouverts (2)', 'Traités (1)', 'Tous (3)'])
    await expect(page.getByText('Renfort de 4 STARs pour la sortie')).toHaveCount(0)
    await expect(page.getByText('Lieu de stockage de la collecte')).toHaveCount(0)
  })
})

test.describe('administration de l’église', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('la page non disponible, sans requête de données', async ({ page }) => {
    const requetes = suivreRequetesDeDonnees(page)
    for (const adresse of ['/points', '/points?vue=traites']) {
      await page.goto(adresse)
      await expect(page.getByRole('heading', { level: 1, name: NON_DISPONIBLE })).toBeVisible()
    }
    await expect(articles(page)).toHaveCount(0)
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })
})
