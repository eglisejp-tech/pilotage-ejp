import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, seConnecter } from '../comptes.ts'

// Saisies des chiffres du lot E3 avec la base locale (job « e2e » de la CI, E2E_BASE=1), dans le
// projet « ecritures » : en série, à 1440 px, après les parcours de lecture. Chaque parcours
// compte les lignes avant et après par l'API, avec la session du compte lui-même (clé publique,
// jamais la clé secrète) :
// - Communication saisit un dimanche ancien (hors des dix dimanches des courbes), puis le
//   corrige : une ligne et une ligne de journal par envoi, la nouvelle valeur gagne ;
// - Social corrige le mois en cours de son sensible (P45) avec sa précision et sa répartition :
//   une seule ligne de journal par envoi, sans valeur propre ni texte ; une somme de catégories
//   trop grande n'écrit rien ; une précision vidée disparaît ; puis le mois est remis dans l'état
//   du jeu d'exemple (7, réparti 4, 3 et 0, avec sa précision), que lisent les fiches (lot E2).

const URL_API = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const CLE_PUBLIQUE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
const PRECISION_EXEMPLE =
  'Plus de passages pendant la collecte de rentrée, tous orientés vers les bonnes permanences.'

async function jeton(page: Page): Promise<string> {
  return page.evaluate(() => {
    const cle = Object.keys(localStorage).find(
      (nom) => nom.startsWith('sb-') && nom.endsWith('-auth-token'),
    )
    const session = cle ? (JSON.parse(localStorage.getItem(cle) ?? '{}') as unknown) : null
    if (typeof session === 'object' && session !== null && 'access_token' in session) {
      return String(session.access_token)
    }
    throw new Error('Aucune session dans la page.')
  })
}

async function requete(page: Page, chemin: string, entetes: Record<string, string> = {}) {
  const reponse = await page.request.get(`${URL_API}/rest/v1/${chemin}`, {
    headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${await jeton(page)}`, ...entetes },
  })
  expect(reponse.status(), chemin).toBeLessThan(300)
  return reponse
}

async function lire<T>(page: Page, chemin: string): Promise<T[]> {
  return (await (await requete(page, chemin)).json()) as T[]
}

/** Nombre de lignes lisibles par le compte (`Prefer: count=exact`). */
async function compter(page: Page, chemin: string): Promise<number> {
  const reponse = await requete(page, chemin, { Prefer: 'count=exact', Range: '0-0' })
  const total = /\/(\d+)$/.exec(reponse.headers()['content-range'] ?? '')?.[1]
  return Number(total ?? Number.NaN)
}

const attendreChargement = (page: Page) =>
  expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })

const JOURNAL = 'journal?select=id&action=eq.mesure_saisie'

test.describe('saisie du dimanche, ministère Communication', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('un dimanche saisi puis corrigé : une ligne et une ligne de journal par envoi', async ({
    page,
  }) => {
    await page.goto('/')
    const [semaine] = await lire<{ dimanche: string }>(page, 'v_semaine?select=dimanche')
    const reference = new Date(`${semaine?.dimanche ?? ''}T12:00:00Z`)
    // Douze semaines avant le dimanche de référence : hors des courbes que lisent les autres tests.
    const ancien = new Date(reference.getTime() - 84 * 86_400_000).toISOString().slice(0, 10)
    const [service] = await lire<{ id: string }>(page, 'indicateur?select=id&code=eq.service')
    const lignesService = `mesure?select=id&indicateur_id=eq.${service?.id}&date_ref=eq.${ancien}`

    await page.goto(`/saisir/dimanche?date=${ancien}`)
    await attendreChargement(page)
    const lignesAvant = await compter(page, lignesService)
    const journalAvant = await compter(page, JOURNAL)
    const champ = page.getByLabel('STARs au service ce dimanche', { exact: true })
    await champ.fill(String(lignesAvant + 5))
    await page.getByRole('button', { name: /^Enregistrer (les chiffres|la correction)$/ }).click()
    await expect(
      page.getByRole('status').getByText(/^Chiffres du dimanche .+ enregistrés\.$/),
    ).toBeVisible()
    expect(await compter(page, lignesService)).toBe(lignesAvant + 1)
    expect(await compter(page, JOURNAL)).toBe(journalAvant + 1)

    // Correction : « Corriger les chiffres du dimanche », la nouvelle valeur gagne.
    await page.reload()
    await attendreChargement(page)
    await expect(page.getByText('Corriger les chiffres du dimanche')).toBeVisible()
    await expect(page.getByText(`Déjà saisi : ${lignesAvant + 5}, le `)).toBeVisible()
    await champ.fill(String(lignesAvant + 6))
    await page.getByRole('button', { name: 'Enregistrer la correction' }).click()
    await expect(
      page.getByRole('status').getByText(/^Chiffres du dimanche .+ enregistrés\.$/),
    ).toBeVisible()
    expect(await compter(page, lignesService)).toBe(lignesAvant + 2)
    expect(await compter(page, JOURNAL)).toBe(journalAvant + 2)
    const [enVigueur] = await lire<{ valeur: number }>(
      page,
      `v_mesure_periode?select=valeur&indicateur_id=eq.${service?.id}&periode=eq.${ancien}`,
    )
    expect(enVigueur?.valeur).toBe(lignesAvant + 6)
  })
})

test.describe('« Chiffres du mois », sensible de Social (P45 à P47)', () => {
  test('précision et répartition : un envoi, une ligne de journal sans texte ; tout ou rien', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await seConnecter(page, 'social@exemple.test')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    const [semaine] = await lire<{ aujourdhui: string }>(page, 'v_semaine?select=aujourdhui')
    const mois = (semaine?.aujourdhui ?? '').slice(0, 7)
    const periode = `${mois}-01`
    const [indicateur] = await lire<{ id: string }>(
      page,
      'indicateur?select=id&modele_code=eq.social_beneficiaires_passages',
    )
    const id = indicateur?.id ?? ''
    const totaux = `mesure?select=id&indicateur_id=eq.${id}&date_ref=eq.${periode}`
    const precisionLue = () =>
      lire<{ texte: string }>(
        page,
        `v_precision_sensible?select=texte&indicateur_id=eq.${id}&mois=eq.${periode}`,
      )
    const repartitionLue = () =>
      lire<{ categorie: string | null; valeur: number | null }>(
        page,
        `v_ventilation_sensible?select=categorie,valeur&indicateur_id=eq.${id}&periode=eq.${periode}&order=ordre`,
      )

    await page.goto(`/saisir/mois?mois=${mois}`)
    await attendreChargement(page)
    const total = page.getByLabel('Bénéficiaires (passages)', { exact: true })
    const malaise = page.getByLabel('Malaise', { exact: true })
    const blessure = page.getByLabel('Blessure', { exact: true })
    const autre = page.getByLabel('Autre', { exact: true })
    const precision = page.getByLabel('Précision (facultatif)', { exact: true })
    const enregistrer = page.getByRole('button', { name: 'Enregistrer les chiffres du mois' })
    const reussite = page.getByRole('status').getByText(/^Chiffres d.+ enregistrés\.$/)

    // Le mois en cours du jeu d'exemple (seed/44) est repris : 7, réparti 4, 3 et 0, et sa précision.
    await expect(total).toHaveValue('7')
    await expect(malaise).toHaveValue('4')
    await expect(blessure).toHaveValue('3')
    await expect(autre).toHaveValue('0')
    await expect(precision).toHaveValue(PRECISION_EXEMPLE)

    // 1. Le total corrigé part avec la précision et la répartition reprises : une ligne de journal.
    const totauxAvant = await compter(page, totaux)
    const journalAvant = await compter(page, JOURNAL)
    await total.fill('9')
    await expect(page.getByText('Non réparti : 2')).toBeVisible()
    await enregistrer.click()
    await expect(reussite).toBeVisible()
    expect(await compter(page, totaux)).toBe(totauxAvant + 1)
    expect(await compter(page, JOURNAL)).toBe(journalAvant + 1)
    const [derniere] = await lire<{ detail: unknown }>(
      page,
      'journal?select=detail&action=eq.mesure_saisie&order=id.desc&limit=1',
    )
    // Aucune ligne sensible dans le détail (P45), ni valeur, ni texte.
    expect(derniere?.detail).toEqual({ lignes: [] })
    expect(JSON.stringify(derniere)).not.toContain('passages')
    expect(await precisionLue()).toEqual([{ texte: PRECISION_EXEMPLE }])
    expect(await repartitionLue()).toEqual([
      { categorie: 'malaise', valeur: 4 },
      { categorie: 'blessure', valeur: 3 },
      { categorie: 'autre', valeur: 0 },
      { categorie: null, valeur: 2 },
    ])

    // 2. Une somme de catégories trop grande n'écrit rien.
    await malaise.fill('9')
    await expect(
      page.getByText('La somme des catégories (12) dépasse le total du mois (9).'),
    ).toBeVisible()
    await enregistrer.click()
    expect(await compter(page, totaux)).toBe(totauxAvant + 1)
    expect(await compter(page, JOURNAL)).toBe(journalAvant + 1)

    // 3. Une précision vidée disparaît de l'affichage (le total le plus récent n'en a plus).
    await malaise.fill('4')
    await precision.fill('')
    await enregistrer.click()
    // Le message du premier envoi peut être encore affiché : on attend la ligne de journal.
    await expect.poll(() => compter(page, JOURNAL)).toBe(journalAvant + 2)
    expect(await precisionLue()).toEqual([])

    // 4. Retour à l'état du jeu d'exemple, que lisent les fiches.
    await total.fill('7')
    await precision.fill(PRECISION_EXEMPLE)
    await enregistrer.click()
    await expect.poll(() => compter(page, JOURNAL)).toBe(journalAvant + 3)
    expect(await precisionLue()).toEqual([{ texte: PRECISION_EXEMPLE }])
    expect(await repartitionLue()).toEqual([
      { categorie: 'malaise', valeur: 4 },
      { categorie: 'blessure', valeur: 3 },
      { categorie: 'autre', valeur: 0 },
      { categorie: null, valeur: 0 },
    ])
  })

  // À écrire au lot I, quand la fiche (E2) et l'accueil (E7) sont fusionnés : après l'envoi du
  // mois, la fiche du ministère (`/ma-fiche`) montre la précision et la répartition, et « Vos
  // saisies » (`/`) passe à Fait pour « Chiffres de <mois> ». Inscrit aussi dans la liste de
  // recette du lot I.
  test.fixme('la fiche montre la précision et la répartition, « Vos saisies » passe à Fait', async () => {
    // Rien à lancer tant que E2 et E7 ne sont pas là.
  })
})
