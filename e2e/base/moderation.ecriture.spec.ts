import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { appeler, compter, lire, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Écran 15, « Modération » (lot L6) avec la base locale : projet « ecritures » (en série, à
// 1440 px, après les projets de lecture). Communication écrit deux points et un signalement
// (textes suffixés, en lettres : 5 chiffres de suite tomberaient dans la famille « données
// personnelles » de la base) ; EJP Tech relit le premier, masque le titre du second par la
// fenêtre, puis le texte du signalement par le bloc « Signalements » ; le texte masqué s'affiche
// « [texte masqué par EJP Tech] » chez Communication. Les autres profils reçoivent la page non
// disponible, une file vide et un refus de la base (42501). Le journal reçoit une ligne par
// décision, avec le champ et le motif, jamais le texte.

const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const TITRE_RELU = `Essai L6 relu ${SUFFIXE}`
const TITRE_MASQUE = `Essai L6 masque ${SUFFIXE}`
const DESCRIPTION = `Description du point masque ${SUFFIXE}.`
const SIGNALEMENT = `Essai L6 ${SUFFIXE} : le bouton reste grisé.`
const TEXTE_MASQUE = '[texte masqué par EJP Tech]'
const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

test.describe.configure({ mode: 'serial' })

type LigneFile = { cible: string; cible_id: string; etat: string; motif: string | null }
type LigneJournal = { id: number; detail: Record<string, unknown> | null }

let pointRelu = ''
let pointMasque = ''
let signalementId = ''

/** La ligne de la file d'un texte, lue sous la RLS du compte de la page. */
const dansLaFile = (page: Page, id: string) =>
  lire<LigneFile>(page, `v_textes_a_relire?select=cible,cible_id,etat,motif&cible_id=eq.${id}`)

/** Les lignes de journal d'une décision sur un texte. */
const journalDe = (page: Page, action: string, cible: string, id: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,detail&action=eq.${action}&cible=eq.${cible}&cible_id=eq.${id}`,
  )

const file = (page: Page) => page.getByRole('region', { name: 'Champs libres à relire' })
const fenetre = (page: Page) => page.getByRole('dialog', { name: 'Masquer le texte' })

test.describe('Communication écrit ses textes', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('deux points et un signalement : tous les trois à relire ou ouverts, seulement pour EJP Tech', async ({
    page,
  }) => {
    await page.goto('/saisir/point')
    const creer = async (titre: string, description: string | null) => {
      const reponse = await appeler(page, 'creer_point', {
        p_titre: titre,
        p_description: description,
        p_action_attendue: null,
        p_priorite: 'normale',
        p_echeance: null,
        p_mentions: [],
      })
      expect(reponse.status(), titre).toBeLessThan(300)
      return (await reponse.json()) as string
    }
    pointRelu = await creer(TITRE_RELU, null)
    pointMasque = await creer(TITRE_MASQUE, DESCRIPTION)
    const signal = await appeler(page, 'signaler_difficulte', {
      p_ecran: 'autre',
      p_texte: SIGNALEMENT,
    })
    expect(signal.status()).toBeLessThan(300)
    signalementId = (await signal.json()) as string

    // Le ministère auteur ne lit pas la file de modération.
    expect(await compter(page, `v_textes_a_relire?select=cible_id&cible_id=eq.${pointRelu}`)).toBe(
      0,
    )
    // Ni ne relit, ni ne masque : refus de droit.
    const relu = await appeler(page, 'marquer_relu', {
      p_cible: 'point_attention',
      p_cible_id: pointRelu,
    })
    expect(relu.status()).toBe(403)
    expect(((await relu.json()) as { code: string }).code).toBe('42501')
    const masque = await appeler(page, 'masquer_texte', {
      p_cible: 'point_attention',
      p_cible_id: pointRelu,
      p_champ: 'titre',
      p_motif: 'autre',
    })
    expect(masque.status()).toBe(403)
    await page.goto('/moderation')
    await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
  })
})

test.describe('EJP Tech relit et masque', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('l’écran : en-tête des indicateurs, bloc « Signalements », file avec les deux points', async ({
    page,
  }) => {
    expect(pointRelu).not.toBe('')
    await page.goto('/moderation')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modération')
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
    await expect(file(page).getByRole('heading', { level: 2 })).toBeVisible()
    await expect(file(page).getByText(/\d+ textes? en attente/)).toBeVisible()
    const ligneRelu = file(page).getByRole('article').filter({ hasText: TITRE_RELU })
    await expect(ligneRelu).toContainText("Point d'attention, Communication")
    await expect(ligneRelu.getByRole('button', { name: 'Rien à signaler' })).toBeVisible()
    const ligneMasque = file(page).getByRole('article').filter({ hasText: TITRE_MASQUE })
    await expect(ligneMasque).toContainText(DESCRIPTION)
    // La file ne porte aucune valeur chiffrée : ses colonnes sont celles de la vue.
    const lignes = await dansLaFile(page, pointRelu)
    expect(lignes).toEqual([
      expect.objectContaining({ cible: 'point_attention', cible_id: pointRelu, etat: 'a_relire' }),
    ])
  })

  test('« Rien à signaler » : la ligne passe à « Relu », une ligne de journal sans texte, pas de seconde relecture', async ({
    page,
  }) => {
    await page.goto('/moderation')
    const ligne = file(page).getByRole('article').filter({ hasText: TITRE_RELU })
    await ligne.getByRole('button', { name: 'Rien à signaler' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'relu' })).toHaveText(
      'Texte marqué comme relu.',
    )
    await expect(ligne).toContainText(/Relu le \d{1,2} \S+ : rien à signaler/)
    expect((await dansLaFile(page, pointRelu))[0]?.etat).toBe('relu')
    const journal = await journalDe(page, 'texte_relu', 'point_attention', pointRelu)
    expect(journal).toHaveLength(1)
    expect(JSON.stringify(journal)).not.toContain(SUFFIXE)
    // Un texte relu garde « Masquer le texte » (une donnée personnelle peut être signalée après).
    await expect(ligne.getByRole('button', { name: 'Masquer le texte' })).toBeVisible()
    await expect(ligne.getByRole('button', { name: 'Rien à signaler' })).toHaveCount(0)

    const encore = await appeler(page, 'marquer_relu', {
      p_cible: 'point_attention',
      p_cible_id: pointRelu,
    })
    expect(encore.status()).toBe(400)
    expect(((await encore.json()) as { message: string }).message).toBe('Ce texte a déjà été relu.')
    expect(await journalDe(page, 'texte_relu', 'point_attention', pointRelu)).toHaveLength(1)
  })

  test('« Masquer le texte » sur le titre d’un point : le titre devient le texte masqué, le reste du point demeure', async ({
    page,
  }) => {
    await page.goto('/moderation')
    const ligne = file(page).getByRole('article').filter({ hasText: TITRE_MASQUE })
    await ligne.getByRole('button', { name: 'Masquer le texte' }).click()
    const boite = fenetre(page)
    await boite.getByRole('radio', { name: /^Titre/ }).check()
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(boite.getByText('Choisissez un motif dans la liste.')).toBeVisible()
    await boite.getByRole('radio', { name: "Nom d'une personne" }).check()
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(fenetre(page)).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'masqué' })).toHaveText('Texte masqué.')

    // La ligne est retrouvée par sa description, qui reste lisible.
    const apres = file(page).getByRole('article').filter({ hasText: DESCRIPTION })
    await expect(apres).toContainText(TEXTE_MASQUE)
    await expect(apres).not.toContainText(TITRE_MASQUE)
    await expect(apres).toContainText(/Masqué le \d{1,2} \S+ : nom d'une personne/)
    expect((await dansLaFile(page, pointMasque))[0]).toMatchObject({
      etat: 'masque',
      motif: 'nom_personne',
    })
    const [point] = await lire<{ titre: string; description: string }>(
      page,
      `v_point?select=titre,description&id=eq.${pointMasque}`,
    )
    expect(point).toEqual({ titre: TEXTE_MASQUE, description: DESCRIPTION })

    // Une ligne de journal : le champ et le motif, jamais le texte.
    const journal = await journalDe(page, 'texte_masque', 'point_attention', pointMasque)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ champ: 'titre', motif: 'nom_personne' })
    expect(JSON.stringify(journal)).not.toContain(SUFFIXE)
    // La description reste à masquer : le bouton demeure, « Rien à signaler » a disparu.
    await expect(apres.getByRole('button', { name: 'Masquer le texte' })).toBeVisible()
    await expect(apres.getByRole('button', { name: 'Rien à signaler' })).toHaveCount(0)
  })

  test('« Masquer le texte » dans le bloc « Signalements » : le texte du signalement est remplacé', async ({
    page,
  }) => {
    await page.goto('/moderation')
    const bloc = page.getByRole('region', { name: 'Signalements', exact: true })
    const ligne = bloc.getByRole('article').filter({ hasText: SIGNALEMENT })
    await expect(ligne).toContainText('Communication')
    await ligne.getByRole('button', { name: 'Masquer le texte' }).click()
    await fenetre(page).getByRole('radio', { name: 'Autre information personnelle' }).check()
    await fenetre(page).getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'masqué' })).toHaveText('Texte masqué.')
    await expect(bloc).not.toContainText(SIGNALEMENT)

    const [lu] = await lire<{ texte: string; ouvert: boolean }>(
      page,
      `v_signalement?select=texte,ouvert&id=eq.${signalementId}`,
    )
    expect(lu).toEqual({ texte: TEXTE_MASQUE, ouvert: true })
    const journal = await journalDe(page, 'texte_masque', 'signalement', signalementId)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ champ: 'texte', motif: 'autre' })
    expect(JSON.stringify(journal)).not.toContain(SUFFIXE)
    // Le focus est revenu au titre du bloc (le bouton a disparu avec le texte à masquer).
    await expect(bloc.getByRole('heading', { level: 2, name: 'Signalements' })).toBeFocused()
  })
})

test.describe('Communication relit ses textes', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('le titre masqué et le signalement masqué s’affichent « [texte masqué par EJP Tech] »', async ({
    page,
  }) => {
    // Sur /points : l'article du point d'essai (trouvé par sa description) porte le texte masqué.
    await page.goto('/points')
    const surPoints = page.getByRole('article').filter({ hasText: DESCRIPTION })
    await expect(surPoints).toContainText(TEXTE_MASQUE)
    await expect(surPoints).not.toContainText(TITRE_MASQUE)
    await expect(page.getByText(TITRE_MASQUE)).toHaveCount(0)
    await expect(page.getByText(TITRE_RELU).first()).toBeVisible()

    // Sur la fiche : même article, le texte masqué en `--encre-3` (classe `text-encre-3`).
    await page.goto('/ma-fiche')
    const surFiche = page.getByRole('article').filter({ hasText: DESCRIPTION })
    await expect(surFiche).toContainText(TEXTE_MASQUE)
    await expect(surFiche).not.toContainText(TITRE_MASQUE)
    await expect(surFiche.locator('.text-encre-3', { hasText: TEXTE_MASQUE })).toBeVisible()

    await page.goto('/signaler')
    const liste = page.getByRole('region', { name: 'Vos derniers signalements' })
    await expect(liste.getByText(TEXTE_MASQUE).first()).toBeVisible()
    await expect(liste).not.toContainText(SIGNALEMENT)
    const [lu] = await lire<{ ministere_id: string; texte: string }>(
      page,
      `v_signalement?select=ministere_id,texte&id=eq.${signalementId}`,
    )
    expect(lu).toEqual({ ministere_id: MINISTERE_COMMUNICATION, texte: TEXTE_MASQUE })
  })
})

test.describe('Le berger lit la fiche de Communication', () => {
  test.use({ storageState: fichierSession('berger') })

  test('le titre masqué s’affiche « [texte masqué par EJP Tech] » sur la fiche du ministère', async ({
    page,
  }) => {
    await page.goto(`/ministeres/${MINISTERE_COMMUNICATION}`)
    const article = page.getByRole('article').filter({ hasText: DESCRIPTION })
    await expect(article).toContainText(TEXTE_MASQUE)
    await expect(article).not.toContainText(TITRE_MASQUE)
    await expect(article.locator('.text-encre-3', { hasText: TEXTE_MASQUE })).toBeVisible()
  })
})

for (const profil of ['berger', 'conseil', 'admin_eglise'] as const) {
  test.describe(`profil ${profil}`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('/moderation : la page non disponible ; ni la file, ni les décisions de modération', async ({
      page,
    }) => {
      await page.goto('/moderation')
      await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
      await expect(page.getByText(/Champs libres à relire/)).toHaveCount(0)
      expect(await dansLaFile(page, pointMasque)).toHaveLength(0)
      const relu = await appeler(page, 'marquer_relu', {
        p_cible: 'point_attention',
        p_cible_id: pointMasque,
      })
      expect(relu.status()).toBe(403)
      const masque = await appeler(page, 'masquer_texte', {
        p_cible: 'point_attention',
        p_cible_id: pointMasque,
        p_champ: 'description',
        p_motif: 'autre',
      })
      expect(masque.status()).toBe(403)
      expect(((await masque.json()) as { code: string }).code).toBe('42501')
      // Rien n'a changé : la description du point reste celle du ministère.
      if (profil !== 'admin_eglise') {
        const [point] = await lire<{ description: string }>(
          page,
          `v_point?select=description&id=eq.${pointMasque}`,
        )
        expect(point?.description).toBe(DESCRIPTION)
      }
    })
  })
}
