import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// « Signaler une difficulté » (lot E8, T39) et bloc « Signalements » d'EJP Tech avec le suivi
// (T77) sur l'aperçu de développement : les vrais écrans, données d'exemple (jour de l'aperçu le
// mercredi 28 oct. 2026), envois simulés comme la base (aucune base, aucune écriture). Trois
// formats par les projets Playwright : 1440, 834 et 390 px. La page « Mes signalements » du
// ministère est dans signalements-suivi.spec.ts.

const RAPPEL = "N'écrivez aucun nom ni information personnelle."
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
const CLORE = 'Clore le signalement'
const REPONSE_CLOTURE = 'Réponse au ministère'
const bloc = (page: Page) => page.getByRole('region', { name: 'Signalements', exact: true })
const groupe = (page: Page, nom: string) =>
  bloc(page).getByRole('region', { name: nom, exact: true })
/** La ligne d'un ministère dans le bloc d'EJP Tech (un signalement par ministère dans l'aperçu). */
const ligne = (page: Page, ministere: string): Locator =>
  bloc(page)
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: ministere, exact: true }) })

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

  test('trop court, puis envoyé : l’erreur sous le champ, puis la confirmation vers « Mes signalements »', async ({
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
      "Signalement envoyé. Suivez la réponse d'EJP Tech dans « Mes signalements ».",
    )
    await expect(champ(page)).toHaveValue('')
    // Il n'y a plus rien à annuler : le bouton dit « Fermer ».
    await expect(page.getByRole('button', { name: 'Fermer', exact: true })).toBeVisible()
  })

  test('sous le formulaire, un seul lien « Voir mes signalements », plus de liste', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=ministere')
    await expect(page.getByRole('link', { name: 'Voir mes signalements' })).toHaveAttribute(
      'href',
      '/signalements',
    )
    await expect(page.getByRole('heading', { name: 'Vos derniers signalements' })).toHaveCount(0)
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
  test('titre, compteur, trois groupes, chaque ligne avec sa ligne d’état et ses gestes', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modération')
    await expect(bloc(page).getByText('4 signalements à traiter')).toBeVisible()
    await expect(bloc(page).getByRole('heading', { level: 3 })).toHaveText([
      'À traiter',
      'En attente du ministère',
      'Clos ces 30 derniers jours',
    ])

    // À traiter : du plus ancien au plus récent, avec l'âge lu dans la base.
    const aTraiter = groupe(page, 'À traiter').getByRole('article')
    await expect(aTraiter.getByRole('heading', { level: 4 })).toHaveText([
      'Intégration',
      'Social',
      'Jeunesse',
      'Coordination',
    ])
    await expect(ligne(page, 'Intégration')).toContainText('Le ministère a répondu hier.')
    await expect(ligne(page, 'Intégration')).toContainText(
      'Réponse du ministère : « La session du samedi 24 octobre, celle du soir. »',
    )
    await expect(ligne(page, 'Social')).toContainText('Pris en charge le 20 oct., il y a 8 jours.')
    await expect(ligne(page, 'Coordination')).toContainText("Reçu aujourd'hui.")
    await expect(ligne(page, 'Coordination')).toContainText('Ajouter un événement, 28 oct.')
    await expect(
      ligne(page, 'Coordination').getByRole('button', { name: /^(Prendre|Répondre|Clore)/ }),
    ).toHaveText(['Prendre en charge', 'Répondre au ministère', CLORE])
    await expect(
      ligne(page, 'Intégration').getByRole('button', { name: /^(Prendre|Répondre|Clore)/ }),
    ).toHaveText(['Répondre au ministère', CLORE])

    // En attente du ministère : la date limite, aucun geste.
    const attente = groupe(page, 'En attente du ministère')
    await expect(ligne(page, 'Communication').first()).toContainText(
      "Réponse envoyée le 27 oct. Le ministère peut répondre jusqu'au 3 nov.",
    )
    await expect(attente.getByRole('button', { name: /^(Prendre|Répondre|Clore)/ })).toHaveCount(0)

    // Clos : les derniers clos d'abord, chacun avec sa fin.
    const clos = groupe(page, 'Clos ces 30 derniers jours').getByRole('article')
    await expect(clos).toHaveCount(3)
    await expect(clos.first()).toContainText('Confirmé par le ministère le 26 oct.')
    await expect(clos.nth(1)).toContainText('Clos le 25 oct., sans retour du ministère.')
    await expect(clos.nth(2)).toContainText('Clos par EJP Tech le 8 oct.')
    await expect(clos.nth(2)).toContainText(
      "Transmis à l'administration de l'église, qui recontacte le ministère.",
    )
    await expect(
      groupe(page, 'Clos ces 30 derniers jours').getByRole('button', {
        name: /^(Prendre|Répondre|Clore)/,
      }),
    ).toHaveCount(0)
  })

  test('« Prendre en charge » : annoncé, la ligne reste à traiter, focus sur son en-tête', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await ligne(page, 'Coordination').getByRole('button', { name: 'Prendre en charge' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'pris en charge' })).toHaveText(
      'Signalement pris en charge.',
    )
    await expect(ligne(page, 'Coordination')).toContainText("Pris en charge aujourd'hui.")
    await expect(
      ligne(page, 'Coordination').getByRole('button', { name: 'Prendre en charge' }),
    ).toHaveCount(0)
    await expect(
      ligne(page, 'Coordination').getByRole('heading', { name: 'Coordination' }),
    ).toBeFocused()
  })

  test('« Répondre au ministère » : panneau, contrôles, envoi ; la ligne passe en attente du ministère', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    const bouton = ligne(page, 'Coordination').getByRole('button', {
      name: 'Répondre au ministère',
    })
    await bouton.click()
    await expect(bouton).toHaveAttribute('aria-expanded', 'true')
    const reponse = page.getByLabel('Votre réponse à Coordination')
    await expect(reponse).toBeFocused()
    await expect(reponse).toHaveAccessibleDescription(
      `Posez une question, ou dites ce que vous avez fait. ${RAPPEL} 0 sur 280`,
    )
    await expect(ligne(page, 'Coordination')).toContainText(
      'Coordination lit votre réponse dans Pilotage EJP.',
    )
    await expect(page.getByText(/courriel|e-mail|email/i)).toHaveCount(0)
    const envoyerReponse = page.getByRole('button', { name: 'Envoyer la réponse' })
    await envoyerReponse.click()
    await expect(page.getByText('Écrivez au moins 10 caractères.')).toBeVisible()
    await reponse.fill('Quel événement, à quelle date, et quel message voyez-vous ?')
    await envoyerReponse.click()
    await expect(page.getByRole('status').filter({ hasText: 'Réponse envoyée' })).toHaveText(
      'Réponse envoyée.',
    )
    await expect(bloc(page).getByText('3 signalements à traiter')).toBeVisible()
    const deplace = groupe(page, 'En attente du ministère')
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Coordination', exact: true }) })
    await expect(deplace).toContainText(
      "Réponse envoyée le 28 oct. Le ministère peut répondre jusqu'au 4 nov.",
    )
    await expect(deplace.getByRole('heading', { name: 'Coordination' })).toBeFocused()
  })

  test('« Clore le signalement » : réponse obligatoire, la ligne passe dans les clos', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await ligne(page, 'Social').getByRole('button', { name: CLORE }).click()
    const reponse = page.getByLabel(REPONSE_CLOTURE, { exact: true })
    await expect(reponse).toBeFocused()
    await expect(reponse).toHaveAccessibleDescription(`${RAPPEL} 0 sur 280`)
    await expect(ligne(page, 'Social')).toContainText(
      'Le ministère lit cette réponse dans « Mes signalements ». Un signalement clos ne se rouvre pas.',
    )
    // Un seul « Clore le signalement » sur la ligne : celui qui envoie le panneau.
    await expect(ligne(page, 'Social').getByRole('button', { name: CLORE })).toHaveAttribute(
      'type',
      'submit',
    )
    await ligne(page, 'Social').getByRole('button', { name: CLORE }).click()
    await expect(page.getByText('Écrivez au moins 10 caractères.')).toBeVisible()
    await reponse.fill("Transmis à l'administration de l'église.")
    await ligne(page, 'Social').getByRole('button', { name: CLORE }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Signalement clos' })).toHaveText(
      'Signalement clos.',
    )
    const clos = groupe(page, 'Clos ces 30 derniers jours')
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Social', exact: true }) })
    await expect(clos).toContainText('Clos par EJP Tech le 28 oct.')
    await expect(clos).toContainText("Transmis à l'administration de l'église.")
    await expect(bloc(page).getByText('3 signalements à traiter')).toBeVisible()
  })

  test('ministère sans compte actif : la raison, et « Clore le signalement » seul', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    await expect(ligne(page, 'Jeunesse')).toContainText("Ce ministère n'a plus de compte actif.")
    await expect(
      ligne(page, 'Jeunesse').getByRole('button', { name: /^(Prendre|Répondre|Clore)/ }),
    ).toHaveText([CLORE])
  })

  test('« Masquer » sous chaque texte cité : la fenêtre sur ce texte seul', async ({ page }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    const masquer = ligne(page, 'Intégration').getByRole('button', { name: 'Masquer' })
    // Le texte du signalement, puis la réponse d'EJP Tech et celle du ministère.
    await expect(masquer).toHaveCount(3)
    await masquer.last().click()
    const fenetre = page.getByRole('dialog', { name: 'Masquer ce texte ?' })
    await expect(fenetre).toContainText('La session du samedi 24 octobre, celle du soir.')
    await fenetre.getByLabel("Nom d'une personne").check()
    await fenetre.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'masqué' })).toHaveText('Texte masqué.')
    await expect(ligne(page, 'Intégration')).toContainText(
      'Réponse du ministère : « [texte masqué par EJP Tech] »',
    )
  })

  test('refus de la base (deux personnes d’EJP Tech) : le message, puis la liste se relit', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme&envoi=deja')
    await ligne(page, 'Coordination').getByRole('button', { name: 'Prendre en charge' }).click()
    await expect(
      page.getByText('Ce signalement a déjà été pris en charge. La liste est à jour.'),
    ).toBeVisible()
  })

  test('états : sans signalement à traiter, rien, chargement, problème passager', async ({
    page,
  }) => {
    const vide = 'Aucun signalement.'
    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-sans-ouvert')
    await expect(page.getByText(vide, { exact: true })).toHaveCount(0)
    await expect(page.getByText('Aucun signalement à traiter', { exact: true })).toBeVisible()
    await expect(groupe(page, 'À traiter')).toHaveCount(0)
    await expect(groupe(page, 'Clos ces 30 derniers jours')).toBeVisible()

    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-vide')
    await expect(page.getByText(vide)).toBeVisible()
    await expect(groupe(page, 'Clos ces 30 derniers jours')).toHaveCount(0)

    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-chargement')
    await expect(page.getByText('Chargement des signalements')).toBeVisible()

    await ouvrir(page, 'profil=admin_plateforme&vue=bloc-probleme')
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('accessibilité et largeurs', () => {
  test('audit axe : ministère, formulaire', async ({ page }) => {
    await ouvrir(page, 'profil=ministere&ecran=saisie_evenement')
    await auditer(page)
  })
  for (const vue of VUES_EJP_TECH) {
    test(`audit axe : EJP Tech, ${vue}`, async ({ page }) => {
      await ouvrir(page, `profil=admin_plateforme&vue=${vue}`)
      await auditer(page)
    })
  }

  test('audit axe avec l’erreur du champ et les panneaux ouverts', async ({ page }) => {
    await ouvrir(page, 'profil=ministere')
    await envoyer(page)
    await expect(page.getByText('Décrivez la difficulté (10 caractères au moins).')).toBeVisible()
    await auditer(page)
    await ouvrir(page, 'profil=admin_plateforme')
    await ligne(page, 'Coordination').getByRole('button', { name: 'Répondre au ministère' }).click()
    await expect(page.getByLabel('Votre réponse à Coordination')).toBeVisible()
    await auditer(page)
    await ligne(page, 'Social').getByRole('button', { name: CLORE }).click()
    await expect(page.getByLabel(REPONSE_CLOTURE, { exact: true })).toBeVisible()
    await auditer(page)
  })

  test('« Annuler » avec une réponse écrite : « Fermer sans enregistrer ? », puis le focus revient', async ({
    page,
  }) => {
    await ouvrir(page, 'profil=admin_plateforme')
    const bouton = ligne(page, 'Coordination').getByRole('button', {
      name: 'Répondre au ministère',
    })
    await bouton.click()
    await page.getByLabel('Votre réponse à Coordination').fill('Réglé par téléphone.')
    await ligne(page, 'Coordination').getByRole('button', { name: 'Annuler' }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })
    await fenetre.getByRole('button', { name: 'Continuer la saisie' }).click()
    await expect(page.getByLabel('Votre réponse à Coordination')).toHaveValue(
      'Réglé par téléphone.',
    )
    await ligne(page, 'Coordination').getByRole('button', { name: 'Annuler' }).click()
    await fenetre.getByRole('button', { name: 'Fermer sans enregistrer' }).click()
    await expect(page.getByLabel('Votre réponse à Coordination')).toHaveCount(0)
    await expect(bouton).toBeFocused()
  })

  test('à 360 px, aucun défilement horizontal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'Largeur de téléphone')
    await page.setViewportSize({ width: 360, height: 800 })
    for (const requete of [
      'profil=ministere',
      'profil=admin_plateforme',
      'profil=admin_plateforme&vue=bloc-sans-ouvert',
      // Un lien collé de 90 caractères, sans espace, dans le texte et les réponses.
      'profil=ministere&vue=suivi-lien-long',
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
  for (const vue of VUES_EJP_TECH) {
    await ouvrir(page, `profil=admin_plateforme&vue=${vue}`)
    // « Chargement » n'apparaît qu'après 300 ms : la capture l'attend.
    if (vue === 'bloc-chargement') await expect(page.getByText('Chargement')).toBeVisible()
    await capturer(vue)
  }
  await ouvrir(page, 'profil=admin_plateforme')
  await ligne(page, 'Coordination').getByRole('button', { name: 'Répondre au ministère' }).click()
  await capturer('bloc-reponse')
  await ouvrir(page, 'profil=admin_plateforme')
  await ligne(page, 'Social').getByRole('button', { name: CLORE }).click()
  await capturer('bloc-cloture')
})
