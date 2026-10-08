import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, seConnecter } from '../comptes.ts'
import { appeler, lire } from './outils-evenements.ts'

// Mentions modifiables (T54) avec la base locale : projet « ecritures » (en série, à 1440 px, après
// les projets de lecture). Communication crée un point qui mentionne Intégration, ajoute Social et
// retire Intégration par la fenêtre « Modifier les mentions » ; Social voit le point, Intégration
// ne le voit plus et la base lui refuse toute action. Le berger retire Social et ajoute Intégration
// de nouveau : Intégration revoit le point. EJP Tech et l'administration n'ont ni le bouton ni le
// droit. Une ligne de journal par ajout et par retrait, sans texte libre. Le berger marque le point
// traité à la fin : ses mentions ne changent plus.

// Le suffixe s'écrit en lettres : 5 chiffres de suite tombent dans la famille « données
// personnelles » de `private.verifier_texte`, et la base refuserait le texte.
const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const TITRE = `Essai T54 ${SUFFIXE} salle`
const BOUTON = 'Modifier les mentions'
const REFUS_ACCES = "Ce point n'existe pas ou vous n'y avez pas accès."

test.describe.configure({ mode: 'serial' })

let point = ''
let integration = ''
let social = ''

const mentionsDe = async (page: Page) =>
  (
    await lire<{ ministere_id: string }>(
      page,
      `v_point_mention?select=ministere_id&point_id=eq.${point}`,
    )
  )
    .map((ligne) => ligne.ministere_id)
    .sort()

const pointsVisibles = (page: Page) =>
  lire<{ id: string }>(page, `v_point?select=id&id=eq.${point}`)

const journalDe = (page: Page, action: string) =>
  lire<{ detail: Record<string, unknown> | null; compte: string | null }>(
    page,
    `journal?select=detail,compte&action=eq.${action}&cible=eq.point_attention&cible_id=eq.${point}&order=id`,
  )

const boutonDuPoint = (page: Page, nom: string) =>
  page.getByRole('button', { name: nom, description: TITRE })

/** Bascule la case d'un ministère de la fenêtre (la case est cachée : on clique son libellé). */
async function basculer(page: Page, nom: string) {
  await page
    .getByRole('dialog', { name: BOUTON })
    .locator('label')
    .filter({ has: page.getByRole('checkbox', { name: nom, exact: true }) })
    .click()
}

const enregistrer = (page: Page) =>
  page
    .getByRole('dialog', { name: BOUTON })
    .getByRole('button', { name: 'Enregistrer les mentions' })
    .click()

test.describe('Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('crée un point qui mentionne Intégration, ajoute Social et retire Intégration', async ({
    page,
  }) => {
    await page.goto('/')
    const ministeres = await lire<{ id: string; nom: string }>(page, 'ministere?select=id,nom')
    integration = ministeres.find((m) => m.nom === 'Intégration')?.id ?? ''
    social = ministeres.find((m) => m.nom === 'Social')?.id ?? ''
    expect(integration).not.toBe('')
    expect(social).not.toBe('')
    const creation = await appeler(page, 'creer_point', {
      p_titre: TITRE,
      p_description: null,
      p_action_attendue: null,
      p_priorite: 'normale',
      p_echeance: null,
      p_mentions: [integration],
    })
    expect(creation.status()).toBe(200)
    point = (await creation.json()) as string
    expect(await mentionsDe(page)).toEqual([integration])

    await page.goto('/points')
    await boutonDuPoint(page, BOUTON).click()
    const fenetre = page.getByRole('dialog', { name: BOUTON })
    await expect(fenetre.getByRole('checkbox', { name: 'Intégration' })).toBeChecked()
    await expect(fenetre.getByRole('checkbox', { name: 'Social' })).not.toBeChecked()
    // Le ministère créateur ne se mentionne pas lui-même.
    await expect(fenetre.getByRole('checkbox', { name: 'Communication' })).toHaveCount(0)
    await basculer(page, 'Social')
    await basculer(page, 'Intégration')
    await enregistrer(page)
    await expect(page.getByRole('status').filter({ hasText: 'Mentions' })).toHaveText(
      'Mentions enregistrées.',
    )
    await expect(fenetre).toHaveCount(0)

    expect(await mentionsDe(page)).toEqual([social])
    // Rien n'est modifié ni effacé : deux lignes d'ajout, un retrait.
    expect(await lire(page, `point_mention?select=id&point_id=eq.${point}`)).toHaveLength(2)
    // Une ligne de journal par ajout et par retrait : des identifiants, jamais le titre.
    const ajouts = await journalDe(page, 'point_mention_ajoutee')
    const retraits = await journalDe(page, 'point_mention_retiree')
    expect(ajouts.map((ligne) => ligne.detail)).toEqual([{ ministere: social }])
    expect(retraits.map((ligne) => ligne.detail)).toEqual([{ ministere: integration }])
    expect(JSON.stringify([ajouts, retraits])).not.toContain(SUFFIXE)
  })

  test('la base refuse un doublon, un retrait sans mention et le ministère créateur', async ({
    page,
  }) => {
    await page.goto('/')
    const [communication] = await lire<{ id: string }>(
      page,
      'ministere?select=id&nom=eq.Communication',
    )
    const refus = async (nom: string, args: object, message: string) => {
      const reponse = await appeler(page, nom, { p_point_id: point, ...args })
      expect(reponse.status()).toBe(400)
      expect(((await reponse.json()) as { message: string }).message).toBe(message)
    }
    await refus(
      'ajouter_mention_point',
      { p_ministere_id: social },
      'Ce ministère est déjà mentionné sur ce point.',
    )
    await refus(
      'retirer_mention_point',
      { p_ministere_id: integration },
      "Ce ministère n'est pas mentionné sur ce point.",
    )
    await refus(
      'ajouter_mention_point',
      { p_ministere_id: communication?.id },
      'Ce ministère ne peut pas être mentionné.',
    )
    expect(await mentionsDe(page)).toEqual([social])
  })
})

test.describe('Social, mentionné', () => {
  test('voit le point, sans le bouton « Modifier les mentions », et ne peut pas les modifier', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await seConnecter(page, 'social@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect(await pointsVisibles(page)).toHaveLength(1)
    await page.goto('/points')
    await expect(page.getByText(TITRE)).toBeVisible()
    await expect(boutonDuPoint(page, 'Marquer traité')).toBeVisible()
    await expect(boutonDuPoint(page, BOUTON)).toHaveCount(0)

    const reponse = await appeler(page, 'modifier_mentions_point', {
      p_point_id: point,
      p_mentions: [],
    })
    expect(reponse.status()).toBe(403)
    expect(await reponse.json()).toMatchObject({ code: '42501', message: REFUS_ACCES })
    expect(await mentionsDe(page)).toEqual([social])
  })
})

test.describe('Intégration, retiré', () => {
  test('ne voit plus le point, et la base lui refuse toute action', async ({ page }) => {
    test.setTimeout(120_000)
    await seConnecter(page, 'integration@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect(await pointsVisibles(page)).toHaveLength(0)
    expect(await mentionsDe(page)).toEqual([])
    await page.goto('/points')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(TITRE)).toHaveCount(0)

    for (const [nom, args] of [
      ['changer_statut_point', { p_point_id: point, p_statut: 'en_cours' }],
      ['marquer_traite', { p_point_id: point, p_commentaire: 'Essai de traitement refusé.' }],
      ['ajouter_mention_point', { p_point_id: point, p_ministere_id: integration }],
    ] as const) {
      const reponse = await appeler(page, nom, args)
      expect(reponse.status(), nom).toBe(403)
      expect(await reponse.json()).toMatchObject({ code: '42501', message: REFUS_ACCES })
    }
  })
})

test.describe('le berger', () => {
  test.use({ storageState: fichierSession('berger') })

  test('retire Social et ajoute Intégration de nouveau, depuis la fenêtre', async ({ page }) => {
    await page.goto('/points')
    await boutonDuPoint(page, BOUTON).click()
    const fenetre = page.getByRole('dialog', { name: BOUTON })
    await expect(fenetre.getByRole('checkbox', { name: 'Social' })).toBeChecked()
    await expect(fenetre.getByRole('checkbox', { name: 'Intégration' })).not.toBeChecked()
    await basculer(page, 'Social')
    await basculer(page, 'Intégration')
    await enregistrer(page)
    await expect(page.getByRole('status').filter({ hasText: 'Mentions' })).toHaveText(
      'Mentions enregistrées.',
    )
    expect(await mentionsDe(page)).toEqual([integration])
    const ajouts = await journalDe(page, 'point_mention_ajoutee')
    const retraits = await journalDe(page, 'point_mention_retiree')
    expect(ajouts).toHaveLength(2)
    expect(retraits).toHaveLength(2)
    expect(retraits[1]?.detail).toEqual({ ministere: social })
    expect(ajouts[1]?.detail).toEqual({ ministere: integration })
    // Le compte de la dernière ligne est celui du berger, pas celui du ministère créateur.
    expect(ajouts[1]?.compte).not.toBe(ajouts[0]?.compte)
  })
})

test.describe('Intégration, ajouté de nouveau', () => {
  test('revoit le point', async ({ page }) => {
    test.setTimeout(120_000)
    await seConnecter(page, 'integration@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect(await pointsVisibles(page)).toHaveLength(1)
    await page.goto('/points')
    await expect(page.getByText(TITRE)).toBeVisible()
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('lit le point sans « Modifier les mentions », et la base refuse l’appel', async ({
    page,
  }) => {
    await page.goto('/points')
    await expect(page.getByText(TITRE)).toBeVisible()
    await expect(page.getByRole('button', { name: BOUTON })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Marquer traité' })).toHaveCount(0)
    const reponse = await appeler(page, 'modifier_mentions_point', {
      p_point_id: point,
      p_mentions: [],
    })
    expect(reponse.status()).toBe(403)
    expect(await mentionsDe(page)).toEqual([integration])
  })
})

test.describe('l’administration de l’église', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('ne lit pas le point et la base refuse l’appel', async ({ page }) => {
    await page.goto('/')
    expect(await pointsVisibles(page)).toHaveLength(0)
    const reponse = await appeler(page, 'modifier_mentions_point', {
      p_point_id: point,
      p_mentions: [],
    })
    expect(reponse.status()).toBe(403)
  })
})

test.describe('le berger, point traité', () => {
  test.use({ storageState: fichierSession('berger') })

  test('un point traité ne change plus de mentions : plus de bouton, la base refuse', async ({
    page,
  }) => {
    await page.goto('/')
    const traite = await appeler(page, 'marquer_traite', {
      p_point_id: point,
      p_commentaire: null,
    })
    expect(traite.status()).toBe(204)
    const reponse = await appeler(page, 'modifier_mentions_point', {
      p_point_id: point,
      p_mentions: [],
    })
    expect(reponse.status()).toBe(400)
    expect(await reponse.json()).toMatchObject({
      message: 'Ce point est traité : ses mentions ne changent plus.',
    })
    expect(await mentionsDe(page)).toEqual([integration])
    await page.goto('/points')
    await expect(page.getByRole('button', { name: BOUTON })).toHaveCount(0)
  })
})
