import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Bloc « À valider » de l'écran Indicateurs (lot L4) sur l'aperçu de développement : le vrai bloc,
// des données d'exemple, des décisions simulées comme `valider_indicateur` (aucune base, aucune
// écriture). EJP Tech décide et lit le « Pourquoi » ; l'administration de l'église lit l'attente
// sans bouton ni « Pourquoi ». Trois formats par les projets Playwright : 1440, 834 et 390 px. Les
// parcours avec la base locale sont dans e2e/base/validation-indicateurs.ecriture.spec.ts.

type Ecran = { vue?: string; profil?: string; envoi?: string }

const adresse = ({ vue = 'liste', profil = 'admin_plateforme', envoi }: Ecran) =>
  `/apercu/validation-indicateurs?profil=${profil}&vue=${vue}${envoi ? `&envoi=${envoi}` : ''}`

async function ouvrir(page: Page, ecran: Ecran = {}) {
  await page.goto(adresse(ecran))
  await page.evaluate(() => document.fonts.ready)
}

const nomDe = ({ vue = 'liste', profil = 'admin_plateforme', envoi }: Ecran) =>
  `${vue}-${profil}${envoi ? `-${envoi}` : ''}`

const bouton = (page: Page, nom: string | RegExp) => page.getByRole('button', { name: nom })
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ })
const ligne = (page: Page, ministere: string) =>
  page.getByRole('heading', { level: 3, name: ministere }).locator('xpath=ancestor::article[1]')

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(resultat.violations).toEqual([])
}

const TOUS: Ecran[] = [
  { vue: 'liste', profil: 'admin_plateforme' },
  { vue: 'liste', profil: 'admin_eglise' },
  { vue: 'vide', profil: 'admin_plateforme' },
  { vue: 'vide', profil: 'admin_eglise' },
  { vue: 'chargement' },
  { vue: 'probleme' },
  { vue: 'decisions-probleme' },
  { vue: 'retraits-probleme' },
]

/** La liste repliée des retraits faits par les ministères (T62). */
const retraits = (page: Page) =>
  page.locator('details', { hasText: 'Retirés par les ministères ces 30 derniers jours' })

test.describe('bloc « À valider » (EJP Tech), aperçu', () => {
  test('titre, phrase, trois ajouts du plus ancien au plus récent, « en retard » avec le mot', async ({
    page,
  }) => {
    await ouvrir(page)
    const bloc = page.getByRole('region', { name: 'À valider' })
    await expect(bloc.getByRole('heading', { level: 2, name: 'À valider' })).toBeVisible()
    await expect(bloc.getByText('3 indicateurs à valider')).toBeVisible()
    await expect(bloc.getByRole('heading', { level: 3 })).toHaveText([
      'Kumi',
      'Communication',
      'Intégration',
    ])
    await expect(ligne(page, 'Kumi')).toContainText('Envoyé le 1er oct.')
    await expect(ligne(page, 'Kumi')).toContainText('depuis 9 jours')
    await expect(ligne(page, 'Kumi').getByText('en retard')).toBeVisible()
    await expect(ligne(page, 'Communication').getByText('en retard')).toHaveCount(0)
    await expect(ligne(page, 'Kumi')).toContainText('2 chiffres déjà saisis')
    await expect(ligne(page, 'Kumi')).toContainText(
      /Nouvel indicateur\s*: «\s*Demandes reçues\s*» \(chaque mois\)/,
    )
    await expect(ligne(page, 'Communication')).toContainText('(à ce jour)')
  })

  test('EJP Tech lit le « Pourquoi », y compris masqué', async ({ page }) => {
    await ouvrir(page)
    await expect(ligne(page, 'Kumi')).toContainText('Pourquoi : « Suivre les demandes')
    await expect(ligne(page, 'Intégration')).toContainText('[texte masqué]')
  })

  test('« Valider » décide en un clic, sans fenêtre : la ligne disparaît, la décision s’annonce', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, /^Valider «\s*Demandes reçues\s*» de Kumi$/).click()
    await expect(reussite(page)).toHaveText('Indicateur validé.')
    await expect(page.getByRole('heading', { level: 3, name: 'Kumi' })).toHaveCount(0)
    await expect(page.getByText('2 indicateurs à valider')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // La décision rejoint la liste repliée.
    await page.getByText(/Décidées ces 30 derniers jours \(4\)/).click()
    await expect(page.getByText('Validée le 10 oct.')).toBeVisible()
  })

  test('« Refuser » : fenêtre, motif de 10 à 280 caractères, rappel, puis refus annoncé', async ({
    page,
  }) => {
    await ouvrir(page)
    await bouton(page, /^Refuser «\s*Projets en cours\s*» de Communication$/).click()
    const fenetre = page.getByRole('dialog', { name: /Refuser «\s*Projets en cours\s*» \?/ })
    await expect(fenetre).toBeVisible()
    await expect(fenetre.getByText("N'écrivez aucun nom ni information personnelle.")).toBeVisible()
    await expect(
      fenetre.getByText(
        "L'indicateur sera retiré : ses valeurs ne s'afficheront plus. Communication lira ce motif.",
      ),
    ).toBeVisible()
    const champ = fenetre.getByRole('textbox', { name: 'Pourquoi ce refus ?' })
    await expect(fenetre.getByText('0 sur 280')).toBeVisible()

    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(fenetre.getByText('Expliquez le refus (10 caractères au moins).')).toBeVisible()
    await champ.fill('a'.repeat(281))
    await expect(fenetre.getByText('281 sur 280')).toBeVisible()
    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(
      fenetre.getByText('Raccourcissez le motif : 280 caractères au plus.'),
    ).toBeVisible()

    await champ.fill('Ce chiffre existe déjà sur votre fiche.')
    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(reussite(page)).toHaveText('Indicateur refusé.')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 3, name: 'Communication' })).toHaveCount(0)
    await page.getByText(/Décidées ces 30 derniers jours \(4\)/).click()
    await expect(
      page.getByText(/Refusée le 10 oct\. : «.*Ce chiffre existe déjà sur votre fiche\..*»/),
    ).toBeVisible()
  })

  test('« Annuler » et Échap ferment la fenêtre sans rien décider', async ({ page }) => {
    await ouvrir(page)
    const refuser = bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/)
    await refuser.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(refuser).toBeFocused()
    await refuser.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('3 indicateurs à valider')).toBeVisible()
  })

  test('un refus du motif par la base se dit sous le champ, la fenêtre reste ouverte', async ({
    page,
  }) => {
    await ouvrir(page, { envoi: 'motif' })
    await bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/).click()
    const fenetre = page.getByRole('dialog')
    await fenetre.getByRole('textbox').fill('Écrire à quelqu’un pour voir.')
    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(fenetre.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    // Le rappel sous le champ, puis le refus de la base traduit (T66, m268).
    await expect(fenetre.getByText("N'écrivez aucun nom ni information personnelle.")).toHaveCount(
      1,
    )
    await expect(
      fenetre.getByText('Retirez de votre texte les emails, liens, numéros et noms de personnes.'),
    ).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('une connexion perdue garde le motif dans la fenêtre, et « Valider » le dit sous la ligne', async ({
    page,
  }) => {
    await ouvrir(page, { envoi: 'echec' })
    await bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/).click()
    const fenetre = page.getByRole('dialog')
    await fenetre.getByRole('textbox').fill('Ce chiffre existe déjà ailleurs.')
    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(fenetre.getByRole('alert')).toContainText('La connexion a échoué.')
    await expect(fenetre.getByRole('textbox')).toHaveValue('Ce chiffre existe déjà ailleurs.')
    await fenetre.getByRole('button', { name: 'Annuler' }).click()
    await bouton(page, /^Valider «\s*Demandes reçues\s*» de Kumi$/).click()
    await expect(ligne(page, 'Kumi').getByRole('alert')).toHaveText(
      'La connexion a échoué. Réessayez.',
    )
    await expect(ligne(page, 'Kumi')).toBeVisible()
  })

  test('une demande déjà décidée par un autre compte : le message reste en haut du bloc', async ({
    page,
  }) => {
    await ouvrir(page, { envoi: 'decidee' })
    await bouton(page, /^Valider «\s*Demandes reçues\s*» de Kumi$/).click()
    // Formule « changé entre-temps » (T66, m235).
    await expect(page.getByRole('region', { name: 'À valider' }).getByRole('alert')).toHaveText(
      'Cette demande a déjà reçu une réponse. Rechargez la page.',
    )
    await expect(page.getByRole('heading', { level: 3, name: 'Kumi' })).toHaveCount(0)
  })

  test('rien à valider : le titre reste, avec la phrase et sans introduction', async ({ page }) => {
    await ouvrir(page, { vue: 'vide' })
    const bloc = page.getByRole('region', { name: 'À valider' })
    await expect(bloc.getByText(/^Rien à valider\./)).toBeVisible()
    await expect(bloc.getByText('Aucun indicateur à valider')).toBeVisible()
    await expect(bloc.getByText(/Les ministères envoient leurs ajouts ici/)).toHaveCount(0)
    await expect(bloc.getByRole('button')).toHaveCount(0)
  })

  test('chargement, puis problème passager avec « Réessayer » : aucun compte de décisions à côté', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'chargement' })
    await expect(page.locator('[aria-busy="true"]')).toBeVisible()
    await expect(page.getByText(/Décidées ces 30 derniers jours/)).toHaveCount(0)
    await ouvrir(page, { vue: 'probleme' })
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(bouton(page, 'Réessayer')).toBeVisible()
    await expect(page.getByText(/Décidées ces 30 derniers jours/)).toHaveCount(0)
  })

  test('la liste des décisions ne se lit pas : un bandeau et « Réessayer », la file reste lisible', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'decisions-probleme' })
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(bouton(page, 'Réessayer')).toBeVisible()
    await expect(page.getByText('3 indicateurs à valider')).toBeVisible()
    await expect(page.getByText(/Décidées ces 30 derniers jours/)).toHaveCount(0)
  })

  test('« Masquer le texte » sous un « Pourquoi » : motif dans une liste, texte remplacé, annoncé', async ({
    page,
  }) => {
    await ouvrir(page)
    // Kumi et Communication ont un « Pourquoi » à masquer ; celui d'Intégration l'est déjà.
    await expect(page.getByRole('button', { name: 'Masquer le texte' })).toHaveCount(2)
    await expect(
      ligne(page, 'Intégration').getByRole('button', { name: 'Masquer le texte' }),
    ).toHaveCount(0)
    await ligne(page, 'Kumi').getByRole('button', { name: 'Masquer le texte' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Masquer ce texte ?' })
    await expect(fenetre.getByText('Indicateur à valider, Kumi')).toBeVisible()
    await fenetre.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(fenetre.getByText('Choisissez un motif dans la liste.')).toBeVisible()
    await fenetre.getByRole('radio', { name: "Nom d'une personne" }).check()
    await fenetre.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(reussite(page)).toHaveText('Texte masqué.')
    await expect(ligne(page, 'Kumi')).toContainText('[texte masqué]')
    await expect(ligne(page, 'Kumi')).not.toContainText('Suivre les demandes')
    await expect(ligne(page, 'Kumi').getByRole('button', { name: 'Masquer le texte' })).toHaveCount(
      0,
    )
  })

  test('« Masquer le texte » sous le motif d’un refus décidé, jamais sous un motif déjà masqué', async ({
    page,
  }) => {
    await ouvrir(page)
    await page.getByText(/Décidées ces 30 derniers jours \(3\)/).click()
    const decidees = page.locator('details', { hasText: 'Décidées ces 30 derniers jours' })
    await expect(decidees.getByRole('button', { name: 'Masquer le texte' })).toHaveCount(1)
    await decidees.getByRole('button', { name: 'Masquer le texte' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Masquer ce texte ?' })
    await expect(fenetre.getByText('Indicateur refusé, Jeunesse')).toBeVisible()
    await fenetre.getByRole('radio', { name: 'Autre information personnelle' }).check()
    await fenetre.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(reussite(page)).toHaveText('Texte masqué.')
    await expect(decidees.getByRole('button', { name: 'Masquer le texte' })).toHaveCount(0)
    await expect(decidees.getByText('[texte masqué]')).toHaveCount(2)
  })

  test('les décisions des 30 derniers jours sont repliées : jour, motif en citation, motif masqué', async ({
    page,
  }) => {
    await ouvrir(page)
    await expect(page.getByText('Validée le 8 oct.')).toBeHidden()
    // Le titre est souligné : on voit qu'il s'ouvre.
    await expect(page.getByText(/Décidées ces 30 derniers jours \(3\)/)).toHaveCSS(
      'text-decoration-line',
      'underline',
    )
    await page.getByText(/Décidées ces 30 derniers jours \(3\)/).click()
    await expect(page.getByText('Validée le 8 oct.')).toBeVisible()
    await expect(
      page.getByText(
        /Refusée le 5 oct\. : «.*Ce chiffre existe déjà sur la fiche sous un autre nom\..*»/,
      ),
    ).toBeVisible()
    await expect(
      page
        .locator('details', { hasText: 'Décidées ces 30 derniers jours' })
        .getByText('[texte masqué]'),
    ).toBeVisible()
  })

  test('T62 : les retraits des ministères, repliés, avec le ministère, le jour et le motif', async ({
    page,
  }) => {
    await ouvrir(page)
    const resume = page.getByText(/Retirés par les ministères ces 30 derniers jours \(2\)/)
    await expect(resume).toHaveCSS('text-decoration-line', 'underline')
    await expect(page.getByText(/^Demande retirée le 9 oct\./)).toBeHidden()
    await resume.click()
    const liste = retraits(page)
    await expect(liste.getByText(/Kumi, «\s*Projets en cours\s*»/)).toBeVisible()
    await expect(
      liste.getByText(
        /^Demande retirée le 9 oct\. : «\s*Nous suivons déjà ces projets dans « Activités réalisées »\.\s*»$/,
      ),
    ).toBeVisible()
    await expect(liste.getByText(/^Retiré le 2 oct\. : «\s*\[texte masqué\]\s*»$/)).toBeVisible()
    // La demande retirée avant la décision a quitté la file : son « Pourquoi » se lit ici.
    await expect(
      liste.getByText(/^Pourquoi : «\s*Voir combien de projets restent ouverts chaque mois\.\s*»$/),
    ).toBeVisible()
    await expect(liste.getByText(/^Pourquoi :/)).toHaveCount(1)
  })

  test('T62 : « Masquer le texte » sous le motif d’un retrait, jamais sous un motif déjà masqué', async ({
    page,
  }) => {
    await ouvrir(page)
    await page.getByText(/Retirés par les ministères ces 30 derniers jours \(2\)/).click()
    const liste = retraits(page)
    // Le motif de Kumi et le « Pourquoi » de sa demande retirée ; rien sous le motif masqué.
    const boutons = liste.getByRole('button', { name: 'Masquer le texte' })
    await expect(boutons).toHaveCount(2)
    await boutons.first().click()
    const fenetre = page.getByRole('dialog', { name: 'Masquer ce texte ?' })
    await expect(fenetre.getByText('Indicateur retiré par son ministère, Kumi')).toBeVisible()
    await fenetre.getByRole('radio', { name: 'Autre information personnelle' }).check()
    await fenetre.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(reussite(page)).toHaveText('Texte masqué.')
    await expect(boutons).toHaveCount(1)
    await expect(liste.getByText('[texte masqué]')).toHaveCount(2)
  })

  test('T62 : le « Pourquoi » d’une demande retirée avant la décision se masque dans la liste', async ({
    page,
  }) => {
    await ouvrir(page)
    await page.getByText(/Retirés par les ministères ces 30 derniers jours \(2\)/).click()
    const liste = retraits(page)
    await liste.getByRole('button', { name: 'Masquer le texte' }).last().click()
    const fenetre = page.getByRole('dialog', { name: 'Masquer ce texte ?' })
    await expect(fenetre.getByText('Demande retirée par son ministère, Kumi')).toBeVisible()
    await expect(fenetre.getByText(/Voir combien de projets restent ouverts/)).toBeVisible()
    await fenetre.getByRole('radio', { name: 'Autre information personnelle' }).check()
    await fenetre.getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(reussite(page)).toHaveText('Texte masqué.')
    await expect(liste.getByText(/^Pourquoi : «\s*\[texte masqué\]\s*»$/)).toBeVisible()
    await expect(liste.getByRole('button', { name: 'Masquer le texte' })).toHaveCount(1)
  })

  test('T62 : la liste des retraits ne se lit pas : un bandeau et « Réessayer », le reste lisible', async ({
    page,
  }) => {
    await ouvrir(page, { vue: 'retraits-probleme' })
    await expect(page.getByText(/Décidées ces 30 derniers jours \(3\)/)).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText('La connexion a échoué. Réessayez.')
    await expect(bouton(page, 'Réessayer')).toBeVisible()
    await expect(page.getByText(/Retirés par les ministères/)).toHaveCount(0)
  })
})

test.describe('bloc « À valider » (administration de l’église), aperçu', () => {
  test('lit l’attente sans bouton, sans « Pourquoi » et sans nombre de valeurs', async ({
    page,
  }) => {
    await ouvrir(page, { profil: 'admin_eglise' })
    const bloc = page.getByRole('region', { name: 'À valider' })
    await expect(bloc.getByText('3 indicateurs à valider')).toBeVisible()
    await expect(
      bloc.getByText(
        'Ces ajouts attendent EJP Tech. Vous les lisez ici : seul EJP Tech les valide ou les refuse.',
      ),
    ).toBeVisible()
    await expect(bloc.getByRole('heading', { level: 3 })).toHaveText([
      'Kumi',
      'Communication',
      'Intégration',
    ])
    await expect(bloc.getByRole('button')).toHaveCount(0)
    await expect(bloc.getByText(/Pourquoi/)).toHaveCount(0)
    await expect(bloc.getByText(/Suivre les demandes/)).toHaveCount(0)
    await expect(bloc.getByText(/valeurs? déjà saisies?/)).toHaveCount(0)
    await expect(bloc.getByText(/Décidées ces 30 derniers jours/)).toHaveCount(0)
    // T62 : les retraits des ministères et leur motif se lisent par EJP Tech seul.
    await expect(bloc.getByText(/Retirés par les ministères/)).toHaveCount(0)
    await expect(ligne(page, 'Kumi').getByText('en retard')).toBeVisible()
    await expect(ligne(page, 'Kumi')).toContainText('Envoyé le 1er oct.')
  })

  test('les autres profils reçoivent la page non disponible', async ({ page }) => {
    for (const profil of ['ministere', 'berger', 'conseil']) {
      await ouvrir(page, { profil })
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Page non disponible',
        }),
      ).toBeVisible()
    }
  })
})

test.describe('accessibilité et petits écrans', () => {
  test('axe, WCAG 2.2 AA : chaque état, chaque profil, la fenêtre « Refuser » et les décisions', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      try {
        await auditer(page)
      } catch (erreur) {
        throw new Error(`${nomDe(ecran)} : ${String(erreur)}`, { cause: erreur })
      }
    }
    await ouvrir(page)
    await page.getByText(/Décidées ces 30 derniers jours \(3\)/).click()
    await page.getByText(/Retirés par les ministères ces 30 derniers jours \(2\)/).click()
    await auditer(page)
    await bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/).click()
    await auditer(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Refuser' }).click()
    await expect(page.getByText('Expliquez le refus (10 caractères au moins).')).toBeVisible()
    await auditer(page)
    await page.keyboard.press('Escape')
    await ligne(page, 'Kumi').getByRole('button', { name: 'Masquer le texte' }).click()
    await expect(page.getByRole('dialog', { name: 'Masquer ce texte ?' })).toBeVisible()
    await auditer(page)
  })

  test('cibles de 44 px : boutons, liens et résumé replié', async ({ page }) => {
    await ouvrir(page)
    const cibles = page.locator('main').locator('button:visible, a:visible, summary:visible')
    const total = await cibles.count()
    expect(total).toBeGreaterThan(6)
    for (let rang = 0; rang < total; rang += 1) {
      const boite = await cibles.nth(rang).boundingBox()
      if (boite === null) continue
      expect(boite.height, `cible ${rang}, hauteur`).toBeGreaterThanOrEqual(43.5)
    }
    await bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/).click()
    for (const cible of await page
      .getByRole('dialog')
      .locator('button:visible, textarea:visible')
      .all()) {
      const boite = await cible.boundingBox()
      if (boite === null) continue
      expect(boite.height).toBeGreaterThanOrEqual(43.5)
    }
  })

  test('à 360 px, aucun défilement horizontal, fenêtre comprise', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 360, height: 800 })
    const debord = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
    for (const ecran of TOUS) {
      await ouvrir(page, ecran)
      expect(await debord(), nomDe(ecran)).toBeLessThanOrEqual(0)
    }
    await ouvrir(page)
    await bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/).click()
    expect(await debord(), 'fenêtre « Refuser »').toBeLessThanOrEqual(0)
    const boite = await page.getByRole('dialog').boundingBox()
    expect(boite).not.toBeNull()
    expect(boite!.x).toBeGreaterThanOrEqual(0)
    expect(boite!.x + boite!.width).toBeLessThanOrEqual(360)
  })
})

test('captures en 1440, 834 et 390 px', { tag: '@captures' }, async ({ page }) => {
  test.setTimeout(120_000)
  const taille = page.viewportSize()?.width ?? 0
  for (const ecran of TOUS) {
    await ouvrir(page, ecran)
    await page.screenshot({
      path: `test-results/captures/validation-indicateurs-${nomDe(ecran)}-${taille}.png`,
      fullPage: true,
    })
  }
  await ouvrir(page)
  await page.getByText(/Décidées ces 30 derniers jours \(3\)/).click()
  await page.screenshot({
    path: `test-results/captures/validation-indicateurs-decidees-${taille}.png`,
    fullPage: true,
  })
  // T62 : les retraits des ministères, ouverts, avec leur motif.
  await page.getByText(/Retirés par les ministères ces 30 derniers jours \(2\)/).click()
  await page.screenshot({
    path: `test-results/captures/validation-indicateurs-retraits-${taille}.png`,
    fullPage: true,
  })
  await bouton(page, /^Refuser «\s*Demandes reçues\s*» de Kumi$/).click()
  await page.screenshot({
    path: `test-results/captures/validation-indicateurs-refuser-${taille}.png`,
  })
  await page.keyboard.press('Escape')
  await ligne(page, 'Kumi').getByRole('button', { name: 'Masquer le texte' }).click()
  await page.screenshot({
    path: `test-results/captures/validation-indicateurs-masquer-${taille}.png`,
  })
})
