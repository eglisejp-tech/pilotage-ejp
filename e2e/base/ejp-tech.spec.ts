import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  COMPTES_PROFILS,
  fichierSession,
  ouvrirMenuSiBesoin,
  seConnecter,
  suivreRequetesDeDonnees,
} from '../comptes.ts'

// EJP Tech lit tout comme le berger, en lecture seule (docs/decisions.md, T29), avec la base
// locale (job « e2e » de la CI, E2E_BASE=1) : après la connexion, son accueil reste la
// modération ; l'onglet « Cette semaine » ouvre la vue du berger, sans aucune action.

const EJP_TECH = COMPTES_PROFILS.find((compte) => compte.profil === 'admin_plateforme')
if (!EJP_TECH) throw new Error('Compte EJP Tech absent de COMPTES_PROFILS.')
const { email, onglets } = EJP_TECH

/** La phrase du berger : EJP Tech voit la même (BRIEF, section 9). */
const phraseSemaine =
  "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et un point attend votre décision."

const navigation = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' })

/** Depuis la modération, l'onglet « Cette semaine » (dans le menu sous 1024 px). */
async function ouvrirCetteSemaine(page: Page) {
  await expect(page).toHaveTitle('Modération, Pilotage EJP')
  await ouvrirMenuSiBesoin(page)
  await expect(navigation(page).getByRole('link')).toHaveText(onglets)
  await expect(navigation(page).getByRole('link', { name: 'Modération' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await navigation(page).getByRole('link', { name: 'Cette semaine' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/')
}

/** La vue du berger, en lecture seule : ni « Marquer traité », ni saisie, ni aucun bouton. */
async function verifierLectureSeule(page: Page) {
  await expect(page).toHaveTitle('Cette semaine, Pilotage EJP')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(phraseSemaine)
  await expect(page.locator('h1 mark')).toHaveText('un point attend votre décision')

  const aDecider = page.getByRole('region', { name: 'À décider' })
  await expect(aDecider.getByRole('heading', { level: 3 })).toHaveCount(3)
  await expect(aDecider.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Marquer traité/ })).toHaveCount(0)
  const contenu = page.getByRole('main')
  await expect(contenu.getByRole('button')).toHaveCount(0)
  await expect(
    contenu.getByRole('link', { name: /Saisir|Enregistrer|Ajouter|Déclarer|Changer le statut/ }),
  ).toHaveCount(0)
}

/**
 * Attend le début de la période TOTP suivante (30 s) : le code de cette connexion ne peut pas
 * être celui que le projet « connexion » vient d'utiliser pour le même compte.
 */
async function attendrePeriodeTotpSuivante() {
  const reste = 30_000 - (Date.now() % 30_000)
  await new Promise((fin) => setTimeout(fin, reste + 500))
}

test.describe('EJP Tech : connexion, puis « Cette semaine » en lecture seule', () => {
  test('se connecte, arrive sur la modération, ouvre « Cette semaine » sans aucune action, sans défiler à 390 px', async ({
    page,
  }, infos) => {
    // Une seule connexion de plus suffit (vérification des codes limitée, BRIEF section 8).
    test.skip(infos.project.name !== 'telephone', 'Connexion vérifiée une fois, à 390 px.')
    test.setTimeout(120_000)
    expect(page.viewportSize()?.width).toBe(390)
    const requetes = suivreRequetesDeDonnees(page)

    await attendrePeriodeTotpSuivante()
    await seConnecter(page, email)
    await expect(page).toHaveURL((url) => url.pathname === '/moderation')
    await ouvrirCetteSemaine(page)
    await verifierLectureSeule(page)

    // Les points sont lus pour EJP Tech, comme pour le berger.
    expect(requetes).toContain('/rest/v1/v_point')
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debordement).toBeLessThanOrEqual(0)
  })
})

test.describe('EJP Tech : « Cette semaine » à chaque format', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('depuis la modération, l’onglet « Cette semaine » ouvre la vue du berger, en lecture seule', async ({
    page,
  }) => {
    await page.goto('/moderation')
    await ouvrirCetteSemaine(page)
    await verifierLectureSeule(page)
    await ouvrirMenuSiBesoin(page)
    await expect(navigation(page).getByRole('link', { name: 'Cette semaine' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
