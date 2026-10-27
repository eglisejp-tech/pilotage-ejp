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
//
// Exception : la prochaine réunion n'a qu'une ligne « à venir » par ministère. Le parcours de la
// réunion écrit donc celle de Communication, qui remplace « Calendrier éditorial d'octobre » du jeu
// d'exemple, et ajoute deux lignes `reunion_saisie` (fraîcheur de Communication). Dans la CI, le
// projet `ecritures` passe en dernier : sans effet. En local, lancez `npx supabase db reset` avant
// de relancer les projets de lecture après un passage d'`ecritures` (colonne « Prochaine réunion »
// du berger, « Vos saisies »).

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
    // Heure prévue (T68) : « 19:00 » part en minutes depuis minuit.
    await page.getByLabel('Heure prévue (facultatif)').fill('19:00')
    await page.getByLabel("Nom de l'événement").fill(NOM)
    await page.getByText('Brouillon', { exact: true }).click()
    await page.getByRole('checkbox', { name: 'Coordination' }).check()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )

    const lignes = await lire<{
      id: string
      ministere_id: string
      date: string
      statut: string
      heure_prevue: number | null
      heure_debut: number | null
    }>(
      page,
      `v_evenement?select=id,ministere_id,date,statut,heure_prevue,heure_debut&titre=eq.${encodeURIComponent(NOM)}`,
    )
    expect(lignes).toHaveLength(1)
    const [ligne] = lignes
    evenementId = ligne?.id ?? ''
    expect(ligne).toMatchObject({
      ministere_id: MINISTERE_COMMUNICATION,
      date: plusJours(aujourdhui, 10),
      statut: 'brouillon',
      heure_prevue: 1140,
      heure_debut: null,
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

  // T76, le cas réel du 26 octobre 2026 : la base enregistre, la réponse se perd (Safari, « Load
  // failed »). L'écran ne dit plus « réessayez » : il dit de vérifier la liste, relit le calendrier
  // et montre la référence, la même que dans X-Client-Info (journaux de la passerelle).
  test('réponse perdue après l’enregistrement : « Vérifiez la liste », la référence de la requête, un seul événement', async ({
    page,
  }) => {
    const nom = `Essai T76 ${SUFFIXE}`
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    let enTete = ''
    await page.route('**/rest/v1/rpc/ajouter_evenement', async (route) => {
      enTete = route.request().headers()['x-client-info'] ?? ''
      // La requête part et la base enregistre ; seule la réponse n'arrive pas au navigateur.
      await route.fetch()
      await route.abort('failed')
    })
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 12))
    await page.getByLabel("Nom de l'événement").fill(nom)
    await page.getByText('Brouillon', { exact: true }).click()
    for (const mention of ['Coordination', 'FIJ']) {
      await page.getByRole('checkbox', { name: mention, exact: true }).check()
    }
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()

    const alerte = page.getByRole('alert')
    await expect(alerte).toContainText(
      'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    )
    await expect(alerte).not.toContainText('encore dans le formulaire')
    const reference = /Référence pour EJP Tech : ([2-9A-HJKMNP-Z]{6})/.exec(
      (await alerte.textContent()) ?? '',
    )?.[1]
    expect(reference).toBeDefined()
    expect(enTete).toMatch(/; pilotage=([0-9a-f]{7}|local);/)
    expect(enTete).toContain(`; ref=${reference ?? ''}`)
    await expect(page.getByLabel("Nom de l'événement")).toHaveValue(nom)

    const lignes = await lire<{ id: string }>(
      page,
      `v_evenement?select=id&titre=eq.${encodeURIComponent(nom)}`,
    )
    expect(lignes).toHaveLength(1)
    expect(await journalDe(page, 'evenement_ajoute', lignes[0]?.id ?? '')).toBe(1)
  })

  // T76, lot B : le numéro anti-doublon. La réponse se perd une fois après l'enregistrement ;
  // l'outil renvoie seul le même envoi (Proposé, Q1) : la base reconnaît le numéro et rend le même
  // événement. La réussite s'affiche dès le premier toucher, un seul événement, un seul journal.
  test('numéro anti-doublon : réponse perdue une fois, le nouvel essai automatique rend le même événement', async ({
    page,
  }) => {
    const nom = `Essai T76 B1 ${SUFFIXE}`
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const numeros: string[] = []
    await page.route('**/rest/v1/rpc/ajouter_evenement', async (route) => {
      numeros.push((route.request().postDataJSON() as { p_cle?: string }).p_cle ?? '')
      if (numeros.length > 1) {
        await route.continue()
        return
      }
      // Le premier envoi part et la base enregistre ; seule sa réponse se perd.
      await route.fetch()
      await route.abort('failed')
    })
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 13))
    await page.getByLabel("Nom de l'événement").fill(nom)
    await page.getByText('Brouillon', { exact: true }).click()
    for (const mention of ['Coordination', 'FIJ']) {
      await page.getByRole('checkbox', { name: mention, exact: true }).check()
    }
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(numeros).toHaveLength(2)
    expect(numeros[1]).toBe(numeros[0])

    const lignes = await lire<{ id: string }>(
      page,
      `v_evenement?select=id&titre=eq.${encodeURIComponent(nom)}`,
    )
    expect(lignes).toHaveLength(1)
    expect(await journalDe(page, 'evenement_ajoute', lignes[0]?.id ?? '')).toBe(1)
  })

  // Les deux essais perdent leur réponse : « Vérifiez la liste ». Un second toucher renvoie le
  // même numéro : la base rend l'événement déjà créé, l'écran dit la réussite, rien n'est doublé.
  test('numéro anti-doublon : second toucher après « Vérifiez la liste », la réussite et un seul événement', async ({
    page,
  }) => {
    const nom = `Essai T76 B2 ${SUFFIXE}`
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    await page.route(
      '**/rest/v1/rpc/ajouter_evenement',
      async (route) => {
        await route.fetch()
        await route.abort('failed')
      },
      { times: 2 },
    )
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 14))
    await page.getByLabel("Nom de l'événement").fill(nom)
    await page.getByText('Brouillon', { exact: true }).click()
    await page.getByRole('checkbox', { name: 'FIJ', exact: true }).check()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    )
    await expect(page.getByLabel("Nom de l'événement")).toHaveValue(nom)

    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )
    await expect(page.getByLabel("Nom de l'événement")).toHaveValue('')
    const lignes = await lire<{ id: string }>(
      page,
      `v_evenement?select=id&titre=eq.${encodeURIComponent(nom)}`,
    )
    expect(lignes).toHaveLength(1)
    expect(await journalDe(page, 'evenement_ajoute', lignes[0]?.id ?? '')).toBe(1)
  })

  // Même numéro, nom corrigé après « Vérifiez la liste » : la base refuse, l'écran dit que le
  // premier envoi est enregistré, et rien n'est écrit de plus.
  test('numéro anti-doublon : nom corrigé avant le second toucher, « Votre premier envoi est déjà enregistré »', async ({
    page,
  }) => {
    const nom = `Essai T76 B3 ${SUFFIXE}`
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    await page.route(
      '**/rest/v1/rpc/ajouter_evenement',
      async (route) => {
        await route.fetch()
        await route.abort('failed')
      },
      { times: 2 },
    )
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 15))
    await page.getByLabel("Nom de l'événement").fill(nom)
    await page.getByText('Brouillon', { exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('alert')).toContainText('Vérifiez la liste avant de réessayer.')

    await page.getByLabel("Nom de l'événement").fill(`${nom}, corrigé`)
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer.',
    )
    expect(
      await lire<{ id: string }>(page, `v_evenement?select=id&titre=eq.${encodeURIComponent(nom)}`),
    ).toHaveLength(1)
    expect(
      await lire<{ id: string }>(
        page,
        `v_evenement?select=id&titre=eq.${encodeURIComponent(`${nom}, corrigé`)}`,
      ),
    ).toHaveLength(0)
  })

  // m134 : la ligne identique est dite avant l'envoi (la base la refuserait aussi).
  test('une mise à jour sans changement est refusée, sans ligne ni journal', async ({ page }) => {
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
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
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
    // Une seule phrase de date passée, comme à l'ajout (T66, t140 et m125).
    await expect(page.getByLabel('Date', { exact: true })).toHaveAccessibleDescription(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
    expect(await compter(page, `evenement_etat?select=id&evenement_id=eq.${evenementId}`)).toBe(
      etatsAvant,
    )
  })

  // T68 : un événement du jour, Terminé sans heure de début, puis avec. La base calcule le retard ;
  // l'écran le lit dans `v_evenement`, sur la fiche, dans « Vos saisies » et au journal.
  test('heures (T68) : Terminé du jour, « Heure de début à indiquer », puis « Commencé à »', async ({
    page,
  }) => {
    const nomDuJour = `${NOM} du jour`
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    await page.getByLabel('Date', { exact: true }).fill(aujourdhui)
    await page.getByLabel('Heure prévue (facultatif)').fill('10:00')
    await page.getByLabel("Nom de l'événement").fill(nomDuJour)
    await page.getByText('Validé', { exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement ajouté au calendrier.',
    )
    const [cree] = await lire<{ id: string }>(
      page,
      `v_evenement?select=id&titre=eq.${encodeURIComponent(nomDuJour)}`,
    )
    const id = cree?.id ?? ''
    expect(id).not.toBe('')

    // Terminé, sans heure de début : le champ paraît, vide ; l'heure prévue est préremplie.
    await page.goto(`/saisir/evenement/${id}`)
    await expect(page.getByLabel('Heure prévue (facultatif)')).toHaveValue('10:00')
    await expect(page.getByLabel('Heure de début (facultatif)')).toHaveCount(0)
    await page.getByText('Terminé', { exact: true }).click()
    await expect(page.getByLabel('Heure de début (facultatif)')).toHaveValue('')
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement mis à jour.',
    )

    // « Vos saisies » et le calendrier du porteur rappellent l'heure de début.
    await page.goto('/')
    const saisies = page.getByRole('region', { name: 'Vos saisies' })
    await expect(saisies.getByRole('listitem').filter({ hasText: nomDuJour })).toContainText(
      'Heure de début à indiquer',
    )
    await page.goto('/ma-fiche')
    const calendrier = page.getByRole('region', { name: 'Calendrier prévisionnel' })
    const ligne = calendrier.getByRole('listitem').filter({ hasText: nomDuJour })
    await expect(ligne).toContainText(', 10 h')
    await expect(ligne).toContainText('Heure de début à indiquer')

    // L'heure de début : 10 h 12, soit 12 minutes de retard, calculées par la base.
    await page.goto(`/saisir/evenement/${id}`)
    await page.getByLabel('Heure de début (facultatif)').fill('10:12')
    await page.getByRole('button', { name: 'Enregistrer la mise à jour' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Événement' })).toHaveText(
      'Événement mis à jour.',
    )
    const [lue] = await lire<{ heure_debut: number; retard: number; a_l_heure: boolean }>(
      page,
      `v_evenement?select=heure_debut,retard,a_l_heure&id=eq.${id}`,
    )
    expect(lue).toEqual({ heure_debut: 612, retard: 12, a_l_heure: false })
    await page.goto('/ma-fiche')
    await expect(
      page
        .getByRole('region', { name: 'Calendrier prévisionnel' })
        .getByRole('listitem')
        .filter({ hasText: nomDuJour }),
    ).toContainText('Commencé à 10 h 12, 12 min de retard')
    await expect(
      page.getByRole('region', { name: 'Dernières saisies' }).getByText(/commencé à 10 h 12/),
    ).toBeVisible()
    await page.goto('/')
    await expect(
      page.getByRole('region', { name: 'Vos saisies' }).getByRole('listitem').filter({
        hasText: nomDuJour,
      }),
    ).toHaveCount(0)
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
    const requeteEtats = `evenement_etat?select=id&evenement_id=eq.${ligne?.id}`
    const requeteReunions = `reunion?select=id&ministere_id=eq.${MINISTERE_COMMUNICATION}`
    const requeteAjout = `v_evenement?select=id&titre=eq.${encodeURIComponent(`${NOM} EJP Tech`)}`
    const etatsAvant = await compter(page, requeteEtats)
    const reunionsAvant = await compter(page, requeteReunions)

    // Un refus de droit (42501, HTTP 403), pas une autre erreur (fonction introuvable, mauvais
    // argument) : seul ce code prouve que la base refuse EJP Tech.
    const refuse = async (reponse: Awaited<ReturnType<typeof appeler>>) => {
      expect(reponse.status()).toBe(403)
      expect(((await reponse.json()) as { code: string }).code).toBe('42501')
    }

    await refuse(
      await appeler(page, 'ajouter_evenement', {
        p_titre: `${NOM} EJP Tech`,
        p_date: plusJours(aujourdhui, 3),
        p_statut: 'brouillon',
        p_mentions: [],
      }),
    )
    // La version à cinq arguments (T68), celle de l'écran, refuse de même.
    await refuse(
      await appeler(page, 'ajouter_evenement', {
        p_titre: `${NOM} EJP Tech`,
        p_date: plusJours(aujourdhui, 3),
        p_statut: 'brouillon',
        p_mentions: [],
        p_heure_prevue: 1140,
      }),
    )
    await refuse(
      await ajouter(page, 'evenement_etat', {
        evenement_id: ligne?.id,
        date: plusJours(aujourdhui, 20),
        statut: 'valide',
      }),
    )
    await refuse(
      await ajouter(page, 'reunion', {
        ministere_id: MINISTERE_COMMUNICATION,
        date: plusJours(aujourdhui, 3),
      }),
    )
    expect(await compter(page, requeteEtats)).toBe(etatsAvant)
    expect(await compter(page, requeteReunions)).toBe(reunionsAvant)
    expect(await compter(page, requeteAjout)).toBe(0)
  })
})
