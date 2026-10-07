import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { AVEC_BASE, fichierSession, seConnecter } from './comptes.ts'
import { appeler, lire, MINISTERE_COMMUNICATION } from './base/outils-evenements.ts'

// Points d'attention (étape 5, lot P1) qui écrivent dans la base locale : projet « ecritures » (en
// série, à 1440 px, après les projets de lecture). Communication crée des points par l'API (le
// formulaire « Nouveau point » est celui du lot P2), un mentionnant Intégration. Un ministère
// mentionné marque le point traité avec un commentaire, un autre ministère ne le voit pas et la
// base lui refuse toute action, le créateur lit « Traité le ... par Intégration ». Le berger
// marque un point traité avec un commentaire, un autre sans. Une ligne de journal par écriture,
// sans le texte.
//
// Ce fichier est à la racine de `e2e/` (plan des étapes 5 à 8, P1) : sans base (E2E_BASE absent), il
// ne fait rien. Le lot P2 y ajoute le parcours de création à sa fusion.
//
// Deux familles de tests :
// - les parcours de la base (droits, journal, refus) tournent toujours, par l'API ;
// - les parcours de l'interface (boutons posés sur « Points d'attention » et « Mes points », lots
//   P3 et P4) sont marqués `test.fixme` tant que `ECRANS_POSES` est faux : ils apparaissent comme
//   ignorés dans le rapport Playwright au lieu de passer pour verts. Le lot qui fusionne P3 et P4
//   passe `ECRANS_POSES` à vrai, adapte au besoin `ouvrirTraites` à la forme des onglets de
//   l'écran 05, et vérifie que ces tests passent.
const ECRANS_POSES = false
const RAISON_ECRANS = 'Écran 05 et pose des boutons (lots P3 et P4) non fusionnés'

test.skip(!AVEC_BASE, 'Parcours avec la base locale (E2E_BASE=1)')
test.describe.configure({ mode: 'serial' })

// Le suffixe s'écrit en lettres : 5 chiffres de suite tombent dans la famille « données
// personnelles » de `private.verifier_texte`, et la base refuserait le texte.
const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const TITRE_A = `Essai P1 ${SUFFIXE} salle`
const TITRE_B = `Essai P1 ${SUFFIXE} micros`
const TITRE_E = `Essai P1 ${SUFFIXE} sonorisation`
const TITRE_C = `Essai P1 ${SUFFIXE} projecteur`
const TITRE_D = `Essai P1 ${SUFFIXE} chaises`
const COMMENTAIRE = `Essai P1 ${SUFFIXE} : salle confirmée avec le propriétaire.`
const COMMENTAIRE_UI = `Essai P1 ${SUFFIXE} : projecteur prêté par Intégration.`
const COURT = 'Trop vite'
const COMMENTAIRE_BERGER = `Essai P1 ${SUFFIXE} : vu en réunion.`
const REFUS_ACCES = "Ce point n'existe pas ou vous n'y avez pas accès."

type LignePoint = { id: string; statut: string; traite_commentaire: string | null }
type LigneJournal = { id: number; detail: Record<string, unknown> | null }

let pointA = ''
let pointB = ''
let pointE = ''
let pointC = ''
let pointD = ''

const pointDe = (page: Page, id: string) =>
  lire<LignePoint>(page, `v_point?select=id,statut,traite_commentaire&id=eq.${id}`)

const journalDe = (page: Page, action: string, id: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,detail&action=eq.${action}&cible=eq.point_attention&cible_id=eq.${id}`,
  )

const boutonDuPoint = (page: Page, nom: string, titre: string) =>
  page.getByRole('button', { name: nom, description: titre })

/** « Traités » de l'écran 05 : l'onglet peut être un onglet, un lien ou un bouton. */
async function ouvrirTraites(page: Page) {
  await page
    .getByRole('tab', { name: /^Traités/ })
    .or(page.getByRole('link', { name: /^Traités/ }))
    .or(page.getByRole('button', { name: /^Traités/ }))
    .first()
    .click()
}

/** Crée un point par l'API du compte de la page et rend son identifiant. */
async function creerPoint(page: Page, titre: string, mentions: string[]): Promise<string> {
  const reponse = await appeler(page, 'creer_point', {
    p_titre: titre,
    p_description: 'Point créé par le parcours de test du lot P1.',
    p_action_attendue: 'Une réponse',
    p_priorite: 'normale',
    p_echeance: null,
    p_mentions: mentions,
  })
  expect(reponse.status()).toBe(200)
  return (await reponse.json()) as string
}

test.describe('Communication crée ses points et change le statut', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('trois points créés : « À traiter », une ligne de journal chacun', async ({ page }) => {
    await page.goto('/')
    const [integration] = await lire<{ id: string }>(page, 'ministere?select=id&nom=eq.Intégration')
    expect(integration).toBeDefined()
    pointA = await creerPoint(page, TITRE_A, [integration?.id ?? ''])
    pointB = await creerPoint(page, TITRE_B, [])
    pointE = await creerPoint(page, TITRE_E, [])
    expect((await pointDe(page, pointA))[0]?.statut).toBe('a_traiter')
    expect((await pointDe(page, pointB))[0]?.statut).toBe('a_traiter')
    expect((await pointDe(page, pointE))[0]?.statut).toBe('a_traiter')
    expect(await journalDe(page, 'point_cree', pointA)).toHaveLength(1)
  })

  test('« Changer le statut » (API) : En cours, une ligne de journal avec les deux statuts', async ({
    page,
  }) => {
    expect(pointA).not.toBe('')
    await page.goto('/')
    const reponse = await appeler(page, 'changer_statut_point', {
      p_point_id: pointA,
      p_statut: 'en_cours',
    })
    expect(reponse.status()).toBe(204)
    expect((await pointDe(page, pointA))[0]?.statut).toBe('en_cours')
    const journal = await journalDe(page, 'point_statut', pointA)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ statut: ['a_traiter', 'en_cours'] })
  })
})

test.describe('Intégration, mentionné', () => {
  test('voit le point, refuse un commentaire de 9 caractères, le marque traité avec un commentaire', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    expect(pointA).not.toBe('')
    await seConnecter(page, 'integration@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect(await pointDe(page, pointA)).toHaveLength(1)
    // Le point B ne le mentionne pas : il ne le voit pas.
    expect(await pointDe(page, pointB)).toHaveLength(0)

    // La base refuse un commentaire de 9 caractères et ne change rien.
    const refus = await appeler(page, 'marquer_traite', {
      p_point_id: pointA,
      p_commentaire: COURT,
    })
    expect(refus.status()).toBe(400)
    expect(await refus.json()).toMatchObject({
      message: 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
    })
    expect((await pointDe(page, pointA))[0]?.statut).toBe('en_cours')

    const reponse = await appeler(page, 'marquer_traite', {
      p_point_id: pointA,
      p_commentaire: COMMENTAIRE,
    })
    expect(reponse.status()).toBe(204)

    const [traite] = await pointDe(page, pointA)
    expect(traite).toMatchObject({ statut: 'traite', traite_commentaire: COMMENTAIRE })
    const journal = await journalDe(page, 'point_traite', pointA)
    expect(journal).toHaveLength(1)
    // La ligne de journal dit qu'il y a un commentaire, jamais le commentaire.
    expect(journal[0]?.detail).toEqual({ avec_commentaire: true })
    expect(JSON.stringify(journal)).not.toContain(SUFFIXE)

    // Un point traité ne se rouvre pas : le statut et un second traitement sont refusés.
    const statut = await appeler(page, 'changer_statut_point', {
      p_point_id: pointA,
      p_statut: 'a_traiter',
    })
    expect(statut.status()).toBe(400)
    expect(await statut.json()).toMatchObject({
      message: 'Ce point est traité : il ne change plus.',
    })
    const encore = await appeler(page, 'marquer_traite', {
      p_point_id: pointA,
      p_commentaire: COMMENTAIRE,
    })
    expect(encore.status()).toBe(400)
    expect(await encore.json()).toMatchObject({ message: 'Ce point est déjà traité.' })
    expect(await journalDe(page, 'point_traite', pointA)).toHaveLength(1)
  })
})

test.describe('un autre ministère (Jeunesse)', () => {
  test('ne voit pas le point, et la base lui refuse toute action', async ({ page }) => {
    test.setTimeout(120_000)
    expect(pointA).not.toBe('')
    await seConnecter(page, 'jeunesse@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect(await pointDe(page, pointA)).toHaveLength(0)
    expect(await pointDe(page, pointB)).toHaveLength(0)
    expect(await journalDe(page, 'point_traite', pointA)).toHaveLength(0)

    const traite = await appeler(page, 'marquer_traite', {
      p_point_id: pointB,
      p_commentaire: COMMENTAIRE,
    })
    expect(traite.status()).toBe(403)
    expect(await traite.json()).toMatchObject({ code: '42501', message: REFUS_ACCES })
    const statut = await appeler(page, 'changer_statut_point', {
      p_point_id: pointB,
      p_statut: 'en_cours',
    })
    expect(statut.status()).toBe(403)
  })
})

test.describe('Communication relit le traitement', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('le traitement est attribué à un compte du ministère Intégration', async ({ page }) => {
    expect(pointA).not.toBe('')
    await page.goto('/')
    const [point] = await lire<{ traite_par: string; ministere_id: string }>(
      page,
      `v_point?select=traite_par,ministere_id&id=eq.${pointA}`,
    )
    expect(point?.ministere_id).toBe(MINISTERE_COMMUNICATION)
    // L'auteur du traitement est un compte du ministère Intégration.
    const [auteur] = await lire<{ ministere_id: string | null }>(
      page,
      `compte?select=ministere_id&user_id=eq.${point?.traite_par ?? ''}`,
    )
    const [integration] = await lire<{ id: string }>(page, 'ministere?select=id&nom=eq.Intégration')
    expect(auteur?.ministere_id).toBe(integration?.id)
  })
})

test.describe('le berger', () => {
  test.use({ storageState: fichierSession('berger') })

  test('marque un point traité avec un commentaire facultatif : « Marquer traité » seulement, une ligne de journal', async ({
    page,
  }) => {
    expect(pointB).not.toBe('')
    await page.goto('/')
    // Le berger ne change jamais le statut d'un point : la base le refuse.
    const statut = await appeler(page, 'changer_statut_point', {
      p_point_id: pointB,
      p_statut: 'en_cours',
    })
    expect(statut.status()).toBe(403)
    const traite = await appeler(page, 'marquer_traite', {
      p_point_id: pointB,
      p_commentaire: COMMENTAIRE_BERGER,
    })
    expect(traite.status()).toBe(204)
    expect((await pointDe(page, pointB))[0]).toMatchObject({
      statut: 'traite',
      traite_commentaire: COMMENTAIRE_BERGER,
    })
    const journal = await journalDe(page, 'point_traite', pointB)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ avec_commentaire: true })
  })

  test('marque un point traité sans commentaire : aucun commentaire, journal « avec_commentaire » faux', async ({
    page,
  }) => {
    expect(pointE).not.toBe('')
    await page.goto('/')
    const traite = await appeler(page, 'marquer_traite', {
      p_point_id: pointE,
      p_commentaire: null,
    })
    expect(traite.status()).toBe(204)
    expect((await pointDe(page, pointE))[0]).toMatchObject({
      statut: 'traite',
      traite_commentaire: null,
    })
    const journal = await journalDe(page, 'point_traite', pointE)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ avec_commentaire: false })
  })
})

// Parcours de l'interface : ignorés (test.fixme) tant que l'écran 05 et les boutons ne sont pas
// posés. Deux nouveaux points, pour ne pas dépendre de ceux des parcours de la base.
test.describe('interface : écran 05 et boutons posés (P3 et P4)', () => {
  test.describe('Communication change le statut', () => {
    test.use({ storageState: fichierSession('ministere') })

    test('« Changer le statut » : En cours, message, une ligne de journal avec les deux statuts', async ({
      page,
    }) => {
      test.fixme(!ECRANS_POSES, RAISON_ECRANS)
      await page.goto('/')
      const [integration] = await lire<{ id: string }>(
        page,
        'ministere?select=id&nom=eq.Intégration',
      )
      pointC = await creerPoint(page, TITRE_C, [integration?.id ?? ''])
      pointD = await creerPoint(page, TITRE_D, [])

      await page.goto('/points')
      await boutonDuPoint(page, 'Changer le statut', TITRE_C).click()
      await page.getByRole('radio', { name: 'En cours' }).check()
      await page.getByRole('button', { name: 'Enregistrer le statut' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Statut' })).toHaveText(
        'Statut enregistré : En cours.',
      )
      expect((await pointDe(page, pointC))[0]?.statut).toBe('en_cours')
      const journal = await journalDe(page, 'point_statut', pointC)
      expect(journal).toHaveLength(1)
      expect(journal[0]?.detail).toEqual({ statut: ['a_traiter', 'en_cours'] })
    })
  })

  test('Intégration, mentionné : voit le point, le marque traité depuis la fenêtre, le focus ne tombe pas sur le corps', async ({
    page,
  }) => {
    test.fixme(!ECRANS_POSES, RAISON_ECRANS)
    test.setTimeout(120_000)
    await seConnecter(page, 'integration@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await page.goto('/points')
    await expect(page.getByText(TITRE_C)).toBeVisible()
    await expect(page.getByText(TITRE_D)).toHaveCount(0)
    await boutonDuPoint(page, 'Marquer traité', TITRE_C).click()
    const fenetre = page.getByRole('dialog', { name: 'Marquer traité' })
    await fenetre.getByLabel('Ce qui a été traité, et comment').fill(COURT)
    await fenetre.getByRole('button', { name: 'Marquer traité' }).click()
    await expect(
      fenetre.getByText('Expliquez ce qui a été traité et comment (10 caractères au moins).'),
    ).toBeVisible()
    await fenetre.getByLabel('Ce qui a été traité, et comment').fill(COMMENTAIRE_UI)
    await fenetre.getByRole('button', { name: 'Marquer traité' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Point' })).toHaveText(
      'Point marqué traité.',
    )
    await expect(boutonDuPoint(page, 'Marquer traité', TITRE_C)).toHaveCount(0)
    // Le bouton a disparu : le focus ne tombe pas sur le corps de la page.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName ?? 'BODY'))
      .not.toBe('BODY')
    expect((await pointDe(page, pointC))[0]).toMatchObject({
      statut: 'traite',
      traite_commentaire: COMMENTAIRE_UI,
    })
  })

  test('Jeunesse : ne voit aucun des deux points', async ({ page }) => {
    test.fixme(!ECRANS_POSES, RAISON_ECRANS)
    test.setTimeout(120_000)
    await seConnecter(page, 'jeunesse@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await page.goto('/points')
    await expect(page.getByText(TITRE_C)).toHaveCount(0)
    await expect(page.getByText(TITRE_D)).toHaveCount(0)
  })

  test.describe('Communication relit le traitement', () => {
    test.use({ storageState: fichierSession('ministere') })

    test('« Traité le ... par Intégration » avec le commentaire', async ({ page }) => {
      test.fixme(!ECRANS_POSES, RAISON_ECRANS)
      await page.goto('/points')
      await ouvrirTraites(page)
      await expect(page.getByText(TITRE_C)).toBeVisible()
      await expect(page.getByText(/Traité le .+ par Intégration/)).toBeVisible()
      await expect(page.getByText(COMMENTAIRE_UI)).toBeVisible()
    })
  })

  test.describe('le berger', () => {
    test.use({ storageState: fichierSession('berger') })

    test('marque un point traité sans écrire de commentaire : aucun « Changer le statut »', async ({
      page,
    }) => {
      test.fixme(!ECRANS_POSES, RAISON_ECRANS)
      await page.goto('/points')
      await expect(boutonDuPoint(page, 'Changer le statut', TITRE_D)).toHaveCount(0)
      await boutonDuPoint(page, 'Marquer traité', TITRE_D).click()
      await page
        .getByRole('dialog', { name: 'Marquer traité' })
        .getByRole('button', { name: 'Marquer traité' })
        .click()
      await expect(page.getByRole('status').filter({ hasText: 'Point' })).toHaveText(
        'Point marqué traité.',
      )
      expect((await pointDe(page, pointD))[0]).toMatchObject({
        statut: 'traite',
        traite_commentaire: null,
      })
    })
  })
})
