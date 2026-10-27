import { expect, test } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { appeler, aujourdhuiDeLaBase, compter, lire, plusJours } from './outils-evenements.ts'

// Plages des événements (T78, lot 2 ; docs/conception/calendrier-evenements.md, sections 7 (S1,
// S8) et 16, test 11) avec la base locale, à 390 px. Le jeu d'essai n'a de session que pour un
// ministère (Communication) : il rejoue S1 à la place de Coordination. Il saisit « Se répète »,
// chaque lundi pendant sept semaines, de 19 h à 21 h, avec une mention ; l'aperçu dit les sept
// dates, le bouton leur nombre ; après l'envoi, sept événements de la même série, que le berger
// lit aussi (il lit tout, comme le ministère mentionné lit les siens). Puis S8 : la série retirée
// d'un geste, le parcours ne laisse aucun événement au calendrier.

const SUFFIXE = `${Date.now()}`
const NOM = `Essai série ${SUFFIXE}`

test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 390, height: 844 } })

/** Le premier lundi au moins une semaine après `date` (AAAA-MM-JJ, calcul en UTC). */
function premierLundiApres(date: string): string {
  const depart = plusJours(date, 7)
  const jour = new Date(`${depart}T00:00:00Z`).getUTCDay() // 0 : dimanche, 1 : lundi
  return plusJours(depart, (8 - jour) % 7)
}

const lignesDeLaSerie = `v_evenement?select=id,serie_id,date&titre=eq.${encodeURIComponent(NOM)}`
let serie = ''

test.describe('Communication, porteur (S1 à la place de Coordination)', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('S1 : saisit une série de sept lundis, l’aperçu et le bouton disent le nombre', async ({
    page,
  }) => {
    await page.goto('/ma-fiche')
    const premiere = premierLundiApres(await aujourdhuiDeLaBase(page))
    const derniere = plusJours(premiere, 42)
    await page.goto('/saisir/evenement')
    await page.getByRole('radio', { name: 'Se répète' }).check({ force: true })
    await page.getByLabel('Première date').fill(premiere)
    await expect(page.getByRole('checkbox', { name: 'lundi' })).toBeChecked()
    await page.getByLabel('Dernière date').fill(derniere)
    await page.getByLabel('Heure prévue (facultatif)').fill('19:00')
    await page.getByLabel('Heure de fin (facultatif)').fill('21:00')
    await page.getByLabel("Nom de l'événement").fill(NOM)
    await page.getByRole('radio', { name: 'Validé' }).check({ force: true })
    await page.getByRole('checkbox', { name: 'Coordination' }).check()
    await expect(page.getByText(/^7 dates : lun\. /)).toBeVisible()
    await page.getByRole('button', { name: 'Ajouter 7 événements au calendrier' }).click()
    await expect(page.getByText('7 événements ajoutés au calendrier.')).toBeVisible()

    const lignes = await lire<{ id: string; serie_id: string | null; date: string }>(
      page,
      lignesDeLaSerie,
    )
    expect(lignes).toHaveLength(7)
    expect(new Set(lignes.map((ligne) => ligne.serie_id)).size).toBe(1)
    expect(lignes.map((ligne) => ligne.date).sort()[0]).toBe(premiere)
    serie = lignes[0]?.serie_id ?? ''
    expect(serie).not.toBe('')
  })
})

test.describe('le berger', () => {
  test.use({ storageState: fichierSession('berger') })

  test('S1 : lit les sept dates de la série', async ({ page }) => {
    await page.goto('/')
    expect(await compter(page, lignesDeLaSerie)).toBe(7)
  })
})

test.describe('Communication, retrait', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('S8 : retire toute la série d’un geste ; plus aucune date au calendrier', async ({
    page,
  }) => {
    await page.goto('/ma-fiche')
    const reponse = await appeler(page, 'retirer_serie', { p_serie_id: serie })
    expect(reponse.ok()).toBe(true)
    expect(await compter(page, lignesDeLaSerie)).toBe(0)
  })
})
