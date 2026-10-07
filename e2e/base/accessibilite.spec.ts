import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, ouvrirMenuSiBesoin, seConnecter } from '../comptes.ts'
import type { CompteTest } from '../comptes.ts'
import { auditerAxe, decrireFautes } from '../outils/axe.ts'
import {
  LARGEUR_MINIMALE,
  ciblesTropPetites,
  debordementHorizontal,
  decrireRapportClavier,
  parcourirAuClavier,
  problemesEchapDesAides,
  problemesEchapDuMenu,
  problemesPiegeDuFocus,
} from '../outils/controles.ts'

// Audit transversal de l'étape 7 (plan, section 3.3, lot F2) avec la base locale (job « e2e » de
// la CI, E2E_BASE=1) : les vraies pages de chaque profil, avec les vraies données du jeu
// d'exemple. Par page : aucune faute axe (WCAG 2.1 A et AA), aucun défilement horizontal, cibles
// de 44 px, Tab jusqu'à chaque action avec un focus visible, piège du focus et Échap. Puis, pour
// le berger : l'écran sans réseau et l'erreur de page. Chaque page qui ouvre un panneau est
// contrôlée sans lui connaître de nom : dès qu'un `role="dialog"` s'affiche, Échap doit le fermer.
// Une page ajoutée par un lot ultérieur se déclare dans `PAGES_PAR_PROFIL`.

type Profil = CompteTest['profil']
const SOCIAL = '10000000-0000-4000-8000-000000000005'

/** Pages de chaque profil (adresses de `ADRESSES_APPLICATION` et leur accueil). */
const PAGES_PAR_PROFIL: Record<Profil, string[]> = {
  ministere: [
    '/',
    '/ma-fiche',
    '/saisir/dimanche',
    '/saisir/mois',
    '/saisir/evenement',
    '/saisir/reunion',
    '/signaler',
    '/points',
    '/journal',
    '/confidentialite',
  ],
  berger: ['/', '/ministeres', `/ministeres/${SOCIAL}`, '/points', '/journal'],
  conseil: ['/', '/ministeres', `/ministeres/${SOCIAL}`, '/points', '/journal'],
  admin_eglise: ['/', '/comptes', '/sessions', '/journal'],
  admin_plateforme: [
    '/moderation',
    '/',
    '/ministeres',
    `/ministeres/${SOCIAL}`,
    '/journal-technique',
  ],
}

/** Le ministère FIJ (Coordo FIJ) a deux saisies de plus : la carte et les chiffres par département. */
const EMAIL_FIJ = 'fij@exemple.test'
const PAGES_FIJ = ['/', '/ma-fiche', '/saisir/fij', '/saisir/fij-statistiques']

/** Ouvre l'adresse et attend la page : ni chargement, ni police en cours. */
async function ouvrirPage(page: Page, adresse: string) {
  await page.goto(adresse)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
}

/** Les contrôles de la page ouverte, au format de fenêtre courant. */
async function controlerPage(page: Page, adresse: string) {
  expect.soft(decrireFautes(await auditerAxe(page)), `${adresse} : axe`).toEqual([])
  expect
    .soft(await debordementHorizontal(page), `${adresse} : défilement horizontal`)
    .toBeLessThanOrEqual(0)
  expect.soft(await ciblesTropPetites(page), `${adresse} : cibles de 44 px`).toEqual([])
  const clavier = [
    ...decrireRapportClavier(await parcourirAuClavier(page)),
    ...(await problemesPiegeDuFocus(page)),
    ...(await problemesEchapDesAides(page)),
    ...(await problemesEchapDuMenu(page)),
  ]
  expect.soft(clavier, `${adresse} : clavier`).toEqual([])
}

/** Un panneau ouvert se ferme avec Échap (et la page d'origine revient). */
async function controlerEchapDuPanneau(page: Page, adresse: string) {
  const panneau = page.getByRole('dialog')
  if ((await panneau.count()) === 0) return
  await page.keyboard.press('Escape')
  await expect(panneau, `${adresse} : Échap ferme le panneau`).toHaveCount(0)
}

/** Le plus petit téléphone visé : aucun défilement horizontal à 360 px. */
async function controler360(page: Page, adresse: string) {
  await page.setViewportSize({ width: LARGEUR_MINIMALE, height: 800 })
  await ouvrirPage(page, adresse)
  expect
    .soft(await debordementHorizontal(page), `${adresse} : défilement horizontal à 360 px`)
    .toBeLessThanOrEqual(0)
}

for (const [profil, pages] of Object.entries(PAGES_PAR_PROFIL) as [Profil, string[]][]) {
  test.describe(`${profil} : accessibilité des pages`, () => {
    test.use({ storageState: fichierSession(profil) })

    for (const adresse of pages) {
      test(adresse, async ({ page }, testInfo) => {
        await ouvrirPage(page, adresse)
        await controlerPage(page, adresse)
        await controlerEchapDuPanneau(page, adresse)
        // Les largeurs fixes se mesurent une fois, dans le projet « ordinateur ».
        if (testInfo.project.name === 'ordinateur') await controler360(page, adresse)
      })
    }
  })
}

// Le ministère FIJ n'a pas de session enregistrée par le projet « connexion » : il se connecte
// ici, une fois, puis passe ses pages aux quatre largeurs (une seule connexion, donc un seul
// projet, pour ne pas rejouer le même code à usage unique).
test.describe('ministère FIJ : accessibilité des pages', () => {
  test('connexion, puis chaque page à 1440, 834, 390 et 360 px', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'ordinateur',
      'une seule connexion pour les quatre largeurs',
    )
    test.setTimeout(180_000)
    await seConnecter(page, EMAIL_FIJ)
    await expect(page).toHaveTitle('Cette semaine, Pilotage EJP')
    for (const largeur of [1440, 834, 390, LARGEUR_MINIMALE]) {
      await page.setViewportSize({ width: largeur, height: 900 })
      for (const adresse of PAGES_FIJ) {
        await ouvrirPage(page, adresse)
        await controlerPage(page, `${adresse} à ${largeur} px`)
        if (largeur >= 834) await controlerEchapDuPanneau(page, `${adresse} à ${largeur} px`)
      }
    }
  })
})

test.describe('berger : sans réseau et erreur de page', () => {
  test.use({ storageState: fichierSession('berger') })

  /** Dans l'application, depuis l'accueil déjà chargé : l'onglet « Ministères » (sans recharger). */
  async function ouvrirOngletMinisteres(page: Page) {
    await ouvrirMenuSiBesoin(page)
    await page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('link', { name: 'Ministères' })
      .click()
  }

  test('erreur de page : message annoncé, « Réessayer » au clavier, puis retour à la liste', async ({
    page,
  }) => {
    await ouvrirPage(page, '/')
    await page.route('**/rest/v1/**', (route) => route.abort('failed'))
    await ouvrirOngletMinisteres(page)
    const erreur = page.getByRole('alert').filter({ hasText: 'La connexion a échoué' })
    await expect(erreur).toBeVisible({ timeout: 25_000 })
    expect.soft(decrireFautes(await auditerAxe(page)), 'erreur de page : axe').toEqual([])
    expect
      .soft(await debordementHorizontal(page), 'erreur de page : défilement')
      .toBeLessThanOrEqual(0)
    expect
      .soft(decrireRapportClavier(await parcourirAuClavier(page)), 'erreur de page : clavier')
      .toEqual([])
    // La connexion revient : « Réessayer » relance la lecture et l'erreur disparaît.
    await page.unroute('**/rest/v1/**')
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(erreur).toHaveCount(0, { timeout: 15_000 })
  })

  test('sans réseau : la page ne reste pas en chargement et reste accessible', async ({
    page,
    context,
  }) => {
    // Même parcours que ci-dessus, mais la connexion est coupée avant de changer de page.
    await ouvrirPage(page, '/')
    await context.setOffline(true)
    try {
      await ouvrirOngletMinisteres(page)
      // Sans le mode réseau « always » (lot F1), « Chargement » ne finirait jamais.
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 25_000 })
      expect.soft(decrireFautes(await auditerAxe(page)), 'sans réseau : axe').toEqual([])
      expect
        .soft(await debordementHorizontal(page), 'sans réseau : défilement')
        .toBeLessThanOrEqual(0)
      expect
        .soft(decrireRapportClavier(await parcourirAuClavier(page)), 'sans réseau : clavier')
        .toEqual([])
    } finally {
      await context.setOffline(false)
    }
  })
})

test('chaque profil de la CI a ses pages dans l’audit', () => {
  for (const compte of COMPTES_PROFILS) {
    expect(PAGES_PAR_PROFIL[compte.profil].length, compte.profil).toBeGreaterThan(0)
  }
})
