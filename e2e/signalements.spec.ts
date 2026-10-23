import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// « Signaler une difficulté » et bloc « Signalements » (lot E8, T39) sur l'aperçu de
// développement : les vrais écrans, données d'exemple, envois simulés comme la base (aucune
// base, aucune écriture). Trois formats par les projets Playwright : 1440, 834 et 390 px.

const RAPPEL = "N'écrivez aucun nom ni information personnelle."
const VUES_MINISTERE = ['formulaire', 'premier-usage', 'liste-probleme', 'lien-long'] as const
const VUES_EJP_TECH = [
  'bloc',
  'bloc-lien-long',
  'bloc-sans-ouvert',
  'bloc-vide',
  'bloc-chargement',
  'bloc-probleme',
] as const

async function ouvrir(page: Page, requete: string) {
  await page.goto(`/apercu/signalements?${requete}`)
  await page.evaluate(() => document.fonts.ready)
}

const champ = (page: Page) => page.getByLabel('Quelle difficulté rencontrez-vous ?')
const envoyer = (page: Page) => page.getByRole('button', { name: 'Envoyer le signalement' }).click()
const REPONSE = 'Réponse au ministère (facultatif)'
const CLORE = 'Clore le signalement'
/** Le premier signalement ouvert du bloc d'EJP Tech (Communication, dans l'aperçu). */
const premierOuvert = (page: Page) =>
  page
    .getByRole('region', { name: 'Signalements', exact: true })
    .getByRole('list')
    .first()
    .getByRole('article')
    .first()
/**
 * Le même libellé ouvre le panneau et confirme (T66) : le bouton de la ligne laisse sa place au
 * bouton du panneau, la ligne n'a donc jamais qu'un « Clore le signalement ».
 */
const cloreLePremier = (page: Page) => premierOuvert(page).getByRole('button', { name: CLORE })

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('Signaler une difficulté (ministère), aperçu', () => {
  test('titre, écran prérempli, rappel sous le champ, compteur', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&ecran=saisie_evenement')
    await expect(page).toHaveTitle('Signaler une difficulté, Pilotage EJP')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Signaler une difficulté')
    // Le libellé suffit : plus de phrase sur qui lit (T66, t149).
    await expect(page.getByText(/lit votre signalement/)).toHaveCount(0)
    await expect(page.getByText('Écran concerné : Ajouter un événement')).toBeVisible()
    await expect(champ(page)).toHaveAccessibleDescription(`${RAPPEL} 0 sur 280`)
    await expect(page.getByText(RAPPEL)).toHaveCount(1)
  })

  test('un code inconnu dans l’adresse : « Autre écran »', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&ecran=nimportequoi')
    await expect(page.getByText('Écran concerné : Autre écran')).toBeVisible()
  })

  test('trop court, puis envoyé : l’erreur sous le champ, puis la confirmation et le champ vidé', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere&ecran=saisie_reunion')
    await champ(page).fill('Bloqué')
    await envoyer(page)
    await expect(champ(page)).toHaveAccessibleDescription(
      `${RAPPEL} 6 sur 280 Décrivez la difficulté (10 caractères au moins).`,
    )
    await champ(page).fill('Je ne trouve pas la réunion de jeudi.')
    await envoyer(page)
    await expect(page.getByRole('status').filter({ hasText: 'Signalement' })).toHaveText(
      "Signalement envoyé. La réponse s'affichera sur cette page.",
    )
    await expect(champ(page)).toHaveValue('')
    // Il n'y a plus rien à annuler : le bouton dit « Fermer ».
    await expect(page.getByRole('button', { name: 'Fermer', exact: true })).toBeVisible()
  })

  test('refus de la base (donnée personnelle) : son message sous le champ, texte gardé', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere')
    await champ(page).fill('Écrivez-moi à contact@exemple.test')
    await envoyer(page)
    await expect(page.getByText("N'écrivez aucun nom ni information personnelle.")).toBeVisible()
    await expect(champ(page)).toHaveValue('Écrivez-moi à contact@exemple.test')
  })

  test('connexion perdue : l’erreur de formulaire, texte gardé', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&envoi=echec')
    await champ(page).fill('Je ne peux pas choisir la date.')
    await envoyer(page)
    await expect(page.getByRole('alert')).toHaveText(
      'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
    )
    await expect(champ(page)).toHaveValue('Je ne peux pas choisir la date.')
  })

  test('« Vos derniers signalements » : ouvert, puis clos avec la réponse d’EJP Tech', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere')
    const liste = page.getByRole('region', { name: 'Vos derniers signalements' })
    await expect(liste.getByRole('listitem')).toHaveCount(2)
    await expect(liste.getByRole('listitem').first()).toContainText('Ouvert')
    await expect(liste.getByRole('listitem').nth(1)).toContainText('Clos le 29 sept.')
    await expect(liste).toContainText('Réponse : Réglé avec le ministère')
  })

  test('premier usage : rien sous le formulaire ; lecture en échec : « Réessayer »', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere&vue=premier-usage')
    await expect(page.getByRole('heading', { name: 'Vos derniers signalements' })).toHaveCount(0)
    await ouvrir(page, 'profil=ministere&vue=liste-probleme')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  for (const profil of ['berger', 'conseil', 'admin_eglise']) {
    test(`profil ${profil} : page non disponible, aucun signalement`, async ({ page }) => {
      await ouvrir(page, `profil=${profil}`)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Page non disponible',
        }),
      ).toBeVisible()
      await expect(page.getByRole('main').getByText(/signalement/i)).toHaveCount(0)
    })
  }
})

test.describe('Bloc « Signalements » (EJP Tech), aperçu', () => {
  test('titre de l’écran, bloc en tête, ouverts du plus ancien au plus récent, puis les clos', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modération')
    const bloc = page.getByRole('region', { name: 'Signalements', exact: true })
    await expect(bloc.getByText('2 signalements ouverts')).toBeVisible()
    // Le sous-titre redisait le titre : retiré par T66 (t361).
    await expect(bloc.getByText('Difficultés signalées par les ministères')).toHaveCount(0)
    const ouverts = bloc.getByRole('list').first().getByRole('article')
    await expect(ouverts).toHaveCount(2)
    await expect(ouverts.first()).toContainText('Communication')
    await expect(ouverts.first()).toContainText('Ajouter un événement, 2 oct.')
    await expect(ouverts.nth(1)).toContainText('Intégration')
    const clos = page.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    await expect(clos).toContainText('Clos le 29 sept.')
    await expect(clos).toContainText('Réponse : Réglé avec le ministère')
    await expect(clos.getByRole('button')).toHaveCount(0)
  })

  test('clore avec une réponse : la ligne passe dans les clos, « Signalement clos. »', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await cloreLePremier(page).click()
    const commentaire = page.getByLabel(REPONSE)
    await expect(commentaire).toBeFocused()
    // Un seul « Clore le signalement » sur la ligne ouverte : celui qui envoie le panneau.
    await expect(cloreLePremier(page)).toHaveAttribute('type', 'submit')
    // La consigne « transmis à l'administration » a quitté l'écran (T66, point ouvert 10).
    await expect(commentaire).toHaveAccessibleDescription(`${RAPPEL} 0 sur 280`)
    await expect(page.getByText('Un signalement clos ne se rouvre pas.')).toBeVisible()
    await commentaire.fill('Court')
    await cloreLePremier(page).click()
    await expect(
      page.getByText('Écrivez au moins 10 caractères, ou laissez la réponse vide.'),
    ).toBeVisible()
    await commentaire.fill("transmis à l'administration")
    await cloreLePremier(page).click()
    await expect(page.getByRole('status').filter({ hasText: 'Signalement' })).toHaveText(
      'Signalement clos.',
    )
    await expect(page.getByText('1 signalement ouvert')).toBeVisible()
    const clos = page.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    await expect(clos).toContainText('Clos le 6 oct.')
    await expect(clos).toContainText("Réponse : transmis à l'administration")
  })

  test('états : sans ouvert (titre et clos gardés), rien, chargement, problème passager', async ({
    page,
  }) => {
    const vide = 'Aucun signalement.'
    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-sans-ouvert')
    // Le compteur du titre suffit quand des clos suivent (T66, t363).
    await expect(page.getByText('Les prochains arriveront ici.')).toHaveCount(0)
    await expect(page.getByText(vide, { exact: true })).toHaveCount(0)
    await expect(page.getByText('Aucun signalement ouvert', { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeVisible()

    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-vide')
    await expect(page.getByText(vide)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Clos ces 30 derniers jours' })).toHaveCount(0)

    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-chargement')
    await expect(page.getByText('Chargement')).toBeVisible()

    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-probleme')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('accessibilité et largeurs', () => {
  for (const vue of VUES_MINISTERE) {
    test(`audit axe : ministère, ${vue}`, async ({ page }) => {
      await ouvrir(page, `profil=ministere&vue=${vue}&ecran=saisie_evenement`)
      await auditer(page)
    })
  }
  for (const vue of VUES_EJP_TECH) {
    test(`audit axe : EJP Tech, ${vue}`, async ({ page }) => {
      await ouvrir(page, `profil=admin_plateforme&vue=${vue}`)
      await auditer(page)
    })
  }

  test('audit axe avec l’erreur du champ et le panneau de clôture ouvert', async ({ page }) => {
    await ouvrir(page, 'profil=ministere')
    await envoyer(page)
    await expect(page.getByText('Décrivez la difficulté (10 caractères au moins).')).toBeVisible()
    await auditer(page)
    await ouvrir(page, 'profil=admin_plateforme')
    await cloreLePremier(page).click()
    await expect(page.getByLabel(REPONSE)).toBeVisible()
    await auditer(page)
  })

  test('« Annuler » avec une réponse écrite : « Fermer sans enregistrer ? », puis le focus revient', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await cloreLePremier(page).click()
    await page.getByLabel(REPONSE).fill('Réglé par téléphone.')
    await premierOuvert(page).getByRole('button', { name: 'Annuler' }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })
    await fenetre.getByRole('button', { name: 'Continuer la saisie' }).click()
    await expect(page.getByLabel(REPONSE)).toHaveValue('Réglé par téléphone.')
    await premierOuvert(page).getByRole('button', { name: 'Annuler' }).click()
    await fenetre.getByRole('button', { name: 'Fermer sans enregistrer' }).click()
    await expect(page.getByLabel(REPONSE)).toHaveCount(0)
    await expect(cloreLePremier(page)).toBeFocused()
    await expect(cloreLePremier(page)).toHaveAttribute('type', 'button')
  })

  test('à 360 px, aucun défilement horizontal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'Largeur de téléphone')
    await page.setViewportSize({ width: 360, height: 800 })
    for (const requete of [
      'profil=ministere',
      'profil=admin_plateforme',
      'profil=admin_plateforme&vue=bloc-sans-ouvert',
      // Un lien collé de 90 caractères, sans espace, dans le texte et la réponse.
      'profil=ministere&vue=lien-long',
      'profil=admin_plateforme&vue=bloc-lien-long',
    ]) {
      await ouvrir(page, requete)
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, requete).toBeLessThanOrEqual(0)
    }
  })

  test('sous 600 px une page entière, à partir de 600 px un panneau de 460 px', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere')
    const largeur = page.viewportSize()?.width ?? 0
    const fenetre = page.getByRole('dialog', { name: 'Signaler une difficulté' })
    if (largeur < 600) {
      await expect(fenetre).toHaveCount(0)
    } else {
      const boite = await fenetre.boundingBox()
      expect(boite?.width).toBe(460)
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  // Une dizaine de pages pleines : le délai par défaut est trop juste sur un poste chargé.
  test.setTimeout(90_000)
  const largeur = page.viewportSize()?.width ?? 0
  const capturer = (nom: string) =>
    page.screenshot({
      path: `test-results/captures/signalement-${nom}-${largeur}.png`,
      fullPage: true,
    })
  await ouvrir(page, 'profil=ministere&ecran=saisie_evenement')
  await capturer('formulaire')
  await envoyer(page)
  await capturer('formulaire-erreur')
  await ouvrir(page, 'profil=ministere&vue=premier-usage&ecran=saisie_evenement')
  await capturer('premier-usage')
  for (const vue of VUES_EJP_TECH) {
    await ouvrir(page, `profil=admin_plateforme&vue=${vue}`)
    // « Chargement » n'apparaît qu'après 300 ms : la capture l'attend.
    if (vue === 'bloc-chargement') await expect(page.getByText('Chargement')).toBeVisible()
    await capturer(vue)
  }
  await ouvrir(page, 'profil=admin_plateforme')
  await cloreLePremier(page).click()
  await capturer('bloc-cloture')
})
