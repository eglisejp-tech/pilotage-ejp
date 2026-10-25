import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  accepterConditionsSiDemande,
  codeTotp,
  COMPTES_PROFILS,
  declarerPrenom,
  ouvrirMenuSiBesoin,
  PRENOM_TEST,
  saisirMotDePasse,
  secretDe,
  seConnecter,
} from '../comptes.ts'

// « Changer d'espace » (T73) avec la base locale (CI, E2E_BASE=1) : EJP Tech ouvre ses deux
// comptes sur le même navigateur (T48 : la plateforme et un ministère), passe de l'un à l'autre
// sans se reconnecter, puis « Se déconnecter » les ferme tous. Le ministère Communication du jeu
// d'exemple tient lieu de ministère Tech. Parcours en écriture : la déclaration du prénom (T56)
// ajoute une ligne, comme toute connexion d'un compte de ministère.

function compte(profil: 'ministere' | 'admin_plateforme') {
  const trouve = COMPTES_PROFILS.find((candidat) => candidat.profil === profil)
  if (!trouve) throw new Error(`Compte ${profil} absent de COMPTES_PROFILS.`)
  return trouve
}
const PLATEFORME = compte('admin_plateforme')
const MINISTERE = compte('ministere')

/** Ouvre « Changer d'espace » dans l'en-tête (dans le menu au téléphone et pour EJP Tech). */
async function ouvrirChangerDEspace(page: Page) {
  await ouvrirMenuSiBesoin(page)
  await page.getByRole('button', { name: "Changer d'espace" }).filter({ visible: true }).click()
}

/** Les connexions gardées par auth-js dans ce navigateur. */
function clesDeConnexion(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(window.localStorage).filter(
      (cle) => cle.startsWith('sb-') && cle.endsWith('-auth-token'),
    ),
  )
}

test('EJP Tech passe de la plateforme au ministère et revient sans se reconnecter', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seConnecter(page, PLATEFORME.email)
  await expect(page).toHaveTitle('Modération, Pilotage EJP')

  // « Ajouter un compte » : la connexion d'un nouvel espace, l'autre compte reste à un appui.
  await ouvrirChangerDEspace(page)
  await page.getByRole('button', { name: 'Ajouter un compte' }).click()
  await expect(page).toHaveURL(/\/connexion/)
  await expect(
    page.getByText('Connectez-vous avec le compte à ajouter. Vos autres comptes restent ouverts.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: `Revenir à ${PLATEFORME.libelle}` })).toBeVisible()
  await saisirMotDePasse(page, MINISTERE.email)
  await expect(page.getByRole('heading', { level: 1, name: 'Code de vérification' })).toBeVisible()
  await page.getByLabel('Code à 6 chiffres').fill(await codeTotp(secretDe(MINISTERE.email)))
  await page.getByRole('button', { name: 'Vérifier le code' }).click()
  await expect(page).not.toHaveURL(/\/double-authentification/)
  if (new URL(page.url()).pathname === '/qui-utilise') await declarerPrenom(page, PRENOM_TEST)
  await accepterConditionsSiDemande(page)
  await expect(page).toHaveTitle(`${MINISTERE.accueil.titre}, Pilotage EJP`)
  await expect(
    page.getByRole('banner').getByText(MINISTERE.libelle).filter({ visible: true }).first(),
  ).toBeVisible()
  expect(await clesDeConnexion(page)).toHaveLength(2)

  // Passer à la plateforme : son accueil, la modération, sans connexion à refaire.
  await ouvrirChangerDEspace(page)
  await page.getByRole('button', { name: `Passer à ${PLATEFORME.libelle}` }).click()
  await expect(page).toHaveTitle('Modération, Pilotage EJP')
  await expect(page).not.toHaveURL(/\/connexion|\/double-authentification/)
  await expect(
    page.getByRole('banner').getByText(PLATEFORME.libelle).filter({ visible: true }).first(),
  ).toBeVisible()

  // Revenir au ministère, le même jour : ni connexion ni prénom à redonner (T63).
  await ouvrirChangerDEspace(page)
  await page.getByRole('button', { name: `Passer à ${MINISTERE.libelle}` }).click()
  await expect(page).toHaveTitle(`${MINISTERE.accueil.titre}, Pilotage EJP`)
  await expect(page).not.toHaveURL(/\/connexion|\/qui-utilise/)

  // « Se déconnecter » ferme les deux comptes : plus aucune connexion gardée.
  await ouvrirMenuSiBesoin(page)
  await page.getByRole('button', { name: 'Se déconnecter' }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Revenir à/ })).toHaveCount(0)
  expect(await clesDeConnexion(page)).toEqual([])
  await page.goto('/')
  await expect(page).toHaveURL(/\/connexion/)
})
