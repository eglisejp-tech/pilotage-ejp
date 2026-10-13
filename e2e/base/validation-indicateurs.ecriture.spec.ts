import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { appeler, lire, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Validation des indicateurs d'un ministère (lot L4, T30) avec la base locale : projet « ecritures »
// (en série, à 1440 px, après les projets de lecture). Le parcours suit une demande de bout en
// bout, avec les cinq profils :
// 1. Communication envoie trois suggestions avec leur « Pourquoi » et lit le refus d'une quatrième
//    (l'explication du panneau, puis le refus de la base à un appel direct) ; son « Pourquoi »
//    n'entre jamais dans le journal, et elle ne peut pas décider ;
// 2. le berger voit les trois « à valider » sur la fiche, sans « Pourquoi » (la base ne le lui rend
//    pas) ;
// 3. l'administration de l'église lit le bloc « À valider » sans bouton ni « Pourquoi » ;
// 4. EJP Tech lit les « Pourquoi », valide une suggestion et en refuse une avec un motif ; une
//    seconde décision est refusée ;
// 5. Communication lit la suite : une suggestion active, une refusée avec le motif, une encore à
//    valider, et il lui reste un ajout.
//
// Ce parcours ne se rejoue pas sur la même base : les trois suggestions de Communication y restent.
// Dans la CI, le projet `ecritures` passe en dernier sur une base neuve : sans effet. En local,
// lancez `npx supabase db reset` avant de rejouer ce fichier. Le fichier se nomme « validation... »
// pour passer après les autres parcours d'écriture : une suggestion validée entre dans les chiffres
// du mois de Communication.

test.describe.configure({ mode: 'serial' })

// Trois suggestions « chaque mois » que le modèle « communication » n'a pas déjà comme prévus :
// `private.suggestions()` retire d'une fiche toute suggestion dont le libellé est déjà dessus
// (« Demandes reçues » et « Demandes traitées » y sont des prévus). L'ordre sert au parcours :
// la première est validée, la deuxième refusée, la troisième reste à valider. Le jeu d'exemple
// laisse aussi « Participants » de Jeunesse à valider, et deux décisions d'EJP Tech y sont déjà
// écrites : les comptes d'ensemble se lisent donc sur les lignes (voir `attendus`), et les
// lignes de Communication se retrouvent par le titre de leur ministère.
const SUGGESTIONS = [
  {
    code: 'suggestion_evenements_couverts',
    libelle: 'Événements couverts',
    pourquoi: 'Suivre les événements que nous couvrons chaque mois pour répartir le travail.',
  },
  {
    code: 'suggestion_activites_realisees',
    libelle: 'Activités réalisées',
    pourquoi: 'Mesurer les activités tenues chaque mois par le ministère.',
  },
  {
    code: 'suggestion_personnes_formees',
    libelle: 'Personnes formées',
    pourquoi: 'Voir combien de personnes suivent une formation de notre ministère.',
  },
] as const

const MOTIF_REFUS = 'Ce chiffre existe déjà sur votre fiche sous un autre nom.'
const AUTRE_POURQUOI = 'Compter les participants venus à nos activités du mois.'

/** Identifiants des demandes d'ajout de Communication, par libellé (lus par son compte). */
const demandes = new Map<string, string>()

type LigneDemande = { id: string; libelle: string; pourquoi: string }
type LigneIndicateur = {
  id: string
  libelle: string
  etat: string
  origine: string
  retrait_motif: string | null
}

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

const indicateursDeCommunication = (page: Page) =>
  lire<LigneIndicateur>(
    page,
    `indicateur?select=id,libelle,etat,origine,retrait_motif&ministere_id=eq.${MINISTERE_COMMUNICATION}&origine=eq.ministere`,
  )

/** La ligne du bloc « À valider » d'un ministère et d'un indicateur. */
const ligneAValider = (page: Page, libelle: string) =>
  page
    .getByRole('region', { name: 'À valider' })
    .getByRole('article')
    .filter({ hasText: new RegExp(`Nouvel indicateur\\s*: «\\s*${libelle}\\s*»`) })

/** Les lignes du bloc « À valider » (une par ajout, tous ministères). */
const lignesDuBloc = (page: Page) =>
  page.getByRole('region', { name: 'À valider' }).getByRole('article')

/** Les lignes du bloc qui sont celles de Communication. */
const lignesDeCommunication = (page: Page) =>
  lignesDuBloc(page).filter({
    has: page.getByRole('heading', { level: 3, name: 'Communication', exact: true }),
  })

/** « 3 ajouts en attente » : la phrase du titre du bloc pour un nombre de lignes. */
function phraseEnAttente(nombre: number): string {
  if (nombre === 0) return 'Aucun ajout en attente'
  return `${nombre} ${nombre === 1 ? 'ajout' : 'ajouts'} en attente`
}

test.describe('Communication envoie ses suggestions', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('« Gérer mes indicateurs » mène à « Mes indicateurs », sans cinquième onglet', async ({
    page,
  }) => {
    await page.goto('/ma-fiche')
    await attendreLaFinDuChargement(page)
    await page.getByRole('link', { name: 'Gérer mes indicateurs' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/ma-fiche/indicateurs')
    await expect(page.getByRole('heading', { level: 1, name: 'Mes indicateurs' })).toBeVisible()
    await attendreLaFinDuChargement(page)
    await expect(page).toHaveTitle('Mes indicateurs, Pilotage EJP')
    await expect(page.getByText(/Vous pouvez en ajouter 3\./)).toBeVisible()
    expect(await indicateursDeCommunication(page)).toHaveLength(0)
  })

  test('envoie trois suggestions avec leur « Pourquoi » : chacune naît « à valider »', async ({
    page,
  }) => {
    await page.goto('/ma-fiche/indicateurs')
    await attendreLaFinDuChargement(page)
    for (const [rang, suggestion] of SUGGESTIONS.entries()) {
      await page.getByRole('button', { name: 'Ajouter un indicateur' }).click()
      const panneau = page.getByRole('dialog', { name: 'Ajouter un indicateur' })
      await panneau
        .getByRole('button', { name: new RegExp(`^Choisir «\\s*${suggestion.libelle}`) })
        .click()
      const champ = panneau.getByRole('textbox', { name: 'Pourquoi cet indicateur ?' })
      // Aucun rappel sur les données personnelles sous ce champ (exception voulue, T30).
      await expect(panneau.getByText(/N'écrivez aucun nom/)).toHaveCount(0)
      await champ.fill(suggestion.pourquoi)
      await panneau.getByRole('button', { name: 'Envoyer pour validation' }).click()
      await expect(
        page.getByText(
          new RegExp(
            `«\\s*${suggestion.libelle}\\s*» envoyé pour validation : vous pouvez déjà le saisir dans vos chiffres du mois\\.`,
          ),
        ),
      ).toBeVisible()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(await indicateursDeCommunication(page)).toHaveLength(rang + 1)
    }

    const indicateurs = await indicateursDeCommunication(page)
    expect(indicateurs.map((indicateur) => indicateur.libelle).sort()).toEqual(
      SUGGESTIONS.map((suggestion) => suggestion.libelle).sort(),
    )
    expect(indicateurs.every((indicateur) => indicateur.etat === 'en_attente')).toBe(true)
    const lignes = await lire<LigneDemande>(page, 'demande_indicateur?select=id,libelle,pourquoi')
    expect(lignes).toHaveLength(3)
    for (const suggestion of SUGGESTIONS) {
      const ligne = lignes.find((possible) => possible.libelle === suggestion.libelle)
      expect(ligne?.pourquoi).toBe(suggestion.pourquoi)
      demandes.set(suggestion.libelle, ligne?.id ?? '')
    }
    await expect(page.getByText(/À valider par EJP Tech depuis aujourd'hui\./)).toHaveCount(3)
    await expect(page.getByText(/Vous avez atteint le maximum de 3 ajouts\./)).toBeVisible()
  })

  test('lit le refus d’une quatrième : l’explication du panneau, puis le refus de la base', async ({
    page,
  }) => {
    await page.goto('/ma-fiche/indicateurs')
    await attendreLaFinDuChargement(page)
    await page.getByRole('button', { name: 'Ajouter un indicateur' }).click()
    const panneau = page.getByRole('dialog', { name: 'Ajouter un indicateur' })
    await expect(panneau.getByText(/^Votre ministère a déjà 3 indicateurs à lui\./)).toBeVisible()
    await expect(panneau.getByText(/Demandez à l'administration de l'église/)).toBeVisible()
    await expect(panneau.getByRole('button', { name: /^Choisir «/ })).toHaveCount(0)
    await panneau.getByRole('button', { name: 'Fermer' }).click()

    // Un appel direct reçoit le même refus de la base : rien n'est écrit.
    const reponse = await appeler(page, 'ajouter_suggestion', {
      p_ministere_id: MINISTERE_COMMUNICATION,
      p_code: 'suggestion_participants',
      p_pourquoi: AUTRE_POURQUOI,
    })
    expect(reponse.status()).toBe(400)
    expect(((await reponse.json()) as { message: string }).message).toContain(
      'Votre ministère a déjà 3 indicateurs à lui.',
    )
    expect(await indicateursDeCommunication(page)).toHaveLength(3)
  })

  test('le « Pourquoi » n’entre jamais dans le journal, et le ministère ne décide pas', async ({
    page,
  }) => {
    await page.goto('/')
    const journal = await lire<{ detail: unknown }>(
      page,
      `v_journal?select=detail&action=eq.indicateur_cree&ministere_id=eq.${MINISTERE_COMMUNICATION}`,
    )
    expect(journal).toHaveLength(3)
    for (const suggestion of SUGGESTIONS) {
      expect(JSON.stringify(journal)).not.toContain(suggestion.pourquoi)
    }
    const demande = demandes.get('Événements couverts')
    expect(demande).toBeTruthy()
    const refus = await appeler(page, 'valider_indicateur', {
      p_demande_id: demande,
      p_decision: 'valide',
    })
    expect(refus.status()).toBe(403)
    expect(
      (await indicateursDeCommunication(page)).every(
        (indicateur) => indicateur.etat === 'en_attente',
      ),
    ).toBe(true)
  })
})

for (const profil of ['berger', 'conseil'] as const) {
  test.describe(`${profil} : lit les trois « à valider », sans le « Pourquoi »`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('sur la fiche : la marque « À valider par EJP Tech », aucun « Pourquoi »', async ({
      page,
    }) => {
      await page.goto(`/ministeres/${MINISTERE_COMMUNICATION}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Communication' })).toBeVisible()
      await attendreLaFinDuChargement(page)
      for (const suggestion of SUGGESTIONS) {
        await expect(page.getByText(suggestion.libelle, { exact: true }).first()).toBeVisible()
        await expect(page.getByText(suggestion.pourquoi)).toHaveCount(0)
      }
      await expect(page.getByText('À valider par EJP Tech', { exact: true })).toHaveCount(3)
      await expect(page.getByText(/Pourquoi cet indicateur/)).toHaveCount(0)
      // Cette fiche n'a ni lien « Gérer mes indicateurs » ni bouton de décision.
      await expect(page.getByRole('link', { name: 'Gérer mes indicateurs' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /^(Valider|Refuser) / })).toHaveCount(0)
    })

    test('la base ne lui rend ni le « Pourquoi », ni la file, et refuse toute décision', async ({
      page,
    }) => {
      await page.goto('/')
      expect(await lire<unknown>(page, 'demande_indicateur?select=pourquoi')).toEqual([])
      expect(await lire<unknown>(page, 'v_a_valider?select=pourquoi')).toEqual([])
      const decision = await appeler(page, 'valider_indicateur', {
        p_demande_id: demandes.get('Événements couverts'),
        p_decision: 'valide',
      })
      expect(decision.status()).toBe(403)
      const ajout = await appeler(page, 'ajouter_suggestion', {
        p_ministere_id: MINISTERE_COMMUNICATION,
        p_code: 'suggestion_participants',
        p_pourquoi: AUTRE_POURQUOI,
      })
      expect(ajout.status()).toBe(403)
    })
  })
}

test.describe('l’administration de l’église lit le bloc « À valider »', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('sans bouton, sans « Pourquoi » et sans nombre de valeurs', async ({ page }) => {
    await page.goto('/indicateurs')
    await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs' })).toBeVisible()
    await attendreLaFinDuChargement(page)
    const bloc = page.getByRole('region', { name: 'À valider' })
    // Les trois de Communication, plus « Participants » de Jeunesse, laissé à valider par le jeu
    // d'exemple : le titre dit le nombre de lignes, quelles qu'elles soient.
    await expect(lignesDeCommunication(page)).toHaveCount(3)
    await expect(bloc.getByText(phraseEnAttente(await lignesDuBloc(page).count()))).toBeVisible()
    for (const suggestion of SUGGESTIONS) {
      await expect(
        bloc.getByText(new RegExp(`Nouvel indicateur\\s*: «\\s*${suggestion.libelle}`)),
      ).toBeVisible()
      await expect(bloc.getByText(suggestion.pourquoi)).toHaveCount(0)
    }
    await expect(bloc.getByRole('button')).toHaveCount(0)
    await expect(bloc.getByText(/Pourquoi/)).toHaveCount(0)
    await expect(bloc.getByText(/valeurs? déjà saisies?/)).toHaveCount(0)
    await expect(bloc.getByText(/Ces ajouts attendent EJP Tech/)).toBeVisible()
  })

  test('la base ne lui rend ni le « Pourquoi », ni la file d’EJP Tech, et refuse toute décision', async ({
    page,
  }) => {
    await page.goto('/')
    expect(await lire<unknown>(page, 'demande_indicateur?select=pourquoi')).toEqual([])
    expect(await lire<unknown>(page, 'v_a_valider?select=pourquoi')).toEqual([])
    const decision = await appeler(page, 'valider_indicateur', {
      p_demande_id: demandes.get('Événements couverts'),
      p_decision: 'valide',
    })
    expect(decision.status()).toBe(403)
  })
})

test.describe('EJP Tech valide une suggestion et en refuse une', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('lit les « Pourquoi », valide « Événements couverts » en un clic', async ({ page }) => {
    await page.goto('/indicateurs')
    await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs' })).toBeVisible()
    await attendreLaFinDuChargement(page)
    const bloc = page.getByRole('region', { name: 'À valider' })
    await expect(lignesDeCommunication(page)).toHaveCount(3)
    const avant = await lignesDuBloc(page).count()
    await expect(bloc.getByText(phraseEnAttente(avant))).toBeVisible()
    for (const suggestion of SUGGESTIONS) {
      await expect(ligneAValider(page, suggestion.libelle)).toContainText(suggestion.pourquoi)
    }
    await page
      .getByRole('button', { name: /^Valider «\s*Événements couverts\s*» de Communication$/ })
      .click()
    await expect(page.getByText('Indicateur validé.')).toBeVisible()
    await expect(ligneAValider(page, 'Événements couverts')).toHaveCount(0)
    await expect(lignesDeCommunication(page)).toHaveCount(2)
    await expect(bloc.getByText(phraseEnAttente(avant - 1))).toBeVisible()
    const indicateurs = await indicateursDeCommunication(page)
    expect(
      indicateurs.find((indicateur) => indicateur.libelle === 'Événements couverts')?.etat,
    ).toBe('actif')
  })

  test('refuse « Activités réalisées » avec un motif de 10 à 280 caractères', async ({ page }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    const bloc = page.getByRole('region', { name: 'À valider' })
    // Il reste deux lignes de Communication (une validée avant) : on compte les lignes une fois
    // la liste affichée.
    await expect(lignesDeCommunication(page)).toHaveCount(2)
    const avant = await lignesDuBloc(page).count()
    await page
      .getByRole('button', { name: /^Refuser «\s*Activités réalisées\s*» de Communication$/ })
      .click()
    const fenetre = page.getByRole('dialog', { name: /Refuser «\s*Activités réalisées\s*» \?/ })
    await expect(fenetre.getByText("N'écrivez aucun nom ni information personnelle.")).toBeVisible()
    // Trop court : refusé par le formulaire, rien n'est écrit.
    await fenetre.getByRole('textbox', { name: 'Pourquoi ce refus ?' }).fill('Court')
    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(fenetre.getByText('Expliquez le refus (10 caractères au moins).')).toBeVisible()
    await fenetre.getByRole('textbox').fill(MOTIF_REFUS)
    await fenetre.getByRole('button', { name: 'Refuser' }).click()
    await expect(page.getByText('Indicateur refusé.', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const indicateurs = await indicateursDeCommunication(page)
    const refuse = indicateurs.find((indicateur) => indicateur.libelle === 'Activités réalisées')
    expect(refuse).toMatchObject({ etat: 'retire', retrait_motif: 'refuse' })
    // La liste repliée des décisions montre le motif (le jeu d'exemple y ajoute deux décisions de
    // Jeunesse : le nombre exact n'est pas celui de ce parcours), le bloc garde « Personnes formées ».
    await page.getByText(/Décidées ces 30 derniers jours \(\d+\)/).click()
    await expect(
      page.getByText(/Refusée le .* : «\s*Ce chiffre existe déjà sur votre fiche/),
    ).toBeVisible()
    await expect(lignesDeCommunication(page)).toHaveCount(1)
    await expect(ligneAValider(page, 'Personnes formées')).toBeVisible()
    await expect(bloc.getByText(phraseEnAttente(avant - 1))).toBeVisible()
  })

  test('masque le « Pourquoi » d’une demande : le texte est remplacé, le bouton disparaît', async ({
    page,
  }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    const ligne = ligneAValider(page, 'Personnes formées')
    // Les motifs de refus de la liste repliée se masquent aussi (le bouton est posé, pas utilisé ici).
    await page.getByText(/Décidées ces 30 derniers jours \(\d+\)/).click()
    await expect(
      page
        .getByRole('region', { name: 'À valider' })
        .getByRole('button', { name: 'Masquer le texte' })
        .last(),
    ).toBeVisible()
    await ligne.getByRole('button', { name: 'Masquer le texte' }).click()
    const boite = page.getByRole('dialog', { name: 'Masquer le texte' })
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(boite.getByText('Choisissez un motif dans la liste.')).toBeVisible()
    await boite.getByRole('radio', { name: "Nom d'une personne" }).check()
    await boite.getByRole('button', { name: 'Masquer définitivement' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Texte masqué.')).toBeVisible()
    await expect(ligne).toContainText('[texte masqué par EJP Tech]')
    await expect(ligne).not.toContainText(SUGGESTIONS[2].pourquoi)
    await expect(ligne.getByRole('button', { name: 'Masquer le texte' })).toHaveCount(0)
    // La décision reste possible sur une ligne dont le texte est masqué.
    await expect(
      page.getByRole('button', { name: /^Valider «\s*Personnes formées\s*» de Communication$/ }),
    ).toBeVisible()
  })

  test('une décision est définitive, et le journal ne recopie ni le « Pourquoi » ni le motif', async ({
    page,
  }) => {
    await page.goto('/')
    const seconde = await appeler(page, 'valider_indicateur', {
      p_demande_id: demandes.get('Événements couverts'),
      p_decision: 'valide',
    })
    expect(seconde.status()).toBe(400)
    expect(((await seconde.json()) as { message: string }).message).toBe(
      'Cette demande a déjà été décidée.',
    )
    const journal = await lire<{ action: string; detail: unknown }>(
      page,
      `v_journal?select=action,detail&ministere_id=eq.${MINISTERE_COMMUNICATION}&action=in.(indicateur_cree,indicateur_valide,indicateur_refuse)`,
    )
    expect(journal.filter((ligne) => ligne.action === 'indicateur_valide')).toHaveLength(1)
    expect(journal.filter((ligne) => ligne.action === 'indicateur_refuse')).toHaveLength(1)
    const texte = JSON.stringify(journal)
    expect(texte).not.toContain(MOTIF_REFUS)
    for (const suggestion of SUGGESTIONS) expect(texte).not.toContain(suggestion.pourquoi)
  })
})

test.describe('Communication lit la suite', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('« Mes indicateurs » : une suggestion active, une refusée avec son motif, une à valider', async ({
    page,
  }) => {
    await page.goto('/ma-fiche/indicateurs')
    await attendreLaFinDuChargement(page)
    await expect(page.getByText(/2 ajoutés par vous/)).toBeVisible()
    await expect(page.getByText(/Vous pouvez en ajouter 1 autre\./)).toBeVisible()
    // Une seule ligne reste « à valider » : « Personnes formées ».
    await expect(page.getByText(/^À valider par EJP Tech depuis/)).toHaveCount(1)
    await expect(page.getByText('Événements couverts', { exact: true })).toBeVisible()
    // « Retirés » s'ouvre de lui-même : il porte le motif d'un refus, que Communication doit lire.
    await expect(page.getByText(/^Retirés \(1\)$/)).toBeVisible()
    await expect(page.locator('details[open] summary', { hasText: 'Retirés' })).toHaveCount(1)
    await expect(
      page.getByText(new RegExp(`Refusé le .* : «\\s*${MOTIF_REFUS}\\s*»\\.`)),
    ).toBeVisible()
  })

  test('le panneau propose une suggestion de plus : le refus ne compte pas dans les ajouts', async ({
    page,
  }) => {
    await page.goto('/ma-fiche/indicateurs')
    await attendreLaFinDuChargement(page)
    await page.getByRole('button', { name: 'Ajouter un indicateur' }).click()
    const panneau = page.getByRole('dialog', { name: 'Ajouter un indicateur' })
    await expect(panneau.getByRole('button', { name: /^Choisir «/ }).first()).toBeVisible()
    // « Activités réalisées » a été refusée : elle revient dans la liste.
    await expect(
      panneau.getByRole('button', { name: /^Choisir «\s*Activités réalisées/ }),
    ).toBeVisible()
    // Celles qui sont déjà sur la fiche n'y sont plus.
    await expect(
      panneau.getByRole('button', { name: /^Choisir «\s*Événements couverts/ }),
    ).toHaveCount(0)
    await expect(
      panneau.getByRole('button', { name: /^Choisir «\s*Personnes formées/ }),
    ).toHaveCount(0)
  })
})
