import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Écran 06 « Journal », « Mon journal » et « Journal technique » (lot L5) sur l'aperçu
// /apercu/journal, sans base ni écriture : les lignes d'exemple lues par chaque profil, les
// filtres dans l'adresse, les 50 lignes puis « Afficher 50 lignes de plus » et les états. Trois
// formats par les projets Playwright. L'exemple compte 79 lignes ; le berger en lit 73 sur les 30
// derniers jours (BRIEF, section 9), 75 sur 3 mois et 77 depuis le début.

type Ecran = {
  profil?: string
  etat?: string
  periode?: string
  action?: string
  compte?: string
  ministere?: string
}

function adresse({ profil = 'berger', etat, periode, action, compte, ministere }: Ecran): string {
  const parametres = new URLSearchParams({ profil })
  if (etat) parametres.set('etat', etat)
  if (periode) parametres.set('periode', periode)
  if (action) parametres.set('action', action)
  if (compte) parametres.set('compte', compte)
  if (ministere) parametres.set('ministere', ministere)
  return `/apercu/journal?${parametres.toString()}`
}

async function ouvrir(page: Page, ecran: Ecran) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const nomDe = ({ profil = 'berger', etat = 'liste', periode, action, ministere }: Ecran) =>
  [profil, etat, periode, action, ministere].filter(Boolean).join('-')

const TOUS: Ecran[] = [
  { profil: 'berger' },
  { profil: 'berger', periode: '7j' },
  { profil: 'berger', ministere: 'min-jeunesse' },
  { profil: 'conseil' },
  { profil: 'ministere' },
  { profil: 'admin_eglise' },
  { profil: 'admin_plateforme' },
  { profil: 'berger', etat: 'vide' },
  { profil: 'berger', action: 'session_supprimee' },
  { profil: 'berger', etat: 'chargement' },
  { profil: 'berger', etat: 'erreur' },
]

const lignes = (page: Page) =>
  page.getByRole('list', { name: 'Lignes du journal' }).getByRole('listitem')

test.describe('le berger lit le journal (aperçu)', () => {
  test('titre, phrase, trois filtres, 30 derniers jours et 50 lignes', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible()
    await expect(
      page.getByText(
        'Chaque saisie, création et changement de statut laisse une ligne ici, avec la date et le compte.',
      ),
    ).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Compte' })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: 'Action' })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: 'Période' })).toHaveValue('30j')
    await expect(lignes(page)).toHaveCount(50)
    await expect(page.getByText('50 lignes affichées.')).toBeVisible()
  })

  test('une ligne : date de Paris, compte en gras, action, détail', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    const premiere = lignes(page).first()
    await expect(premiere).toContainText('30 sept., 9 h 12')
    await expect(premiere).toContainText('Berger')
    await expect(premiere).toContainText('A marqué traité')
    await expect(premiere).toContainText("Micros pour Bâtir l'Église")
    await expect(premiere.locator('.font-semibold')).toHaveCSS('font-weight', '600')
    await expect(lignes(page).nth(1)).toContainText("Point de Social, motif : nom d'une personne")
  })

  test('le berger filtre, puis charge 50 lignes de plus', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await page.getByRole('button', { name: 'Afficher 50 lignes de plus' }).click()
    await expect(lignes(page)).toHaveCount(73)
    await expect(page.getByText('Toutes les lignes sont affichées (73).')).toBeFocused()
    await expect(page.getByRole('button', { name: /Afficher 50 lignes de plus/ })).toHaveCount(0)

    await page.getByRole('combobox', { name: 'Période' }).selectOption({ label: '3 derniers mois' })
    await expect(page).toHaveURL(/periode=3m/)
    await expect(lignes(page)).toHaveCount(50)
    await page.getByRole('button', { name: 'Afficher 50 lignes de plus' }).click()
    await expect(lignes(page)).toHaveCount(75)

    await page
      .getByRole('combobox', { name: 'Action' })
      .selectOption({ label: 'A saisi des chiffres' })
    await expect(page).toHaveURL(/action=mesure_saisie/)
    await expect(page).toHaveURL(/periode=3m/)
    await expect(lignes(page).filter({ hasNotText: 'A saisi des chiffres' })).toHaveCount(0)
    await expect(lignes(page).first()).toContainText('A saisi des chiffres')

    await page
      .getByRole('combobox', { name: 'Compte' })
      .selectOption({ label: 'Ministère Jeunesse' })
    await expect(page).toHaveURL(/compte=compte-jeunesse/)
    await expect(lignes(page).first()).toContainText('Ministère Jeunesse')
    await page
      .getByRole('combobox', { name: 'Période' })
      .selectOption({ label: '7 derniers jours' })
    await expect(page).not.toHaveURL(/periode=3m/)
    await expect(page).toHaveURL(/periode=7j/)
    await expect(lignes(page)).toHaveCount(1)
  })

  test('« 7 derniers jours » : les lignes du jour de Paris du 24 septembre au 1er octobre', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger', periode: '7j' })
    await expect(lignes(page)).toHaveCount(20)
    await expect(lignes(page).last()).toContainText('24 sept., 15 h')
  })

  test('le ministère de l’adresse : « Ministère : Jeunesse » et « Retirer le filtre »', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger', ministere: 'min-jeunesse', periode: '7j' })
    await expect(page.getByText('Ministère : Jeunesse')).toBeVisible()
    await expect(lignes(page).first()).toContainText('Ministère Jeunesse')
    await page.getByRole('button', { name: 'Retirer le filtre' }).click()
    await expect(page).not.toHaveURL(/ministere=/)
    await expect(page.getByText('Ministère : Jeunesse')).toHaveCount(0)
    await expect(lignes(page).first()).toContainText('Berger')
  })

  test('un texte masqué par EJP Tech s’affiche en --encre-3', async ({ page }) => {
    await ouvrir(page, { profil: 'berger', periode: '7j', action: 'point_cree' })
    const masque = page.getByText('[texte masqué par EJP Tech]')
    await expect(masque).toBeVisible()
    await expect(masque).toHaveCSS('color', 'rgb(95, 107, 126)')
    const lisible = page.getByText('Visuels pour Welcome Prodiges, mentionne Communication')
    await expect(lisible).toBeVisible()
  })

  test('sans ligne : « Aucune ligne pour ces filtres. » et « Retirer les filtres »', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'berger', action: 'session_supprimee' })
    await expect(page.getByText('Aucune ligne pour ces filtres.')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Lignes du journal' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Retirer les filtres' }).click()
    await expect(page).toHaveURL(/periode=tout/)
    await expect(page).not.toHaveURL(/action=/)
    await expect(page.getByText('Aucune ligne pour ces filtres.')).toHaveCount(0)
    await expect(lignes(page)).toHaveCount(50)
  })

  test('au clavier : Tab atteint Compte, Action et Période', async ({ page }) => {
    await ouvrir(page, { profil: 'berger' })
    await page.getByRole('combobox', { name: 'Compte' }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('combobox', { name: 'Action' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('combobox', { name: 'Période' })).toBeFocused()
  })
})

test.describe('les autres profils (aperçu)', () => {
  test('le ministère : « Mon journal », sans filtre Compte, seulement ses lignes', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'ministere' })
    await expect(page.getByRole('heading', { level: 1, name: 'Mon journal' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Compte' })).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(2)
    await expect(page.getByText('de votre ministère')).toBeVisible()
    // Il lit ses signalements (T39) et le jeu d'exemple ne lui donne ni point de Social ni FIJ.
    await expect(page.getByText('Écran : Chiffres du dimanche')).toBeVisible()
    await expect(page.getByText('Point de Social')).toHaveCount(0)
    await expect(page.getByText('FIJ par département')).toHaveCount(0)
  })

  test('l’administration de l’église ne lit ni signalement, ni précision, ni point', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'admin_eglise', periode: 'tout' })
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible()
    const liste = page.getByRole('list', { name: 'Lignes du journal' })
    await expect(liste).toContainText('A déclaré une session')
    await expect(liste).not.toContainText(/signal|Précision|Soirée de louange|Point|point/)
    await expect(liste).not.toContainText("1 chiffre d'indicateurs du ministère")
    const actions = page.getByRole('combobox', { name: 'Action' }).getByRole('option')
    await expect(actions.filter({ hasText: 'A signalé une difficulté' })).toHaveCount(0)
    await expect(actions.filter({ hasText: 'A créé un point' })).toHaveCount(0)
    await expect(actions.filter({ hasText: 'A déclaré une session' })).toHaveCount(1)
  })

  test('EJP Tech : « Journal technique », tout le journal, signalements compris', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'admin_plateforme', periode: '7j' })
    await expect(page.getByRole('heading', { level: 1, name: 'Journal technique' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Compte' })).toBeVisible()
    await expect(page.getByText('Écran : Chiffres du dimanche')).toBeVisible()
    await expect(page.getByText('Écran : Présence à une session')).toBeVisible()
    await expect(lignes(page)).toHaveCount(22)
    // Son onglet mène à /journal-technique, pas à /journal.
    const onglet = page
      .getByRole('link', { name: 'Journal technique', includeHidden: true })
      .first()
    await expect(onglet).toHaveAttribute('href', '/journal-technique')
  })

  test('le berger ne lit aucun signalement', async ({ page }) => {
    await ouvrir(page, { profil: 'berger', periode: '7j' })
    await expect(page.getByText('Écran : Chiffres du dimanche')).toHaveCount(0)
    await expect(
      page.getByRole('combobox', { name: 'Action' }).getByRole('option', {
        name: 'A signalé une difficulté',
      }),
    ).toHaveCount(0)
  })
})

test.describe('états (T36)', () => {
  test('journal vide : une phrase de premier usage', async ({ page }) => {
    await ouvrir(page, { profil: 'berger', etat: 'vide', periode: 'tout' })
    await expect(page.getByText("Le journal est vide pour l'instant.")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retirer les filtres' })).toHaveCount(0)
  })

  test('chargement : le titre est déjà là, « Chargement » après 300 ms', async ({ page }) => {
    await ouvrir(page, { etat: 'chargement' })
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible()
    await expect(page.getByText('Chargement', { exact: true })).toBeVisible()
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1)
  })

  test('problème passager : le bandeau et « Réessayer »', async ({ page }) => {
    await ouvrir(page, { etat: 'erreur' })
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(/La connexion a échoué. Réessayez./)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('accessibilité', () => {
  for (const ecran of TOUS) {
    test(`audit axe : ${nomDe(ecran)}`, async ({ page }) => {
      await ouvrir(page, ecran)
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })
  }

  test('liens, boutons et listes du contenu : 44 px de haut au moins', async ({ page }) => {
    for (const ecran of [
      { profil: 'berger', ministere: 'min-jeunesse' },
      { profil: 'ministere' },
      { etat: 'erreur' },
    ]) {
      await ouvrir(page, ecran)
      const cibles = page.getByRole('main').locator('a:visible, button:visible, select:visible')
      for (let rang = 0; rang < (await cibles.count()); rang++) {
        const boite = await cibles.nth(rang).boundingBox()
        expect(
          boite?.height ?? 0,
          `${nomDe(ecran)}, cible ${rang}, hauteur`,
        ).toBeGreaterThanOrEqual(44)
        expect(boite?.width ?? 0, `${nomDe(ecran)}, cible ${rang}, largeur`).toBeGreaterThanOrEqual(
          44,
        )
      }
    }
  })

  test('à 360 px, aucun défilement horizontal', async ({ page }) => {
    test.slow()
    await page.setViewportSize({ width: 360, height: 800 })
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nomDe(ecran)).toBeLessThanOrEqual(0)
    }
  })

  test('à 200 % de zoom (720 px de large), rien ne déborde', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 800 })
    for (const ecran of TOUS.slice(0, 4)) {
      await ouvrir(page, ecran)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nomDe(ecran)).toBeLessThanOrEqual(0)
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.slow()
  const largeur = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/journal-${nomDe(ecran)}-${largeur}.png`,
      fullPage: true,
    })
  }
})
