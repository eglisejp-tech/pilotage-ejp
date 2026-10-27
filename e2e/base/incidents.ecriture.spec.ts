import { expect, test } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { appeler, aujourdhuiDeLaBase, plusJours } from './outils-evenements.ts'

// Incidents d'envoi (T76, lot C ; conception erreurs-envoi, 3 (S1, S13) et 14, test 19) avec la
// base locale : projet « ecritures ». Un ministère ajoute un événement dont la requête ne part
// jamais (les deux essais coupés) : l'écran montre une référence, l'incident part vers la base
// dès que la session est en aal2. EJP Tech le lit dans Modération, sous « Signalements », avec la
// même référence. Un ministère n'a ni la liste ni l'accès à `incidents_recents` (42501).

const SUFFIXE = `${Date.now()}`

test.describe.configure({ mode: 'serial' })

let reference = ''

test.describe('Communication : un ajout qui n’arrive jamais', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('l’écran dit « Vérifiez la liste » avec sa référence ; l’incident part vers la base', async ({
    page,
  }) => {
    await page.goto('/saisir/evenement')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    // Les deux essais (le premier et le nouvel essai automatique) restent sans réponse.
    await page.route('**/rest/v1/rpc/ajouter_evenement', (route) => route.abort('failed'))
    // Les lots d'incidents envoyés, avec la réponse de la base.
    const lots: { corps: string; ok: boolean }[] = []
    page.on('response', (reponse) => {
      if (reponse.url().includes('/rest/v1/rpc/noter_incidents')) {
        lots.push({ corps: reponse.request().postData() ?? '', ok: reponse.ok() })
      }
    })
    await page.getByLabel('Date', { exact: true }).fill(plusJours(aujourdhui, 16))
    await page.getByLabel("Nom de l'événement").fill(`Essai T76 C ${SUFFIXE}`)
    await page.getByText('Brouillon', { exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter au calendrier' }).click()

    const alerte = page.getByRole('alert')
    await expect(alerte).toContainText(
      'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    )
    reference =
      /Référence pour EJP Tech : ([2-9A-HJKMNP-Z]{6})/.exec(
        (await alerte.textContent()) ?? '',
      )?.[1] ?? ''
    expect(reference).toMatch(/^[2-9A-HJKMNP-Z]{6}$/)
    // L'incident de l'essai que l'écran montre part vers la base, et la base répond.
    await expect
      .poll(() => lots.some((lot) => lot.ok && lot.corps.includes(`"reference":"${reference}"`)))
      .toBe(true)
    // Rien de ce qui a été saisi ne part avec les incidents.
    expect(lots.map((lot) => lot.corps).join('')).not.toContain(`Essai T76 C ${SUFFIXE}`)
  })

  test('un ministère ne lit pas les incidents : la base refuse incidents_recents', async ({
    page,
  }) => {
    await page.goto('/')
    const reponse = await appeler(page, 'incidents_recents', {})
    expect(reponse.ok()).toBe(false)
    expect(((await reponse.json()) as { code?: string }).code).toBe('42501')
  })
})

test.describe('EJP Tech lit l’incident dans Modération', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('sous « Signalements », la liste repliée montre l’incident de Communication, même référence', async ({
    page,
  }) => {
    await page.goto('/moderation')
    const titre = page.getByText(/^Incidents d'envoi des 90 derniers jours \(\d+\)$/)
    await expect(titre).toBeVisible()
    await titre.click()
    await expect(
      page.getByText(
        'Les envois qui ont échoué sur les appareils, sans rien de ce qui a été saisi.',
      ),
    ).toBeVisible()
    const detail = page.getByText(new RegExp(`Référence ${reference}\\.$`))
    await expect(detail).toBeVisible()
    const ligne = page.getByRole('listitem').filter({ has: detail })
    await expect(ligne).toContainText(': Communication, Ajouter un événement. Pas de réponse')
  })
})
