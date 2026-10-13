import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import { appeler, lire } from './outils-evenements.ts'
import { ministereDEssai } from './outils-ministere.ts'

// Panneaux de configuration des indicateurs (lot L3b, configuration-indicateurs.md, 7.2) qui
// écrivent dans la base locale : projet « ecritures » (en série, à 1440 px, après les projets de
// lecture). Un ministère créé par le test (clé secrète locale, comme `installer-comptes.ts` : jamais
// une base distante) que nul autre parcours ne lit :
// - l'administration ajoute deux indicateurs du mois, puis un calcul sur les deux ;
// - elle corrige l'un des deux (rien n'est saisi), puis le retire : le calcul part avec lui, ses
//   textes restent, une seule ligne de journal sans texte ;
// - elle ajoute un indicateur « sensible après coup » et le retire pour confidentialité : libellé et
//   définition masqués en base, une seule ligne de journal sans texte ;
// - EJP Tech voit « Voir la fiche » et remplace un indicateur : l'ancien est retiré (motif
//   « Remplacé »), le nouveau le cite ;
// - le ministère, le berger et le conseil reçoivent la page non disponible, sans requête, et la base
//   refuse leurs appels directs (relus avec la clé secrète locale : rien n'a changé).
//
// Ce parcours ne se rejoue pas sur la même base : le ministère d'essai et ses indicateurs y
// restent. Dans la CI, le projet `ecritures` passe sur une base neuve. En local, lancez
// `npx supabase db reset` avant de rejouer ce fichier.

test.describe.configure({ mode: 'serial' })

// Une consonne au début : le titre dit « Indicateurs de … » (« d'Essai » devant une voyelle).
const NOM_MINISTERE = 'Panneaux essai'
let ministere = ''

test.beforeAll(async () => {
  ministere = await ministereDEssai(NOM_MINISTERE)
})

type LigneIndicateur = {
  id: string
  libelle: string
  definition: string
  nature: string
  unite: string
  calcul: string | null
  etat: string
  origine: string
  retrait_motif: string | null
  remplace_id: string | null
}
type LigneTerme = { calcul_id: string; source_id: string | null; role: string }
type LigneJournal = {
  id: number
  action: string
  cible_id: string | null
  detail: Record<string, unknown> | null
}

const indicateursDe = (page: Page) =>
  lire<LigneIndicateur>(
    page,
    `indicateur?select=id,libelle,definition,nature,unite,calcul,etat,origine,retrait_motif,remplace_id&ministere_id=eq.${ministere}&order=cree_le`,
  )

const parLibelle = (lignes: LigneIndicateur[], libelle: string) =>
  lignes.find((ligne) => ligne.libelle === libelle)

const journalDe = (page: Page, action: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,action,cible_id,detail&action=eq.${action}&ministere_id=eq.${ministere}&order=id`,
  )

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

async function ouvrirLeMinistere(page: Page) {
  await page.goto(`/indicateurs/${ministere}`)
  await expect(
    page.getByRole('heading', { level: 1, name: `Indicateurs de ${NOM_MINISTERE}` }),
  ).toBeVisible()
  await attendreLaFinDuChargement(page)
}

/**
 * Ajoute un indicateur du mois par le panneau, puis attend le message et la ligne. Un texte qui
 * ressemble à un domaine sensible (libellé ou définition) demande la confirmation « Ce n'est pas un
 * domaine sensible » : `confirmerPasSensible` la coche, une fois l'avertissement de la base lu.
 */
async function ajouterUnIndicateur(
  page: Page,
  libelle: string,
  definition: string,
  confirmerPasSensible = false,
) {
  await page.getByRole('button', { name: 'Ajouter un indicateur', exact: true }).click()
  const panneau = page.getByRole('dialog', { name: 'Ajouter un indicateur' })
  await panneau.getByLabel('Ce que vous comptez').fill(libelle)
  await panneau.getByLabel("Ce qu'on compte exactement").fill(definition)
  await panneau.getByRole('radio', { name: /Chaque mois/ }).check()
  if (confirmerPasSensible) {
    await expect(panneau.getByText(/Ce chiffre semble sensible/)).toBeVisible()
    await panneau.getByRole('checkbox', { name: "Ce n'est pas un domaine sensible" }).check()
  }
  await panneau.getByRole('button', { name: "Ajouter l'indicateur" }).click()
  await expect(page.getByText('Indicateur ajouté.')).toBeVisible()
  await expect(page.getByText(libelle, { exact: true })).toBeVisible()
}

test.describe('administration de l’église', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('deux indicateurs du mois, ajoutés sans valeur ni texte au journal', async ({ page }) => {
    await ouvrirLeMinistere(page)
    // Un nom que la coordination ne connaît pas : aucun indicateur, et le bloc « Prévus » à choisir.
    expect(await indicateursDe(page)).toHaveLength(0)
    await expect(
      page.getByRole('button', { name: 'Ajouter un indicateur', exact: true }),
    ).toBeVisible()
    await ajouterUnIndicateur(
      page,
      'Demandes essai',
      'Demandes reçues dans le mois, toutes sources.',
    )
    await ajouterUnIndicateur(page, 'Résolues essai', 'Demandes résolues dans le mois.')

    const lignes = await indicateursDe(page)
    expect(lignes).toHaveLength(2)
    expect(lignes.every((ligne) => ligne.etat === 'actif' && ligne.origine === 'eglise')).toBe(true)
    expect(parLibelle(lignes, 'Demandes essai')).toMatchObject({ nature: 'mois', unite: 'nombre' })

    const journal = await journalDe(page, 'indicateur_cree')
    expect(journal).toHaveLength(2)
    for (const ligne of journal) {
      expect(ligne.detail).toMatchObject({ nature: 'mois', unite: 'nombre', origine: 'eglise' })
      expect(JSON.stringify(ligne.detail)).not.toMatch(/essai/i)
    }
  })

  test('un doublon est refusé : le message de la base s’affiche, rien n’est écrit', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    await page.getByRole('button', { name: 'Ajouter un indicateur', exact: true }).click()
    const panneau = page.getByRole('dialog', { name: 'Ajouter un indicateur' })
    await panneau.getByLabel('Ce que vous comptez').fill('Demandes essai')
    await panneau.getByLabel("Ce qu'on compte exactement").fill('Demandes reçues, encore une fois.')
    await panneau.getByRole('radio', { name: /Chaque mois/ }).check()
    await panneau.getByRole('button', { name: "Ajouter l'indicateur" }).click()
    await expect(panneau.getByRole('alert')).toHaveText('Cette fiche a déjà « Demandes essai ».')
    expect(await indicateursDe(page)).toHaveLength(2)
    await panneau.getByRole('button', { name: 'Annuler' }).click()
  })

  test('un calcul sur les deux : un taux, ses deux termes, une ligne de journal', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    await page.getByRole('button', { name: 'Ajouter un calcul', exact: true }).click()
    const panneau = page.getByRole('dialog', { name: 'Ajouter un calcul' })
    await panneau.getByLabel('Nom du calcul').fill('Taux essai')
    await panneau.getByLabel("Ce qu'on calcule").fill('Demandes résolues sur demandes reçues.')
    await panneau
      .getByRole('combobox', { name: 'Chiffre du haut' })
      .selectOption({ label: 'Résolues essai' })
    await panneau.getByLabel('Chiffre du bas').selectOption({ label: 'Demandes essai' })
    await panneau.getByRole('radio', { name: 'En pourcentage' }).check()
    await expect(panneau.getByText(/^Par exemple : 16 sur 20, soit 80.%$/)).toBeVisible()
    await panneau.getByRole('button', { name: 'Ajouter le calcul' }).click()
    await expect(page.getByText('Calcul ajouté.')).toBeVisible()
    await expect(page.getByText('Taux essai', { exact: true })).toBeVisible()

    const lignes = await indicateursDe(page)
    const calcul = parLibelle(lignes, 'Taux essai')
    expect(calcul).toMatchObject({ calcul: 'taux', nature: 'mois', etat: 'actif' })
    const termes = await lire<LigneTerme>(
      page,
      `indicateur_terme?select=calcul_id,source_id,role&calcul_id=eq.${calcul?.id}&order=ordre`,
    )
    expect(termes).toEqual([
      { calcul_id: calcul?.id, source_id: parLibelle(lignes, 'Résolues essai')?.id, role: 'haut' },
      { calcul_id: calcul?.id, source_id: parLibelle(lignes, 'Demandes essai')?.id, role: 'bas' },
    ])
    expect(await journalDe(page, 'indicateur_cree')).toHaveLength(3)
  })

  test('corriger un indicateur jamais saisi : le libellé change, une ligne de journal sans texte', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    await page.getByRole('button', { name: 'Corriger « Demandes essai »' }).click()
    const panneau = page.getByRole('dialog', { name: "Corriger l'indicateur" })
    await panneau.getByLabel('Ce que vous comptez').fill('Demandes essai reçues')
    await panneau.getByRole('button', { name: 'Enregistrer la correction' }).click()
    await expect(page.getByText('Correction enregistrée.')).toBeVisible()
    await expect(page.getByText('Demandes essai reçues', { exact: true })).toBeVisible()
    expect(parLibelle(await indicateursDe(page), 'Demandes essai reçues')).toBeDefined()
    const journal = await journalDe(page, 'indicateur_corrige')
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ champs: ['libelle'] })
  })

  test('retirer la source d’un calcul : le calcul part avec elle, les textes restent', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    await page.getByRole('button', { name: 'Retirer « Demandes essai reçues »' }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Retirer « Demandes essai reçues » ?' })
    await expect(fenetre.getByText('Le calcul « Taux essai » sera retiré aussi.')).toBeVisible()
    await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
    await expect(fenetre.getByText('Choisissez le motif du retrait.')).toBeVisible()
    await fenetre.getByRole('radio', { name: "Doublon d'un autre chiffre" }).check()
    await fenetre.getByRole('button', { name: "Retirer l'indicateur" }).click()
    await expect(page.getByText('Indicateur retiré. 1 calcul retiré avec lui.')).toBeVisible()

    const lignes = await indicateursDe(page)
    expect(parLibelle(lignes, 'Demandes essai reçues')).toMatchObject({
      etat: 'retire',
      retrait_motif: 'doublon',
    })
    expect(parLibelle(lignes, 'Taux essai')).toMatchObject({
      etat: 'retire',
      retrait_motif: 'source_retiree',
    })
    expect(parLibelle(lignes, 'Résolues essai')).toMatchObject({ etat: 'actif' })
    const journal = await journalDe(page, 'indicateur_retire')
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ motif: 'doublon', avec_saisies: false, calculs: 1 })
  })

  test('un mot sensible dans la définition : la base demande de confirmer, la case le permet', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    // « enfants » est de la famille sensible : le libellé, lui, est clair.
    await ajouterUnIndicateur(
      page,
      'Annonces essai',
      'Annonces faites aux enfants dans le mois.',
      true,
    )
    expect(parLibelle(await indicateursDe(page), 'Annonces essai')).toMatchObject({
      etat: 'actif',
      nature: 'mois',
    })
  })

  test('retirer pour confidentialité : libellé et définition masqués, une seule ligne de journal', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    // « intervention » est de la famille sensible : le libellé demande la confirmation.
    await ajouterUnIndicateur(
      page,
      'Interventions essai',
      'Interventions menées dans le mois.',
      true,
    )
    await page
      .getByRole('button', { name: 'Retirer pour confidentialité « Interventions essai »' })
      .click()
    const fenetre = page.getByRole('alertdialog', {
      name: 'Retirer « Interventions essai » pour confidentialité ?',
    })
    await expect(
      fenetre.getByText("Le nom et la définition seront masqués. C'est définitif."),
    ).toBeVisible()
    await fenetre.getByRole('button', { name: 'Retirer pour confidentialité' }).click()
    await expect(page.getByText('Indicateur retiré pour confidentialité.')).toBeVisible()
    await expect(page.getByText('Interventions essai', { exact: true })).toHaveCount(0)

    const lignes = await indicateursDe(page)
    const masque = lignes.find((ligne) => ligne.retrait_motif === 'confidentialite')
    expect(masque).toMatchObject({
      etat: 'retire',
      libelle: '[retiré pour confidentialité]',
      definition: '[retiré pour confidentialité]',
    })
    expect(lignes.some((ligne) => ligne.libelle === 'Interventions essai')).toBe(false)
    const retires = await journalDe(page, 'indicateur_retire')
    const ligneMasquee = retires.find((ligne) => ligne.cible_id === masque?.id)
    expect(ligneMasquee?.detail).toEqual({
      motif: 'confidentialite',
      avec_saisies: false,
      calculs: 0,
    })
    expect(JSON.stringify(retires)).not.toMatch(/interventions/i)
  })

  test('« Voir la fiche » n’est pas proposé à l’administration', async ({ page }) => {
    await ouvrirLeMinistere(page)
    await expect(page.getByRole('link', { name: 'Voir la fiche' })).toHaveCount(0)
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('« Voir la fiche » mène à la fiche du ministère', async ({ page }) => {
    await ouvrirLeMinistere(page)
    await page.getByRole('link', { name: 'Voir la fiche' }).click()
    await expect(page).toHaveURL(new RegExp(`/ministeres/${ministere}$`))
  })

  test('remplacer un indicateur : l’ancien est retiré (« Remplacé »), le nouveau le cite', async ({
    page,
  }) => {
    await ouvrirLeMinistere(page)
    await page.getByRole('button', { name: 'Remplacer « Résolues essai »' }).click()
    const panneau = page.getByRole('dialog', { name: "Remplacer l'indicateur" })
    await expect(
      panneau.getByText(
        "Remplace « Résolues essai » (chaque mois). Ses saisies restent sous l'ancien indicateur.",
      ),
    ).toBeVisible()
    // Aucun mot de période dans le libellé : le rythme se choisit plus bas.
    await panneau.getByLabel('Ce que vous comptez').fill('Résolues essai bis')
    await panneau.getByRole('radio', { name: /Chaque dimanche/ }).check()
    await panneau.getByRole('button', { name: "Remplacer l'indicateur" }).click()
    await expect(page.getByText('Indicateur remplacé.')).toBeVisible()

    const lignes = await indicateursDe(page)
    const ancien = parLibelle(lignes, 'Résolues essai')
    const nouveau = parLibelle(lignes, 'Résolues essai bis')
    expect(ancien).toMatchObject({ etat: 'retire', retrait_motif: 'remplace' })
    expect(nouveau).toMatchObject({ etat: 'actif', nature: 'dimanche', remplace_id: ancien?.id })
  })
})

test.describe('le ministère, le berger et le conseil', () => {
  for (const profil of ['ministere', 'berger', 'conseil'] as const) {
    test.describe(profil, () => {
      test.use({ storageState: fichierSession(profil) })

      test('la page d’un ministère est non disponible, sans requête de données ni bouton', async ({
        page,
      }) => {
        const requetes = suivreRequetesDeDonnees(page)
        await page.goto(`/indicateurs/${ministere}`)
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: "Cette page n'est pas disponible avec votre compte.",
          }),
        ).toBeVisible()
        await expect(
          page.getByRole('button', { name: /Ajouter|Corriger|Remplacer|Retirer/ }),
        ).toHaveCount(0)
        expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
      })

      test('la base refuse leurs appels directs, rien n’est écrit', async ({ page, browser }) => {
        await page.goto('/')
        // Le berger lit toutes les fiches : il relit le ministère d'essai avant et après, car un
        // ministère ne voit pas la fiche d'un autre (0 = 0 ne prouverait rien).
        const indicateursVusParLeBerger = async () => {
          const contexte = await browser.newContext({ storageState: fichierSession('berger') })
          try {
            const pageBerger = await contexte.newPage()
            await pageBerger.goto('/')
            return await indicateursDe(pageBerger)
          } finally {
            await contexte.close()
          }
        }
        const avant = await indicateursVusParLeBerger()
        const cible = avant.find((ligne) => ligne.etat === 'actif')
        if (cible === undefined) throw new Error('Le ministère d’essai n’a aucun indicateur actif.')
        const ajout = await appeler(page, 'creer_indicateur', {
          p_ministere_id: ministere,
          p_libelle: 'Tentative directe',
          p_definition: 'Tentative directe depuis un profil sans droit.',
          p_nature: 'mois',
          p_unite: 'nombre',
          p_sensible: false,
          p_pas_sensible: false,
          p_remplace_id: null,
        })
        expect(ajout.status()).toBe(403)
        const retrait = await appeler(page, 'retirer_indicateur', {
          p_indicateur_id: cible.id,
          p_motif: 'confidentialite',
        })
        expect(retrait.status()).toBe(403)
        const apres = await indicateursVusParLeBerger()
        expect(apres).toHaveLength(avant.length)
        expect(apres.some((ligne) => ligne.libelle === 'Tentative directe')).toBe(false)
        expect(apres.find((ligne) => ligne.id === cible.id)).toEqual(cible)
      })
    })
  }
})
