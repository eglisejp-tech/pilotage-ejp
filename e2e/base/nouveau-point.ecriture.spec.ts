import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import {
  appeler,
  aujourdhuiDeLaBase,
  compter,
  lire,
  MINISTERE_COMMUNICATION,
  plusJours,
} from './outils-evenements.ts'

// « Nouveau point d'attention » (étape 5, lot P2) avec la base locale : projet « ecritures » (en
// série, à 1440 px, après les projets de lecture). Chaque parcours crée ses propres points (titre
// suffixé), jamais ceux du jeu d'exemple que lisent d'autres tests, et compare les comptes avant et
// après. Les dates viennent de `v_semaine` (heure de Paris). Seul un compte de ministère crée un
// point : les quatre autres profils reçoivent la page non disponible, et la base refuse leur appel
// (42501). Chaque création écrit une seule ligne de journal, sans texte libre.

const SUFFIXE = `${Date.now()}`
const TITRE = `Essai P2 ${SUFFIXE}`
const DESCRIPTION = `La salle n'est pas confirmée ${SUFFIXE}.`
const ATTENDU = `Confirmer la salle ${SUFFIXE}`
const TITRE_SEUL = `Essai P2 seul ${SUFFIXE}`
const TITRE_REFUSE = `Essai P2 refusé ${SUFFIXE}`

test.describe.configure({ mode: 'serial' })

type LignePoint = {
  id: string
  ministere_id: string
  titre: string
  description: string | null
  action_attendue: string | null
  priorite: string
  echeance: string | null
  statut: string
}

const colonnesPoint = 'id,ministere_id,titre,description,action_attendue,priorite,echeance,statut'

/** Points lisibles par le compte de la page, à ce titre exact. */
const pointsTitres = (page: Page, titre: string) =>
  lire<LignePoint>(page, `v_point?select=${colonnesPoint}&titre=eq.${encodeURIComponent(titre)}`)

const requeteJournalDuMinistere = `journal?select=id&action=eq.point_cree&ministere_id=eq.${MINISTERE_COMMUNICATION}`

/** Coche un ministère dans le groupe des mentions (la case est cachée, son libellé se clique). */
async function mentionner(page: Page, nom: string) {
  await page
    .getByRole('group', { name: 'Mentionner un ministère (facultatif)' })
    .getByText(nom, { exact: true })
    .click()
  await expect(page.getByRole('checkbox', { name: nom })).toBeChecked()
}

const bouton = (page: Page) => page.getByRole('button', { name: 'Créer le point' })
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: 'Point créé.' })

test.describe('Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('crée un point complet avec @Coordination : une ligne, sa mention, une ligne de journal sans texte', async ({
    page,
  }) => {
    await page.goto('/saisir/point')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Nouveau point d'attention")
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const journalAvant = await compter(page, requeteJournalDuMinistere)
    // Le ministère du compte ne se mentionne pas lui-même.
    await expect(page.getByRole('checkbox', { name: 'Communication' })).toHaveCount(0)

    await page.getByLabel('Titre', { exact: true }).fill(`  ${TITRE}  `)
    await page.getByLabel('Ce qui se passe (facultatif)').fill(DESCRIPTION)
    await page.getByText('Haute', { exact: true }).click()
    await page.getByLabel('Ce qui est attendu (facultatif)', { exact: true }).fill(ATTENDU)
    await page.getByLabel('Échéance (facultatif)', { exact: true }).fill(plusJours(aujourdhui, 5))
    await mentionner(page, 'Coordination')
    await bouton(page).click()
    await expect(reussite(page)).toHaveText('Point créé.')

    // Le formulaire est vidé : un second clic n'envoie rien.
    await expect(page.getByLabel('Titre', { exact: true })).toHaveValue('')
    const [point, ...autres] = await pointsTitres(page, TITRE)
    expect(autres).toHaveLength(0)
    expect(point).toMatchObject({
      ministere_id: MINISTERE_COMMUNICATION,
      titre: TITRE,
      description: DESCRIPTION,
      action_attendue: ATTENDU,
      priorite: 'haute',
      echeance: plusJours(aujourdhui, 5),
      statut: 'a_traiter',
    })

    const [coordination] = await lire<{ id: string }>(
      page,
      'ministere?select=id&nom=eq.Coordination',
    )
    expect(
      await lire<{ ministere_id: string }>(
        page,
        `point_mention?select=ministere_id&point_id=eq.${point?.id}`,
      ),
    ).toEqual([{ ministere_id: coordination?.id }])

    // Une seule ligne de journal par envoi, sans le titre ni le texte libre.
    const lignes = await lire<{ detail: unknown }>(
      page,
      `journal?select=detail&action=eq.point_cree&cible_id=eq.${point?.id}`,
    )
    expect(lignes).toHaveLength(1)
    const detail = JSON.stringify(lignes[0]?.detail)
    for (const texte of [TITRE, DESCRIPTION, ATTENDU]) expect(detail).not.toContain(texte)
    expect(await compter(page, requeteJournalDuMinistere)).toBe(journalAvant + 1)
  })

  test('crée un point avec le seul titre : priorité « Normale », sans échéance ni mention', async ({
    page,
  }) => {
    await page.goto('/saisir/point')
    await expect(page.getByRole('radio', { name: 'Normale' })).toBeChecked()
    const journalAvant = await compter(page, requeteJournalDuMinistere)

    await page.getByLabel('Titre', { exact: true }).fill(TITRE_SEUL)
    await bouton(page).click()
    await expect(reussite(page)).toHaveText('Point créé.')

    const [point, ...autres] = await pointsTitres(page, TITRE_SEUL)
    expect(autres).toHaveLength(0)
    expect(point).toMatchObject({
      ministere_id: MINISTERE_COMMUNICATION,
      description: null,
      action_attendue: null,
      priorite: 'normale',
      echeance: null,
      statut: 'a_traiter',
    })
    expect(await compter(page, `point_mention?select=ministere_id&point_id=eq.${point?.id}`)).toBe(
      0,
    )
    expect(await compter(page, requeteJournalDuMinistere)).toBe(journalAvant + 1)
  })

  test('une échéance passée est refusée sous le champ, valeurs gardées, rien n’est écrit', async ({
    page,
  }) => {
    await page.goto('/saisir/point')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const journalAvant = await compter(page, requeteJournalDuMinistere)

    await page.getByLabel('Titre', { exact: true }).fill(TITRE_REFUSE)
    await page.getByLabel('Échéance (facultatif)', { exact: true }).fill(plusJours(aujourdhui, -1))
    await bouton(page).click()
    await expect(
      page.getByLabel('Échéance (facultatif)', { exact: true }),
    ).toHaveAccessibleDescription("L'échéance ne peut pas être passée.")
    await expect(page.getByLabel('Titre', { exact: true })).toHaveValue(TITRE_REFUSE)
    expect(await pointsTitres(page, TITRE_REFUSE)).toHaveLength(0)
    expect(await compter(page, requeteJournalDuMinistere)).toBe(journalAvant)
  })

  test('un titre vide est refusé sous le champ ; la base refuse aussi l’appel direct', async ({
    page,
  }) => {
    await page.goto('/saisir/point')
    await bouton(page).click()
    await expect(page.getByLabel('Titre', { exact: true })).toHaveAccessibleDescription(
      /Donnez un titre au point \(80 caractères au plus\)\./,
    )

    const aujourdhui = await aujourdhuiDeLaBase(page)
    const [coordination] = await lire<{ id: string }>(
      page,
      'ministere?select=id&nom=eq.Coordination',
    )
    const arguments_ = {
      p_titre: TITRE_REFUSE,
      p_description: null,
      p_action_attendue: null,
      p_priorite: 'normale',
      p_echeance: null,
      p_mentions: [],
    }
    const refus = async (surcharge: object, message: string) => {
      const reponse = await appeler(page, 'creer_point', { ...arguments_, ...surcharge })
      expect(reponse.status()).toBe(400)
      expect(((await reponse.json()) as { message: string }).message).toBe(message)
    }
    await refus({ p_titre: '   ' }, 'Donnez un titre au point (80 caractères au plus).')
    await refus({ p_echeance: plusJours(aujourdhui, -1) }, "L'échéance ne peut pas être passée.")
    await refus(
      { p_mentions: [MINISTERE_COMMUNICATION] },
      'Ce ministère ne peut pas être mentionné.',
    )
    await refus(
      { p_mentions: [coordination?.id, '10000000-0000-4000-8000-0000000000ff'] },
      'Ce ministère ne peut pas être mentionné.',
    )
    expect(await pointsTitres(page, TITRE_REFUSE)).toHaveLength(0)
  })
})

// Les quatre autres profils : page non disponible, et la base refuse la création (403, 42501).
for (const profil of ['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const) {
  test.describe(`profil ${profil}, sans accès à la création`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('la page est non disponible, et creer_point est refusé par la base', async ({ page }) => {
      await page.goto('/saisir/point')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        "Cette page n'est pas disponible avec votre compte.",
      )
      await expect(bouton(page)).toHaveCount(0)

      const reponse = await appeler(page, 'creer_point', {
        p_titre: TITRE_REFUSE,
        p_description: null,
        p_action_attendue: null,
        p_priorite: 'normale',
        p_echeance: null,
        p_mentions: [],
      })
      expect(reponse.status()).toBe(403)
      expect(((await reponse.json()) as { code: string }).code).toBe('42501')
    })
  })
}

test.describe('berger, après les refus', () => {
  test.use({ storageState: fichierSession('berger') })

  test('lit les points créés par Communication, et aucun point refusé n’existe', async ({
    page,
  }) => {
    await page.goto('/')
    expect(await pointsTitres(page, TITRE)).toHaveLength(1)
    expect(await pointsTitres(page, TITRE_SEUL)).toHaveLength(1)
    expect(await pointsTitres(page, TITRE_REFUSE)).toHaveLength(0)
  })
})
