import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  COMPTE_DECONNEXION,
  COMPTE_SANS_FACTEUR,
  COMPTES_PROFILS,
  fichierSession,
  ouvrirMenuSiBesoin,
  saisirMotDePasse,
  seConnecter,
  suivreRequetesDeDonnees,
} from '../comptes.ts'

// Parcours avec la base locale (job « e2e » de la CI, E2E_BASE=1) : routage selon le niveau,
// navigation par profil, adresse interdite, activation et déconnexion (BRIEF sections 8 et 13).

/** Jeton d'accès de la session enregistrée par auth-js dans ce navigateur. */
async function jetonAcces(page: Page): Promise<string> {
  const jeton = await page.evaluate(() => {
    const cle = Object.keys(localStorage).find((nom) => /^sb-.*-auth-token$/.test(nom))
    const session = cle
      ? (JSON.parse(localStorage.getItem(cle) ?? '{}') as { access_token?: string })
      : {}
    return session.access_token ?? null
  })
  if (!jeton) throw new Error('Aucune session enregistrée dans le navigateur.')
  return jeton
}

/** Lecture directe d'une table avec le jeton de la page : la RLS décide, pas l'interface. */
async function lireDirectement(page: Page, table: string): Promise<unknown> {
  const url = process.env.VITE_SUPABASE_URL
  const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !cle) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent.')
  const reponse = await page.request.get(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey: cle, Authorization: `Bearer ${await jetonAcces(page)}` },
  })
  expect(reponse.status()).toBe(200)
  return reponse.json()
}

for (const compte of COMPTES_PROFILS) {
  test.describe(`profil ${compte.profil}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('arrive sur son accueil et ne voit que ses onglets', async ({ page }) => {
      // L'arrivée après la connexion est vérifiée par le projet « connexion » ; « / » est
      // « Cette semaine » pour tous, EJP Tech compris (T29), dont l'accueil reste /moderation.
      await page.goto(compte.accueil.chemin)
      // Le titre de l'onglet : sur « / », le h1 est la phrase de la semaine (étape 3).
      await expect(page).toHaveTitle(`${compte.accueil.titre}, Pilotage EJP`)
      await expect(page).toHaveURL((url) => url.pathname === compte.accueil.chemin)
      await expect(page.getByRole('banner')).toContainText(compte.libelle)
      await ouvrirMenuSiBesoin(page)
      const navigation = page.getByRole('navigation', { name: 'Navigation principale' })
      await expect(navigation.getByRole('link')).toHaveText(compte.onglets)
      await expect(navigation.getByRole('link', { name: compte.accueil.titre })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })

    test("n'obtient rien d'une adresse réservée à un autre profil", async ({ page }) => {
      const requetes = suivreRequetesDeDonnees(page)
      await page.goto(compte.adresseInterdite)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeVisible()
      await expect(page.getByText('Elle est réservée à un autre profil.')).toBeVisible()
      // Seule la ligne du compte connecté est lue, avant l'affichage.
      expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
    })

    test('captures de l’en-tête et du menu', { tag: '@captures' }, async ({ page }) => {
      const largeur = page.viewportSize()?.width ?? 0
      await page.goto(compte.accueil.chemin)
      await expect(page).toHaveTitle(`${compte.accueil.titre}, Pilotage EJP`)
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)
      const nom = `base-${compte.profil}-${largeur}`
      await page.screenshot({ path: `test-results/captures/${nom}-entete.png` })
      const menu = page.getByRole('button', { name: 'Ouvrir le menu' })
      if (await menu.isVisible()) {
        await menu.click()
        await page.screenshot({ path: `test-results/captures/${nom}-menu.png` })
      }
    })
  })
}

test('un compte sans double authentification va vers l’activation et ne voit aucune donnée', async ({
  page,
}, infos) => {
  // Un seul format : trois enrôlements simultanés du même compte se gêneraient.
  test.skip(infos.project.name !== 'telephone', 'Un seul enrôlement à la fois pour ce compte.')
  const requetes = suivreRequetesDeDonnees(page)
  await page.goto('/ma-fiche')
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fma-fiche$/)
  await saisirMotDePasse(page, COMPTE_SANS_FACTEUR.email)

  await expect(
    page.getByRole('heading', { level: 1, name: 'Activer la double authentification' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/double-authentification/)
  await expect(
    page.getByRole('img', { name: "QR code d'activation de Pilotage EJP" }),
  ).toBeVisible()
  await expect(page.getByText('Compte partagé.')).toBeVisible()
  await expect(page.getByText(COMPTE_SANS_FACTEUR.libelle)).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)

  // Toute adresse de l'application ramène à l'activation.
  await page.goto('/')
  await expect(page).toHaveURL(/\/double-authentification/)
  expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])

  // En aal1, la base ne rend rien, même interrogée directement.
  expect(await lireDirectement(page, 'ministere')).toEqual([])
  expect(await lireDirectement(page, 'journal')).toEqual([])
  // Seule exception aal1 : sa propre ligne de compte.
  const comptes = (await lireDirectement(page, 'compte')) as { libelle: string }[]
  expect(comptes.map((ligne) => ligne.libelle)).toEqual([COMPTE_SANS_FACTEUR.libelle])

  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion/)
})

test('« Se déconnecter » ferme la session de cet appareil', async ({ page }, infos) => {
  test.skip(infos.project.name !== 'ordinateur', 'Une vérification de code de plus suffit.')
  await seConnecter(page, COMPTE_DECONNEXION.email)
  await expect(page).toHaveTitle('Cette semaine, Pilotage EJP')
  await expect(page.getByRole('banner')).toContainText(COMPTE_DECONNEXION.libelle)

  await page.getByRole('banner').getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('alert')).toHaveCount(0)
  const restantes = await page.evaluate(() =>
    Object.keys(localStorage).filter((nom) => /^sb-.*-auth-token$/.test(nom)),
  )
  expect(restantes).toEqual([])

  await page.goto('/journal')
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fjournal$/)
})
