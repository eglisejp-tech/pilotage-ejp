import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { appeler, compter, lire, MINISTERE_COMMUNICATION } from './outils-evenements.ts'
import { ministereDEssai } from './outils-ministere.ts'

// Liste choisie et création des indicateurs prévus (lot L3a, configuration-indicateurs.md, 7.1 et
// 7.2 ; T72) qui écrivent dans la base locale : projet « ecritures » (en série, à 1440 px, après
// les projets de lecture). Trois ministères créés par le test (clé secrète locale, comme
// `installer-comptes.ts` : jamais une base distante), qu'aucun autre parcours ne lit :
// - « Kumi », dont le nom est celui d'un modèle de la coordination : la liste « Kumi » est
//   présélectionnée, jamais choisie d'office ; EJP Tech, qui configure seul (décision T60),
//   enregistre le choix, puis clique « Créer » dans le tableau ; tous les prévus du modèle sont
//   créés d'un coup, sans doublon, avec une seule ligne de journal de création ;
// - « Essai prévus », dont le nom n'est pas reconnu : EJP Tech choisit « Entretien » dans la liste
//   de la coordination sur l'écran du ministère, l'enregistre, puis crée ;
// - « Essai sans prévu » : EJP Tech enregistre « Aucun prévu », réversible.
// Puis Jeunesse : « Kumi » est refusé (la liste sert déjà à Kumi), « Eagles » s'enregistre, mais
// sa création est refusée (Jeunesse a déjà « Activités réalisées ») : tout ou rien, aucune ligne
// de journal de création. L'administration de l'église lit les écrans sans aucun bouton ; elle,
// le ministère et le berger n'ont aucun droit sur les fonctions.
//
// Ce parcours ne se rejoue pas sur la même base : les trois ministères d'essai, leurs listes et
// leurs indicateurs y restent (« Kumi » doit être vide au départ, les lectures comptent 8
// ministères). Dans la CI, le projet `ecritures` passe en dernier sur une base neuve : sans effet.
// En local, lancez `npx supabase db reset` avant de rejouer ce fichier, et avant de relancer les
// projets de lecture (`indicateurs-configuration.spec.ts`) après un passage d'`ecritures`.

const ACTION_PREVUS = 'indicateurs_prevus_crees'
const ACTION_CHOIX = 'modele_prevus_choisi'

test.describe.configure({ mode: 'serial' })

const MINISTERE_JEUNESSE = '10000000-0000-4000-8000-000000000004'
let kumi = ''
let essaiPrevus = ''
let essaiSansPrevu = ''

test.beforeAll(async () => {
  kumi = await ministereDEssai('Kumi')
  essaiPrevus = await ministereDEssai('Essai prévus')
  essaiSansPrevu = await ministereDEssai('Essai sans prévu')
})

type LigneIndicateur = {
  id: string
  modele_code: string | null
  etat: string
  origine: string
  libelle: string
}
type LigneJournal = { id: number; detail: Record<string, unknown> | null }
type LigneListe = { modele: string | null; suggere: string | null }

const indicateursDe = (page: Page, ministereId: string) =>
  lire<LigneIndicateur>(
    page,
    `indicateur?select=id,modele_code,etat,origine,libelle&ministere_id=eq.${ministereId}`,
  )

const journalDe = (page: Page, action: string, ministereId: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,detail&action=eq.${action}&ministere_id=eq.${ministereId}&order=id`,
  )

const journalPrevus = (page: Page, ministereId: string) =>
  journalDe(page, ACTION_PREVUS, ministereId)

const journalChoix = (page: Page, ministereId: string) => journalDe(page, ACTION_CHOIX, ministereId)

/** Liste choisie d'un ministère (`v_ministere_modele`, T72). */
async function listeDe(page: Page, ministereId: string): Promise<LigneListe | undefined> {
  const lignes = await lire<LigneListe>(
    page,
    `v_ministere_modele?select=modele,suggere&ministere_id=eq.${ministereId}`,
  )
  return lignes[0]
}

/** Nombre de prévus d'un modèle dans le catalogue, lu par le compte de la page. */
async function nombreDePrevus(page: Page, modele: string): Promise<number> {
  return compter(page, `v_catalogue?select=code&modele=eq.${encodeURIComponent(modele)}`)
}

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

const ligneDe = (page: Page, nom: string) =>
  page
    .getByRole('link', { name: nom, exact: true })
    .locator('xpath=ancestor::*[self::tr or self::li][1]')

const choixDeLaListe = (page: Page) =>
  page.getByRole('combobox', { name: 'Nom du ministère dans la liste' })

test.describe('EJP Tech, qui configure (T60)', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('Kumi : la liste « Kumi » est présélectionnée, rien n’est enregistré avant « Enregistrer le choix »', async ({
    page,
  }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    const ligne = ligneDe(page, 'Kumi')
    await expect(ligne).toContainText('À choisir')
    await expect(ligne).toContainText('0 sur 30')
    expect(await listeDe(page, kumi)).toEqual({ modele: null, suggere: 'kumi' })
    await ligne.getByRole('link', { name: 'Choisir pour Kumi' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs de Kumi' })).toBeVisible()
    await attendreLaFinDuChargement(page)
    await expect(choixDeLaListe(page)).toHaveValue('kumi')
    await expect(choixDeLaListe(page)).toHaveAccessibleDescription(
      "Choix proposé d'après le nom du ministère : vérifiez-le avant d'enregistrer.",
    )
    // Une suggestion n'est jamais un choix : rien au journal, rien dans la base.
    expect(await journalChoix(page, kumi)).toHaveLength(0)
    expect(await indicateursDe(page, kumi)).toHaveLength(0)

    await page.getByRole('button', { name: 'Enregistrer le choix' }).click()
    await expect(page.getByText('Choix « Kumi » enregistré pour Kumi.')).toBeVisible()
    expect(await listeDe(page, kumi)).toEqual({ modele: 'kumi', suggere: 'kumi' })
    const choix = await journalChoix(page, kumi)
    expect(choix).toHaveLength(1)
    expect(choix[0]?.detail).toEqual({ avant: null, apres: 'kumi' })
    expect(await indicateursDe(page, kumi)).toHaveLength(0)
  })

  test('Kumi : « Créer » dans le tableau crée tous les prévus du modèle, une seule ligne de journal', async ({
    page,
  }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    const n = await nombreDePrevus(page, 'kumi')
    expect(n).toBeGreaterThan(0)
    expect(await indicateursDe(page, kumi)).toHaveLength(0)
    expect(await journalPrevus(page, kumi)).toHaveLength(0)

    const ligne = ligneDe(page, 'Kumi')
    await expect(ligne).toContainText(`${n} à créer`)
    await expect(ligne).toContainText('0 sur 30')
    await ligne.getByRole('button', { name: `Créer les ${n} indicateurs prévus de Kumi` }).click()

    await expect(page.getByText(`${n} indicateurs prévus créés.`)).toBeVisible()
    await expect(ligneDe(page, 'Kumi')).toContainText('Créés')
    await expect(ligneDe(page, 'Kumi')).toContainText(`${n} sur 30`)
    await expect(ligneDe(page, 'Kumi').getByRole('button')).toHaveCount(0)

    const crees = await indicateursDe(page, kumi)
    expect(crees).toHaveLength(n)
    expect(crees.every((indicateur) => indicateur.etat === 'actif')).toBe(true)
    expect(crees.every((indicateur) => indicateur.origine === 'eglise')).toBe(true)
    expect(crees.every((indicateur) => indicateur.modele_code?.startsWith('kumi_'))).toBe(true)
    const journal = await journalPrevus(page, kumi)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ modele: 'kumi', nombre: n })
  })

  test('l’écran de Kumi : ses indicateurs par rythme, plus de bloc de prévus, la phrase du ministère', async ({
    page,
  }) => {
    await page.goto(`/indicateurs/${kumi}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs de Kumi' })).toBeVisible()
    await attendreLaFinDuChargement(page)
    const n = await nombreDePrevus(page, 'kumi')
    await expect(page.getByText(new RegExp(`^${n} indicateurs suivis\\.$`))).toBeVisible()
    await expect(page.getByRole('region', { name: 'Indicateurs prévus' })).toHaveCount(0)
    const sections = await page.getByRole('heading', { level: 2 }).allTextContents()
    expect(sections.length).toBeGreaterThan(0)
    // Un indicateur créé aujourd'hui n'a encore rien de saisi : « Jamais saisi », jamais une valeur.
    await expect(page.getByText('Jamais saisi').first()).toBeVisible()
  })

  test('par l’API : un second « Créer » ne crée rien ; une autre liste est refusée tant que Kumi suit la sienne', async ({
    page,
  }) => {
    await page.goto('/')
    const reponse = await appeler(page, 'creer_indicateurs_prevus', {
      p_ministere_id: kumi,
      p_modele: 'kumi',
    })
    expect(reponse.status()).toBe(200)
    expect(await reponse.json()).toBe(0)
    expect(await journalPrevus(page, kumi)).toHaveLength(1)
    expect(await indicateursDe(page, kumi)).toHaveLength(await nombreDePrevus(page, 'kumi'))
    // T72 : la création refuse une autre liste que la sienne, le choix aussi tant qu'un prévu
    // de la liste est suivi.
    const autreCreation = await appeler(page, 'creer_indicateurs_prevus', {
      p_ministere_id: kumi,
      p_modele: 'eagles',
    })
    expect(autreCreation.status()).toBe(400)
    const autreChoix = await appeler(page, 'choisir_modele_prevus', {
      p_ministere_id: kumi,
      p_modele: 'eagles',
    })
    expect(autreChoix.status()).toBe(400)
    expect(await listeDe(page, kumi)).toMatchObject({ modele: 'kumi' })
    expect(await journalChoix(page, kumi)).toHaveLength(1)
  })

  test('« Essai sans prévu » : « Aucun prévu » s’enregistre, puis se change et revient', async ({
    page,
  }) => {
    await page.goto(`/indicateurs/${essaiSansPrevu}`)
    await attendreLaFinDuChargement(page)
    await choixDeLaListe(page).selectOption({ label: 'Aucun prévu' })
    await page.getByRole('button', { name: 'Enregistrer le choix' }).click()
    await expect(
      page.getByText('Choix « Aucun prévu » enregistré pour Essai sans prévu.'),
    ).toBeVisible()
    await expect(page.getByText('Aucun indicateur pour Essai sans prévu.')).toBeVisible()
    const bloc = page.getByRole('region', { name: 'Indicateurs prévus' })
    await expect(bloc.getByText('Aucun indicateur prévu pour ce ministère.')).toBeVisible()
    await expect(bloc.getByRole('button', { name: 'Changer' })).toBeVisible()
    expect(await indicateursDe(page, essaiSansPrevu)).toHaveLength(0)
    expect(await listeDe(page, essaiSansPrevu)).toMatchObject({ modele: 'aucun' })
    const choix = await journalChoix(page, essaiSansPrevu)
    expect(choix.map((ligne) => ligne.detail)).toEqual([{ avant: null, apres: 'aucun' }])

    // La création « aucun » par l'API garde sa ligne de journal, une seule fois.
    for (let essai = 0; essai < 2; essai += 1) {
      const reponse = await appeler(page, 'creer_indicateurs_prevus', {
        p_ministere_id: essaiSansPrevu,
        p_modele: 'aucun',
      })
      expect(reponse.status()).toBe(200)
    }
    const journal = await journalPrevus(page, essaiSansPrevu)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ modele: 'aucun', nombre: 0 })

    // « Aucun prévu » est réversible : « Changer », une liste, puis de nouveau « Aucun prévu ».
    await page.reload()
    await attendreLaFinDuChargement(page)
    await page
      .getByRole('region', { name: 'Indicateurs prévus' })
      .getByRole('button', { name: 'Changer' })
      .click()
    await choixDeLaListe(page).selectOption({ label: 'Film' })
    await page.getByRole('button', { name: 'Enregistrer le choix' }).click()
    await expect(page.getByText('Choix « Film » enregistré pour Essai sans prévu.')).toBeVisible()
    expect(await listeDe(page, essaiSansPrevu)).toMatchObject({ modele: 'film' })
    const retour = await appeler(page, 'choisir_modele_prevus', {
      p_ministere_id: essaiSansPrevu,
      p_modele: 'aucun',
    })
    // choisir_modele_prevus ne rend rien : PostgREST répond 204.
    expect(retour.status()).toBe(204)
    expect((await journalChoix(page, essaiSansPrevu)).map((ligne) => ligne.detail)).toEqual([
      { avant: null, apres: 'aucun' },
      { avant: 'aucun', apres: 'film' },
      { avant: 'film', apres: 'aucun' },
    ])
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    await expect(ligneDe(page, 'Essai sans prévu')).toContainText('Aucun prévu')
  })

  test('Jeunesse : « Kumi » sert déjà à Kumi ; « Eagles » s’enregistre, mais sa création est refusée (doublon)', async ({
    page,
  }) => {
    await page.goto(`/indicateurs/${MINISTERE_JEUNESSE}`)
    await attendreLaFinDuChargement(page)
    const avant = (await indicateursDe(page, MINISTERE_JEUNESSE)).length
    const journalAvant = await journalPrevus(page, MINISTERE_JEUNESSE)
    await choixDeLaListe(page).selectOption({ label: 'Kumi' })
    await page.getByRole('button', { name: 'Enregistrer le choix' }).click()
    // Le refus de la base, traduit (T72) : une liste sert un seul ministère actif.
    await expect(page.getByRole('alert')).toHaveText(
      "Cette liste sert déjà à « Kumi ». Changez d'abord la liste de ce ministère.",
    )
    expect(await listeDe(page, MINISTERE_JEUNESSE)).toMatchObject({ modele: null })

    await choixDeLaListe(page).selectOption({ label: 'Eagles' })
    await page.getByRole('button', { name: 'Enregistrer le choix' }).click()
    await expect(page.getByText('Choix « Eagles » enregistré pour Jeunesse.')).toBeVisible()
    await page.getByRole('button', { name: /^Créer ces \d+ indicateurs$/ }).click()
    // Le refus de la base, traduit (m228).
    await expect(page.getByRole('alert')).toHaveText(
      /^La fiche a déjà « .+ »\. Retirez-le, puis créez les indicateurs prévus\.$/,
    )
    // Tout ou rien : aucun indicateur de plus, aucune ligne de journal de plus, le bloc reste.
    expect(await indicateursDe(page, MINISTERE_JEUNESSE)).toHaveLength(avant)
    expect(await journalPrevus(page, MINISTERE_JEUNESSE)).toHaveLength(journalAvant.length)
    await expect(page.getByRole('region', { name: 'Indicateurs prévus' })).toBeVisible()
  })

  test('« Essai prévus » : nom non reconnu, EJP Tech choisit « Entretien », l’enregistre, puis crée', async ({
    page,
  }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    const ligne = ligneDe(page, 'Essai prévus')
    await expect(ligne).toContainText('À choisir')
    expect(await indicateursDe(page, essaiPrevus)).toHaveLength(0)
    await ligne.getByRole('link', { name: 'Choisir pour Essai prévus' }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: "Indicateurs d'Essai prévus" }),
    ).toBeVisible()
    await attendreLaFinDuChargement(page)
    const n = await nombreDePrevus(page, 'entretien')
    expect(n).toBeGreaterThan(0)
    const choix = choixDeLaListe(page)
    await expect(choix).toHaveValue('')
    await expect(choix.locator('option').last()).toHaveText('Aucun prévu')
    await choix.selectOption({ label: 'Entretien' })
    await expect(page.getByText(`Liste « Entretien » : ${n} indicateurs à créer.`)).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer le choix' }).click()
    await expect(page.getByText('Choix « Entretien » enregistré pour Essai prévus.')).toBeVisible()
    await page.getByRole('button', { name: `Créer ces ${n} indicateurs` }).click()

    await expect(page.getByText(`${n} indicateurs prévus créés.`)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Indicateurs prévus' })).toHaveCount(0)
    const crees = await indicateursDe(page, essaiPrevus)
    expect(crees).toHaveLength(n)
    expect(crees.every((indicateur) => indicateur.modele_code?.startsWith('entretien_'))).toBe(true)
    const journal = await journalPrevus(page, essaiPrevus)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ modele: 'entretien', nombre: n })

    // La liste le dit : ses prévus sont créés, même si son nom n'est pas dans la liste.
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    await expect(ligneDe(page, 'Essai prévus')).toContainText('Créés')
  })
})

test.describe('administration de l’église, en lecture (T60)', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test('lit Kumi créé par EJP Tech : « Créés », la phrase de lecture, aucun bouton', async ({
    page,
  }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    await expect(
      page.getByText(
        'EJP Tech crée, corrige et retire les indicateurs. Adressez-lui vos demandes.',
      ),
    ).toBeVisible()
    await expect(ligneDe(page, 'Kumi')).toContainText('Créés')
    await expect(page.getByRole('main').getByRole('button', { name: /^Créer/ })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('link', { name: /^Changer/ })).toHaveCount(0)
    await page.goto(`/indicateurs/${kumi}`)
    await attendreLaFinDuChargement(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Indicateurs de Kumi' })).toBeVisible()
    await expect(
      page.getByRole('main').getByRole('button', { name: /Ajouter|Corriger|Remplacer|Retirer/ }),
    ).toHaveCount(0)
  })
})

test.describe('le ministère, le berger et l’administration de l’église', () => {
  for (const profil of ['ministere', 'berger', 'admin_eglise'] as const) {
    test.describe(profil, () => {
      test.use({ storageState: fichierSession(profil) })

      test('l’appel direct à creer_indicateurs_prevus ou à choisir_modele_prevus est refusé, rien n’est écrit', async ({
        page,
      }) => {
        await page.goto('/')
        const avant = (await journalPrevus(page, MINISTERE_COMMUNICATION)).length
        const choixAvant = (await journalChoix(page, MINISTERE_COMMUNICATION)).length
        const reponse = await appeler(page, 'creer_indicateurs_prevus', {
          p_ministere_id: MINISTERE_COMMUNICATION,
          p_modele: 'communication',
        })
        expect(reponse.status()).toBe(403)
        const choix = await appeler(page, 'choisir_modele_prevus', {
          p_ministere_id: MINISTERE_COMMUNICATION,
          p_modele: 'aucun',
        })
        expect(choix.status()).toBe(403)
        expect(await journalPrevus(page, MINISTERE_COMMUNICATION)).toHaveLength(avant)
        expect(await journalChoix(page, MINISTERE_COMMUNICATION)).toHaveLength(choixAvant)
      })
    })
  }
})
