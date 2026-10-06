import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import {
  ajouter,
  appeler,
  aujourdhuiDeLaBase,
  compter,
  lire,
  MINISTERE_COMMUNICATION,
  plusJours,
} from './outils-evenements.ts'

// Saisies d'événement et de réunion (lot E5) qui écrivent dans la base locale : projet
// « ecritures » (en série, à 1440 px, après les projets de lecture). Chaque parcours crée ses
// propres lignes (nom suffixé), jamais celles du jeu d'exemple que lisent d'autres tests, et
// compare les comptes avant et après. Les dates viennent de `v_semaine` (heure de Paris).

const SUFFIXE = `${Date.now()}`
const NOM = `Essai E5 ${SUFFIXE}`

test.describe.configure({ mode: 'serial' })

/** Lignes de journal de l'événement ou de la réunion, lues par le ministère. */
const journalDe = (page: Page, action: string, cibleId: string) =>
  compter(page, `journal?select=id&action=eq.${action}&cible_id=eq.${cibleId}`)

test.describe('Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  let evenementId = ''

  test('ajoute un événement avec @Coordination : une ligne, sa mention, une ligne de journal', async ({
    page,
  }) => {
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const ajoutsAvant = await compter(
      page,
      `journal?select=id&action=eq.evenement_ajoute&ministere_id=eq.${MINISTERE_COMMUNICATION}`,
    )

    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 10))
    await page.getByLabel("Nom de l'événement").fill(NOM)
    await page.getByText('Brouillon', { exact: true }).click()
    await page.getByRole('checkbox', { name: 'Coordination' }).check()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )

    const lignes = await lire<{ id: string; ministere_id: string; date: string; statut: string }>(
      page,
      `v_evenement?select=id,ministere_id,date,statut&titre=eq.${encodeURIComponent(NOM)}`,
    )
    expect(lignes).toHaveLength(1)
    const [ligne] = lignes
    evenementId = ligne?.id ?? ''
    expect(ligne).toMatchObject({
      ministere_id: MINISTERE_COMMUNICATION,
      date: plusJours(aujourdhui, 10),
      statut: 'brouillon',
    })
    const mentions = await lire<{ ministere_id: string }>(
      page,
      `evenement_mention?select=ministere_id&evenement_id=eq.${evenementId}`,
    )
    const [coordination] = await lire<{ id: string }>(
      page,
      'ministere?select=id&nom=eq.Coordination',
    )
    expect(mentions).toEqual([{ ministere_id: coordination?.id }])
    expect(await journalDe(page, 'evenement_ajoute', evenementId)).toBe(1)
    expect(
      await compter(
        page,
        `journal?select=id&action=eq.evenement_ajoute&ministere_id=eq.${MINISTERE_COMMUNICATION}`,
      ),
    ).toBe(ajoutsAvant + 1)
  })

  test('une mise à jour sans changement est refusée par la base, sans ligne de journal', async ({
    page,
  }) => {
    expect(evenementId).not.toBe('')
    await page.goto(`/saisir/evenement/${evenementId}`)
    await expect(page.getByText(NOM)).toBeVisible()
    const etatsAvant = await compter(
      page,
      `evenement_etat?select=id&evenement_id=eq.${evenementId}`,
    )

    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    const alerte = page.getByRole('alert')
    await expect(alerte).toHaveText(
      "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
    )
    await expect(alerte.getByRole('link')).toHaveCount(0)
    expect(await compter(page, `evenement_etat?select=id&evenement_id=eq.${evenementId}`)).toBe(
      etatsAvant,
    )
    expect(await journalDe(page, 'evenement_modifie', evenementId)).toBe(0)
  })

  test('un report : la ligne « Report », une ligne d’état et une ligne de journal', async ({
    page,
  }) => {
    await page.goto(`/saisir/evenement/${evenementId}`)
    await expect(page.getByText(NOM)).toBeVisible()
    const aujourdhui = await aujourdhuiDeLaBase(page)
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 17))
    await expect(page.getByText(/^Report : du /)).toBeVisible()
    await page.getByText('En attente de validation', { exact: true }).click()
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement mis à jour.',
    )
    const [ligne] = await lire<{ date: string; statut: string; reporte_du: string | null }>(
      page,
      `v_evenement?select=date,statut,reporte_du&id=eq.${evenementId}`,
    )
    expect(ligne).toEqual({
      date: plusJours(aujourdhui, 17),
      statut: 'attente_validation',
      reporte_du: plusJours(aujourdhui, 10),
    })
    expect(await journalDe(page, 'evenement_modifie', evenementId)).toBe(1)
  })

  test('une nouvelle date passée est refusée sous le champ, avec « Signaler une difficulté »', async ({
    page,
  }) => {
    await page.goto(`/saisir/evenement/${evenementId}`)
    await expect(page.getByText(NOM)).toBeVisible()
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const etatsAvant = await compter(
      page,
      `evenement_etat?select=id&evenement_id=eq.${evenementId}`,
    )
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, -1))
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByLabel('Date', { exact: true })).toHaveAccessibleDescription(
      "La nouvelle date doit être aujourd'hui ou plus tard. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
    expect(await compter(page, `evenement_etat?select=id&evenement_id=eq.${evenementId}`)).toBe(
      etatsAvant,
    )
  })

  test('la prochaine réunion, renseignée puis modifiée : deux déclarations, deux lignes de journal', async ({
    page,
  }) => {
    await page.goto('/saisir/reunion')
    await expect(page.getByRole('button', { name: 'Enregistrer la réunion' })).toBeVisible()
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const requeteReunions = `reunion?select=id&ministere_id=eq.${MINISTERE_COMMUNICATION}`
    const requeteJournal = `journal?select=id&action=eq.reunion_saisie&ministere_id=eq.${MINISTERE_COMMUNICATION}`
    const reunionsAvant = await compter(page, requeteReunions)
    const journalAvant = await compter(page, requeteJournal)

    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 7))
    await page.getByLabel('Heure (facultatif)').fill('20:00')
    await page.getByLabel('Objet (facultatif)').fill(NOM)
    await page.getByRole('button', { name: 'Enregistrer la réunion' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Réunion' })).toHaveText(
      'Réunion enregistrée.',
    )

    await page
      .getByLabel('Décision attendue (facultatif)', { exact: true })
      .fill(`Choisir la salle ${SUFFIXE}`)
    await page.getByRole('button', { name: 'Enregistrer la réunion' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Réunion' })).toHaveText(
      'Réunion enregistrée.',
    )
    // Le message du premier envoi peut encore être affiché : on attend la seconde ligne.
    await expect.poll(() => compter(page, requeteReunions)).toBe(reunionsAvant + 2)

    const [prochaine] = await lire<{
      date: string
      heure: string
      objet: string
      decision_attendue: string
    }>(
      page,
      `v_prochaine_reunion?select=date,heure,objet,decision_attendue&ministere_id=eq.${MINISTERE_COMMUNICATION}`,
    )
    expect(prochaine).toEqual({
      date: plusJours(aujourdhui, 7),
      heure: '20:00:00',
      objet: NOM,
      decision_attendue: `Choisir la salle ${SUFFIXE}`,
    })
    expect(await compter(page, requeteJournal)).toBe(journalAvant + 2)

    // « Modifier » rouvre le panneau prérempli.
    await page.goto('/saisir/reunion')
    await expect(page.getByLabel('Objet (facultatif)')).toHaveValue(NOM)
  })
})

test.describe('EJP Tech, lecture seule', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('lit l’événement du test, mais la base refuse tout ajout de sa part', async ({ page }) => {
    await page.goto('/moderation')
    const [ligne] = await lire<{ id: string }>(
      page,
      `v_evenement?select=id&titre=eq.${encodeURIComponent(NOM)}`,
    )
    expect(ligne).toBeDefined()
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const etatsAvant = await compter(page, `evenement_etat?select=id&evenement_id=eq.${ligne?.id}`)

    const ajout = await appeler(page, 'ajouter_evenement', {
      p_titre: `${NOM} EJP Tech`,
      p_date: plusJours(aujourdhui, 3),
      p_statut: 'brouillon',
      p_mentions: [],
    })
    expect(ajout.ok()).toBe(false)
    const etat = await ajouter(page, 'evenement_etat', {
      evenement_id: ligne?.id,
      date: plusJours(aujourdhui, 20),
      statut: 'valide',
    })
    expect(etat.ok()).toBe(false)
    const reunion = await ajouter(page, 'reunion', {
      ministere_id: MINISTERE_COMMUNICATION,
      date: plusJours(aujourdhui, 3),
    })
    expect(reunion.ok()).toBe(false)
    expect(await compter(page, `evenement_etat?select=id&evenement_id=eq.${ligne?.id}`)).toBe(
      etatsAvant,
    )
  })
})
