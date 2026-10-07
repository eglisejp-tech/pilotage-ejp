import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, seConnecter, suivreRequetesDeDonnees } from '../comptes.ts'

// Fiche d'un ministère (04, 12) et liste des ministères (lot E2) avec la base locale (job « e2e »
// de la CI, E2E_BASE=1), en lecture seulement. Jeux d'exemple : seed/40 (le sensible de Social à
// 2 au dernier mois fini) et seed/44 (catégories, répartition du mois en cours 4, 3 et 0, et une
// précision). Par profil : EJP Tech en lecture seule, l'administration refusée, Communication sur
// sa fiche et sur celle d'un autre, le berger et le conseil sur la fiche de Social, et Social ;
// tous lisent les valeurs exactes du sensible (P52).

const SOCIAL = '10000000-0000-4000-8000-000000000005'
const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const PRECISION =
  'Plus de passages pendant la collecte de rentrée, tous orientés vers les bonnes permanences.'
const SENSIBLE = 'Bénéficiaires (passages)'

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

async function attendreLaFiche(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
}

/** La ligne de l'indicateur sensible de Social. */
const ligneSensible = (page: Page) =>
  page.getByRole('listitem').filter({ hasText: SENSIBLE }).first()

async function ouvrirRepartition(page: Page) {
  const resume = ligneSensible(page).getByText('Répartition par catégorie')
  await resume.scrollIntoViewIfNeeded()
  await resume.click()
}

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('ouvre la liste puis une fiche, sans aucun bouton de saisie (T29)', async ({ page }) => {
    await page.goto('/ministeres')
    await expect(page).toHaveTitle('Ministères, Pilotage EJP')
    await attendreLaFiche(page)
    await page.getByRole('link', { name: 'Social', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === `/ministeres/${SOCIAL}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Social' })).toBeVisible()
    await attendreLaFiche(page)
    const contenu = page.getByRole('main')
    await expect(contenu.getByRole('link', { name: ACTIONS })).toHaveCount(0)
    await expect(contenu.getByRole('button', { name: ACTIONS })).toHaveCount(0)
  })
})

test.describe('administration de l’église', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('la liste et les fiches lui sont refusées, sans requête de données', async ({ page }) => {
    const requetes = suivreRequetesDeDonnees(page)
    for (const adresse of ['/ministeres', `/ministeres/${SOCIAL}`]) {
      await page.goto(adresse)
      await expect(page.getByRole('heading', { level: 1, name: NON_DISPONIBLE })).toBeVisible()
    }
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })
})

test.describe('ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('sa propre fiche par son identifiant : « Ma fiche », avec ses boutons de saisie', async ({
    page,
  }) => {
    await page.goto(`/ministeres/${COMMUNICATION}`)
    await expect(page).toHaveURL((url) => url.pathname === '/ma-fiche')
    await expect(page.getByRole('heading', { level: 1, name: 'Communication' })).toBeVisible()
    await attendreLaFiche(page)
    await expect(page.getByRole('link', { name: 'Saisir les chiffres du dimanche' })).toBeVisible()
  })

  test('la fiche d’un autre ministère : la page non disponible, sans requête', async ({ page }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto(`/ministeres/${SOCIAL}`)
    await expect(page.getByRole('heading', { level: 1, name: NON_DISPONIBLE })).toBeVisible()
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })
})

for (const profil of ['berger', 'conseil'] as const) {
  test.describe(`${profil}, fiche de Social`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('le sensible à 2 s’affiche exact (P52) ; mois en cours, précision et répartition', async ({
      page,
    }) => {
      await page.goto(`/ministeres/${SOCIAL}`)
      await attendreLaFiche(page)
      const ligne = ligneSensible(page)
      await expect(ligne.getByText('2', { exact: true })).toBeVisible()
      await expect(page.getByText('moins de 3', { exact: true })).toHaveCount(0)
      await expect(ligne.getByText(/ en cours : 7$/)).toBeVisible()
      await expect(ligne.getByText(PRECISION)).toBeVisible()
      await ouvrirRepartition(page)
      // Le dernier mois fini (2) n'a pas de répartition ; le mois en cours (7 : 4, 3, 0) se lit
      // exact, comme pour Social.
      await expect(ligne.getByText(/^Pas de répartition pour /)).toBeVisible()
      await expect(ligne.getByRole('listitem').filter({ hasText: 'Malaise' })).toHaveText(
        'Malaise : 4',
      )
      await expect(ligne.getByRole('listitem').filter({ hasText: 'Blessure' })).toHaveText(
        'Blessure : 3',
      )
      await expect(ligne.getByRole('listitem').filter({ hasText: 'Non réparti' })).toHaveText(
        'Non réparti : 0',
      )
    })
  })
}

test.describe('ministère Social, sur sa fiche', () => {
  test('lit ses valeurs exactes : 2, et la même répartition', async ({ page }, infos) => {
    // Une seule connexion de plus (vérification des codes limitée, BRIEF section 8).
    test.skip(infos.project.name !== 'ordinateur', 'Connexion vérifiée une fois, à 1440 px.')
    test.setTimeout(120_000)
    await seConnecter(page, 'social@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await page.goto('/ma-fiche')
    await attendreLaFiche(page)
    const ligne = ligneSensible(page)
    await expect(ligne.getByText('2', { exact: true })).toBeVisible()
    await expect(page.getByText('moins de 3', { exact: true })).toHaveCount(0)
    await ouvrirRepartition(page)
    await expect(ligne.getByRole('listitem').filter({ hasText: 'Malaise' })).toHaveText(
      'Malaise : 4',
    )
    await expect(ligne.getByText(PRECISION)).toBeVisible()
  })
})
