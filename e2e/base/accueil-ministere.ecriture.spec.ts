import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { aujourdhuiDeLaBase, lire, plusJours } from './outils-evenements.ts'

// Accueil du ministère (07) et événement à confirmer (T31 ; `validation-metier.md`, 4.4 et 4.5),
// projet « ecritures » (en série, à 1440 px, après les projets de lecture). Communication crée
// son propre événement en attente de validation à J+2 (jamais celui du jeu d'exemple), le lit
// dans « Vos saisies » et dans la phrase, sans son titre, puis le valide : la ligne disparaît.
// « Aujourd'hui » vient de `v_semaine` (heure de Paris).

const NOM = `Essai E7 ${Date.now()}`

test.describe.configure({ mode: 'serial' })
test.use({ storageState: fichierSession('ministere') })

async function ouvrirAccueil(page: Page) {
  await page.goto('/')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
}

const ligneDuTest = (page: Page) =>
  page.getByRole('region', { name: 'Vos saisies' }).getByRole('listitem').filter({ hasText: NOM })

test('un événement à confirmer : une ligne « Mettre à jour » et la phrase sans son titre', async ({
  page,
}) => {
  await page.goto('/saisir/evenement')
  const aujourdhui = await aujourdhuiDeLaBase(page)
  await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 2))
  await page.getByLabel("Nom de l'événement").fill(NOM)
  await page.getByText('En attente de validation', { exact: true }).click()
  await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
    'Événement ajouté au calendrier.',
  )
  const [evenement] = await lire<{ id: string }>(
    page,
    `v_evenement?select=id&titre=eq.${encodeURIComponent(NOM)}`,
  )
  expect(evenement).toBeTruthy()

  await ouvrirAccueil(page)
  const ligne = ligneDuTest(page)
  await expect(ligne).toContainText('À faire')
  await expect(ligne).toContainText('En attente de validation, dans 2 jours')
  await expect(ligne.getByRole('link', { name: /^Mettre à jour : / })).toHaveAttribute(
    'href',
    `/saisir/evenement/${evenement?.id}`,
  )

  // La phrase compte les événements sans jamais citer leur titre ; « Tout est à jour » est masqué.
  const phrase = page.getByRole('heading', { level: 1 })
  await expect(phrase).toContainText(/le statut (d'un événement|de \d+ événements)/)
  await expect(phrase).not.toContainText(NOM)
  await expect(phrase).not.toContainText('Tout est à jour')
  await expect(
    page.getByRole('navigation', { name: 'Saisies à faire' }).locator('.bg-lumiere'),
  ).toHaveCount(1)
})

test('validé : la ligne quitte « Vos saisies »', async ({ page }) => {
  await ouvrirAccueil(page)
  const [evenement] = await lire<{ id: string }>(
    page,
    `v_evenement?select=id&titre=eq.${encodeURIComponent(NOM)}`,
  )
  await ligneDuTest(page)
    .getByRole('link', { name: /^Mettre à jour : / })
    .click()
  await expect(page).toHaveURL((url) => url.pathname === `/saisir/evenement/${evenement?.id}`)
  await expect(page.getByText(NOM)).toBeVisible()
  await page.getByText('Validé', { exact: true }).click()
  await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
    'Événement mis à jour.',
  )
  await ouvrirAccueil(page)
  await expect(page.getByRole('region', { name: 'Vos saisies' })).toBeVisible()
  await expect(ligneDuTest(page)).toHaveCount(0)
})
