import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import { compter, lire, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Configuration des indicateurs (lot L3a) avec la base locale (job « e2e » de la CI, E2E_BASE=1),
// en lecture seulement : la création des prévus est dans
// `indicateurs-configuration.ecriture.spec.ts` (projet « ecritures »). Jeu d'exemple (seed/40) :
// les prévus sont créés pour Communication, Intégration, Coordination, Social, FIJ, Prodiges Junior
// et EJP Formation ; Jeunesse n'a aucun prévu et son nom n'est pas dans la liste de la coordination.
// Seuls l'administration de l'église et EJP Tech ont la page ; les autres profils reçoivent la page
// non disponible, sans aucune requête de données. Jamais une valeur d'indicateur n'est lue.

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const MINISTERE_JEUNESSE = '10000000-0000-4000-8000-000000000004'
const MINISTERE_SOCIAL = '10000000-0000-4000-8000-000000000005'
const MINISTERES_AVEC_PREVUS = [
  'Communication',
  'Intégration',
  'Coordination',
  'Social',
  'FIJ',
  'Prodiges Junior',
  'EJP Formation',
]
/** Lectures de valeurs : l'écran de configuration n'en fait aucune. */
const LECTURES_DE_VALEURS = [
  '/rest/v1/mesure',
  '/rest/v1/v_mesure_periode',
  '/rest/v1/v_indicateur_suivi',
  '/rest/v1/v_indicateur_serie',
  '/rest/v1/v_calcul',
]

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

/** Ligne d'un ministère : une ligne du tableau à partir de 600 px, un élément de liste en dessous. */
const ligneDe = (page: Page, nom: string) =>
  page
    .getByRole('link', { name: nom, exact: true })
    .locator('xpath=ancestor::*[self::tr or self::li][1]')

for (const profil of ['admin_eglise', 'admin_plateforme'] as const) {
  test.describe(`profil ${profil}`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('/indicateurs : phrase, un ministère par ligne, prévus créés ou à choisir, aucune valeur lue', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      await page.goto('/indicateurs')
      await expect(page).toHaveTitle('Indicateurs, Pilotage EJP')
      await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs' })).toBeVisible()
      await attendreLaFinDuChargement(page)
      await expect(page.getByText(/^\d+ indicateurs? actifs? pour 8 ministères/)).toBeVisible()
      for (const nom of MINISTERES_AVEC_PREVUS) {
        const ligne = ligneDe(page, nom)
        await expect(ligne, nom).toContainText('Créés')
        await expect(ligne, nom).toContainText(/\d+ sur 30/)
        await expect(ligne.getByRole('button', { name: /^Créer/ }), nom).toHaveCount(0)
      }
      const jeunesse = ligneDe(page, 'Jeunesse')
      await expect(jeunesse).toContainText('À choisir')
      await expect(jeunesse.getByRole('link', { name: 'Choisir pour Jeunesse' })).toBeVisible()
      // La configuration ne lit que des définitions, l'usage, le catalogue et le journal.
      for (const chemin of LECTURES_DE_VALEURS) expect(requetes, chemin).not.toContain(chemin)
      expect(requetes).toContain('/rest/v1/v_catalogue')
      expect(requetes).toContain('/rest/v1/v_usage_indicateurs')
    })

    test('/indicateurs : tableau à partir de 600 px, liste en dessous', async ({ page }) => {
      await page.goto('/indicateurs')
      await attendreLaFinDuChargement(page)
      const largeur = page.viewportSize()?.width ?? 0
      if (largeur >= 600) {
        await expect(page.getByRole('table', { name: 'Indicateurs' })).toBeVisible()
        await expect(page.getByRole('row')).toHaveCount(9)
      } else {
        await expect(page.getByRole('table')).toHaveCount(0)
      }
    })

    test('/indicateurs/:id d’un ministère avec prévus : ses indicateurs par rythme, sans valeur, sans bloc de prévus', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      await page.goto(`/indicateurs/${MINISTERE_COMMUNICATION}`)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Indicateurs de Communication' }),
      ).toBeVisible()
      await attendreLaFinDuChargement(page)
      await expect(
        page.getByText(/^Communication suit \d+ indicateurs? sur 30 au plus/),
      ).toBeVisible()
      await expect(page.getByRole('region', { name: 'Prévus par la coordination' })).toHaveCount(0)
      // Chaque indicateur suivi (actif ou à valider) a sa ligne, ni plus ni moins.
      const suivis = await lire<{ id: string }>(
        page,
        `indicateur?select=id&ministere_id=eq.${MINISTERE_COMMUNICATION}&etat=neq.retire`,
      )
      const lignes = page.locator('section[aria-labelledby] ul > li').filter({
        has: page.locator('span.font-semibold'),
      })
      await expect(lignes).toHaveCount(suivis.length)
      for (const chemin of LECTURES_DE_VALEURS) expect(requetes, chemin).not.toContain(chemin)
    })

    test('/indicateurs/:id de Jeunesse : « À choisir » dans la liste de la coordination, « Aucun prévu » en dernier', async ({
      page,
    }) => {
      await page.goto(`/indicateurs/${MINISTERE_JEUNESSE}`)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Indicateurs de Jeunesse' }),
      ).toBeVisible()
      await attendreLaFinDuChargement(page)
      const choix = page.getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
      await expect(choix).toBeVisible()
      const options = await choix.locator('option').allTextContents()
      expect(options[0]).toBe('Choisissez un ministère de la liste')
      expect(options.at(-1)).toBe('Aucun prévu')
      expect(options).toContain('Kumi')
      await expect(page.getByRole('button', { name: /^Créer/ })).toHaveCount(0)
    })

    test('/indicateurs/:id d’un identifiant inconnu : la phrase, sans erreur de page', async ({
      page,
    }) => {
      await page.goto('/indicateurs/10000000-0000-4000-8000-0000000000ff')
      await expect(page.getByText("Ce ministère n'existe pas ou n'est plus actif.")).toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
    })

    test('par l’API : l’usage et le catalogue se lisent, jamais une valeur d’un indicateur propre', async ({
      page,
    }) => {
      await page.goto('/')
      expect(await compter(page, 'v_catalogue?select=code')).toBeGreaterThan(0)
      expect(await compter(page, 'v_usage_indicateurs?select=indicateur_id')).toBeGreaterThan(0)
      if (profil === 'admin_eglise') {
        // P06 : l'administration ne lit aucune valeur d'indicateur propre (Social en a, seed/40).
        expect(
          await compter(
            page,
            `v_indicateur_suivi?select=indicateur_id&ministere_id=eq.${MINISTERE_SOCIAL}&derniere_valeur=not.is.null`,
          ),
        ).toBe(0)
      }
    })

    test('axe, WCAG 2.2 AA : la liste et l’écran d’un ministère', async ({ page }) => {
      test.setTimeout(60_000)
      for (const adresse of ['/indicateurs', `/indicateurs/${MINISTERE_JEUNESSE}`]) {
        await page.goto(adresse)
        await attendreLaFinDuChargement(page)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        const resultat = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(resultat.violations, adresse).toEqual([])
      }
    })

    test('à 360 px, aucun défilement horizontal', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      for (const adresse of ['/indicateurs', `/indicateurs/${MINISTERE_COMMUNICATION}`]) {
        await page.goto(adresse)
        await attendreLaFinDuChargement(page)
        const debord = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debord, adresse).toBeLessThanOrEqual(0)
      }
    })

    test(
      'captures de la liste et de l’écran d’un ministère',
      { tag: '@captures' },
      async ({ page }) => {
        const largeur = page.viewportSize()?.width ?? 0
        for (const [nom, adresse] of [
          ['liste', '/indicateurs'],
          ['communication', `/indicateurs/${MINISTERE_COMMUNICATION}`],
          ['jeunesse', `/indicateurs/${MINISTERE_JEUNESSE}`],
        ]) {
          await page.goto(adresse!)
          await attendreLaFinDuChargement(page)
          await page.screenshot({
            path: `test-results/captures/base-indicateurs-configuration-${nom}-${profil}-${largeur}.png`,
            fullPage: true,
          })
        }
      },
    )
  })
}

// Le ministère, le berger et le conseil : ni la page, ni aucune requête de données ; par l'API, ni
// le catalogue ni l'usage (réservés à l'administration et à EJP Tech).
for (const compte of COMPTES_PROFILS.filter((profil) =>
  ['ministere', 'berger', 'conseil'].includes(profil.profil),
)) {
  test.describe(`profil ${compte.profil}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('/indicateurs et /indicateurs/:id : la page non disponible, sans requête', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      for (const adresse of ['/indicateurs', `/indicateurs/${MINISTERE_JEUNESSE}`]) {
        await page.goto(adresse)
        await expect(
          page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
          adresse,
        ).toBeVisible()
        await expect(page.getByRole('table')).toHaveCount(0)
        await expect(page.getByRole('button', { name: /^Créer/ })).toHaveCount(0)
      }
      expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
    })

    test('par l’API : ni le catalogue, ni l’usage des indicateurs', async ({ page }) => {
      await page.goto('/')
      expect(await compter(page, 'v_catalogue?select=code')).toBe(0)
      expect(await compter(page, 'v_usage_indicateurs?select=indicateur_id')).toBe(0)
    })
  })
}
