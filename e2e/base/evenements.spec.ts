import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, suivreRequetesDeDonnees } from '../comptes.ts'
import { EVENEMENT_COORDINATION, lire } from './outils-evenements.ts'

// Saisies d'événement et de réunion (lot E5) avec la base locale (job « e2e » de la CI,
// E2E_BASE=1), en lecture seulement : rien n'est envoyé ici (les envois sont dans
// `evenements.ecriture.spec.ts`, projet « ecritures »). Par profil : le ministère porteur,
// le ministère mentionné, un autre ministère, puis le berger, le conseil, l'administration et
// EJP Tech, qui n'ont ni ces adresses ni aucun bouton de saisie.

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const INTROUVABLE = "Cet élément n'existe pas ou vous n'y avez pas accès."

async function attendreLaFinDuChargement(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('ajout : le formulaire, les autres ministères actifs à mentionner, jamais lui-même', async ({
    page,
  }) => {
    await page.goto('/saisir/evenement')
    await expect(page).toHaveTitle('Ajouter un événement, Pilotage EJP')
    await attendreLaFinDuChargement(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Coordination' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Communication' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Aide : / })).toHaveCount(3)
    // Le jour de Paris vient de la base : c'est la plus petite date permise.
    const [semaine] = await lire<{ aujourdhui: string }>(page, 'v_semaine?select=aujourdhui')
    await expect(page.getByLabel('Date', { exact: true })).toHaveAttribute(
      'min',
      semaine?.aujourdhui ?? '',
    )
  })

  test('mise à jour de son événement : nom en lecture seule, date et statut préremplis', async ({
    page,
  }) => {
    await page.goto('/ma-fiche')
    const [soiree] = await lire<{ id: string; date: string }>(
      page,
      `v_evenement?select=id,date&titre=eq.${encodeURIComponent('Soirée de louange')}`,
    )
    expect(soiree).toBeDefined()
    await page.goto(`/saisir/evenement/${soiree?.id ?? ''}`)
    await expect(page).toHaveTitle("Mettre à jour l'événement, Pilotage EJP")
    await expect(page.getByText('Soirée de louange')).toBeVisible()
    await expect(page.getByLabel("Nom de l'événement")).toHaveCount(0)
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(soiree?.date ?? '')
    await expect(page.getByRole('radio', { name: 'En attente de validation' })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Enregistrer la mise à jour' })).toBeVisible()
  })

  test('ministère mentionné : « Seul Coordination met à jour cet événement. », sans formulaire', async ({
    page,
  }) => {
    await page.goto(`/saisir/evenement/${EVENEMENT_COORDINATION}`)
    await expect(page.getByText('Seul Coordination met à jour cet événement.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Enregistrer/ })).toHaveCount(0)
  })

  test('événement d’un autre ministère, qui ne le mentionne pas : aucun résultat', async ({
    page,
    browser,
  }) => {
    // L'identifiant est lu par le berger, qui lit tous les événements.
    const berger = await browser.newContext({ storageState: fichierSession('berger') })
    const pageBerger = await berger.newPage()
    await pageBerger.goto('/')
    const [sortie] = await lire<{ id: string }>(
      pageBerger,
      `v_evenement?select=id&titre=eq.${encodeURIComponent('Sortie jeunesse')}`,
    )
    await berger.close()
    expect(sortie).toBeDefined()

    await page.goto(`/saisir/evenement/${sortie?.id ?? ''}`)
    await expect(page.getByText(INTROUVABLE)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revenir à ma fiche' })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)
  })

  test('adresse qui n’est pas un identifiant : aucun résultat, sans requête de données', async ({
    page,
  }) => {
    const requetes = suivreRequetesDeDonnees(page)
    await page.goto('/saisir/evenement/pas-un-identifiant')
    await expect(page.getByText(INTROUVABLE)).toBeVisible()
    expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
  })

  test('prochaine réunion : le formulaire et ses deux aides', async ({ page }) => {
    await page.goto('/saisir/reunion')
    await expect(page).toHaveTitle('Prochaine réunion, Pilotage EJP')
    await attendreLaFinDuChargement(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enregistrer la réunion' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Aide : / })).toHaveCount(2)
  })
})

// Le berger, le conseil, l'administration et EJP Tech : ni ces adresses, ni aucun bouton de
// saisie, sans aucune requête de données (seule la ligne du compte est lue).
for (const compte of COMPTES_PROFILS.filter((profil) => profil.profil !== 'ministere')) {
  test.describe(`profil ${compte.profil}`, () => {
    test.use({ storageState: fichierSession(compte.profil) })

    test('les saisies d’événement et de réunion : la page non disponible, sans requête', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      for (const adresse of [
        '/saisir/evenement',
        `/saisir/evenement/${EVENEMENT_COORDINATION}`,
        '/saisir/reunion',
      ]) {
        await page.goto(adresse)
        await expect(
          page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
          adresse,
        ).toBeVisible()
        await expect(
          page.getByRole('main').getByRole('button', { name: /Ajouter|Enregistrer/ }),
        ).toHaveCount(0)
      }
      expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
    })
  })
}
