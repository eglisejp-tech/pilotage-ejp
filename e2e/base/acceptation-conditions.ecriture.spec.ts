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
  texteVersionConditions,
} from '../comptes.ts'
import { appeler, jetonAcces, lire } from './outils-evenements.ts'

// Acceptation des conditions (T53), par personne sur un compte partagé de ministère (T61), avec
// la base locale : projet « ecritures » (en série, 1440 px). Le script d'installation
// (installer-comptes.ts) fait accepter la version courante à tous les comptes d'exemple sauf
// Prodiges Junior. Sur ce compte, la personne dit d'abord son prénom, puis voit l'écran à son
// nom, ne peut pas continuer sans cocher la case, accepte, arrive sur la page demandée, et n'est
// plus interrogée à sa connexion suivante. Une deuxième personne du même compte, sur un autre
// appareil, ne profite pas de cette acceptation : elle accepte à son tour. EJP Tech seul lit qui a
// accepté quelle version (la session d'un ministère demande seulement oui ou non) ; le compte
// n'écrit rien dans l'acceptation par compte.

test.describe.configure({ mode: 'serial' })

const TITRE = "Conditions d'utilisation"
const DATE_VERSION = texteVersionConditions(VERSION_CONDITIONS)

/** « Léa Kqz » : trois lettres tirées au hasard, sans chiffre (la base refuse les chiffres). */
function prenomUnique(): string {
  const lettre = () => String.fromCharCode(97 + Math.floor(Math.random() * 26))
  return `Léa ${lettre().toUpperCase()}${lettre()}${lettre()}`
}
const SECONDE_PERSONNE = prenomUnique()

/** La question de l'écran, posée par la session de la page : sa personne a-t-elle accepté ? */
async function personneAAccepte(page: Page): Promise<boolean> {
  const reponse = await appeler(page, 'conditions_acceptees', { p_version: VERSION_CONDITIONS })
  expect(reponse.status()).toBe(200)
  return (await reponse.json()) as boolean
}

/** Les lignes de la table que la session de la page lit : aucune, EJP Tech seul les lit. */
const lignesLisibles = (page: Page) => lire<unknown>(page, 'acceptation_personne?select=id')

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
    page.getByText(`Chaque personne du compte accepte elle-même. Vous : ${PRENOM_TEST}`),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: "Ce n'est pas moi" })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  expect(await personneAAccepte(page)).toBe(false)

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
  expect(await personneAAccepte(page)).toBe(false)

  // Avec la case : retour à l'adresse demandée (« Mes points »). La réponse est oui ; la session
  // ne lit aucune ligne de la table (EJP Tech seul, vérifié plus bas) et n'écrit rien dans
  // l'acceptation par compte.
  await cocherEtAccepter(page)
  await expect(page).toHaveURL((url) => url.pathname === '/points')
  await expect(page).toHaveTitle('Mes points, Pilotage EJP')
  expect(await personneAAccepte(page)).toBe(true)
  expect(await lignesLisibles(page)).toEqual([])
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
  expect(await personneAAccepte(page)).toBe(true)
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
  expect(await personneAAccepte(page)).toBe(false)
  await cocherEtAccepter(page)
  await expect(page).toHaveTitle('Ma semaine, Pilotage EJP')
  expect(await personneAAccepte(page)).toBe(true)
  expect(await lignesLisibles(page)).toEqual([])
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
  // EJP Tech lit aussi les lignes : une par personne, attachée à sa déclaration, saisie par le
  // compte.
  const declarations = await lire<{ id: number }>(
    pageTech,
    `intervenant?select=id&compte=eq.${compte}`,
  )
  const lignes = await lire<{ version: string; saisi_par: string }>(
    pageTech,
    `acceptation_personne?select=version,saisi_par&intervenant_id=in.(${declarations.map((d) => d.id).join(',')})`,
  )
  expect(lignes).toHaveLength(2)
  for (const ligne of lignes) {
    expect(ligne.version).toBe(VERSION_CONDITIONS)
    expect(ligne.saisi_par).toBe(compte)
  }
  const actives = pageTech.getByRole('region', { name: 'Actives sur 30 jours' })
  await expect(actives.getByText(SECONDE_PERSONNE, { exact: true })).toBeVisible()
  await expect(actives.getByRole('listitem').filter({ hasText: SECONDE_PERSONNE })).toContainText(
    `${DATE_VERSION} acceptées le `,
  )
  await tech.close()
})
