import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Suivi des signalements (T77) sur l'aperçu de développement, côté ministère : la page « Mes
// signalements » (le cas de Coordination : Répondu le 27 oct., à vérifier jusqu'au 3 nov.), puis
// le bandeau et la ligne de « Ma semaine ». Données d'exemple, jour de l'aperçu le mercredi
// 28 oct. 2026, envois simulés comme la base (aucune base, aucune écriture). Trois formats par
// les projets Playwright : 1440, 834 et 390 px.

const RAPPEL = "N'écrivez aucun nom ni information personnelle."
const OUI = "Oui, c'est réglé"
const REPONDRE = 'Répondre à EJP Tech'
const CHAMP = 'Votre réponse à EJP Tech'
const AIDE = 'Répondez à sa question, ou dites ce qui ne va toujours pas.'
const COORDINATION = 'Ajouter un événement, 26 oct.'

async function ouvrir(page: Page, requete: string) {
  await page.goto(`/apercu/signalements?profil=ministere&${requete}`)
  await page.evaluate(() => document.fonts.ready)
}

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

const groupe = (page: Page, nom: string) => page.getByRole('region', { name: nom, exact: true })
/** Le signalement de Coordination (« Ajouter un événement, 26 oct. »), où qu'il soit. */
const signalementCoordination = (page: Page): Locator =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name: COORDINATION }) })

test.describe('Mes signalements (ministère), aperçu', () => {
  test('titre, trois groupes dans l’ordre, chaque signalement avec son statut et sa ligne d’état', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi')
    await expect(page).toHaveTitle('Mes signalements, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes signalements')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'À vérifier',
      'En cours',
      'Clos ces 30 derniers jours',
    ])

    // À vérifier : le Répondu de Coordination, sa question, « Est-ce réglé ? » et les deux boutons.
    const repondu = groupe(page, 'À vérifier').getByRole('article')
    await expect(repondu).toHaveCount(1)
    await expect(repondu.getByRole('heading', { level: 3 })).toHaveText(COORDINATION)
    await expect(repondu).toContainText('Répondu')
    await expect(repondu).toContainText(
      '« Problème au niveau de la saisie des événement dans le calendrier »',
    )
    await expect(repondu).toContainText('EJP Tech vous a répondu le 27 oct.')
    await expect(repondu).toContainText(
      "Quel événement, à quelle date, et quel message s'affiche quand vous enregistrez ?",
    )
    const question = repondu.getByRole('group', { name: 'Est-ce réglé ?' })
    await expect(question.getByRole('button')).toHaveText([OUI, REPONDRE])
    await expect(repondu).toContainText("Vous pouvez répondre jusqu'au 3 nov.")

    // En cours : après la réponse du ministère, puis un Reçu, du plus ancien au plus récent.
    const enCours = groupe(page, 'En cours').getByRole('article')
    await expect(enCours).toHaveCount(2)
    await expect(enCours.first()).toContainText('En cours')
    await expect(enCours.first()).toContainText(
      'Vous avez répondu le 27 oct. EJP Tech reprend votre signalement.',
    )
    await expect(enCours.nth(1)).toContainText('Reçu')
    await expect(enCours.nth(1)).toContainText('EJP Tech a reçu votre signalement le 28 oct.')
    await expect(groupe(page, 'En cours').getByRole('button')).toHaveCount(0)

    // Clos : les derniers clos d'abord, chacun avec sa raison, sans bouton.
    const clos = groupe(page, 'Clos ces 30 derniers jours').getByRole('article')
    await expect(clos).toHaveCount(3)
    await expect(clos.first()).toContainText(
      'Clos le 14 oct., sans retour de votre part. Si la difficulté revient, faites un nouveau signalement.',
    )
    await expect(clos.nth(1)).toContainText("Vous avez confirmé que c'est réglé le 13 oct.")
    await expect(clos.nth(2)).toContainText('Clos par EJP Tech le 8 oct.')
    await expect(clos.nth(2)).toContainText(
      "Réponse : Transmis à l'administration de l'église, qui vous recontacte.",
    )
    await expect(groupe(page, 'Clos ces 30 derniers jours').getByRole('button')).toHaveCount(0)
  })

  test('le suivi daté : une liste, du plus ancien au plus récent, chaque date dans un <time>', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi')
    const suivi = signalementCoordination(page).getByRole('list', { name: 'Suivi' })
    await expect(suivi.getByRole('listitem')).toHaveText([
      '26 oct. Signalement envoyé',
      '27 oct. Pris en charge par EJP Tech',
      "27 oct. Réponse d'EJP Tech : « Quel événement, à quelle date, et quel message s'affiche quand vous enregistrez ? »",
    ])
    await expect(suivi.locator('time').first()).toHaveAttribute('datetime', '2026-10-26')
    const enCours = groupe(page, 'En cours').getByRole('article').first()
    await expect(
      enCours.getByRole('list', { name: 'Suivi' }).getByRole('listitem').last(),
    ).toHaveText(
      "27 oct. Votre réponse : « L'heure de 20 h 30 est refusée, un message rouge s'affiche. »",
    )
  })

  test('« Oui, c’est réglé » : annoncé, le signalement passe dans les clos, focus sur son en-tête', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi')
    await signalementCoordination(page).getByRole('button', { name: OUI }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Merci' })).toHaveText(
      'Merci. Le signalement est clos.',
    )
    await expect(groupe(page, 'À vérifier')).toHaveCount(0)
    const clos = groupe(page, 'Clos ces 30 derniers jours')
    const deplace = clos
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: COORDINATION }) })
    await expect(deplace).toContainText("Vous avez confirmé que c'est réglé le 28 oct.")
    await expect(deplace.getByRole('button')).toHaveCount(0)
    await expect(deplace.getByRole('heading', { name: COORDINATION })).toBeFocused()
  })

  test('« Répondre à EJP Tech » : le panneau, les contrôles, le refus de la base, puis l’envoi', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi')
    const bouton = signalementCoordination(page).getByRole('button', { name: REPONDRE })
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await bouton.click()
    await expect(bouton).toHaveAttribute('aria-expanded', 'true')
    const champ = page.getByLabel(CHAMP)
    await expect(champ).toBeFocused()
    await expect(champ).toHaveAccessibleDescription(`${AIDE} ${RAPPEL} 0 sur 280`)
    await expect(page.getByText(RAPPEL)).toHaveCount(1)

    const envoyer = page.getByRole('button', { name: 'Envoyer la réponse' })
    await envoyer.click()
    await expect(page.getByText('Écrivez au moins 10 caractères.')).toBeVisible()
    // Critère 17 : la base refuse un numéro de téléphone ; le texte reste dans le champ.
    await champ.fill('Appelez Jean au 06 12 34 56 78')
    await envoyer.click()
    await expect(page.getByText(RAPPEL)).toHaveCount(2)
    await expect(champ).toHaveValue('Appelez Jean au 06 12 34 56 78')

    await champ.fill("L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche.")
    await envoyer.click()
    await expect(page.getByRole('status').filter({ hasText: 'Réponse envoyée' })).toHaveText(
      'Réponse envoyée. EJP Tech reprend votre signalement.',
    )
    await expect(groupe(page, 'À vérifier')).toHaveCount(0)
    const deplace = groupe(page, 'En cours')
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: COORDINATION }) })
    await expect(deplace).toContainText(
      'Vous avez répondu le 28 oct. EJP Tech reprend votre signalement.',
    )
    await expect(deplace.getByRole('heading', { name: COORDINATION })).toBeFocused()
  })

  test('« Annuler » : sans texte le panneau se ferme, avec un texte « Fermer sans enregistrer ? »', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi')
    const bouton = signalementCoordination(page).getByRole('button', { name: REPONDRE })
    await bouton.click()
    await signalementCoordination(page).getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByLabel(CHAMP)).toHaveCount(0)
    await expect(bouton).toBeFocused()

    await bouton.click()
    await page.getByLabel(CHAMP).fill('Toujours le même message rouge.')
    await signalementCoordination(page).getByRole('button', { name: 'Annuler' }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })
    await fenetre.getByRole('button', { name: 'Continuer la saisie' }).click()
    await expect(page.getByLabel(CHAMP)).toHaveValue('Toujours le même message rouge.')
    await signalementCoordination(page).getByRole('button', { name: 'Annuler' }).click()
    await fenetre.getByRole('button', { name: 'Fermer sans enregistrer' }).click()
    await expect(page.getByLabel(CHAMP)).toHaveCount(0)
    await expect(bouton).toBeFocused()
  })

  test('sans réseau : « L’envoi n’a pas abouti. Réessayez. » sous les boutons, focus gardé', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi&envoi=echec')
    const oui = signalementCoordination(page).getByRole('button', { name: OUI })
    await oui.click()
    await expect(signalementCoordination(page)).toContainText("L'envoi n'a pas abouti. Réessayez.")
    await expect(oui).toBeFocused()
    await expect(groupe(page, 'À vérifier').getByRole('article')).toHaveCount(1)
  })

  test('refus de la base (délai passé) : « Ce signalement est déjà clos. », puis la liste se relit', async ({
    page,
  }) => {
    await ouvrir(page, 'vue=suivi&envoi=clos')
    await signalementCoordination(page).getByRole('button', { name: OUI }).click()
    await expect(page.getByText('Ce signalement est déjà clos.')).toBeVisible()
  })

  test('états : rien, seulement des clos, chargement, problème passager', async ({ page }) => {
    await ouvrir(page, 'vue=suivi-vide')
    await expect(page.getByRole('main')).toContainText(
      'Aucun signalement. En cas de difficulté sur un formulaire de saisie, utilisez le lien « Signaler une difficulté » en bas du formulaire.',
    )
    await ouvrir(page, 'vue=suivi-clos')
    await expect(page.getByText('Aucun signalement ouvert.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Clos ces 30 derniers jours'])
    await ouvrir(page, 'vue=suivi-chargement')
    await expect(page.getByText('Chargement de vos signalements')).toBeVisible()
    await ouvrir(page, 'vue=suivi-probleme')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  test('à 390 px : les deux boutons s’empilent sur toute la largeur, aucun défilement horizontal', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'Largeur de téléphone')
    await ouvrir(page, 'vue=suivi')
    const question = signalementCoordination(page).getByRole('group', { name: 'Est-ce réglé ?' })
    const oui = await question.getByRole('button', { name: OUI }).boundingBox()
    const repondre = await question.getByRole('button', { name: REPONDRE }).boundingBox()
    expect(oui && repondre).toBeTruthy()
    if (oui && repondre) {
      expect(repondre.y).toBeGreaterThan(oui.y)
      expect(Math.abs(oui.width - repondre.width)).toBeLessThanOrEqual(1)
      expect(oui.width).toBeGreaterThan(300)
    }
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debord).toBeLessThanOrEqual(0)
  })

  test('audit axe : la liste, le panneau ouvert, les états', async ({ page }) => {
    await ouvrir(page, 'vue=suivi')
    await auditer(page)
    await signalementCoordination(page).getByRole('button', { name: REPONDRE }).click()
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click()
    await expect(page.getByText('Écrivez au moins 10 caractères.')).toBeVisible()
    await auditer(page)
    for (const vue of ['suivi-vide', 'suivi-clos', 'suivi-probleme']) {
      await ouvrir(page, `vue=${vue}`)
      await auditer(page)
    }
  })
})

test.describe('« Ma semaine » : bandeau et ligne du suivi, aperçu', () => {
  const maSemaine = (etat?: string) =>
    `/apercu/cette-semaine?profil=ministere${etat ? `&etat=${etat}` : ''}`

  test('un Répondu : le bandeau sous l’ouverture, avant les blocs, vers la réponse', async ({
    page,
  }) => {
    await page.goto(maSemaine('signalement-repondu'))
    const bandeau = page.getByText(
      "EJP Tech a répondu à votre signalement du 26 oct. Dites-nous si c'est réglé.",
    )
    await expect(bandeau).toBeVisible()
    const lien = page.getByRole('link', { name: 'Voir la réponse' })
    await expect(lien).toHaveAttribute('href', /^\/signalements#[0-9a-f-]{36}$/)
    const titre = await page.getByRole('heading', { level: 1 }).boundingBox()
    const boite = await bandeau.boundingBox()
    const saisies = await page.getByRole('heading', { name: 'Vos saisies' }).boundingBox()
    expect(titre && boite && saisies).toBeTruthy()
    if (titre && boite && saisies) {
      expect(boite.y).toBeGreaterThan(titre.y)
      expect(boite.y).toBeLessThan(saisies.y)
    }
    await expect(page.getByText(/signalements? suivis? par EJP Tech/)).toHaveCount(0)
    // Les blocs de la page ne changent pas (aucun titre de plus).
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Vos saisies',
      'Vos chiffres de la semaine',
      'Mes points',
      "Dans l'église",
    ])
  })

  test('deux Répondu : « EJP Tech a répondu à 2 de vos signalements. »', async ({ page }) => {
    await page.goto(maSemaine('signalements-repondus'))
    await expect(
      page.getByText("EJP Tech a répondu à 2 de vos signalements. Dites-nous si c'est réglé."),
    ).toBeVisible()
  })

  test('seulement des Reçu ou En cours : une ligne discrète sous « Mes points », sans bandeau', async ({
    page,
  }) => {
    await page.goto(maSemaine('signalement-suivi'))
    await expect(page.getByText('1 signalement suivi par EJP Tech.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voir le suivi' })).toHaveAttribute(
      'href',
      '/signalements',
    )
    await expect(page.getByRole('link', { name: 'Voir la réponse' })).toHaveCount(0)
    const points = await page.getByRole('region', { name: 'Mes points' }).boundingBox()
    const ligne = await page.getByText('1 signalement suivi par EJP Tech.').boundingBox()
    expect(points && ligne).toBeTruthy()
    if (points && ligne) expect(ligne.y).toBeGreaterThan(points.y)
  })

  test('aucun ouvert : ni bandeau ni ligne', async ({ page }) => {
    await page.goto(maSemaine())
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voir la réponse' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Voir le suivi' })).toHaveCount(0)
  })

  test('audit axe avec le bandeau et avec la ligne', async ({ page }) => {
    for (const etat of ['signalement-repondu', 'signalement-suivi']) {
      await page.goto(maSemaine(etat))
      await page.evaluate(() => document.fonts.ready)
      await auditer(page)
    }
  })
})

test('captures du suivi en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(90_000)
  const largeur = page.viewportSize()?.width ?? 0
  const capturer = (nom: string) =>
    page.screenshot({
      path: `test-results/captures/signalement-${nom}-${largeur}.png`,
      fullPage: true,
    })
  for (const vue of ['suivi', 'suivi-vide', 'suivi-clos', 'suivi-probleme']) {
    await ouvrir(page, `vue=${vue}`)
    await capturer(vue)
  }
  await ouvrir(page, 'vue=suivi')
  await signalementCoordination(page).getByRole('button', { name: REPONDRE }).click()
  await capturer('suivi-reponse')
  for (const etat of ['signalement-repondu', 'signalement-suivi']) {
    await page.goto(`/apercu/cette-semaine?profil=ministere&etat=${etat}`)
    await page.evaluate(() => document.fonts.ready)
    await capturer(`ma-semaine-${etat}`)
  }
})
