import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, seConnecter } from '../comptes.ts'
import {
  appeler,
  aujourdhuiDeLaBase,
  compter,
  lire,
  MINISTERE_COMMUNICATION,
  plusJours,
} from './outils-evenements.ts'

// Signalements (lot E8, T39) qui écrivent dans la base locale : projet « ecritures » (en série, à
// 1440 px, après les projets de lecture). Communication part du refus d'une date passée sur le
// formulaire 11, suit le lien « Signaler une difficulté » et envoie un signalement créé par le
// test (texte suffixé) ; un autre ministère ne le voit pas ; EJP Tech le voit dans son bloc et le
// clôt avec un commentaire ; Communication lit « Clos ». Le journal reçoit une ligne par envoi
// et par clôture, avec le code de l'écran, jamais le texte ni le commentaire.

// Le suffixe s'écrit en lettres : 5 chiffres de suite tombent dans la famille « données
// personnelles » de `private.verifier_texte`, et la base refuserait le texte.
const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const TEXTE = `Essai E8 ${SUFFIXE} : le formulaire refuse ma date.`
const COMMENTAIRE = `Essai E8 ${SUFFIXE} : réglé avec le ministère.`
const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

test.describe.configure({ mode: 'serial' })

type LigneJournal = { id: number; detail: Record<string, unknown> | null }

/** Lignes de journal d'un signalement, lues par le compte de la page. */
const journalDe = (page: Page, action: string, signalementId: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,detail&action=eq.${action}&cible=eq.signalement&cible_id=eq.${signalementId}`,
  )

/** Le signalement du test, lu sous la RLS du compte de la page. */
const signalementDuTest = (page: Page) =>
  lire<{ id: string; ministere_id: string; ecran: string; ouvert: boolean; commentaire: string }>(
    page,
    `v_signalement?select=id,ministere_id,ecran,ouvert,commentaire&texte=eq.${encodeURIComponent(TEXTE)}`,
  )

let signalementId = ''

test.describe('Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('date refusée sur le formulaire 11, lien suivi, signalement envoyé : une ligne, une ligne de journal sans le texte', async ({
    page,
  }) => {
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const requeteJournal = `journal?select=id&action=eq.difficulte_signalee&ministere_id=eq.${MINISTERE_COMMUNICATION}`
    const journalAvant = await compter(page, requeteJournal)

    // Une date passée : le formulaire la refuse sous le champ, avec le lien.
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, -1))
    await page.getByLabel("Nom de l'événement").fill(`Essai E8 ${SUFFIXE}`)
    await page.getByText('Brouillon', { exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()
    await expect(
      page.getByText("Cette date est passée. Choisissez aujourd'hui ou une date à venir."),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Signaler une difficulté' }).first().click()

    await expect(page).toHaveURL((url) => url.pathname === '/signaler')
    await expect(page.getByText('Écran concerné : Ajouter un événement')).toBeVisible()
    await page.getByLabel('Quelle difficulté rencontrez-vous ?').fill(TEXTE)
    await page.getByRole('button', { name: 'Envoyer le signalement' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Signalement' })).toHaveText(
      'Signalement envoyé. EJP Tech le lira.',
    )

    const lignes = await signalementDuTest(page)
    expect(lignes).toHaveLength(1)
    expect(lignes[0]).toMatchObject({
      ministere_id: MINISTERE_COMMUNICATION,
      ecran: 'saisie_evenement',
      ouvert: true,
    })
    signalementId = lignes[0]?.id ?? ''
    expect(await compter(page, requeteJournal)).toBe(journalAvant + 1)
    const journal = await journalDe(page, 'difficulte_signalee', signalementId)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ ecran: 'saisie_evenement' })
    expect(JSON.stringify(journal)).not.toContain(SUFFIXE)

    // « Vos derniers signalements » le montre, ouvert.
    await expect(
      page
        .getByRole('region', { name: 'Vos derniers signalements' })
        .getByRole('listitem')
        .filter({ hasText: TEXTE }),
    ).toContainText('Ouvert')
  })
})

test.describe('un autre ministère (Intégration)', () => {
  test('ne lit ni le signalement de Communication, ni ses lignes de journal', async ({ page }) => {
    test.setTimeout(120_000)
    expect(signalementId).not.toBe('')
    await seConnecter(page, 'integration@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await page.goto('/signaler')
    await expect(page.getByText('Écran concerné : Autre écran')).toBeVisible()
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByText(TEXTE)).toHaveCount(0)
    expect(await signalementDuTest(page)).toHaveLength(0)
    expect(
      await compter(page, `v_signalement?select=id&ministere_id=eq.${MINISTERE_COMMUNICATION}`),
    ).toBe(0)
    expect(await journalDe(page, 'difficulte_signalee', signalementId)).toHaveLength(0)
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('voit le signalement dans son bloc, le clôt avec un commentaire ; une seconde clôture est refusée', async ({
    page,
  }) => {
    expect(signalementId).not.toBe('')
    await page.goto('/moderation')
    const ligne = page
      .getByRole('region', { name: 'Signalements', exact: true })
      .getByRole('list')
      .first()
      .getByRole('article')
      .filter({ hasText: TEXTE })
    await expect(ligne).toContainText('Communication')
    await expect(ligne).toContainText('Ajouter un événement')
    await ligne.getByRole('button', { name: 'Clore le signalement' }).click()
    await page.getByLabel('Commentaire (facultatif)').fill(COMMENTAIRE)
    await page.getByRole('button', { name: 'Clore définitivement' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Signalement' })).toHaveText(
      'Signalement clos.',
    )
    await expect(
      page
        .getByRole('region', { name: 'Clos ces 30 derniers jours' })
        .getByRole('article')
        .filter({ hasText: TEXTE }),
    ).toContainText(COMMENTAIRE)

    // Une ligne de journal, avec l'écran et la présence d'un commentaire, jamais le commentaire.
    const journal = await journalDe(page, 'signalement_clos', signalementId)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ ecran: 'saisie_evenement', avec_commentaire: true })
    expect(JSON.stringify(journal)).not.toContain(SUFFIXE)

    // Une seconde clôture : refusée par la base, aucune ligne de journal de plus.
    const seconde = await appeler(page, 'clore_signalement', {
      p_signalement_id: signalementId,
      p_commentaire: null,
    })
    expect(seconde.status()).toBe(400)
    expect(((await seconde.json()) as { message: string }).message).toBe(
      'Ce signalement est déjà clos.',
    )
    expect(await journalDe(page, 'signalement_clos', signalementId)).toHaveLength(1)

    // EJP Tech ne signale pas (refus de droit, 42501).
    const signal = await appeler(page, 'signaler_difficulte', {
      p_ecran: 'autre',
      p_texte: `Essai E8 ${SUFFIXE} EJP Tech`,
    })
    expect(signal.status()).toBe(403)
    expect(((await signal.json()) as { code: string }).code).toBe('42501')
  })
})

test.describe('Communication, après la clôture', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('lit « Clos » et la réponse d’EJP Tech', async ({ page }) => {
    await page.goto('/signaler')
    const ligne = page
      .getByRole('region', { name: 'Vos derniers signalements' })
      .getByRole('listitem')
      .filter({ hasText: TEXTE })
    await expect(ligne).toContainText(/Clos le \d{1,2} /)
    await expect(ligne).toContainText(`Réponse d'EJP Tech : ${COMMENTAIRE}`)
    expect(await journalDe(page, 'signalement_clos', signalementId)).toHaveLength(1)
  })
})

for (const profil of ['berger', 'admin_eglise'] as const) {
  test.describe(`profil ${profil}`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('/signaler : la page non disponible ; ni le signalement ni ses lignes de journal', async ({
      page,
    }) => {
      await page.goto('/signaler?ecran=saisie_evenement')
      await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
      expect(await compter(page, `v_signalement?select=id&id=eq.${signalementId}`)).toBe(0)
      expect(await journalDe(page, 'difficulte_signalee', signalementId)).toHaveLength(0)
      expect(await journalDe(page, 'signalement_clos', signalementId)).toHaveLength(0)
    })
  })
}
