import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { verifierAdresseLocale } from '../installer-comptes.ts'
import { appeler, compter, lire, MINISTERE_COMMUNICATION } from './outils-evenements.ts'

// Création des indicateurs prévus (lot L3a, configuration-indicateurs.md, 7.1 et 7.2) qui écrit
// dans la base locale : projet « ecritures » (en série, à 1440 px, après les projets de lecture).
// Trois ministères créés par le test (clé secrète locale, comme `installer-comptes.ts` : jamais
// une base distante), qu'aucun autre parcours ne lit :
// - « Kumi », dont le nom est celui d'un modèle de la coordination : l'administration clique
//   « Créer » dans le tableau ; tous les prévus du modèle sont créés d'un coup, sans doublon, avec
//   une seule ligne de journal ;
// - « Essai prévus », dont le nom n'est pas reconnu : EJP Tech choisit « Entretien » dans la liste
//   de la coordination sur l'écran du ministère ;
// - « Essai sans prévu » : l'administration enregistre « Aucun prévu », une seule fois.
// Puis le refus d'un doublon (Jeunesse a déjà « Activités réalisées ») : tout ou rien, aucune
// ligne de journal. Le ministère et le berger n'ont aucun droit sur la fonction.

const ACTION_PREVUS = 'indicateurs_prevus_crees'

test.describe.configure({ mode: 'serial' })

const MINISTERE_JEUNESSE = '10000000-0000-4000-8000-000000000004'
let kumi = ''
let essaiPrevus = ''
let essaiSansPrevu = ''

/** Identifiant d'un ministère d'essai, créé s'il n'existe pas (clé secrète de la pile locale). */
async function ministereDEssai(nom: string): Promise<string> {
  const url = process.env.VITE_SUPABASE_URL
  const cleSecrete = process.env.E2E_CLE_SECRETE_LOCALE
  if (!url || !cleSecrete) {
    throw new Error('VITE_SUPABASE_URL et E2E_CLE_SECRETE_LOCALE manquent : voir le job « e2e ».')
  }
  verifierAdresseLocale(url)
  const admin = createClient(url, cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: existant, error: erreurLecture } = await admin
    .from('ministere')
    .select('id')
    .eq('nom', nom)
    .maybeSingle()
  if (erreurLecture)
    throw new Error(`Lecture du ministère d'essai impossible (${erreurLecture.code}).`)
  if (existant) return (existant as { id: string }).id
  const { data, error } = await admin.from('ministere').insert({ nom }).select('id').single()
  if (error) throw new Error(`Création du ministère d'essai impossible (${error.code}).`)
  return (data as { id: string }).id
}

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

const indicateursDe = (page: Page, ministereId: string) =>
  lire<LigneIndicateur>(
    page,
    `indicateur?select=id,modele_code,etat,origine,libelle&ministere_id=eq.${ministereId}`,
  )

const journalPrevus = (page: Page, ministereId: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,detail&action=eq.${ACTION_PREVUS}&ministere_id=eq.${ministereId}`,
  )

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

test.describe('administration de l’église', () => {
  test.use({ storageState: fichierSession('admin_eglise') })

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
    await expect(
      page.getByText(
        new RegExp(
          `^Kumi suit ${n} indicateurs sur 30 au plus : ${n} prévus par la coordination\\.$`,
        ),
      ),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Prévus par la coordination' })).toHaveCount(0)
    const sections = await page.getByRole('heading', { level: 2 }).allTextContents()
    expect(sections.length).toBeGreaterThan(0)
    // Un indicateur créé aujourd'hui n'a encore rien de saisi : « Jamais saisi », jamais une valeur.
    await expect(page.getByText('Jamais saisi').first()).toBeVisible()
  })

  test('un second « Créer » (par l’API) ne crée rien et n’écrit aucune ligne de journal de plus', async ({
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
  })

  test('« Essai sans prévu » : « Aucun prévu » s’enregistre une seule fois, sans indicateur', async ({
    page,
  }) => {
    await page.goto(`/indicateurs/${essaiSansPrevu}`)
    await attendreLaFinDuChargement(page)
    await page
      .getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
      .selectOption({ label: 'Aucun prévu' })
    await page.getByRole('button', { name: 'Enregistrer : aucun prévu' }).click()
    await expect(
      page.getByText('Noté : aucun indicateur prévu pour Essai sans prévu.'),
    ).toBeVisible()
    await expect(
      page.getByText('Aucun indicateur pour Essai sans prévu. Il saisit les chiffres communs.'),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Prévus par la coordination' })).toHaveCount(0)
    expect(await indicateursDe(page, essaiSansPrevu)).toHaveLength(0)
    const journal = await journalPrevus(page, essaiSansPrevu)
    expect(journal).toHaveLength(1)
    expect(journal[0]?.detail).toEqual({ modele: 'aucun', nombre: 0 })

    // Un second appel n'écrit rien de plus ; la liste dit « Aucun prévu », jamais « À choisir ».
    const encore = await appeler(page, 'creer_indicateurs_prevus', {
      p_ministere_id: essaiSansPrevu,
      p_modele: 'aucun',
    })
    expect(encore.status()).toBe(200)
    expect(await journalPrevus(page, essaiSansPrevu)).toHaveLength(1)
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    await expect(ligneDe(page, 'Essai sans prévu')).toContainText('Aucun prévu')
  })

  test('refus d’un doublon : Jeunesse a déjà « Activités réalisées », rien n’est créé, le message de la base s’affiche', async ({
    page,
  }) => {
    await page.goto(`/indicateurs/${MINISTERE_JEUNESSE}`)
    await attendreLaFinDuChargement(page)
    const avant = (await indicateursDe(page, MINISTERE_JEUNESSE)).length
    const journalAvant = await journalPrevus(page, MINISTERE_JEUNESSE)
    await page
      .getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
      .selectOption({ label: 'Kumi' })
    await page.getByRole('button', { name: /^Créer ces \d+ indicateurs$/ }).click()
    await expect(page.getByRole('alert')).toHaveText(
      /^La fiche a déjà « .+ » : retirez-le avant de créer les indicateurs prévus\.$/,
    )
    // Tout ou rien : aucun indicateur de plus, aucune ligne de journal de plus, le bloc reste.
    expect(await indicateursDe(page, MINISTERE_JEUNESSE)).toHaveLength(avant)
    expect(await journalPrevus(page, MINISTERE_JEUNESSE)).toHaveLength(journalAvant.length)
    await expect(page.getByRole('region', { name: 'Prévus par la coordination' })).toBeVisible()
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('« Essai prévus » : nom non reconnu, EJP Tech choisit « Entretien » dans la liste, puis crée', async ({
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
    const choix = page.getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
    await expect(choix.locator('option').last()).toHaveText('Aucun prévu')
    await choix.selectOption({ label: 'Entretien' })
    await expect(
      page.getByText(`Liste « Entretien » de la coordination : ${n} indicateurs à créer.`),
    ).toBeVisible()
    await page.getByRole('button', { name: `Créer ces ${n} indicateurs` }).click()

    await expect(page.getByText(`${n} indicateurs prévus créés.`)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Prévus par la coordination' })).toHaveCount(0)
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

  test('EJP Tech lit Kumi créé par l’administration : « Créés », sans bouton « Créer »', async ({
    page,
  }) => {
    await page.goto('/indicateurs')
    await attendreLaFinDuChargement(page)
    await expect(ligneDe(page, 'Kumi')).toContainText('Créés')
    await expect(ligneDe(page, 'Kumi').getByRole('button')).toHaveCount(0)
  })
})

test.describe('le ministère et le berger', () => {
  for (const profil of ['ministere', 'berger'] as const) {
    test.describe(profil, () => {
      test.use({ storageState: fichierSession(profil) })

      test('l’appel direct à creer_indicateurs_prevus est refusé, rien n’est écrit', async ({
        page,
      }) => {
        await page.goto('/')
        const avant = (await journalPrevus(page, MINISTERE_COMMUNICATION)).length
        const reponse = await appeler(page, 'creer_indicateurs_prevus', {
          p_ministere_id: MINISTERE_COMMUNICATION,
          p_modele: 'communication',
        })
        expect(reponse.status()).toBe(403)
        expect(await journalPrevus(page, MINISTERE_COMMUNICATION)).toHaveLength(avant)
      })
    })
  }
})
