import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Champs côte à côte (GrilleChamps) : dans une rangée, les titres sont sur une même ligne, les
// cases sur une même ligne et les notes sous leur case, quelle que soit la longueur des textes de
// la base et qu'une note ou un message soit présent d'un seul côté (constaté sur iPad le
// 26 octobre 2026 : « Dont en FIJ » plus haut que « STARs actifs »). Sur les aperçus, sans base,
// aux trois largeurs du projet, et dans le projet tablette aux largeurs d'iPad 820 et 1024 px.

const TOLERANCE = 1

/** Largeurs d'iPad contrôlées en plus de celle du projet tablette (834 px). */
const LARGEURS_IPAD = [820, 1024]

async function ouvrir(page: Page, adresse: string) {
  await page.goto(adresse)
  await page.evaluate(() => document.fonts.ready)
}

interface Mesure {
  libelle: string
  titre: number
  haut: number
  bas: number
}

/** Haut du titre, haut et bas de la case de chaque champ nommé. */
async function mesurer(zone: Page | Locator, libelles: readonly string[]): Promise<Mesure[]> {
  return Promise.all(
    libelles.map(async (libelle) => {
      const champ = zone.getByLabel(libelle, { exact: true })
      const id = await champ.getAttribute('id')
      const boiteCase = await champ.boundingBox()
      const boiteTitre = await zone.locator(`label[for="${id}"]`).boundingBox()
      if (!boiteCase || !boiteTitre) throw new Error(`Champ invisible : ${libelle}`)
      return {
        libelle,
        titre: boiteTitre.y,
        haut: boiteCase.y,
        bas: boiteCase.y + boiteCase.height,
      }
    }),
  )
}

/** Les champs regroupés par rangée visuelle : haut du titre à 4 px près. */
function rangees(mesures: readonly Mesure[]): Mesure[][] {
  const groupes: { titre: number; membres: Mesure[] }[] = []
  for (const mesure of mesures) {
    const groupe = groupes.find((candidat) => Math.abs(candidat.titre - mesure.titre) <= 4)
    if (groupe) groupe.membres.push(mesure)
    else groupes.push({ titre: mesure.titre, membres: [mesure] })
  }
  return groupes.map((groupe) => groupe.membres)
}

const ecart = (valeurs: readonly number[]) => Math.max(...valeurs) - Math.min(...valeurs)

/** Dans chaque rangée de deux champs ou plus : titres et cases sur une même ligne. */
async function attendreAlignes(
  zone: Page | Locator,
  libelles: readonly string[],
  contexte: string,
) {
  const parRangee = rangees(await mesurer(zone, libelles)).filter((groupe) => groupe.length > 1)
  expect(parRangee.length, `${contexte} : au moins une rangée côte à côte`).toBeGreaterThan(0)
  // Contrôles souples : toutes les rangées et toutes les largeurs sont mesurées, le test échoue
  // à la fin avec la liste complète des écarts.
  for (const groupe of parRangee) {
    const noms = groupe.map((mesure) => mesure.libelle).join(', ')
    expect
      .soft(ecart(groupe.map((mesure) => mesure.titre)), `${contexte} : titres de ${noms}`)
      .toBeLessThanOrEqual(TOLERANCE)
    expect
      .soft(ecart(groupe.map((mesure) => mesure.haut)), `${contexte} : cases de ${noms}`)
      .toBeLessThanOrEqual(TOLERANCE)
  }
}

/** Largeurs à contrôler dans ce projet : la sienne, et celles d'iPad dans le projet tablette. */
function largeurs(page: Page, projet: string): number[] {
  const largeur = page.viewportSize()?.width ?? 0
  return projet === 'tablette' ? [largeur, ...LARGEURS_IPAD] : [largeur]
}

async function aLaLargeur(page: Page, largeur: number) {
  const hauteur = page.viewportSize()?.height ?? 900
  await page.setViewportSize({ width: largeur, height: hauteur })
}

const COMMUNS = ['STARs actifs', 'Dont en FIJ'] as const
const DIMANCHE_PREMIER_USAGE = '/apercu/saisies?ecran=dimanche&profil=ministere&etat=premier-usage'
const NOTE_POURCENTAGE = /^100\s% des actifs$/

test.describe('saisie du dimanche : « STARs actifs » et « Dont en FIJ »', () => {
  test('cas réel : définition longue à gauche, « 100 % des actifs » à droite seulement', async ({
    page,
  }, infos) => {
    for (const largeur of largeurs(page, infos.project.name)) {
      await aLaLargeur(page, largeur)
      await ouvrir(page, DIMANCHE_PREMIER_USAGE)
      await page.getByLabel('STARs actifs', { exact: true }).fill('11')
      await page.getByLabel('Dont en FIJ', { exact: true }).fill('11')
      const note = page.getByText(NOTE_POURCENTAGE)
      await expect(note).toBeVisible()
      // Aucune note sous la case de gauche : seule celle de droite en a une.
      await expect(page.getByText(/^Saisi le /)).toHaveCount(0)
      const [actifs, enFij] = await mesurer(page, COMMUNS)
      if (!actifs || !enFij) throw new Error('« STARs actifs » ou « Dont en FIJ » absent')
      const boiteNote = await note.boundingBox()
      expect(boiteNote?.y ?? 0, `${largeur} px : note sous sa case`).toBeGreaterThanOrEqual(
        enFij.bas,
      )
      if (largeur < 600) {
        // Sous 600 px, rien ne change : l'un sous l'autre, pour que la bulle d'aide prenne
        // toute la largeur (T38).
        expect(enFij.titre, `${largeur} px : l'un sous l'autre`).toBeGreaterThan(actifs.bas)
        continue
      }
      await attendreAlignes(page, COMMUNS, `${largeur} px`)
    }
  })

  test('une consigne sous une seule case, puis une bulle d’aide ouverte d’un seul côté', async ({
    page,
  }, infos) => {
    test.skip((page.viewportSize()?.width ?? 0) < 600, 'une colonne sous 600 px')
    for (const largeur of largeurs(page, infos.project.name)) {
      await aLaLargeur(page, largeur)
      await ouvrir(page, DIMANCHE_PREMIER_USAGE)
      await page.getByLabel('Dont en FIJ', { exact: true }).fill('12a')
      await expect(
        page.getByText('Saisissez un nombre entier, sans virgule ni lettre.'),
      ).toBeVisible()
      await attendreAlignes(page, COMMUNS, `${largeur} px, consigne à droite`)
      await page.getByRole('button', { name: 'Aide : STARs actifs' }).click()
      await expect(page.getByRole('button', { name: 'Aide : STARs actifs' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      await attendreAlignes(page, COMMUNS, `${largeur} px, bulle ouverte à gauche`)
    }
  })
})

const DEPARTEMENTS = [
  '75 Paris',
  '77 Seine-et-Marne',
  '78 Yvelines',
  '91 Essonne',
  '92 Hauts-de-Seine',
  '93 Seine-Saint-Denis',
  '94 Val-de-Marne',
  "95 Val-d'Oise",
] as const
const CONSIGNE_FORMAT = 'Saisissez un nombre entier, sans virgule ni lettre.'

test.describe('grilles de petits champs : une consigne sous une seule case', () => {
  test('carte des FIJ', async ({ page }, infos) => {
    for (const largeur of largeurs(page, infos.project.name)) {
      await aLaLargeur(page, largeur)
      await ouvrir(page, '/apercu/saisies-e4?ecran=carte-fij&profil=ministere')
      await page.getByLabel('75 Paris', { exact: true }).fill('3a')
      await expect(page.getByText(CONSIGNE_FORMAT)).toBeVisible()
      await attendreAlignes(page, DEPARTEMENTS, `${largeur} px`)
    }
  })

  test('chiffres par département', async ({ page }, infos) => {
    for (const largeur of largeurs(page, infos.project.name)) {
      await aLaLargeur(page, largeur)
      await ouvrir(page, '/apercu/saisies-e4?ecran=chiffres-departement&profil=ministere')
      const rubrique = page.getByRole('group').first()
      await rubrique.getByLabel('92 Hauts-de-Seine', { exact: true }).fill('3a')
      await expect(rubrique.getByText(CONSIGNE_FORMAT)).toBeVisible()
      await attendreAlignes(rubrique, DEPARTEMENTS, `${largeur} px`)
    }
  })

  test('répartition par catégorie des chiffres du mois', async ({ page }, infos) => {
    for (const largeur of largeurs(page, infos.project.name)) {
      await aLaLargeur(page, largeur)
      await ouvrir(page, '/apercu/saisies?ecran=mois&profil=ministere')
      await page.getByLabel('Bénéficiaires (passages)', { exact: true }).fill('7')
      await page.getByLabel('Malaise', { exact: true }).fill('4a')
      await expect(page.getByText(CONSIGNE_FORMAT)).toBeVisible()
      await attendreAlignes(page, ['Malaise', 'Blessure', 'Autre'], `${largeur} px`)
    }
  })
})
