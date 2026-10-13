import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Panneaux et fenêtres de la configuration des indicateurs (lot L3b) sur l'aperçu
// /apercu/indicateurs, sans base : ajouter un indicateur, le corriger, le remplacer, ajouter un
// calcul, retirer un indicateur (les calculs qui s'en servent partent avec lui), le retirer pour
// confidentialité, et les refus de la base. Les écritures sont simulées avec les mêmes règles que la
// base. Trois formats par les projets Playwright : 1440 et 834 px (panneau de 460 px), 390 px (page
// entière). Les parcours avec la base sont dans e2e/base/indicateurs-panneaux.ecriture.spec.ts.

type Ecran = { vue?: string; profil?: string; envoi?: string }

// EJP Tech configure seul les indicateurs (T60) : il est le profil des panneaux.
const adresse = ({ vue = 'communication', profil = 'admin_plateforme', envoi }: Ecran) =>
  `/apercu/indicateurs?vue=${vue}&profil=${profil}${envoi ? `&envoi=${envoi}` : ''}`

async function ouvrir(page: Page, ecran: Ecran = {}) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

const titre = (page: Page, nom: string) => page.getByRole('heading', { level: 1, name: nom })
const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true })

async function remplirAjout(page: Page, libelle: string, definition: string, rythme: RegExp) {
  await page.getByLabel('Ce que vous comptez').fill(libelle)
  await page.getByLabel("Ce qu'on compte exactement").fill(definition)
  await page.getByRole('radio', { name: rythme }).check()
}

test.describe('ajouter, corriger et remplacer un indicateur', () => {
  test('ajouter un indicateur : l’aperçu, la place, l’envoi, le message et la ligne', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await expect(titre(page, 'Ajouter un indicateur')).toBeVisible()
    await expect(page.getByText('La fiche compte 5 indicateurs sur 30 au plus.')).toBeVisible()
    await expect(page.getByText(/N'écrivez aucun nom ni information personnelle/)).toHaveCount(1)
    await remplirAjout(page, 'Tournages', 'Tournages réalisés dans le mois.', /Chaque mois/)
    await expect(page.getByText('Tournages, septembre 2026 : __')).toBeVisible()
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByText('Indicateur ajouté.')).toBeVisible()
    await expect(titre(page, 'Indicateurs de Communication')).toBeVisible()
    await expect(page.getByText('Tournages', { exact: true })).toBeVisible()
    await expect(page.getByText('Jamais saisi')).toHaveCount(3)
  })

  test('envoyé vide : les champs disent ce qui manque, sans rien envoyer', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByText('Donnez un libellé de 2 à 60 caractères.')).toBeVisible()
    await expect(page.getByText("Expliquez ce qu'on compte en 10 à 140 caractères.")).toBeVisible()
    await expect(
      page.getByText('Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.'),
    ).toBeVisible()
    await expect(page.getByLabel('Ce que vous comptez')).toBeFocused()
    await expect(page.getByText('Indicateur ajouté.')).toHaveCount(0)
  })

  test('un doublon est refusé par la base : son message reste sous le bouton, le texte est gardé', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await remplirAjout(page, 'Publications', 'Publications mises en ligne.', /Chaque mois/)
    await expect(page.getByText('Cette fiche a déjà « Publications ».').first()).toBeVisible()
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByRole('alert')).toHaveText('Cette fiche a déjà « Publications ».')
    await expect(page.getByLabel('Ce que vous comptez')).toHaveValue('Publications')
  })

  test('le domaine sensible impose « chaque mois » et un compte simple', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await page.getByRole('radio', { name: /Chaque dimanche/ }).check()
    await page.getByRole('checkbox', { name: /Domaine sensible/ }).check()
    await expect(page.getByText('Saisi chaque mois, mois en cours compris.')).toBeVisible()
    await expect(page.getByRole('radio', { name: /Chaque mois/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: /Chaque mois/ })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Des euros' })).toBeDisabled()
  })

  test('un mot sensible dans la définition : l’avertissement et la confirmation', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await remplirAjout(page, 'Annonces', 'Annonces faites aux enfants.', /Chaque mois/)
    await expect(page.getByText(/Ce chiffre semble sensible/)).toBeVisible()
    // Sans confirmation, la base refuse l'envoi et le dit sous le bouton.
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByRole('alert')).toContainText('Ce chiffre semble sensible')
    await page.getByRole('checkbox', { name: "Ce n'est pas un domaine sensible" }).check()
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByText('Indicateur ajouté.')).toBeVisible()
  })

  test('remplacer la source d’un calcul : le panneau nomme le calcul qui part avec elle', async ({
    page,
  }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Remplacer « Demandes reçues »' }).click()
    await expect(
      page.getByText(
        "L'ancien indicateur est retiré et le nouveau prend sa place. Le calcul « Taux de demandes traitées » sera retiré aussi.",
      ),
    ).toBeVisible()
    await page.getByLabel('Ce que vous comptez').fill('Demandes reçues par mail')
    await bouton(page, "Remplacer l'indicateur").click()
    await expect(page.getByText('Indicateur remplacé. 1 calcul retiré avec lui.')).toBeVisible()
  })

  test('remplacer des jours : la sorte « jours » est gardée', async ({ page }) => {
    await ouvrir(page, { vue: 'jeunesse' })
    await page.getByRole('button', { name: 'Remplacer « Jours de camp »' }).click()
    await expect(
      page.getByRole('radio', { name: "Un nombre de jours (comme l'ancien indicateur)" }),
    ).toBeChecked()
  })

  test('corriger un indicateur jamais saisi, puis le remplacer', async ({ page }) => {
    await ouvrir(page)
    await expect(page.getByRole('button', { name: 'Corriger « Publications »' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Corriger « Demandes reçues »' }).click()
    await expect(titre(page, "Corriger l'indicateur")).toBeVisible()
    await expect(page.getByLabel('Ce que vous comptez')).toHaveValue('Demandes reçues')
    await page.getByLabel('Ce que vous comptez').fill('Demandes reçues par mail')
    await bouton(page, 'Enregistrer la correction').click()
    await expect(page.getByText('Correction enregistrée.')).toBeVisible()
    await expect(page.getByText('Demandes reçues par mail', { exact: true })).toBeVisible()
    await expect(page.getByText(/Libellé corrigé le \d+ /).first()).toBeVisible()

    await page.getByRole('button', { name: 'Remplacer « Publications »' }).click()
    await expect(titre(page, "Remplacer l'indicateur")).toBeVisible()
    await expect(
      page.getByText(
        "Remplace « Publications » (chaque mois). Ses saisies restent sous l'ancien indicateur.",
      ),
    ).toBeVisible()
    await page.getByRole('radio', { name: /Chaque dimanche/ }).check()
    await bouton(page, "Remplacer l'indicateur").click()
    await expect(page.getByText('Indicateur remplacé.')).toBeVisible()
    await expect(page.getByText('Remplace « Publications » (chaque mois)')).toBeVisible()
  })

  test('un corps de panneau qui dit ce qui change et ce qui ne change pas', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await expect(page.getByText('Ce qui change', { exact: true })).toBeVisible()
    await expect(page.getByText('Ce qui ne change pas', { exact: true })).toBeVisible()
  })
})

test.describe('ajouter un calcul', () => {
  test('un taux ou une moyenne : l’aperçu, le bas qui va avec le haut, le message et la ligne', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un calcul').click()
    await expect(titre(page, 'Ajouter un calcul')).toBeVisible()
    await page.getByLabel('Nom du calcul').fill('Part des publications')
    await page.getByLabel("Ce qu'on calcule").fill('Publications sur demandes reçues.')
    await page
      .getByRole('combobox', { name: 'Chiffre du haut' })
      .selectOption({ label: 'Publications' })
    await expect(page.getByLabel('Chiffre du bas').locator('option')).toHaveText([
      'Choisissez un chiffre',
      'Demandes reçues',
      'Visuels livrés',
    ])
    await page.getByLabel('Chiffre du bas').selectOption({ label: 'Demandes reçues' })
    await page.getByRole('radio', { name: 'En moyenne' }).check()
    await expect(page.getByText('Par exemple : 1 240 pour 53, soit 23,4')).toBeVisible()
    await page.getByRole('radio', { name: 'En pourcentage' }).check()
    await expect(page.getByText(/^Par exemple : 16 sur 20, soit 80.%$/)).toBeVisible()
    await bouton(page, 'Ajouter le calcul').click()
    await expect(page.getByText('Calcul ajouté.')).toBeVisible()
    await expect(page.getByText('Part des publications', { exact: true })).toBeVisible()
    await expect(page.getByText('Se calcule tout seul')).toHaveCount(2)
  })

  test('envoyé vide : les chiffres et le type manquants sont dits', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un calcul').click()
    await bouton(page, 'Ajouter le calcul').click()
    await expect(page.getByText('Choisissez le chiffre du haut.')).toBeVisible()
    await expect(page.getByText('Choisissez le chiffre du bas.')).toBeVisible()
    await expect(page.getByText('Choisissez un taux ou une moyenne.')).toBeVisible()
  })

  test('une fiche qui n’a pas deux chiffres qui se calculent ensemble le dit et mène à l’ajout', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'eagles' })
    await bouton(page, 'Ajouter un calcul').click()
    await expect(page.getByText(/Un calcul demande deux indicateurs saisis, actifs/)).toBeVisible()
    await expect(page.getByLabel('Nom du calcul')).toHaveCount(0)
    await expect(
      page.getByText('Ajoutez un indicateur, puis revenez ajouter le calcul.'),
    ).toBeVisible()
    // Le bouton de la page et celui du panneau portent le même nom : le panneau vient en dernier.
    await bouton(page, 'Ajouter un indicateur').last().click()
    await expect(titre(page, 'Ajouter un indicateur')).toBeVisible()
    await expect(page.getByLabel('Ce que vous comptez')).toBeVisible()
  })

  test('la case « part » (P49) n’existe que pour un taux', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un calcul').click()
    const part = page.getByRole('checkbox', { name: /C'est une part/ })
    await expect(part).toHaveCount(0)
    await page.getByRole('radio', { name: 'En pourcentage' }).check()
    await expect(part).toBeVisible()
    await page.getByRole('radio', { name: 'En moyenne' }).check()
    await expect(part).toHaveCount(0)
  })

  test('corriger un calcul dont un chiffre est saisi : le panneau le dit et propose de le remplacer', async ({
    page,
  }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Corriger « Taux de demandes traitées »' }).click()
    await expect(titre(page, "Corriger l'indicateur")).toBeVisible()
    await expect(page.getByText(/Ce calcul a déjà des valeurs/)).toBeVisible()
    await expect(page.getByLabel('Ce que vous comptez')).toHaveCount(0)
    await bouton(page, 'Remplacer le calcul').click()
    await expect(titre(page, 'Remplacer le calcul')).toBeVisible()
  })

  test('remplacer un calcul relit ses deux chiffres', async ({ page }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Remplacer « Taux de demandes traitées »' }).click()
    await expect(titre(page, 'Remplacer le calcul')).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Chiffre du haut' })).toHaveValue(/.+/)
    await expect(
      page.getByRole('combobox', { name: 'Chiffre du haut' }).locator('option:checked'),
    ).toHaveText('Visuels livrés')
    await expect(page.getByLabel('Chiffre du bas').locator('option:checked')).toHaveText(
      'Demandes reçues',
    )
    await bouton(page, 'Remplacer le calcul').click()
    await expect(page.getByText('Calcul remplacé.')).toBeVisible()
  })
})

test.describe('retirer un indicateur', () => {
  test('le calcul qui s’en sert part avec lui, et la fenêtre le dit avant', async ({ page }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Retirer « Demandes reçues »' }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Retirer « Demandes reçues » ?' })
    await expect(fenetre).toBeVisible()
    await expect(
      fenetre.getByText('Le calcul « Taux de demandes traitées » sera retiré aussi.'),
    ).toBeVisible()
    await expect(
      fenetre.getByText(/Il n'a aucune saisie : il disparaîtra de la fiche/),
    ).toBeVisible()
    await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
    await expect(fenetre.getByText('Choisissez le motif du retrait.')).toBeVisible()
    await fenetre.getByRole('radio', { name: "Doublon d'un autre chiffre" }).check()
    await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
    await expect(page.getByText('Indicateur retiré. 1 calcul retiré avec lui.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Chaque mois', 'À ce jour'])
    await page.getByText('Retirés (4)').click()
    // Le retiré de l'exemple (3 oct.) et celui du test.
    await expect(page.getByText(/Retiré le \d+ [^ ]+ : doublon\./)).toHaveCount(2)
    await expect(page.getByText(/Retiré le \d+ [^ ]+ : sa source est retirée\./)).toBeVisible()
  })

  test('un indicateur saisi garde ses saisies sur la fiche, et la fenêtre le dit', async ({
    page,
  }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Retirer « Publications »' }).click()
    const fenetre = page.getByRole('alertdialog')
    await expect(fenetre.getByText(/Ses saisies restent sur la fiche/)).toBeVisible()
    await expect(fenetre.getByText('Ses saisies : rien ne se supprime.')).toBeVisible()
    await fenetre.getByRole('radio', { name: "N'est plus suivi" }).check()
    await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
    await expect(
      page.getByText('Indicateur retiré, ses saisies restent sur la fiche.'),
    ).toBeVisible()
  })

  test('Annuler ferme la fenêtre sans rien retirer', async ({ page }) => {
    await ouvrir(page)
    await page.getByRole('button', { name: 'Retirer « Publications »' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByText('Publications', { exact: true })).toBeVisible()
  })

  test('Échap ferme la fenêtre et rend le focus au bouton', async ({ page }) => {
    await ouvrir(page)
    const ouvreur = page.getByRole('button', { name: 'Retirer « Publications »' })
    await ouvreur.click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(ouvreur).toBeFocused()
  })

  test('connexion perdue : la fenêtre le dit et reste ouverte', async ({ page }) => {
    await ouvrir(page, { envoi: 'echec' })
    await page.getByRole('button', { name: 'Retirer « Publications »' }).click()
    const fenetre = page.getByRole('alertdialog')
    await fenetre.getByRole('radio', { name: "N'est plus suivi" }).check()
    await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
    await expect(fenetre.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
  })
})

test.describe('retirer pour confidentialité', () => {
  test('la fenêtre annonce le masquage avant de confirmer, puis le libellé est masqué', async ({
    page,
  }) => {
    await ouvrir(page)
    await page
      .getByRole('button', { name: 'Retirer pour confidentialité « Publications »' })
      .click()
    const fenetre = page.getByRole('alertdialog', {
      name: 'Retirer « Publications » pour confidentialité ?',
    })
    await expect(fenetre.getByText(/« \[retiré pour confidentialité\] »/)).toBeVisible()
    await expect(fenetre.getByText(/Cette action est définitive\./)).toBeVisible()
    await expect(fenetre.getByText(/rien ne se supprime/)).toBeVisible()
    await expect(fenetre.getByRole('radio')).toHaveCount(0)
    await fenetre.getByRole('button', { name: 'Retirer pour confidentialité' }).click()
    await expect(page.getByText('Indicateur retiré pour confidentialité.')).toBeVisible()
    await expect(page.getByText('Publications', { exact: true })).toHaveCount(0)
    await page.getByText('Retirés (3)').click()
    await expect(page.getByText('[retiré pour confidentialité]')).toBeVisible()
    await expect(page.getByText(/Retiré pour confidentialité le \d+ /)).toBeVisible()
  })
})

test.describe('profils', () => {
  test('EJP Tech a « Voir la fiche » et les panneaux ; l’administration de l’église lit seulement (T60)', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'admin_plateforme' })
    await expect(page.getByRole('link', { name: 'Voir la fiche' })).toHaveAttribute(
      'href',
      '/ministeres/10000000-0000-4000-8000-000000000001',
    )
    await expect(bouton(page, 'Ajouter un indicateur')).toBeVisible()
    await ouvrir(page, { profil: 'admin_eglise' })
    await expect(page.getByRole('link', { name: 'Voir la fiche' })).toHaveCount(0)
    await expect(bouton(page, 'Ajouter un indicateur')).toHaveCount(0)
    await expect(bouton(page, 'Ajouter un calcul')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^(Corriger|Remplacer|Retirer)/ })).toHaveCount(0)
  })

  test('un ministère sans indicateur peut en recevoir un', async ({ page }) => {
    await ouvrir(page, { vue: 'protocole' })
    await expect(
      page.getByText('Aucun indicateur pour Protocole. Il saisit les chiffres communs.'),
    ).toBeVisible()
    await bouton(page, 'Ajouter un indicateur').click()
    await remplirAjout(page, 'Accueils', 'Personnes accueillies à l’entrée.', /Chaque dimanche/)
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByText('Indicateur ajouté.')).toBeVisible()
    await expect(page.getByText('Accueils', { exact: true })).toBeVisible()
  })

  test('les autres profils reçoivent la page non disponible, sans bouton d’action', async ({
    page,
  }) => {
    for (const profil of ['ministere', 'berger', 'conseil']) {
      await ouvrir(page, { profil })
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /Ajouter|Retirer|Corriger|Remplacer/ }),
      ).toHaveCount(0)
    }
  })
})

test.describe('accessibilité et petits écrans', () => {
  async function ouvrirChaquePanneau(page: Page, apres: (nom: string) => Promise<void>) {
    await ouvrir(page)
    await apres('page')

    await bouton(page, 'Ajouter un indicateur').click()
    await expect(titre(page, 'Ajouter un indicateur')).toBeVisible()
    await apres('ajout')
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByText('Donnez un libellé de 2 à 60 caractères.')).toBeVisible()
    await apres('ajout-erreurs')
    await page.getByRole('checkbox', { name: /Domaine sensible/ }).check()
    await apres('ajout-sensible')
    await bouton(page, 'Annuler').click()

    await bouton(page, 'Ajouter un calcul').click()
    await expect(titre(page, 'Ajouter un calcul')).toBeVisible()
    await apres('calcul')
    await bouton(page, 'Annuler').click()

    await page.getByRole('button', { name: 'Corriger « Demandes reçues »' }).click()
    await expect(titre(page, "Corriger l'indicateur")).toBeVisible()
    await apres('corriger')
    await bouton(page, 'Annuler').click()

    await page.getByRole('button', { name: 'Remplacer « Publications »' }).click()
    await expect(titre(page, "Remplacer l'indicateur")).toBeVisible()
    // Les calculs liés sont lus d'abord : le formulaire vient après.
    await expect(page.getByLabel('Ce que vous comptez')).toBeVisible()
    await apres('remplacer')
    await bouton(page, 'Annuler').click()

    await page.getByRole('button', { name: 'Retirer « Demandes reçues »' }).click()
    await expect(
      page.getByText('Le calcul « Taux de demandes traitées » sera retiré aussi.'),
    ).toBeVisible()
    await apres('retirer')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()

    await page
      .getByRole('button', { name: 'Retirer pour confidentialité « Publications »' })
      .click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await apres('confidentialite')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()
  }

  test('axe, WCAG 2.2 AA : chaque panneau et chaque fenêtre', async ({ page }) => {
    test.setTimeout(180_000)
    await ouvrirChaquePanneau(page, async (nom) => {
      try {
        await auditer(page)
      } catch (erreur) {
        throw new Error(`${nom} : ${String(erreur)}`, { cause: erreur })
      }
    })
  })

  test('axe avec le message de réussite affiché', async ({ page }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await remplirAjout(page, 'Tournages', 'Tournages réalisés dans le mois.', /Chaque mois/)
    await bouton(page, "Ajouter l'indicateur").click()
    await expect(page.getByText('Indicateur ajouté.')).toBeVisible()
    await auditer(page)
  })

  test('cibles de 44 px : boutons, choix et champs des panneaux', async ({ page }) => {
    test.setTimeout(180_000)
    await ouvrirChaquePanneau(page, async (nom) => {
      // Le contenu de la page et les fenêtres de retrait (hors de `main`), pas l'en-tête.
      const cibles = page
        .locator('main, [role="alertdialog"]')
        .locator(
          'button:visible, a:visible, select:visible, input[type="text"]:visible, textarea:visible, label:has(input[type="radio"]):visible, label:has(input[type="checkbox"]):visible',
        )
      const total = await cibles.count()
      for (let rang = 0; rang < total; rang += 1) {
        const boite = await cibles.nth(rang).boundingBox()
        if (boite === null) continue
        expect(boite.height, `${nom}, cible ${rang}, hauteur`).toBeGreaterThanOrEqual(43.5)
      }
    })
  })

  test('à 360 px, aucun défilement horizontal dans aucun panneau', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 360, height: 800 })
    await ouvrirChaquePanneau(page, async (nom) => {
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debord, nom).toBeLessThanOrEqual(0)
    })
  })

  test('sous 600 px, un panneau prend la page entière ; au-delà, il se pose sur la page', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, 'Ajouter un indicateur').click()
    await expect(titre(page, 'Ajouter un indicateur')).toBeVisible()
    const largeur = page.viewportSize()?.width ?? 0
    if (largeur >= 600) {
      await expect(page.getByRole('dialog', { name: 'Ajouter un indicateur' })).toBeVisible()
      const boite = await page.getByRole('dialog').boundingBox()
      expect(boite?.width).toBeLessThanOrEqual(460.5)
    } else {
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(titre(page, 'Indicateurs de Communication')).toHaveCount(0)
    }
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(180_000)
  const largeur = page.viewportSize()?.width ?? 0
  const capturer = (nom: string) =>
    page.screenshot({
      path: `test-results/captures/indicateurs-panneaux-${nom}-${largeur}.png`,
      fullPage: true,
    })
  await ouvrir(page)
  await capturer('page')
  await bouton(page, 'Ajouter un indicateur').click()
  await expect(titre(page, 'Ajouter un indicateur')).toBeVisible()
  await capturer('ajout')
  await page.getByLabel('Ce que vous comptez').fill('Tournages')
  await page.getByRole('radio', { name: /Chaque mois/ }).check()
  await bouton(page, "Ajouter l'indicateur").click()
  await capturer('ajout-erreurs')
  await bouton(page, 'Annuler').click()
  await bouton(page, 'Ajouter un calcul').click()
  await page
    .getByRole('combobox', { name: 'Chiffre du haut' })
    .selectOption({ label: 'Publications' })
  await capturer('calcul')
  await bouton(page, 'Annuler').click()
  await page.getByRole('button', { name: 'Corriger « Demandes reçues »' }).click()
  await capturer('corriger')
  await bouton(page, 'Annuler').click()
  await page.getByRole('button', { name: 'Remplacer « Publications »' }).click()
  await capturer('remplacer')
  await bouton(page, 'Annuler').click()
  await page.getByRole('button', { name: 'Retirer « Demandes reçues »' }).click()
  await expect(
    page.getByText('Le calcul « Taux de demandes traitées » sera retiré aussi.'),
  ).toBeVisible()
  await capturer('retirer')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()
  await page.getByRole('button', { name: 'Retirer pour confidentialité « Publications »' }).click()
  await capturer('confidentialite')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()
  await ouvrir(page, { vue: 'eagles' })
  await bouton(page, 'Ajouter un calcul').click()
  await capturer('calcul-impossible')
  await ouvrir(page, { vue: 'protocole' })
  await capturer('protocole')
  // Corriger un calcul dont un chiffre est saisi : le panneau le dit, sans formulaire.
  await ouvrir(page)
  await page.getByRole('button', { name: 'Corriger « Taux de demandes traitées »' }).click()
  await expect(page.getByText(/Ce calcul a déjà des valeurs/)).toBeVisible()
  await capturer('corriger-calcul-saisi')
  // Remplacer une source de calcul : le calcul qui part avec elle est nommé.
  await ouvrir(page)
  await page.getByRole('button', { name: 'Remplacer « Demandes reçues »' }).click()
  await expect(page.getByText(/sera retiré aussi/)).toBeVisible()
  await capturer('remplacer-source')
})

// Les états d'erreur de l'envoi : le refus de la base (`envoi=refus`) et la connexion perdue
// (`envoi=echec`), dans un panneau (ajout) et dans les deux fenêtres de retrait.
for (const envoi of ['refus', 'echec'] as const) {
  test(
    `captures des erreurs d’envoi (${envoi}) en 1440, 834 et 390 px`,
    {
      tag: '@captures',
    },
    async ({ page }) => {
      test.setTimeout(180_000)
      const largeur = page.viewportSize()?.width ?? 0
      const capturer = (nom: string) =>
        page.screenshot({
          path: `test-results/captures/indicateurs-panneaux-${nom}-${envoi}-${largeur}.png`,
          fullPage: true,
        })
      await ouvrir(page, { envoi })
      await bouton(page, 'Ajouter un indicateur').click()
      await remplirAjout(page, 'Tournages', 'Tournages réalisés dans le mois.', /Chaque mois/)
      await bouton(page, "Ajouter l'indicateur").click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.getByRole('alert')).toBeInViewport()
      await capturer('ajout')
      await bouton(page, 'Annuler').click()
      await page.getByRole('button', { name: 'Retirer « Publications »' }).click()
      const fenetre = page.getByRole('alertdialog')
      await fenetre.getByRole('radio', { name: "N'est plus suivi" }).check()
      await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
      await expect(fenetre.getByRole('alert')).toBeVisible()
      await capturer('retirer')
      await fenetre.getByRole('button', { name: 'Annuler' }).click()
      await page
        .getByRole('button', { name: 'Retirer pour confidentialité « Publications »' })
        .click()
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Retirer pour confidentialité' })
        .click()
      await expect(page.getByRole('alertdialog').getByRole('alert')).toBeVisible()
      await capturer('confidentialite')
    },
  )
}

// Les profils sans accès à la page : la même page non disponible, aux trois largeurs.
test(
  'captures de la page non disponible (ministère, berger, conseil)',
  {
    tag: '@captures',
  },
  async ({ page }) => {
    const largeur = page.viewportSize()?.width ?? 0
    for (const profil of ['ministere', 'berger', 'conseil']) {
      await ouvrir(page, { profil })
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeVisible()
      await page.screenshot({
        path: `test-results/captures/indicateurs-panneaux-non-disponible-${profil}-${largeur}.png`,
        fullPage: true,
      })
    }
  },
)
