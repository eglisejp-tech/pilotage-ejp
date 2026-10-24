import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Finitions des saisies (T69, 24 octobre 2026), sur les aperçus de développement, aux trois
// largeurs du projet et à 360 px : le grand chiffre du dimanche se voit même vide (proposition 1,
// écart 1), aucun champ de moins de 16 px (proposition 3), l'en-tête simplifié des saisies au
// téléphone (proposition 4, écart 2) et les choix en un seul bloc qui ne coupent aucun mot
// (proposition 9, écart 3).

const ENCRE = 'rgb(16, 24, 40)'
const ENCRE_3 = 'rgb(95, 107, 126)'

const largeur = (page: Page) => page.viewportSize()?.width ?? 0

async function ouvrir(page: Page, adresse: string) {
  await page.goto(adresse)
  await page.evaluate(() => document.fonts.ready)
}

/** Défilement horizontal de la page, en pixels (0 attendu). */
const debord = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

/** Les champs où l'on écrit (ni case ni bouton radio) dont le texte fait moins de 16 px. */
const champsTropPetits = (page: Page) =>
  page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([type="radio"]):not([type="checkbox"]), textarea, select',
      ),
    )
      .filter((champ) => Number.parseFloat(getComputedStyle(champ).fontSize) < 16)
      .map((champ) => champ.id || champ.getAttribute('name') || champ.tagName),
  )

/**
 * Le premier groupe de choix de la page, une fois sa disposition attendue prise : le gras des
 * libellés peut arriver après l'ouverture du panneau, et la mesure suit les polices. Pour chaque
 * case : sa hauteur et le nombre de lignes de son libellé.
 */
async function casesDuChoix(page: Page, disposition: 'ligne' | 'colonne' | 'grille') {
  await page.evaluate(() => document.fonts.ready)
  const groupe = page.locator('[data-disposition]').first()
  await expect(groupe).toHaveAttribute('data-disposition', disposition)
  return groupe.evaluate((element) =>
    Array.from(element.querySelectorAll<HTMLElement>('[data-libelle]')).map((libelle) => {
      const hauteurLigne = Number.parseFloat(getComputedStyle(libelle).lineHeight)
      return {
        texte: libelle.textContent,
        hauteur: Math.round(libelle.parentElement?.getBoundingClientRect().height ?? 0),
        lignes: Math.round(libelle.getBoundingClientRect().height / hauteurLigne),
      }
    }),
  )
}

/** Les largeurs d'un test : celle du projet, et 360 px au téléphone. */
const largeursDuTest = (page: Page) =>
  largeur(page) < 600 ? [largeur(page), 360] : [largeur(page)]

test.describe('saisie du dimanche (propositions 1, 3 et 4)', () => {
  const ADRESSE = '/apercu/saisies?profil=ministere&vous=Marie%20D.'

  test('le grand champ vide se voit : un trait de 2 px sous le chiffre, foncé au focus', async ({
    page,
  }) => {
    await ouvrir(page, ADRESSE)
    const champ = page.getByRole('textbox', { name: 'STARs au service ce dimanche', exact: true })
    await expect(champ).toHaveValue('')
    await expect(champ).toHaveCSS('border-bottom-width', '2px')
    await expect(champ).toHaveCSS('border-bottom-color', ENCRE_3)
    await expect(champ).toHaveCSS('border-top-width', '0px')
    await champ.focus()
    await expect(champ).toHaveCSS('border-bottom-color', ENCRE)
    expect(await champsTropPetits(page)).toEqual([])
  })

  test('au téléphone : « Retour » et le compte sur une ligne, « Vous : Marie D. », pas de menu', async ({
    page,
  }) => {
    test.skip(largeur(page) >= 600, 'en-tête simplifié sous 600 px seulement')
    for (const taille of largeursDuTest(page)) {
      await page.setViewportSize({ width: taille, height: 800 })
      await ouvrir(page, ADRESSE)
      const entete = page.getByRole('banner')
      await expect(entete.getByRole('button', { name: 'Retour' })).toBeVisible()
      await expect(entete).toContainText('Ministère Communication')
      await expect(entete).toContainText('Vous : Marie D.')
      await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Pilotage EJP' })).toHaveCount(0)
      // Un seul « Retour » : celui du haut du panneau est passé dans l'en-tête.
      await expect(page.getByRole('button', { name: 'Retour' })).toHaveCount(1)
      // L'en-tête de la maquette 08 (72 px) : le premier champ ne descend plus.
      const boite = await entete.boundingBox()
      expect(boite?.height ?? 0).toBeLessThanOrEqual(80)
      expect(await debord(page)).toBeLessThanOrEqual(0)
    }
  })

  test('à partir de 600 px : l’en-tête complet reste, « Retour » est dans le panneau', async ({
    page,
  }) => {
    test.skip(largeur(page) < 600, 'panneau latéral à partir de 600 px')
    await ouvrir(page, ADRESSE)
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Retour' })).toBeVisible()
    await expect(page.getByRole('banner')).toContainText('Pilotage EJP')
  })
})

test.describe('choix en un seul bloc, sans mot coupé (proposition 9)', () => {
  test('types de session : les uns sous les autres, 48 px, une ligne chacun', async ({ page }) => {
    for (const taille of largeursDuTest(page)) {
      await page.setViewportSize({ width: taille, height: 900 })
      await ouvrir(page, '/apercu/sessions?profil=admin_eglise')
      if (taille < 1024) await page.getByRole('button', { name: 'Ajouter une session' }).click()
      for (const choix of await casesDuChoix(page, 'colonne')) {
        expect(choix.hauteur, choix.texte ?? '').toBe(48)
        expect(choix.lignes, choix.texte ?? '').toBe(1)
      }
      expect(await champsTropPetits(page)).toEqual([])
      expect(await debord(page)).toBeLessThanOrEqual(0)
    }
  })

  test('priorité d’un point : côte à côte, comme la maquette 10, jusqu’à 360 px', async ({
    page,
  }) => {
    for (const taille of largeursDuTest(page)) {
      await page.setViewportSize({ width: taille, height: 900 })
      await ouvrir(page, '/apercu/nouveau-point?profil=ministere')
      for (const choix of await casesDuChoix(page, 'ligne')) {
        expect(choix.hauteur, choix.texte ?? '').toBe(48)
        expect(choix.lignes, choix.texte ?? '').toBe(1)
      }
      expect(await champsTropPetits(page)).toEqual([])
      expect(await debord(page)).toBeLessThanOrEqual(0)
    }
  })

  test('statut d’un événement : deux colonnes en un bloc de 48 px, une ou deux lignes', async ({
    page,
  }) => {
    for (const taille of largeursDuTest(page)) {
      await page.setViewportSize({ width: taille, height: 900 })
      await ouvrir(page, '/apercu/evenements?profil=ministere')
      for (const choix of await casesDuChoix(page, 'grille')) {
        expect(choix.hauteur, choix.texte ?? '').toBe(48)
        expect(choix.lignes, choix.texte ?? '').toBeLessThanOrEqual(2)
      }
      expect(await champsTropPetits(page)).toEqual([])
      expect(await debord(page)).toBeLessThanOrEqual(0)
    }
  })

  test('« Changer le statut » d’un point : les uns sous les autres, une ligne chacun', async ({
    page,
  }) => {
    for (const taille of largeursDuTest(page)) {
      await page.setViewportSize({ width: taille, height: 900 })
      await ouvrir(page, '/apercu/points-actions?profil=ministere')
      await page.getByRole('button', { name: 'Changer le statut' }).first().click()
      for (const choix of await casesDuChoix(page, 'colonne')) {
        expect(choix.hauteur, choix.texte ?? '').toBe(48)
        expect(choix.lignes, choix.texte ?? '').toBe(1)
      }
      await expect(page.getByRole('radio', { name: 'À traiter' })).toBeChecked()
      expect(await debord(page)).toBeLessThanOrEqual(0)
    }
  })
})
