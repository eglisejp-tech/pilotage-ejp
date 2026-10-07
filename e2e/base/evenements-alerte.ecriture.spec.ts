import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, seConnecter } from '../comptes.ts'
import { aujourdhuiDeLaBase, compter, lire, plusJours } from './outils-evenements.ts'

// Alerte des événements à confirmer, calendrier et bandeau (lot E6) avec la base locale : projet
// « ecritures » (en série, à 1440 px, après les projets de lecture). Le parcours crée son propre
// événement, en attente de validation à J+2 et mentionnant Coordination : jamais celui du jeu
// d'exemple, que d'autres tests lisent. « Aujourd'hui » vient de `v_semaine` (heure de Paris).
// Coordination et Jeunesse se connectent à part (mot de passe, puis code), comme dans le projet
// « connexion ». Ce parcours ne peut tourner que dans la CI (Docker ne tourne pas sur le poste de
// développement).

const SUFFIXE = `${Date.now()}`
const NOM = `Essai E6 ${SUFFIXE}`
const SANS_SESSION = { cookies: [], origins: [] }

test.describe.configure({ mode: 'serial' })

/**
 * Connexion d'un ministère (mot de passe, puis code). Le code de ce compte ne peut pas être celui
 * d'une connexion de la même période de 30 s : on attend la suivante. La connexion doit être
 * terminée (arrivée sur « / ») avant toute autre navigation, sinon elle est coupée en route.
 */
async function connecterMinistere(page: Page, email: string) {
  test.setTimeout(120_000)
  const reste = 30_000 - (Date.now() % 30_000)
  await new Promise((fin) => setTimeout(fin, reste + 500))
  await seConnecter(page, email)
  await expect(page).toHaveURL((url) => url.pathname === '/')
}

/** Lignes de `v_evenement` portant le titre du test, telles que le compte de la page les lit. */
const lignesDuTest = (page: Page) =>
  lire<{ id: string; jours: number; a_confirmer: boolean; statut: string }>(
    page,
    `v_evenement?select=id,jours,a_confirmer,statut&titre=eq.${encodeURIComponent(NOM)}`,
  )

/** Déplie « Voir les N événements à confirmer » s'il existe, puis rend le bloc. */
async function blocAConfirmer(page: Page) {
  const bloc = page.getByRole('region', { name: 'Événements à confirmer' })
  await expect(bloc).toBeVisible()
  const voirTout = bloc.getByRole('button', { name: /^Voir les \d+ événements à confirmer$/ })
  if ((await voirTout.count()) > 0) await voirTout.click()
  return bloc
}

test.describe('Communication, porteur', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('ajoute un événement en attente de validation à J+2, avec @Coordination', async ({
    page,
  }) => {
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 2))
    await page.getByLabel("Nom de l'événement").fill(NOM)
    await page.getByText('En attente de validation', { exact: true }).click()
    await page.getByRole('checkbox', { name: 'Coordination' }).check()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )
    const [ligne] = await lignesDuTest(page)
    expect(ligne).toMatchObject({ jours: 2, a_confirmer: true, statut: 'attente_validation' })
  })

  test('« Ma fiche » : le bandeau, « dans 2 jours », « @Coordination » et « Mettre à jour »', async ({
    page,
  }) => {
    await page.goto('/ma-fiche')
    const calendrier = page.getByRole('region', { name: 'Calendrier prévisionnel' })
    await expect(calendrier.locator('[data-alerte-fiche]')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    const ligne = calendrier.getByRole('listitem').filter({ hasText: NOM })
    await expect(ligne).toContainText('En attente de validation, dans 2 jours')
    await expect(ligne).toContainText('@Coordination')
    await expect(ligne.getByRole('link', { name: /^Mettre à jour/ })).toBeVisible()
  })
})

test.describe('Berger, conseil et EJP Tech', () => {
  test.describe('berger', () => {
    test.use({ storageState: fichierSession('berger') })

    test('« Cette semaine » : la ligne à J+2, sans aucun bouton de mise à jour', async ({
      page,
    }) => {
      await page.goto('/')
      const bloc = await blocAConfirmer(page)
      const ligne = bloc.getByRole('listitem').filter({ hasText: NOM })
      await expect(ligne).toContainText(`« ${NOM} », Communication`)
      await expect(ligne).toContainText('dans 2 jours')
      await expect(bloc.getByRole('button', { name: /Mettre à jour|Marquer traité/ })).toHaveCount(
        0,
      )
      await expect(page.getByRole('link', { name: /Mettre à jour/ })).toHaveCount(0)
    })
  })

  test.describe('EJP Tech', () => {
    test.use({ storageState: fichierSession('admin_plateforme') })

    test('lit le bloc dans « Cette semaine », sans aucun bouton d’action', async ({ page }) => {
      await page.goto('/')
      const bloc = await blocAConfirmer(page)
      await expect(bloc.getByRole('listitem').filter({ hasText: NOM })).toBeVisible()
      await expect(page.getByRole('link', { name: /Mettre à jour/ })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Mettre à jour|Marquer traité/ })).toHaveCount(
        0,
      )
    })
  })
})

test.describe('Administration de l’église', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('ne voit jamais le bloc, et la base ne lui rend aucune ligne', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 2, name: 'Les ministères' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Événements à confirmer' })).toHaveCount(0)
    expect(await lignesDuTest(page)).toEqual([])
    expect(await compter(page, 'v_evenement?select=id&a_confirmer=eq.true')).toBe(0)
  })
})

test.describe('Coordination, mentionnée', () => {
  test.use({ storageState: SANS_SESSION })

  test('lit l’événement qui la mentionne : bandeau et « Mentionné par Communication », sans bouton', async ({
    page,
  }) => {
    await connecterMinistere(page, 'coordination@exemple.test')
    await page.goto('/ma-fiche')
    const calendrier = page.getByRole('region', { name: 'Calendrier prévisionnel' })
    const ligne = calendrier.getByRole('listitem').filter({ hasText: NOM })
    await expect(ligne).toContainText('Mentionné par Communication.')
    await expect(ligne).toContainText('En attente de validation, dans 2 jours')
    await expect(ligne.getByRole('link')).toHaveCount(0)
    await expect(calendrier.locator('[data-alerte-fiche]')).toContainText('vous mentionne')
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Événements à confirmer' })).toHaveCount(0)
    expect(await lignesDuTest(page)).toHaveLength(1)
  })
})

test.describe('Un autre ministère', () => {
  test.use({ storageState: SANS_SESSION })

  test('ne lit pas l’événement : ni la base, ni sa fiche', async ({ page }) => {
    await connecterMinistere(page, 'jeunesse@exemple.test')
    await page.goto('/ma-fiche')
    await expect(page.getByRole('region', { name: 'Calendrier prévisionnel' })).toBeVisible()
    await expect(page.getByText(NOM)).toHaveCount(0)
    expect(await lignesDuTest(page)).toEqual([])
  })
})

test.describe('Communication, qui valide', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('choisit « Validé » : l’événement quitte l’alerte', async ({ page }) => {
    await page.goto('/ma-fiche')
    const [avant] = await lignesDuTest(page)
    expect(avant?.a_confirmer).toBe(true)
    await page.goto(`/saisir/evenement/${avant?.id}`)
    await expect(page.getByText(NOM)).toBeVisible()
    await page.getByText('Validé', { exact: true }).click()
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement mis à jour.',
    )
    const [apres] = await lignesDuTest(page)
    expect(apres).toMatchObject({ a_confirmer: false, statut: 'valide' })
    await page.goto('/ma-fiche')
    const calendrier = page.getByRole('region', { name: 'Calendrier prévisionnel' })
    const ligne = calendrier.getByRole('listitem').filter({ hasText: NOM })
    await expect(ligne).toContainText('Validé')
    await expect(ligne).not.toContainText('En attente de validation')
  })
})

test.describe('Berger, après la validation', () => {
  test.use({ storageState: fichierSession('berger') })

  test('ne lit plus la ligne dans le bloc', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(NOM)).toHaveCount(0)
    const [ligne] = await lignesDuTest(page)
    expect(ligne?.a_confirmer).toBe(false)
  })
})
