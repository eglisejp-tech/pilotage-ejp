import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import { compter, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Signalements (lot E8, T39) et leur suivi (T77) avec la base locale (job « e2e » de la CI,
// E2E_BASE=1), en lecture seulement : rien n'est envoyé ici (les gestes sont dans
// `signalements.ecriture.spec.ts`, projet « ecritures »). Jeu d'exemple (seed/43) : deux
// signalements de Communication, un Reçu (saisie d'un événement) et un clos par EJP Tech avec sa
// réponse, plus un signalement par statut pour d'autres ministères. Seuls le ministère auteur et
// EJP Tech les lisent ; le berger, le conseil et l'administration n'ont ni les pages, ni le bloc,
// ni aucune ligne.

const PAGE_NON_DISPONIBLE = 'Page non disponible'
const TEXTE_OUVERT =
  "Le formulaire refuse la date de notre soirée de louange, alors qu'elle est bien à venir."
const TEXTE_CLOS = 'Le bouton Envoyer reste grisé après la saisie des STARs au service.'
const COMMENTAIRE_CLOS = 'Réglé avec le ministère, le champ attendait un nombre entier.'

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('/signaler : écran prérempli, rappel, et le seul lien « Voir mes signalements »', async ({
    page,
  }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto('/signaler?ecran=saisie_evenement')
    await expect(page).toHaveTitle('Signaler une difficulté, Pilotage EJP')
    await expect(page.getByText('Écran concerné : Ajouter un événement')).toBeVisible()
    // Le libellé suffit : plus de phrase sur qui lit (T66, t149).
    await expect(page.getByText(/lit votre signalement/)).toHaveCount(0)
    await expect(
      page.getByLabel('Quelle difficulté rencontrez-vous ?'),
    ).toHaveAccessibleDescription("N'écrivez aucun nom ni information personnelle. 0 sur 280")
    await expect(page.getByRole('link', { name: 'Voir mes signalements' })).toHaveAttribute(
      'href',
      '/signalements',
    )
    await expect(page.getByRole('heading', { name: 'Vos derniers signalements' })).toHaveCount(0)
    // Le formulaire ne lit rien : seule la ligne du compte.
    expect(new Set(requetes)).toEqual(new Set(['/rest/v1/compte']))
  })

  test('/signalements : le Reçu dans « En cours », le clos avec la réponse d’EJP Tech', async ({
    page,
  }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto('/signalements')
    await expect(page).toHaveTitle('Mes signalements, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes signalements')
    await attendreLaFinDuChargement(page)
    const enCours = page.getByRole('region', { name: 'En cours', exact: true })
    const ouvert = enCours.getByRole('article').filter({ hasText: TEXTE_OUVERT })
    await expect(ouvert).toContainText('Reçu')
    await expect(ouvert).toContainText(/EJP Tech a reçu votre signalement le \d{1,2} /)
    await expect(ouvert.getByRole('button')).toHaveCount(0)
    const clos = page
      .getByRole('region', { name: 'Clos ces 30 derniers jours' })
      .getByRole('article')
      .filter({ hasText: TEXTE_CLOS })
    await expect(clos).toContainText(/Clos par EJP Tech le \d{1,2} /)
    await expect(clos).toContainText(`Réponse : ${COMMENTAIRE_CLOS}`)
    // La vue des signalements et leurs lignes de suivi, rien d'autre.
    expect(new Set(requetes)).toEqual(
      new Set(['/rest/v1/compte', '/rest/v1/v_signalement', '/rest/v1/signalement_suivi']),
    )
  })

  test('« Ma semaine » : la ligne discrète vers le suivi, sans bandeau', async ({ page }) => {
    await page.goto('/')
    await attendreLaFinDuChargement(page)
    await expect(page.getByText(/^\d+ signalements? suivis? par EJP Tech\.$/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voir le suivi' })).toHaveAttribute(
      'href',
      '/signalements',
    )
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

  test('/moderation : le bloc en tête, le Reçu de Communication à traiter avec ses gestes, puis le clos', async ({
    page,
  }) => {
    await page.goto('/moderation')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modération')
    await attendreLaFinDuChargement(page)
    const bloc = page.getByRole('region', { name: 'Signalements', exact: true })
    await expect(bloc.getByText(/^\d+ signalements? à traiter$/)).toBeVisible()
    const ouvert = bloc
      .getByRole('region', { name: 'À traiter', exact: true })
      .getByRole('article')
      .filter({ hasText: TEXTE_OUVERT })
    await expect(ouvert).toContainText('Communication')
    await expect(ouvert).toContainText(/Ajouter un événement, \d{1,2} /)
    await expect(ouvert).toContainText(/Reçu le \d{1,2} \S+, il y a \d+ jours\./)
    await expect(ouvert.getByRole('button', { name: /^(Prendre|Répondre|Clore)/ })).toHaveText([
      'Prendre en charge',
      'Répondre au ministère',
      'Clore le signalement',
    ])
    const clos = bloc.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    const ligneClose = clos.getByRole('article').filter({ hasText: TEXTE_CLOS })
    await expect(ligneClose).toContainText(COMMENTAIRE_CLOS)
    await expect(ligneClose).toContainText(/Clos par EJP Tech le \d{1,2} /)
    // Un signalement clos ne reçoit plus de geste ; seul « Masquer » y reste possible.
    await expect(clos.getByRole('button', { name: /^(Prendre|Répondre|Clore)/ })).toHaveCount(0)
  })

  test('/signaler et /signalements : la page non disponible (EJP Tech ne signale pas)', async ({
    page,
  }) => {
    const requetes = suivreRequetesDeDonnees(page)
    for (const adresse of ['/signaler?ecran=saisie_evenement', '/signalements']) {
      await page.goto(adresse)
      await expect(
        page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
        adresse,
      ).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Envoyer le signalement' })).toHaveCount(0)
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })
})

// Le berger, le conseil et l'administration : ni les pages, ni le bloc, sans aucune requête de
// données ; par l'API, aucune ligne de signalement, de suivi ni de journal des signalements.
for (const compte of COMPTES_PROFILS.filter((profil) =>
  ['berger', 'conseil', 'admin_eglise'].includes(profil.profil),
)) {
  test.describe(`profil ${compte.profil}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('/signaler, /signalements et /moderation : la page non disponible, sans requête', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      for (const adresse of [
        '/signaler?ecran=saisie_evenement',
        '/signaler',
        '/signalements',
        '/moderation',
      ]) {
        await page.goto(adresse)
        await expect(
          page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
          adresse,
        ).toBeVisible()
        await expect(page.getByRole('main').getByText(/signalement/i)).toHaveCount(0)
      }
      expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
    })

    test('par l’API : aucun signalement, aucune ligne de suivi, aucune ligne de journal des signalements', async ({
      page,
    }) => {
      await page.goto('/')
      expect(await compter(page, 'v_signalement?select=id')).toBe(0)
      expect(await compter(page, 'signalement?select=id')).toBe(0)
      expect(await compter(page, 'signalement_suivi?select=id')).toBe(0)
      expect(
        await compter(
          page,
          `journal?select=id&action=in.(difficulte_signalee,signalement_clos,signalement_pris_en_charge,signalement_repondu,signalement_regle,signalement_reponse_ministere)&ministere_id=eq.${MINISTERE_COMMUNICATION}`,
        ),
      ).toBe(0)
    })
  })
}
