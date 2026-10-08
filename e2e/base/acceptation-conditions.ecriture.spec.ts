import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { VERSION_CONDITIONS } from '../../src/lib/metier/conditions.ts'
import { COMPTE_CONDITIONS, seConnecter } from '../comptes.ts'
import { lire } from './outils-evenements.ts'

// Acceptation des conditions (T53) avec la base locale : projet « ecritures » (en série, 1440 px).
// Le script d'installation (installer-comptes.ts) fait accepter la version courante à tous les
// comptes d'exemple sauf Prodiges Junior : ce compte voit l'écran à sa première connexion, ne
// peut pas continuer sans cocher la case, accepte, arrive sur son accueil, puis n'est plus
// interrogé à la connexion suivante.

test.describe.configure({ mode: 'serial' })

const TITRE = "Conditions d'utilisation"
const lireMesAcceptations = (page: Parameters<typeof lire>[0]) =>
  lire<{ version: string; saisi_par: string; compte: string }>(
    page,
    'acceptation_conditions?select=version,saisi_par,compte',
  )

test("un compte qui n'a pas accepté voit l'écran, accepte, puis n'est plus interrogé", async ({
  page,
}) => {
  await seConnecter(page, COMPTE_CONDITIONS.email)

  // L'écran remplace l'application : ni onglets, ni données, et toute adresse y ramène.
  await expect(page).toHaveURL(/\/conditions-a-accepter$/)
  await expect(page.getByRole('heading', { level: 1, name: TITRE })).toBeVisible()
  await expect(page.getByText(COMPTE_CONDITIONS.libelle)).toBeVisible()
  await expect(page.getByText('Conditions du 8 octobre 2026')).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await page.goto('/points')
  await expect(page).toHaveURL(/\/conditions-a-accepter\?retour=%2Fpoints$/)
  expect(await lireMesAcceptations(page)).toEqual([])

  // Accessibilité et 360 px.
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
  await page.setViewportSize({ width: 360, height: 800 })
  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(debordement).toBeLessThanOrEqual(0)
  await page.setViewportSize({ width: 1440, height: 900 })

  // Liens vers les deux pages, dans un nouvel onglet.
  await expect(
    page.getByRole('link', { name: "Lire les conditions d'utilisation (nouvel onglet)" }),
  ).toHaveAttribute('href', '/conditions')
  await expect(
    page.getByRole('link', { name: 'Lire la politique de confidentialité (nouvel onglet)' }),
  ).toHaveAttribute('href', '/confidentialite')

  // Sans la case : le message, et rien n'est écrit.
  const bouton = page.getByRole('button', { name: 'Accepter et continuer' })
  await bouton.click()
  await expect(page.getByText('Cochez la case pour continuer.')).toBeVisible()
  expect(await lireMesAcceptations(page)).toEqual([])

  // Avec la case : retour à l'adresse demandée avant l'écran (« Mes points »), et une ligne
  // d'acceptation pour ce compte.
  await page.getByRole('checkbox', { name: /J'accepte les conditions d'utilisation/ }).check()
  await bouton.click()
  await expect(page).toHaveURL((url) => url.pathname === '/points')
  await expect(page).toHaveTitle('Mes points, Pilotage EJP')
  const lignes = await lireMesAcceptations(page)
  expect(lignes).toHaveLength(1)
  expect(lignes[0]?.version).toBe(VERSION_CONDITIONS)
  expect(lignes[0]?.saisi_par).toBe(lignes[0]?.compte)

  // À la connexion suivante, la version est déjà acceptée : l'accueil, sans l'écran.
  await page.getByRole('banner').getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await seConnecter(page, COMPTE_CONDITIONS.email)
  await expect(page).toHaveTitle('Cette semaine, Pilotage EJP')
  await expect(page).toHaveURL((url) => url.pathname === '/')
  expect(await lireMesAcceptations(page)).toHaveLength(1)
})
