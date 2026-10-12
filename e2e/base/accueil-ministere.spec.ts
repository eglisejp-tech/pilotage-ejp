import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import type { CompteTest } from '../comptes.ts'

// Accueil du ministère (maquette 07, lot E7), en lecture seule, avec la base locale et le jeu
// d'exemple (job « e2e » de la CI, E2E_BASE=1). Le jeu suit le dimanche de référence : aucune
// vérification ne dépend de la date du jour, seulement des nombres et des titres du jeu
// (Communication : 10 STARs au service le dimanche de référence, 13 présents à Bâtir l'Église
// la veille, un point créé, un point d'Intégration qui le mentionne).

/**
 * Ouvre « / » et attend la vue : ni chargement, ni erreur de page. L'onglet du ministère s'appelle
 * « Ma semaine » (T57), celui des autres profils « Cette semaine ».
 */
async function ouvrir(page: Page, titre: 'Ma semaine' | 'Cette semaine' = 'Ma semaine') {
  await page.goto('/')
  await expect(page).toHaveTitle(`${titre}, Pilotage EJP`)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
}

test.describe('ministère Communication : accueil 07', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('phrase de ce qu’il reste à faire, boutons, « Vos saisies », puis « Vos points »', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page.getByText(/^Semaine \d+, du .+$/)).toBeVisible()
    const phrase = page.getByRole('heading', { level: 1 })
    await expect(phrase).toHaveText(
      /^(Tout est à jour pour la semaine \d+\.|(Vos chiffres sont à jour\. )?Il reste .+)$/,
    )
    // Le bouton jaune existe si et seulement s'il reste quelque chose (surligné dans la phrase).
    const actions = page.getByRole('navigation', { name: 'Saisies à faire' })
    const reste = (await phrase.textContent())?.includes('Il reste') ?? false
    await expect(page.locator('h1 mark')).toHaveCount(reste ? 1 : 0)
    await expect(actions.locator('.bg-lumiere')).toHaveCount(reste ? 1 : 0)
    await expect(actions.getByRole('link', { name: 'Saisir une session' })).toBeVisible()
    await expect(actions.getByRole('link', { name: 'Nouveau point' })).toHaveAttribute(
      'href',
      '/saisir/point',
    )
    await expect(actions.getByRole('link', { name: 'Mettre à jour la carte des FIJ' })).toHaveCount(
      0,
    )
    await expect(page.getByText(/Le dimanche midi/)).toHaveCount(0)

    // Ordre de lecture identique à toutes les tailles.
    const titres = page.getByRole('heading', { level: 2 })
    await expect(titres).toHaveText([
      'Vos saisies',
      'Vos chiffres de la semaine',
      'Vos points',
      "Dans l'église",
    ])
    await expect(page.getByRole('heading', { name: 'À décider' })).toHaveCount(0)

    const saisies = page.getByRole('region', { name: 'Vos saisies' })
    const lignes = saisies.getByRole('listitem')
    await expect(lignes.first()).toContainText(/^Chiffres du dimanche .+Fait10 au service/)
    await expect(
      lignes.first().getByRole('link', { name: /^Corriger : Chiffres du dimanche / }),
    ).toHaveAttribute('href', /^\/saisir\/dimanche\?date=\d{4}-\d{2}-\d{2}$/)
    const batir = lignes.filter({ hasText: /^Bâtir l'Église du / })
    await expect(batir).toHaveCount(1)
    await expect(batir).toContainText('Fait13 présents')
    await expect(
      batir.getByRole('link', { name: /^Corriger : Bâtir l'Église du / }),
    ).toHaveAttribute('href', /^\/saisir\/session\/[0-9a-f-]+$/)
    // Pas de ligne FIJ pour un autre ministère que FIJ.
    await expect(lignes.filter({ hasText: 'Carte des FIJ' })).toHaveCount(0)

    // « Vos points » : ses points et ceux qui le mentionnent, jamais ceux des autres.
    const points = page.getByRole('region', { name: 'Vos points' })
    await expect(points).toContainText('Créés ou mentionnés')
    await expect(
      points.getByRole('heading', { level: 3, name: 'Salle pour la soirée de louange' }),
    ).toBeVisible()
    const mentionne = points
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Visuels pour Welcome Prodiges' }) })
    await expect(mentionne).toContainText('Mentionné par Intégration.')
    await expect(points.getByText('Financement de Welcome Prodiges')).toHaveCount(0)
    await expect(points.getByText('Planning du trimestre à valider')).toHaveCount(0)

    // Aide `accueil.points`, à côté du titre (T38).
    const aide = points.getByRole('button', { name: 'Aide : Vos points' })
    await aide.click()
    await expect(aide).toHaveAttribute('aria-expanded', 'true')
    await expect(points).toContainText('Un point traité reste affiché 7 jours.')
    await page.keyboard.press('Escape')
    await expect(aide).toHaveAttribute('aria-expanded', 'false')
  })

  test('« Ma semaine » : ses propres chiffres et deux totaux de l’église, aucun autre ministère', async ({
    page,
  }) => {
    const requetes = suivreRequetesDeDonnees(page)
    // Adresses complètes de deux lectures sensibles : l'apport de chaque ministère et les noms de
    // ceux qui n'ont pas saisi.
    const presences: string[] = []
    const sessionsLues: string[] = []
    page.on('request', (requete) => {
      const url = new URL(requete.url())
      if (url.pathname === '/rest/v1/v_participation_courante') presences.push(url.search)
      if (url.pathname === '/rest/v1/v_session_completude') sessionsLues.push(url.search)
    })
    await ouvrir(page)

    // Ses chiffres : 10 au service, 14 actifs dont 11 en FIJ (79 %), 13 présents à Bâtir l'Église.
    const chiffres = page.getByRole('region', { name: 'Vos chiffres de la semaine' })
    const service = chiffres.getByRole('listitem').filter({ hasText: 'STARs au service' })
    await expect(service).toContainText('10')
    await expect(service).toContainText(/[+−]\d|Stable|non saisi/)
    await expect(service.getByRole('img', { name: /^Dix derniers dimanches : / })).toBeVisible()
    const actifs = chiffres.getByRole('listitem').filter({ hasText: 'STARs actifs' })
    await expect(actifs).toContainText('14')
    await expect(chiffres.getByRole('listitem').filter({ hasText: 'en FIJ' })).toContainText('79')
    const batir = chiffres.getByRole('listitem').filter({ hasText: "Présents à Bâtir l'Église" })
    await expect(batir).toContainText('13')
    await expect(
      chiffres.getByRole('link', { name: 'Tous vos chiffres dans Ma fiche' }),
    ).toHaveAttribute('href', '/ma-fiche')
    await expect(chiffres.getByText('Carte des FIJ')).toHaveCount(0)

    // « Dans l'église » : deux totaux, chacun avec sa complétude, sans le nom d'un ministère.
    const eglise = page.getByRole('region', { name: "Dans l'église" })
    await expect(eglise.getByRole('listitem')).toHaveCount(2)
    await expect(eglise.getByRole('listitem').first()).toContainText('STARs au service')
    for (const ligne of await eglise.getByRole('listitem').all()) {
      await expect(ligne).toContainText(/\d+ sur \d+/)
    }
    for (const nom of ['Social', 'Coordination', 'Intégration', 'Jeunesse', 'Prodiges Junior']) {
      await expect(chiffres, nom).not.toContainText(nom)
      await expect(eglise, nom).not.toContainText(nom)
    }
    await expect(page.getByRole('heading', { name: 'Les ministères' })).toHaveCount(0)
    await expect(page.getByText('À saisir')).toHaveCount(0)

    // Les lectures de la vue du berger ne sont pas faites.
    expect(
      requetes.filter((chemin) =>
        /\/(v_tableau_ministeres|v_ecart_dimanche|v_ecart_session|v_total_a_ce_jour|v_pourcentage_fij|v_carte_fij)$/.test(
          chemin,
        ),
      ),
    ).toEqual([])
    // Ses présences seulement : chaque lecture est filtrée sur son ministère.
    expect(presences.length).toBeGreaterThan(0)
    for (const recherche of presences) expect(recherche).toContain('ministere_id=eq.')
    // Les sessions sont lues sans la colonne des manquants (noms des autres ministères).
    expect(sessionsLues.length).toBeGreaterThan(0)
    for (const recherche of sessionsLues)
      expect(decodeURIComponent(recherche)).not.toContain('manquants')
  })

  test('« Corriger » ouvre la saisie du dimanche de référence', async ({ page }) => {
    await ouvrir(page)
    await page
      .getByRole('region', { name: 'Vos saisies' })
      .getByRole('link', { name: /^Corriger : Chiffres du dimanche / })
      .click()
    await expect(page).toHaveURL(/\/saisir\/dimanche\?date=\d{4}-\d{2}-\d{2}$/)
  })

  test('à partir de 1024 px, « Vos points » prend la colonne de droite', async ({
    page,
  }, infos) => {
    await ouvrir(page)
    const saisies = await page.getByRole('region', { name: 'Vos saisies' }).boundingBox()
    const points = await page.getByRole('region', { name: 'Vos points' }).boundingBox()
    expect(saisies).not.toBeNull()
    expect(points).not.toBeNull()
    if (!saisies || !points) return
    if (infos.project.name === 'ordinateur') {
      expect(points.x).toBeGreaterThan(saisies.x + saisies.width)
      expect(Math.abs(points.y - saisies.y)).toBeLessThan(2)
    } else {
      expect(points.y).toBeGreaterThanOrEqual(saisies.y + saisies.height)
    }
  })

  test("« Ma semaine » : aucune violation d'accessibilité détectée par axe", async ({ page }) => {
    await ouvrir(page)
    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(resultat.violations).toEqual([])
  })

  for (const largeur of [360, 390]) {
    test(`« Ma semaine » ne défile pas horizontalement à ${largeur} px`, async ({
      page,
    }, infos) => {
      test.skip(infos.project.name !== 'telephone', 'Largeurs de téléphone')
      await page.setViewportSize({ width: largeur, height: 800 })
      await ouvrir(page)
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debordement).toBeLessThanOrEqual(0)
    })
  }

  test('capture de l’accueil', { tag: '@captures' }, async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    await ouvrir(page)
    await page.screenshot({
      path: `test-results/captures/accueil-ministere-${largeur}.png`,
      fullPage: true,
    })
  })
})

// Les autres profils n'ont ni l'ouverture de 07 ni ses blocs, et ne lisent rien pour elle.
const AUTRES: CompteTest['profil'][] = ['berger', 'conseil', 'admin_eglise', 'admin_plateforme']
for (const profil of AUTRES) {
  test.describe(`${profil} : pas d’accueil du ministère`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('ni « Vos saisies », ni « Vos points », ni boutons de saisie', async ({ page }) => {
      const requetes = suivreRequetesDeDonnees(page)
      await ouvrir(page, 'Cette semaine')
      await expect(page.getByRole('heading', { name: 'Vos saisies' })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Vos chiffres de la semaine' })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Vos points' })).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'Saisies à faire' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: /^(Saisir|Corriger|Renseigner)/ })).toHaveCount(0)
      // Lectures propres à l'accueil du ministère : sessions attendues, saisies par rythme.
      expect(
        requetes.filter((chemin) => /\/session_attendu|\/v_mesure_periode|\/mesure$/.test(chemin)),
      ).toEqual([])
    })
  })
}
