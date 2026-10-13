import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { VERSION_CONDITIONS } from '../../src/lib/metier/conditions.ts'
import {
  COMPTE_CONDITIONS,
  declarerPrenom,
  fichierSession,
  PRENOM_TEST,
  seConnecter,
} from '../comptes.ts'
import { jetonAcces, lire } from './outils-evenements.ts'

// Acceptation des conditions (T53), par personne sur un compte partagé de ministère (T61), avec
// la base locale : projet « ecritures » (en série, 1440 px). Le script d'installation
// (installer-comptes.ts) fait accepter la version courante à tous les comptes d'exemple sauf
// Prodiges Junior. Sur ce compte, la personne dit d'abord son prénom, puis voit l'écran à son
// nom, ne peut pas continuer sans cocher la case, accepte, arrive sur la page demandée, et n'est
// plus interrogée à sa connexion suivante. Une deuxième personne du même compte, sur un autre
// appareil, ne profite pas de cette acceptation : elle accepte à son tour. EJP Tech lit qui a
// accepté quelle version ; le compte n'écrit rien dans l'acceptation par compte.

test.describe.configure({ mode: 'serial' })

const TITRE = "Conditions d'utilisation"
const DATE_VERSION = 'Conditions du 13 octobre 2026'

/** « Léa Kqz » : trois lettres tirées au hasard, sans chiffre (la base refuse les chiffres). */
function prenomUnique(): string {
  const lettre = () => String.fromCharCode(97 + Math.floor(Math.random() * 26))
  return `Léa ${lettre().toUpperCase()}${lettre()}${lettre()}`
}
const SECONDE_PERSONNE = prenomUnique()

/** Les acceptations que la session de la page lit : celles de la personne déclarée seulement. */
const lireMesAcceptations = (page: Page) =>
  lire<{ version: string; saisi_par: string; intervenant_id: number }>(
    page,
    'acceptation_personne?select=version,saisi_par,intervenant_id',
  )

/** Identifiant du compte de la page, lu dans son jeton. */
async function idDuCompte(page: Page): Promise<string> {
  const charge = (await jetonAcces(page)).split('.')[1] ?? ''
  const { sub } = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8')) as {
    sub?: string
  }
  if (!sub) throw new Error('Jeton sans compte.')
  return sub
}

async function cocherEtAccepter(page: Page) {
  await page.getByRole('checkbox', { name: /J'accepte les conditions d'utilisation/ }).check()
  await page.getByRole('button', { name: 'Accepter et continuer' }).click()
  await expect(page).not.toHaveURL(/\/conditions-a-accepter/)
}

test("une personne qui n'a pas accepté dit son prénom, voit l'écran à son nom, accepte, puis n'est plus interrogée", async ({
  page,
}) => {
  test.setTimeout(180_000)
  await seConnecter(page, COMPTE_CONDITIONS.email, { prenom: null })

  // Compte partagé (T61) : le prénom d'abord, l'adresse demandée gardée.
  await expect(page).toHaveURL(/\/qui-utilise$/)
  await page.goto('/points')
  await expect(page).toHaveURL(/\/qui-utilise\?retour=%2Fpoints$/)
  await declarerPrenom(page, PRENOM_TEST)

  // Puis les conditions de cette personne : l'écran remplace l'application.
  await expect(page).toHaveURL(/\/conditions-a-accepter\?retour=%2Fpoints$/)
  await expect(page.getByRole('heading', { level: 1, name: TITRE })).toBeVisible()
  await expect(page.getByText(COMPTE_CONDITIONS.libelle)).toBeVisible()
  await expect(page.getByText(DATE_VERSION)).toBeVisible()
  await expect(
    page.getByText(
      "Ce compte est partagé : chaque personne qui l'utilise accepte elle-même les conditions.",
    ),
  ).toBeVisible()
  await expect(page.getByText(`Vous : ${PRENOM_TEST}`)).toBeVisible()
  await expect(page.getByRole('link', { name: "Ce n'est pas moi" })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
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

  // Avec la case : retour à l'adresse demandée (« Mes points »), une ligne pour cette personne,
  // saisie par le compte, et aucune acceptation par compte.
  await cocherEtAccepter(page)
  await expect(page).toHaveURL((url) => url.pathname === '/points')
  await expect(page).toHaveTitle('Mes points, Pilotage EJP')
  const lignes = await lireMesAcceptations(page)
  expect(lignes).toHaveLength(1)
  expect(lignes[0]?.version).toBe(VERSION_CONDITIONS)
  expect(lignes[0]?.saisi_par).toBe(await idDuCompte(page))
  expect(await lire(page, 'acceptation_conditions?select=version')).toEqual([])

  // À la connexion suivante, le prénom est redemandé (à chaque connexion, champ vide) ; la même
  // personne a déjà accepté : l'accueil, sans l'écran des conditions.
  await page.getByRole('banner').getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion/)
  await seConnecter(page, COMPTE_CONDITIONS.email, { prenom: null })
  await expect(page).toHaveURL(/\/qui-utilise$/)
  await expect(page.getByLabel('Votre prénom')).toHaveValue('')
  await declarerPrenom(page, PRENOM_TEST)
  await expect(page).toHaveTitle('Ma semaine, Pilotage EJP')
  await expect(page).toHaveURL((url) => url.pathname === '/')
  expect(await lireMesAcceptations(page)).toHaveLength(1)
})

test('une deuxième personne du même compte, sur un autre appareil, accepte à son tour ; EJP Tech lit les deux', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const ailleurs = await browser.newContext()
  const page = await ailleurs.newPage()
  await seConnecter(page, COMPTE_CONDITIONS.email, { prenom: SECONDE_PERSONNE })

  // L'acceptation de la première personne ne vaut pas pour elle.
  await expect(page).toHaveURL(/\/conditions-a-accepter$/)
  await expect(page.getByText(`Vous : ${SECONDE_PERSONNE}`)).toBeVisible()
  expect(await lireMesAcceptations(page)).toEqual([])
  await cocherEtAccepter(page)
  await expect(page).toHaveTitle('Ma semaine, Pilotage EJP')
  const lignes = await lireMesAcceptations(page)
  expect(lignes).toHaveLength(1)
  expect(lignes[0]?.version).toBe(VERSION_CONDITIONS)
  const compte = await idDuCompte(page)
  await ailleurs.close()

  // EJP Tech : chaque personne du compte, avec la version qu'elle a acceptée.
  const tech = await browser.newContext({ storageState: fichierSession('admin_plateforme') })
  const pageTech = await tech.newPage()
  await pageTech.goto('/personnes')
  await expect(pageTech.getByRole('heading', { level: 1, name: 'Personnes' })).toBeVisible()
  const personnes = await lire<{ prenom: string; version_acceptee: string | null }>(
    pageTech,
    `v_personnes?select=prenom,version_acceptee&compte=eq.${compte}`,
  )
  for (const prenom of [PRENOM_TEST, SECONDE_PERSONNE]) {
    expect(personnes.find((p) => p.prenom === prenom)?.version_acceptee, prenom).toBe(
      VERSION_CONDITIONS,
    )
  }
  const actives = pageTech.getByRole('region', { name: 'Actives sur 30 jours' })
  await expect(actives.getByText(SECONDE_PERSONNE, { exact: true })).toBeVisible()
  await expect(actives.getByRole('listitem').filter({ hasText: SECONDE_PERSONNE })).toContainText(
    `${DATE_VERSION} acceptées le `,
  )
  await tech.close()
})
