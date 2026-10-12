import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import type { CompteTest } from '../comptes.ts'

// Accueil du ministère (maquette 07, lot E7), en lecture seule, avec la base locale et le jeu
// d'exemple (job « e2e » de la CI, E2E_BASE=1). Le jeu suit le dimanche de référence : aucune
// vérification ne dépend de la date du jour, seulement des nombres et des titres du jeu
// (Communication : 10 STARs au service le dimanche de référence, 13 présents à Bâtir l'Église
// la veille, un point créé, un point d'Intégration qui le mentionne).

/** Ouvre « / » et attend la vue : ni chargement, ni erreur de page. */
async function ouvrir(page: Page) {
  await page.goto('/')
  await expect(page).toHaveTitle('Cette semaine, Pilotage EJP')
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
    await expect(titres.nth(0)).toHaveText('Vos saisies')
    await expect(titres.nth(1)).toHaveText('Vos points')
    await expect(titres.nth(2)).toHaveText("L'église cette semaine")
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
      await ouvrir(page)
      await expect(page.getByRole('heading', { name: 'Vos saisies' })).toHaveCount(0)
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
