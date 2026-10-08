import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Écrans de connexion (maquettes 16, 17, 18 et écrans dérivés), sur l'aperçu de développement :
// aucun appel au serveur à cette étape. Les parcours réels avec Supabase arrivent à l'étape 2.
const APERCU = '/apercu/connexion'

const ECRANS = [
  { ecran: 'connexion', titre: 'Pilotage EJP' },
  { ecran: 'activation', titre: 'Activer la double authentification' },
  { ecran: 'code', titre: 'Code de vérification' },
  { ecran: 'acces-invitation', titre: 'Pilotage EJP' },
  { ecran: 'acces-recuperation', titre: 'Pilotage EJP' },
  { ecran: 'choisir-mot-de-passe', titre: 'Choisissez votre mot de passe' },
  { ecran: 'nouveau-mot-de-passe', titre: 'Nouveau mot de passe' },
  { ecran: 'mot-de-passe-oublie', titre: 'Mot de passe oublié' },
  { ecran: 'compte-desactive', titre: 'Compte désactivé' },
  { ecran: 'acceptation', titre: "Conditions d'utilisation" },
] as const

// États non dessinés ou d'erreur, audités eux aussi.
const ETATS = [
  { adresse: 'ecran=connexion&etat=erreur-identifiants', titre: 'Pilotage EJP' },
  { adresse: 'ecran=connexion&etat=en-cours', titre: 'Pilotage EJP' },
  { adresse: 'ecran=activation&etat=erreur-code', titre: 'Activer la double authentification' },
  { adresse: 'ecran=activation&etat=chargement', titre: 'Activer la double authentification' },
  { adresse: 'ecran=activation&compte=personnel', titre: 'Activer la double authentification' },
  { adresse: 'ecran=code&etat=erreur-code', titre: 'Code de vérification' },
  { adresse: 'ecran=acces-invitation&etat=lien-invalide', titre: "Ce lien n'est plus valable" },
  { adresse: 'ecran=acces-recuperation&etat=lien-invalide', titre: "Ce lien n'est plus valable" },
  {
    adresse: 'ecran=choisir-mot-de-passe&etat=erreur-reseau',
    titre: 'Choisissez votre mot de passe',
  },
  { adresse: 'ecran=mot-de-passe-oublie&etat=envoye', titre: 'Mot de passe oublié' },
  { adresse: 'ecran=acceptation&etat=erreur-reseau', titre: "Conditions d'utilisation" },
  { adresse: 'ecran=acceptation&etat=en-cours', titre: "Conditions d'utilisation" },
] as const

async function ouvrir(page: Page, adresse: string, titre: string) {
  await page.goto(`${APERCU}?${adresse}`)
  await expect(page.getByRole('heading', { level: 1, name: titre })).toBeVisible()
}

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

test.describe('écrans de connexion (aperçu)', () => {
  for (const { ecran, titre } of ECRANS) {
    test(`${ecran} : visible et sans violation d'accessibilité`, async ({ page }) => {
      await ouvrir(page, `ecran=${ecran}`, titre)
      await auditer(page)
    })
  }

  test("les états d'erreur, de chargement et de réussite sont accessibles", async ({ page }) => {
    // Une douzaine de chargements et d'audits dans un seul test : 30 s ne suffisent pas toujours.
    test.slow()
    for (const { adresse, titre } of ETATS) {
      await ouvrir(page, adresse, titre)
      await auditer(page)
    }
  })

  test('aucun défilement horizontal à 360 et 390 px', async ({ page }, infos) => {
    test.skip(infos.project.name !== 'telephone', 'Largeurs de téléphone : projet telephone.')
    // Deux largeurs, dix-neuf écrans : une quarantaine de chargements dans un seul test. Sur la
    // machine de la CI, qui lance aussi les parcours avec la base, 30 s ne suffisent pas toujours.
    test.slow()
    for (const largeur of [360, 390]) {
      await page.setViewportSize({ width: largeur, height: 800 })
      for (const { adresse, titre } of [
        ...ECRANS.map(({ ecran, titre }) => ({ adresse: `ecran=${ecran}`, titre })),
        ...ETATS,
      ]) {
        await ouvrir(page, adresse, titre)
        const debordement = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debordement, `${adresse} à ${largeur} px`).toBeLessThanOrEqual(0)
      }
    }
  })

  test('les cibles font 44 px de haut au moins', async ({ page }) => {
    for (const { ecran, titre } of ECRANS) {
      await ouvrir(page, `ecran=${ecran}`, titre)
      const tropPetites = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('a, button, input, select'))
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => {
            // Une case à cocher se clique aussi par son libellé : la cible est la ligne entière.
            const cible =
              element instanceof HTMLInputElement && element.type === 'checkbox'
                ? (element.closest('label') ?? element)
                : element
            const hauteur = cible.getBoundingClientRect().height
            return { nom: cible.textContent?.trim() || element.id, hauteur }
          })
          .filter(({ hauteur }) => hauteur < 44),
      )
      expect(tropPetites, ecran).toEqual([])
    }
  })

  test("connexion : les erreurs de validation prennent le focus, puis l'envoi part", async ({
    page,
  }) => {
    await ouvrir(page, 'ecran=connexion', 'Pilotage EJP')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Saisissez votre adresse email.')).toBeVisible()
    await expect(page.getByLabel('Email', { exact: true })).toBeFocused()
    await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveAccessibleDescription(
      'Saisissez votre mot de passe.',
    )

    await page.getByLabel('Email', { exact: true }).fill('communication@ejp.exemple')
    await page.getByLabel('Mot de passe', { exact: true }).fill('un mot de passe assez long')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Dernière action simulée')).toContainText(
      'onSubmit, connexion de communication@ejp.exemple.',
    )
  })

  test("acceptation : sans case cochée le message s'affiche, puis l'acceptation part", async ({
    page,
  }) => {
    await ouvrir(page, 'ecran=acceptation', "Conditions d'utilisation")
    await expect(page.getByText('Conditions du 8 octobre 2026')).toBeVisible()
    const bouton = page.getByRole('button', { name: 'Accepter et continuer' })
    await expect(bouton).toBeEnabled()
    await bouton.click()
    await expect(page.getByText('Cochez la case pour continuer.')).toBeVisible()
    await expect(page.getByText('Dernière action simulée')).toContainText('aucune.')

    await page.getByRole('checkbox', { name: /J'accepte les conditions d'utilisation/ }).check()
    await bouton.click()
    await expect(page.getByText('Dernière action simulée')).toContainText(
      'onAccept, acceptation des conditions.',
    )
  })

  test('code : un code collé avec une espace remplit le champ, puis la vérification part', async ({
    page,
  }) => {
    await ouvrir(page, 'ecran=code', 'Code de vérification')
    const champ = page.getByLabel('Code à 6 chiffres')
    await expect(champ).toHaveAttribute('inputmode', 'numeric')
    await expect(champ).toHaveAttribute('autocomplete', 'one-time-code')
    await expect(champ).toHaveAttribute('maxlength', '6')
    await champ.focus()
    await champ.evaluate((element) => {
      const donnees = new DataTransfer()
      donnees.setData('text/plain', '482 913')
      element.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: donnees, bubbles: true, cancelable: true }),
      )
    })
    await expect(champ).toHaveValue('482913')
    await page.getByRole('button', { name: 'Vérifier' }).click()
    await expect(page.getByText('Dernière action simulée')).toContainText(
      'onVerifyCode, code 482913.',
    )
  })

  test('connexion : le lien « recevoir un lien » ouvre « Mot de passe oublié »', async ({
    page,
  }) => {
    await ouvrir(page, 'ecran=connexion', 'Pilotage EJP')
    await page.getByRole('link', { name: 'recevoir un lien' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Mot de passe oublié' })).toBeVisible()
    await expect(page).toHaveTitle('Mot de passe oublié, Pilotage EJP')
  })

  test('captures en 1440 et 390 px', { tag: '@captures' }, async ({ page }, infos) => {
    test.skip(infos.project.name !== 'ordinateur', 'Une seule série de captures.')
    test.slow()
    const captures: {
      nom: string
      adresse: string
      titre: string
      remplir?: () => Promise<void>
    }[] = [
      ...ECRANS.map(({ ecran, titre }) => ({ nom: ecran, adresse: `ecran=${ecran}`, titre })),
      // États non dessinés : lien refusé, lien envoyé.
      {
        nom: 'acces-invitation-lien-invalide',
        adresse: 'ecran=acces-invitation&etat=lien-invalide',
        titre: "Ce lien n'est plus valable",
      },
      {
        nom: 'mot-de-passe-oublie-envoye',
        adresse: 'ecran=mot-de-passe-oublie&etat=envoye',
        titre: 'Mot de passe oublié',
      },
      // Mêmes états que les maquettes : erreur de 16, code entamé de 17 et de 18.
      {
        nom: '16-connexion-comme-maquette',
        adresse: 'ecran=connexion&etat=erreur-identifiants',
        titre: 'Pilotage EJP',
        remplir: async () => {
          await page.getByLabel('Email', { exact: true }).fill('communication@ejp.exemple')
          await page.getByLabel('Mot de passe', { exact: true }).fill('mot de passe')
        },
      },
      {
        nom: '17-activation-comme-maquette',
        adresse: 'ecran=activation',
        titre: 'Activer la double authentification',
        remplir: () => page.getByLabel("Saisissez le code affiché par l'application.").fill('482'),
      },
      {
        nom: '18-code-comme-maquette',
        adresse: 'ecran=code',
        titre: 'Code de vérification',
        remplir: () => page.getByLabel('Code à 6 chiffres').fill('4829'),
      },
    ]
    for (const largeur of [1440, 390]) {
      await page.setViewportSize({ width: largeur, height: largeur === 1440 ? 900 : 844 })
      for (const { nom, adresse, titre, remplir } of captures) {
        await ouvrir(page, `${adresse}&outils=non`, titre)
        if (remplir) await remplir()
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({
          path: `test-results/captures/${nom}-${largeur}.png`,
          fullPage: true,
        })
      }
    }
  })
})
