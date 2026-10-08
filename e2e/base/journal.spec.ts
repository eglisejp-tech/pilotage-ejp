import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { compter, lire, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Écran 06 « Journal », « Mon journal » et « Journal technique » (lot L5) avec la base locale (job
// « base » de la CI, E2E_BASE=1), en lecture seulement. Les parcours de `e2e/journal.spec.ts`
// passent par l'aperçu, qui rejoue les règles de lecture en JavaScript : ici, c'est la RLS et
// `v_journal` qui décident (migration 20261009120000), et chaque parcours recompte par l'API avec
// le jeton de la page. Les nombres de lignes viennent de la base, jamais d'une valeur écrite ici :
// le jeu d'exemple peut grossir sans casser ces parcours.

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const TAILLE_PAGE = 50

/** Actions qu'une ligne de signalement porte (T39) : le berger et le conseil n'en lisent aucune. */
const SIGNALEMENTS = 'action=in.(difficulte_signalee,signalement_clos)'

/** Libellés des actions que la liste fermée de l'administration ne laisse pas lire (T47, P50, P51). */
const ACTIONS_HORS_ADMINISTRATION = [
  'A signalé une difficulté',
  'A clos un signalement',
  'A saisi les chiffres par département',
  'A ajouté un événement',
  'A mis à jour un événement',
  'A renseigné la prochaine réunion',
  'A créé un point',
  "A changé le statut d'un point",
  'A marqué traité',
]

const lignes = (page: Page) =>
  page.getByRole('list', { name: 'Lignes du journal' }).getByRole('listitem')

const actions = (page: Page) => page.getByRole('combobox', { name: 'Action' }).getByRole('option')

/** Attend que le titre soit là et que la lecture des lignes soit finie (liste ou phrase vide). */
async function attendreLeJournal(page: Page, titre: string, avecLignes: boolean) {
  await expect(page.getByRole('heading', { level: 1, name: titre })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Action' })).toBeVisible()
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  if (avecLignes) await expect(lignes(page).first()).toBeVisible()
}

test.describe('le berger', () => {
  test.use({ storageState: fichierSession('berger') })

  test('/journal : aucune ligne de signalement, 50 lignes puis « Afficher 50 lignes de plus »', async ({
    page,
  }) => {
    await page.goto('/journal?periode=tout')
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveTitle('Journal, Pilotage EJP')
    await attendreLeJournal(page, 'Journal', true)

    // Aucun signalement par l'API, ni dans la liste, ni dans le filtre « Action ».
    expect(await compter(page, `journal?select=id&${SIGNALEMENTS}`)).toBe(0)
    expect(await compter(page, 'journal?select=id&cible=in.(signalement,signalement_suivi)')).toBe(
      0,
    )
    await expect(lignes(page).filter({ hasText: 'A signalé une difficulté' })).toHaveCount(0)
    await expect(lignes(page).filter({ hasText: 'A clos un signalement' })).toHaveCount(0)
    await expect(actions(page).filter({ hasText: 'A signalé une difficulté' })).toHaveCount(0)
    await expect(actions(page).filter({ hasText: 'A clos un signalement' })).toHaveCount(0)

    // Le nombre de lignes lues est celui de la base : 50 d'abord, puis 50 de plus tant qu'il en reste.
    const total = await compter(page, 'v_journal?select=id')
    expect(total).toBeGreaterThan(0)
    await expect(lignes(page)).toHaveCount(Math.min(total, TAILLE_PAGE))
    const plus = page.getByRole('button', { name: 'Afficher 50 lignes de plus' })
    if (total > TAILLE_PAGE) {
      await expect(plus).toBeVisible()
      await plus.click()
      await expect(lignes(page)).toHaveCount(Math.min(total, 2 * TAILLE_PAGE))
      // Les 50 suivantes reprennent après la 50e ligne : ni ligne manquante, ni ligne en double.
    } else {
      await expect(plus).toHaveCount(0)
      await expect(page.getByText(`Toutes les lignes sont affichées (${total}).`)).toBeVisible()
    }
  })

  test('le filtre « Action » se retrouve dans l’adresse et ne garde que cette action', async ({
    page,
  }) => {
    await page.goto('/journal?periode=tout')
    await attendreLeJournal(page, 'Journal', true)
    await page
      .getByRole('combobox', { name: 'Action' })
      .selectOption({ label: 'A saisi des chiffres' })
    await expect(page).toHaveURL(/[?&]action=mesure_saisie(&|$)/)
    const attendues = await compter(page, 'v_journal?select=id&action=eq.mesure_saisie')
    expect(attendues).toBeGreaterThan(0)
    await expect(lignes(page)).toHaveCount(Math.min(attendues, TAILLE_PAGE))
    for (const ligne of await lignes(page).all()) {
      await expect(ligne).toContainText('A saisi des chiffres')
    }
    // Recharger la page garde le choix : il est dans l'adresse.
    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Action' })).toHaveValue('mesure_saisie')
  })
})

test.describe('le ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('/journal : « Mon journal », sans filtre « Compte », que son ministère et son compte', async ({
    page,
  }) => {
    await page.goto('/journal?periode=tout')
    await expect(page).toHaveTitle('Mon journal, Pilotage EJP')
    await attendreLeJournal(page, 'Mon journal', true)
    await expect(page.getByRole('combobox', { name: 'Compte' })).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(2)
    // Il ne déclare aucune session : le filtre ne propose pas ces actions.
    await expect(actions(page).filter({ hasText: 'A déclaré une session' })).toHaveCount(0)

    // Par l'API : toute ligne lue est celle de son ministère, ou écrite par son compte (le seul
    // compte qui apparaisse hors de son ministère).
    const lues = await lire<{ ministere_id: string | null; compte: string | null }>(
      page,
      'journal?select=ministere_id,compte',
    )
    expect(lues.length).toBeGreaterThan(0)
    const horsMinistere = lues.filter((ligne) => ligne.ministere_id !== MINISTERE_COMMUNICATION)
    expect(new Set(horsMinistere.map((ligne) => ligne.compte)).size).toBeLessThanOrEqual(1)
    const total = await compter(page, 'v_journal?select=id')
    await expect(lignes(page)).toHaveCount(Math.min(total, TAILLE_PAGE))
  })
})

test.describe("l'administration de l'église", () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('/journal : ni signalement, ni précision, ni point, ni événement, ni réunion', async ({
    page,
  }) => {
    await page.goto('/journal?periode=tout')
    await attendreLeJournal(page, 'Journal', true)

    // Par l'API, la RLS et la vue ne rendent aucune de ces lignes.
    const horsListe =
      'journal?select=id&or=(action.in.(difficulte_signalee,signalement_clos,fij_statistiques_saisies,' +
      'evenement_ajoute,evenement_modifie,reunion_saisie,point_cree,point_statut,point_traite),' +
      'cible.in.(precision_sensible,signalement,signalement_suivi,point_attention,point_suivi,' +
      'evenement,reunion))'
    expect(await compter(page, horsListe)).toBe(0)
    expect(await compter(page, horsListe.replace('journal?select=id', 'v_journal?select=id'))).toBe(
      0,
    )

    // Le filtre « Action » ne propose que sa liste fermée.
    for (const libelle of ACTIONS_HORS_ADMINISTRATION) {
      await expect(actions(page).filter({ hasText: libelle }), libelle).toHaveCount(0)
    }
    await expect(actions(page).filter({ hasText: 'A saisi des chiffres' })).toHaveCount(1)
    await expect(actions(page).filter({ hasText: 'A déclaré une session' })).toHaveCount(1)

    const total = await compter(page, 'v_journal?select=id')
    await expect(lignes(page)).toHaveCount(Math.min(total, TAILLE_PAGE))
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('/journal-technique : le titre « Journal technique » et les signalements lisibles', async ({
    page,
  }) => {
    await page.goto('/journal-technique?periode=tout')
    await expect(page).toHaveTitle('Journal technique, Pilotage EJP')
    await attendreLeJournal(page, 'Journal technique', false)
    await expect(page.getByRole('combobox', { name: 'Compte' })).toBeVisible()

    // Le filtre « Action » propose les signalements, et la liste en rend autant que la base.
    await expect(actions(page).filter({ hasText: 'A signalé une difficulté' })).toHaveCount(1)
    await expect(actions(page).filter({ hasText: 'A clos un signalement' })).toHaveCount(1)
    await page
      .getByRole('combobox', { name: 'Action' })
      .selectOption({ label: 'A signalé une difficulté' })
    await expect(page).toHaveURL(/[?&]action=difficulte_signalee(&|$)/)
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
    const signalees = await compter(page, 'journal?select=id&action=eq.difficulte_signalee')
    if (signalees === 0) {
      await expect(page.getByText('Aucune ligne pour ces filtres.')).toBeVisible()
    } else {
      await expect(lignes(page)).toHaveCount(Math.min(signalees, TAILLE_PAGE))
      await expect(lignes(page).first()).toContainText('A signalé une difficulté')
    }
  })

  test('/journal : la page non disponible (son journal est /journal-technique)', async ({
    page,
  }) => {
    await page.goto('/journal')
    await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Lignes du journal' })).toHaveCount(0)
  })
})

test.describe('adresses réservées', () => {
  test.use({ storageState: fichierSession('berger') })

  test('le berger sur /journal-technique : la page non disponible', async ({ page }) => {
    await page.goto('/journal-technique')
    await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Lignes du journal' })).toHaveCount(0)
  })
})
