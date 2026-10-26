import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession } from '../comptes.ts'
import { appeler, aujourdhuiDeLaBase, compter, lire } from './outils-evenements.ts'

// Corrections d'un événement (T78, lot 1 ; docs/conception/calendrier-evenements.md, sections 7
// et 16) avec la base locale : projet « ecritures », en série, à 1440 px. Le ministère du jeu
// d'essai (Communication) rejoue S3, le doublon du 26 octobre : deux événements identiques du
// jour ; il retire l'un depuis son panneau, l'autre reste, chez lui comme chez le berger, et le
// journal de sa fiche le dit. Puis S4 (corriger le nom) et S5 (modifier les mentions) sur l'autre,
// et EJP Tech le retire à son tour : le parcours ne laisse aucun événement au calendrier.

const SUFFIXE = `${Date.now()}`
const NOM = `Essai T78 ${SUFFIXE}`
const NOM_CORRIGE = `Essai T78 corrigé ${SUFFIXE}`

test.describe.configure({ mode: 'serial' })

async function idDuMinistere(page: Page, nom: string): Promise<string> {
  const [ministere] = await lire<{ id: string }>(page, `ministere?select=id&nom=eq.${nom}`)
  if (!ministere) throw new Error(`Ministère ${nom} introuvable.`)
  return ministere.id
}

/** Événements du parcours lisibles dans `v_evenement` par le compte de la page. */
const visibles = (page: Page) =>
  compter(page, `v_evenement?select=id&titre=like.${encodeURIComponent(`Essai T78*${SUFFIXE}`)}`)

let premier = ''
let doublon = ''

test.describe('Communication, porteur', () => {
  test.use({ storageState: fichierSession('ministere') })

  test('S3 : retire le doublon depuis son panneau ; l’autre reste ; le journal le dit', async ({
    page,
    browser,
  }) => {
    await page.goto('/ma-fiche')
    const aujourdhui = await aujourdhuiDeLaBase(page)
    const coordination = await idDuMinistere(page, 'Coordination')
    for (let envoi = 0; envoi < 2; envoi += 1) {
      const reponse = await appeler(page, 'ajouter_evenement', {
        p_titre: NOM,
        p_date: aujourdhui,
        p_statut: 'valide',
        p_mentions: [coordination],
        p_heure_prevue: null,
      })
      expect(reponse.status()).toBe(200)
    }
    const ids = await lire<{ id: string }>(
      page,
      `v_evenement?select=id&titre=eq.${encodeURIComponent(NOM)}&order=mis_a_jour_le.asc`,
    )
    expect(ids).toHaveLength(2)
    premier = ids[0]?.id ?? ''
    doublon = ids[1]?.id ?? ''

    await page.goto(`/saisir/evenement/${doublon}`)
    await page.getByRole('button', { name: "Retirer l'événement" }).click()
    const fenetre = page.getByRole('alertdialog', { name: 'Retirer cet événement ?' })
    await expect(fenetre).toContainText('Ce retrait est définitif.')
    await fenetre.getByRole('button', { name: "Retirer l'événement" }).click()
    await expect(page.getByRole('status').filter({ hasText: 'retiré' })).toContainText(
      'Événement retiré du calendrier.',
    )

    expect(await visibles(page)).toBe(1)
    expect(await compter(page, `v_evenement?select=id&id=eq.${premier}`)).toBe(1)
    expect(
      await compter(page, `journal?select=id&action=eq.evenement_retire&cible_id=eq.${doublon}`),
    ).toBe(1)
    // Rien n'est effacé : l'événement retiré et ses mentions restent en base.
    expect(await compter(page, `evenement?select=id&id=eq.${doublon}`)).toBe(1)
    expect(await compter(page, `evenement_mention?select=id&evenement_id=eq.${doublon}`)).toBe(1)

    // Un ancien lien vers le doublon dit qu'il a été retiré.
    await page.goto(`/saisir/evenement/${doublon}`)
    await expect(page.getByText(/^Cet événement a été retiré le /)).toBeVisible()

    // Le berger ne voit plus qu'un événement.
    const contexte = await browser.newContext({ storageState: fichierSession('berger') })
    const pageBerger = await contexte.newPage()
    await pageBerger.goto('/')
    expect(await visibles(pageBerger)).toBe(1)
    await contexte.close()
  })

  test('S4 : corrige le nom ; l’ancien reste au panneau, le journal ne recopie aucun nom', async ({
    page,
  }) => {
    await page.goto(`/saisir/evenement/${premier}`)
    await page.getByRole('button', { name: 'Corriger le nom' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Corriger le nom' })
    await fenetre.getByLabel("Nom de l'événement").fill(NOM_CORRIGE)
    await fenetre.getByRole('button', { name: 'Enregistrer le nom' }).click()
    await expect(page.getByText('Nom corrigé.')).toBeVisible()
    await expect(page.getByText(new RegExp(`^Ancien nom : ${NOM}, corrigé le `))).toBeVisible()

    const [ligne] = await lire<{ titre: string; titre_precedent: string }>(
      page,
      `v_evenement?select=titre,titre_precedent&id=eq.${premier}`,
    )
    expect(ligne).toEqual({ titre: NOM_CORRIGE, titre_precedent: NOM })
    const [identite] = await lire<{ titre: string }>(
      page,
      `evenement?select=titre&id=eq.${premier}`,
    )
    expect(identite?.titre).toBe(NOM)
    const journal = await lire<{ detail: object }>(
      page,
      `journal?select=detail&action=eq.evenement_titre_corrige&cible_id=eq.${premier}`,
    )
    expect(journal).toEqual([{ detail: {} }])
  })

  test('S5 : modifie les mentions ; deux lignes de journal, l’identifiant du ministère seulement', async ({
    page,
  }) => {
    const fij = await idDuMinistere(page, 'FIJ')
    await page.goto(`/saisir/evenement/${premier}`)
    await page.getByRole('button', { name: 'Modifier les mentions' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Modifier les mentions' })
    // La case est cachée : on clique son libellé (comme « Modifier les mentions » d'un point).
    for (const nom of ['Coordination', 'FIJ']) {
      await fenetre
        .locator('label')
        .filter({ has: page.getByRole('checkbox', { name: nom, exact: true }) })
        .click()
    }
    await expect(fenetre.getByRole('checkbox', { name: 'FIJ', exact: true })).toBeChecked()
    await fenetre.getByRole('button', { name: 'Enregistrer les mentions' }).click()
    await expect(page.getByText('Mentions enregistrées.')).toBeVisible()

    expect(
      await lire<{ ministere_id: string }>(
        page,
        `v_evenement_mention?select=ministere_id&evenement_id=eq.${premier}`,
      ),
    ).toEqual([{ ministere_id: fij }])
    expect(
      await compter(
        page,
        `journal?select=id&action=in.(evenement_mention_ajoutee,evenement_mention_retiree)&cible_id=eq.${premier}`,
      ),
    ).toBe(2)
  })
})

test.describe('EJP Tech', () => {
  test.use({ storageState: fichierSession('admin_plateforme') })

  test('ouvre l’événement en lecture et le retire (Q7) ; aucun formulaire de mise à jour', async ({
    page,
  }) => {
    await page.goto(`/saisir/evenement/${premier}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Événement')
    await expect(page.getByText(NOM_CORRIGE)).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)
    await page.getByRole('button', { name: "Retirer l'événement" }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: "Retirer l'événement" }).click()
    await expect(page.getByRole('status').filter({ hasText: 'retiré' })).toContainText(
      'Événement retiré du calendrier.',
    )
    expect(await visibles(page)).toBe(0)
  })
})
