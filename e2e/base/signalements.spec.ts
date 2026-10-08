import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import { compter, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Signalements (lot E8, T39) avec la base locale (job « e2e » de la CI, E2E_BASE=1), en lecture
// seulement : rien n'est envoyé ici (les envois et la clôture sont dans
// `signalements.ecriture.spec.ts`, projet « ecritures »). Jeu d'exemple (seed/43) : deux
// signalements de Communication, un ouvert (saisie d'un événement) et un clos avec un commentaire
// d'EJP Tech. Seuls le ministère auteur et EJP Tech les lisent ; le berger, le conseil et
// l'administration n'ont ni la page, ni le bloc, ni aucune ligne.

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const TEXTE_OUVERT =
  "Le formulaire refuse la date de notre soirée de louange, alors qu'elle est bien à venir."
const TEXTE_CLOS = 'Le bouton Envoyer reste grisé après la saisie des STARs au service.'
const COMMENTAIRE_CLOS = 'Réglé avec le ministère : le champ attendait un nombre entier.'

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('/signaler : écran prérempli, qui lit, rappel, et ses deux signalements sous le formulaire', async ({
    page,
  }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto('/signaler?ecran=saisie_evenement')
    await expect(page).toHaveTitle('Signaler une difficulté, Pilotage EJP')
    await expect(page.getByText('Écran concerné : Ajouter un événement')).toBeVisible()
    await expect(page.getByText(/^EJP Tech lit votre signalement\./)).toBeVisible()
    await expect(
      page.getByLabel('Quelle difficulté rencontrez-vous ?'),
    ).toHaveAccessibleDescription(
      "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech. 0 sur 280",
    )
    const liste = page.getByRole('region', { name: 'Vos derniers signalements' })
    await expect(liste.getByRole('listitem').filter({ hasText: TEXTE_OUVERT })).toContainText(
      'Ouvert',
    )
    const clos = liste.getByRole('listitem').filter({ hasText: TEXTE_CLOS })
    await expect(clos).toContainText(/Clos le \d{1,2} [a-zéû]+\.?/)
    await expect(clos).toContainText(`Réponse d'EJP Tech : ${COMMENTAIRE_CLOS}`)
    // Seules la ligne du compte et la vue des signalements sont lues.
    expect(new Set(requetes)).toEqual(new Set(['/rest/v1/compte', '/rest/v1/v_signalement']))
  })

  test('un code d’écran inconnu devient « Autre écran »', async ({ page }) => {
    await page.goto('/signaler?ecran=nimportequoi')
    await expect(page.getByText('Écran concerné : Autre écran')).toBeVisible()
  })

  test('/moderation : la page non disponible, aucune lecture de signalement', async ({ page }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto('/moderation')
    await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('/moderation : le bloc en tête, l’ouvert de Communication avec « Clore le signalement », puis le clos', async ({
    page,
  }) => {
    await page.goto('/moderation')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modération')
    await attendreLaFinDuChargement(page)
    const bloc = page.getByRole('region', { name: 'Signalements', exact: true })
    await expect(bloc.getByText(/^\d+ signalements? ouverts?$/)).toBeVisible()
    const ouvert = bloc.getByRole('article').filter({ hasText: TEXTE_OUVERT })
    await expect(ouvert).toContainText('Communication')
    await expect(ouvert).toContainText(/Ajouter un événement, \d{1,2} /)
    await expect(ouvert.getByRole('button', { name: 'Clore le signalement' })).toBeVisible()
    const clos = page.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    await expect(clos.getByRole('article').filter({ hasText: TEXTE_CLOS })).toContainText(
      COMMENTAIRE_CLOS,
    )
    // Un signalement clos ne se clôt plus ; seul « Masquer le texte » (lot L6) y reste possible.
    await expect(clos.getByRole('button', { name: 'Clore le signalement' })).toHaveCount(0)
  })

  test('/signaler : la page non disponible (EJP Tech ne signale pas)', async ({ page }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto('/signaler?ecran=saisie_evenement')
    await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Envoyer le signalement' })).toHaveCount(0)
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })
})

// Le berger, le conseil et l'administration : ni la page, ni le bloc, sans aucune requête de
// données ; par l'API, aucune ligne de signalement ni de journal des signalements.
for (const compte of COMPTES_PROFILS.filter((profil) =>
  ['berger', 'conseil', 'admin_eglise'].includes(profil.profil),
)) {
  test.describe(`profil ${compte.profil}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('/signaler et /moderation : la page non disponible, sans requête', async ({ page }) => {
      const requetes = suivreRequetesDeDonnees(page)
      for (const adresse of ['/signaler?ecran=saisie_evenement', '/signaler', '/moderation']) {
        await page.goto(adresse)
        await expect(
          page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
          adresse,
        ).toBeVisible()
        await expect(page.getByRole('main').getByText(/signalement/i)).toHaveCount(0)
      }
      expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
    })

    test('par l’API : aucun signalement, aucune clôture, aucune ligne de journal des signalements', async ({
      page,
    }) => {
      await page.goto('/')
      expect(await compter(page, 'v_signalement?select=id')).toBe(0)
      expect(await compter(page, 'signalement?select=id')).toBe(0)
      expect(await compter(page, 'signalement_suivi?select=id')).toBe(0)
      expect(
        await compter(
          page,
          `journal?select=id&action=in.(difficulte_signalee,signalement_clos)&ministere_id=eq.${MINISTERE_COMMUNICATION}`,
        ),
      ).toBe(0)
    })
  })
}
