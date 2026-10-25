import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { auditerAxe, decrireFautes } from './outils/axe.ts'
import { ciblesTropPetites, debordementHorizontal } from './outils/controles.ts'

// « Changer d'espace » (T73) sur l'aperçu de l'en-tête, sans base : le panneau des comptes ouverts
// sur l'appareil, aux trois formats (projets ordinateur, tablette et téléphone). Le passage réel
// d'un compte à l'autre, avec la base, est dans e2e/base/changer-espace.ecriture.spec.ts (CI).

async function ouvrir(page: Page, profil: string, espaces = '&espaces=2') {
  await page.goto(`/apercu/navigation?profil=${profil}${espaces}`)
  await page.evaluate(() => document.fonts.ready)
}

/** Le bouton visible de l'en-tête (dans le menu au téléphone et pour EJP Tech). */
async function boutonChangerDEspace(page: Page) {
  const menu = page.getByRole('button', { name: 'Ouvrir le menu' })
  if (await menu.isVisible()) await menu.click()
  return page.getByRole('button', { name: "Changer d'espace" }).filter({ visible: true })
}

async function ouvrirPanneau(page: Page) {
  const bouton = await boutonChangerDEspace(page)
  await bouton.click()
  await expect(bouton).toHaveAttribute('aria-expanded', 'true')
  const id = await bouton.getAttribute('aria-controls')
  return { bouton, panneau: page.locator(`[id="${id}"]`) }
}

test.describe("Changer d'espace (aperçu, T73)", () => {
  for (const { profil, actif, autre } of [
    { profil: 'admin_plateforme', actif: 'EJP Tech, compte 1', autre: 'Ministère Tech' },
    { profil: 'ministere', actif: 'Ministère Communication', autre: 'EJP Tech, compte 1' },
  ]) {
    test(`${profil} : les deux comptes, l'espace actif marqué, sans défilement horizontal`, async ({
      page,
    }) => {
      await ouvrir(page, profil)
      const { panneau } = await ouvrirPanneau(page)
      const liste = panneau.getByRole('list', { name: 'Comptes ouverts sur cet appareil' })
      await expect(liste.getByRole('listitem')).toHaveCount(2)
      await expect(liste.locator('[aria-current="true"]')).toHaveText(`${actif} (espace actif)`)
      await expect(panneau.getByRole('button', { name: `Passer à ${autre}` })).toBeVisible()
      await expect(panneau.getByRole('button', { name: 'Ajouter un compte' })).toBeVisible()
      await expect(panneau.getByRole('button', { name: 'Retirer ce compte' })).toBeVisible()
      await expect(panneau.getByText('« Se déconnecter » ferme les 2 comptes.')).toBeVisible()

      // Le panneau tient dans la fenêtre, sans défilement horizontal, cibles de 44 px.
      const cadre = await panneau.boundingBox()
      const largeur = page.viewportSize()?.width ?? 0
      expect(cadre && cadre.x).toBeGreaterThanOrEqual(0)
      expect(cadre && cadre.x + cadre.width).toBeLessThanOrEqual(largeur)
      expect(await debordementHorizontal(page)).toBeLessThanOrEqual(0)
      expect(await ciblesTropPetites(page)).toEqual([])
      expect(decrireFautes(await auditerAxe(page))).toEqual([])
    })
  }

  test('au clavier : Entrée ouvre, Échap ferme et rend le focus au bouton', async ({ page }) => {
    await ouvrir(page, 'berger')
    const bouton = await boutonChangerDEspace(page)
    await bouton.focus()
    await page.keyboard.press('Enter')
    await expect(bouton).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Passer à EJP Tech, compte 1' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await expect(bouton).toBeFocused()
  })

  test('un seul compte : « Ajouter un compte », sans « Retirer ce compte »', async ({ page }) => {
    await ouvrir(page, 'conseil', '')
    const { panneau } = await ouvrirPanneau(page)
    await expect(panneau.getByRole('listitem')).toHaveCount(1)
    await expect(panneau.getByRole('button', { name: 'Ajouter un compte' })).toBeVisible()
    await expect(panneau.getByRole('button', { name: 'Retirer ce compte' })).toHaveCount(0)
  })
})
