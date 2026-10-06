import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Aides contextuelles (T38, docs/conception/aides-contextuelles.md, section 5) sur les aperçus :
// lecture seule, aucune écriture, aucun serveur. Trois formats par les projets Playwright.
// Les lots E2, E3 et E5 remplacent le contenu des aperçus en gardant leurs aides : ce parcours
// vérifie toutes celles qu'il trouve, sans connaître leurs codes.

const ECRANS = [
  { adresse: '/apercu/saisies?profil=ministere', nom: 'saisie du dimanche', formulaire: true },
  { adresse: '/apercu/evenements?profil=ministere', nom: "ajout d'un événement", formulaire: true },
  { adresse: '/apercu/fiche?profil=berger', nom: 'fiche', formulaire: false },
] as const

type Boite = { x: number; y: number; width: number; height: number }

const boutonsAide = (page: Page) => page.getByRole('button', { name: /^Aide : / })

async function ouvrir(page: Page, adresse: string) {
  await page.goto(adresse)
  await page.evaluate(() => document.fonts.ready)
}

async function boite(locator: Locator): Promise<Boite> {
  const resultat = await locator.boundingBox()
  if (!resultat) throw new Error("L'élément n'a pas de boîte à l'écran.")
  return resultat
}

const seRecouvrent = (a: Boite, b: Boite) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** Bulle d'une aide : l'enfant de la région d'annonce que `aria-controls` désigne. */
async function bulleDe(bouton: Locator, page: Page): Promise<Locator> {
  const id = await bouton.getAttribute('aria-controls')
  expect(id).toBeTruthy()
  return page.locator(`[id="${id}"] > span`)
}

async function ouvrirAide(page: Page, bouton: Locator): Promise<Locator> {
  await bouton.scrollIntoViewIfNeeded()
  await bouton.click()
  await expect(bouton).toHaveAttribute('aria-expanded', 'true')
  const bulle = await bulleDe(bouton, page)
  await expect(bulle).toBeVisible()
  await bulle.scrollIntoViewIfNeeded()
  return bulle
}

for (const ecran of ECRANS) {
  test.describe(`aides de la ${ecran.nom} (aperçu)`, () => {
    const maximum = ecran.formulaire ? 4 : 6

    test(`au plus ${maximum} boutons d'aide, et au moins un`, async ({ page }) => {
      await ouvrir(page, ecran.adresse)
      const nombre = await boutonsAide(page).count()
      expect(nombre).toBeGreaterThan(0)
      expect(nombre).toBeLessThanOrEqual(maximum)
    })

    test('chaque zone cliquable fait 44 px au moins dans les deux sens', async ({ page }) => {
      await ouvrir(page, ecran.adresse)
      const boutons = boutonsAide(page)
      for (let rang = 0; rang < (await boutons.count()); rang++) {
        const zone = await boite(boutons.nth(rang))
        expect(zone.width, `aide ${rang}`).toBeGreaterThanOrEqual(44)
        expect(zone.height, `aide ${rang}`).toBeGreaterThanOrEqual(44)
      }
    })

    test("chaque bulle s'ouvre dans la fenêtre, reste dans sa largeur et ne recouvre rien d'utile", async ({
      page,
    }) => {
      await ouvrir(page, ecran.adresse)
      const largeurFenetre = page.viewportSize()?.width ?? 0
      const boutons = boutonsAide(page)
      for (let rang = 0; rang < (await boutons.count()); rang++) {
        const bouton = boutons.nth(rang)
        const bulle = await ouvrirAide(page, bouton)
        const zone = await boite(bulle)
        // Entièrement dans la fenêtre, à gauche comme à droite.
        expect(zone.x, `aide ${rang}`).toBeGreaterThanOrEqual(0)
        expect(zone.x + zone.width, `aide ${rang}`).toBeLessThanOrEqual(largeurFenetre + 0.5)
        if (largeurFenetre >= 600) {
          // 280 px au plus ; dans un panneau plus étroit, la colonne du panneau.
          expect(zone.width, `aide ${rang}`).toBeLessThanOrEqual(280.5)
        } else {
          // Sur téléphone, toute la largeur de la colonne de contenu.
          expect(zone.width, `aide ${rang}`).toBeGreaterThan(280)
        }
        // Jamais sur son bouton.
        expect(seRecouvrent(zone, await boite(bouton)), `aide ${rang}, son bouton`).toBe(false)
        if (ecran.formulaire) {
          // En flux, la bulle pousse le champ : elle ne recouvre aucun champ.
          const champs = page.locator('input:visible, select:visible, textarea:visible')
          for (let champ = 0; champ < (await champs.count()); champ++) {
            const zoneChamp = await boite(champs.nth(champ))
            expect(seRecouvrent(zone, zoneChamp), `aide ${rang}, champ ${champ}`).toBe(false)
          }
        } else {
          // Flottante : elle ne recouvre pas la ligne qu'elle explique (ni son chiffre).
          const ligne = bouton.locator('xpath=ancestor::*[self::li or self::tr][1]')
          if ((await ligne.count()) > 0) {
            expect(seRecouvrent(zone, await boite(ligne)), `aide ${rang}, sa ligne`).toBe(false)
          }
        }
        // Un second clic la ferme, avant d'essayer la suivante.
        await bouton.click()
        await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      }
    })

    test('au clavier : Entrée ouvre, Échap ferme, Espace ouvre et ferme, le focus ne bouge pas', async ({
      page,
    }) => {
      await ouvrir(page, ecran.adresse)
      const bouton = boutonsAide(page).first()
      await bouton.focus()
      await page.keyboard.press('Enter')
      await expect(bouton).toHaveAttribute('aria-expanded', 'true')
      await expect(bouton).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      await expect(bouton).toBeFocused()
      await page.keyboard.press('Space')
      await expect(bouton).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Space')
      await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      await expect(bouton).toBeFocused()
    })

    test("ouvrir une aide ferme la précédente, un clic ailleurs ferme l'aide ouverte", async ({
      page,
    }) => {
      await ouvrir(page, ecran.adresse)
      const boutons = boutonsAide(page)
      test.skip((await boutons.count()) < 2, 'une seule aide sur cet écran')
      // On ouvre la seconde aide, puis la première : la bulle d'une aide de lecture couvre les
      // lignes qui suivent son bouton, jamais celles qui le précèdent. En flux, la bulle qui se
      // ferme fait remonter la page : le clic sur l'autre bouton ne doit pas s'y perdre.
      await ouvrirAide(page, boutons.nth(1))
      await ouvrirAide(page, boutons.nth(0))
      await expect(boutons.nth(1)).toHaveAttribute('aria-expanded', 'false')
      await expect(boutons.nth(0)).toHaveAttribute('aria-expanded', 'true')
      await page.getByRole('heading', { level: 1 }).click()
      await expect(boutons.nth(0)).toHaveAttribute('aria-expanded', 'false')
    })

    test("en flux, le clic sur l'aide suivante n'est pas perdu quand la bulle ouverte se ferme", async ({
      page,
    }) => {
      test.skip(!ecran.formulaire, 'bulle flottante : elle couvre les lignes suivantes')
      await ouvrir(page, ecran.adresse)
      const boutons = boutonsAide(page)
      test.skip((await boutons.count()) < 2, 'une seule aide sur cet écran')
      await ouvrirAide(page, boutons.nth(0))
      await ouvrirAide(page, boutons.nth(1))
      await expect(boutons.nth(0)).toHaveAttribute('aria-expanded', 'false')
      await expect(boutons.nth(1)).toHaveAttribute('aria-expanded', 'true')
    })

    test("au toucher : le survol n'ouvre rien, un toucher ouvre, un toucher ailleurs ferme", async ({
      page,
    }, testInfo) => {
      test.skip(!testInfo.project.use.hasTouch, 'format sans écran tactile')
      await ouvrir(page, ecran.adresse)
      const boutons = boutonsAide(page)
      const premier = boutons.first()
      await premier.scrollIntoViewIfNeeded()
      await premier.hover()
      await expect(premier).toHaveAttribute('aria-expanded', 'false')
      await premier.tap()
      await expect(premier).toHaveAttribute('aria-expanded', 'true')
      if (ecran.formulaire && (await boutons.count()) >= 2) {
        // Au doigt, le focus arrive après le relâchement : le toucher sur l'aide suivante ne doit
        // pas se perdre quand la première bulle se ferme et que la page remonte.
        const second = boutons.nth(1)
        await second.scrollIntoViewIfNeeded()
        await second.tap()
        await expect(premier).toHaveAttribute('aria-expanded', 'false')
        await expect(second).toHaveAttribute('aria-expanded', 'true')
      }
      await page.getByRole('heading', { level: 1 }).tap()
      for (let rang = 0; rang < (await boutons.count()); rang++) {
        await expect(boutons.nth(rang)).toHaveAttribute('aria-expanded', 'false')
      }
    })

    test('audit axe avec une bulle ouverte : contraste, noms, rôles', async ({ page }) => {
      await ouvrir(page, ecran.adresse)
      await ouvrirAide(page, boutonsAide(page).first())
      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(resultat.violations).toEqual([])
    })

    test('à 360 px, aucun défilement horizontal, bulle ouverte', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      await ouvrir(page, ecran.adresse)
      const boutons = boutonsAide(page)
      for (let rang = 0; rang < (await boutons.count()); rang++) {
        const bulle = await ouvrirAide(page, boutons.nth(rang))
        const zone = await boite(bulle)
        expect(zone.x + zone.width, `aide ${rang}`).toBeLessThanOrEqual(360.5)
        const debord = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(debord, `aide ${rang}`).toBeLessThanOrEqual(0)
        await boutons.nth(rang).click()
      }
    })
  })
}
