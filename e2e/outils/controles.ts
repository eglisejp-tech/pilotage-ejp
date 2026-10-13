import type { Page } from '@playwright/test'

// Contrôles de l'étape 7 qui complètent axe (plan, section 3.3, lot F2) : défilement horizontal,
// cibles de 44 px, parcours au clavier avec anneau de focus visible, piège du focus des panneaux
// et Échap. Chaque contrôle rend une liste de lignes : vide, tout va bien ; sinon chaque ligne
// dit quel élément corriger. Aucun contrôle ne modifie l'écran : seul l'attribut `data-audit`
// est posé sur les éléments interactifs, pour les suivre pendant le parcours.

/** Largeur des fenêtres de référence de l'étape 7 : le plus petit téléphone visé (BRIEF). */
export const LARGEUR_MINIMALE = 360

/** Taille minimale d'une cible tactile (BRIEF section 10). */
export const CIBLE_MINIMALE = 44

/** Pixels en trop à droite de la fenêtre : 0 ou moins, aucun défilement horizontal. */
export async function debordementHorizontal(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/**
 * Éléments interactifs visibles plus petits que 44 px, en hauteur ou en largeur. Exemptions
 * prévues par WCAG 2.5.8 : un lien dans une phrase (affichage en ligne), un élément inactif, et
 * le lien « Aller au contenu » tant qu'il est masqué. Une case ou un bouton radio compte avec
 * son étiquette, qui est la vraie cible.
 */
export async function ciblesTropPetites(
  page: Page,
  exclure: string[] = [],
  minimum = CIBLE_MINIMALE,
): Promise<string[]> {
  return page.evaluate(
    ({ exclure: zones, minimum: seuil }) => {
      const selecteur =
        'a[href], button, summary, select, textarea, input:not([type="hidden"]), [role="button"], [role="link"], [role="tab"]'
      const lignes: string[] = []
      for (const element of document.querySelectorAll<HTMLElement>(selecteur)) {
        if (!element.checkVisibility()) continue
        if (element.closest('[inert]')) continue
        if (zones.some((zone) => element.closest(zone))) continue
        if ('disabled' in element && element.disabled === true) continue
        if (element.tagName === 'A' && getComputedStyle(element).display === 'inline') continue
        let boite = element.getBoundingClientRect()
        // Élément masqué à la manière de `sr-only` (rogné par `clip-path` ou `clip`, ou réduit à
        // 1 px) : il n'a pas de cible tant qu'il ne reçoit pas le focus. Le lien « Aller au
        // contenu » garde son rembourrage, donc sa boîte mesurée fait plus d'un pixel.
        const style = getComputedStyle(element)
        const rogne =
          (style.clipPath !== 'none' && style.clipPath !== '') ||
          (style.clip !== 'auto' && style.clip !== '')
        if (rogne || (parseFloat(style.width) <= 1 && parseFloat(style.height) <= 1)) continue
        if (boite.width <= 1 && boite.height <= 1) continue
        if (element instanceof HTMLInputElement && element.labels?.[0]) {
          const etiquette = element.labels[0].getBoundingClientRect()
          if (etiquette.width * etiquette.height > boite.width * boite.height) boite = etiquette
        }
        if (boite.width < seuil - 0.5 || boite.height < seuil - 0.5) {
          const nom = (
            element.getAttribute('aria-label') ||
            element.innerText ||
            element.getAttribute('name') ||
            element.id ||
            ''
          )
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 40)
          lignes.push(
            `${element.tagName.toLowerCase()} « ${nom} » : ${Math.round(boite.width)} x ${Math.round(boite.height)} px`,
          )
        }
      }
      return lignes
    },
    { exclure, minimum },
  )
}

export type RapportClavier = {
  /** Éléments interactifs que le clavier doit atteindre. */
  attendus: number
  /** Ceux que Tab a atteints. */
  atteints: number
  /** Éléments que Tab n'atteint jamais. */
  inatteignables: string[]
  /** Éléments atteints dont le focus ne se voit pas (ni contour, ni ombre). */
  sansAnneau: string[]
  /** Le premier bouton d'envoi de l'écran, s'il y en a un : atteint ou non. */
  actionPrincipale: { nom: string; atteinte: boolean } | null
}

/** `groupe` : nom du groupe de boutons radio. Tab n'en atteint qu'un, les flèches font le reste. */
type Marque = { rang: number; nom: string; envoi: boolean; groupe: string | null }

/**
 * Parcourt l'écran avec Tab, comme au clavier. Les éléments suivis sont ceux de la fenêtre
 * modale s'il y en a une (le focus y reste), sinon ceux de toute la page. Pour chaque élément
 * atteint, on lit son style de focus : un contour de 2 px au moins et visible, ou une ombre.
 */
export async function parcourirAuClavier(
  page: Page,
  exclure: string[] = [],
  maximum = 400,
): Promise<RapportClavier> {
  const marques: Marque[] = await page.evaluate((zones) => {
    const racine = document.querySelector('[role="dialog"][aria-modal="true"]') ?? document.body
    const selecteur =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    const resultat: { rang: number; nom: string; envoi: boolean; groupe: string | null }[] = []
    for (const ancien of document.querySelectorAll('[data-audit]'))
      ancien.removeAttribute('data-audit')
    for (const element of racine.querySelectorAll<HTMLElement>(selecteur)) {
      if (!element.checkVisibility()) continue
      if (element.closest('[inert]')) continue
      if (zones.some((zone) => element.closest(zone))) continue
      // `tabindex="-1"` : élément qui ne reçoit le focus que par programme (titre, panneau).
      if (element.getAttribute('tabindex') === '-1') continue
      // Le lien « Aller au contenu » est masqué (1 px) jusqu'à son focus : il se parcourt aussi.
      const style = getComputedStyle(element)
      const masque =
        (style.clipPath !== 'none' && style.clipPath !== '') ||
        (style.clip !== 'auto' && style.clip !== '') ||
        (parseFloat(style.width) <= 1 && parseFloat(style.height) <= 1)
      const rang = resultat.length
      element.setAttribute('data-audit', String(rang))
      const nom = (
        element.getAttribute('aria-label') ||
        element.innerText ||
        element.getAttribute('name') ||
        element.id ||
        ''
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40)
      resultat.push({
        rang,
        nom: `${element.tagName.toLowerCase()} « ${nom} »${masque ? ' (masqué jusqu au focus)' : ''}`,
        envoi: element instanceof HTMLButtonElement && element.type === 'submit',
        groupe:
          element instanceof HTMLInputElement && element.type === 'radio' && element.name
            ? `${element.form?.id ?? ''}/${element.name}`
            : null,
      })
    }
    return resultat
  }, exclure)

  const vus = new Set<number>()
  const sansAnneau: string[] = []
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  const groupesVus = new Set<string>()
  const estVu = (marque: Marque) =>
    vus.has(marque.rang) || (marque.groupe !== null && groupesVus.has(marque.groupe))
  let retoursAuDebut = 0
  let repetitions = 0
  for (let appui = 0; appui < maximum && !marques.every(estVu); appui++) {
    await page.keyboard.press('Tab')
    const actif = await page.evaluate(() => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement) || element === document.body) return { sorti: true }
      // Éléments hors de l'écran audité (barres de réglage d'un aperçu) : Tab y passe, sans compter.
      if (element.dataset.audit === undefined) return { sorti: false, suivi: false }
      const aUnContour = (cible: Element) => {
        const style = getComputedStyle(cible)
        return (
          style.outlineStyle !== 'none' &&
          parseFloat(style.outlineWidth) >= 2 &&
          style.outlineColor !== 'rgba(0, 0, 0, 0)' &&
          style.outlineColor !== 'transparent'
        )
      }
      // Anneau sur l'élément (contour ou ombre), ou sur son étiquette ou un élément voisin quand
      // le champ est masqué ou transparent (motif `peer-focus-visible` : l'anneau est sur le frère).
      const etiquettes: Element[] =
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? Array.from(element.labels ?? [])
          : []
      const freres: Element[] = Array.from(element.parentElement?.children ?? []).filter(
        (frere) => frere !== element,
      )
      const voisins: Element[] = [...etiquettes, ...freres]
      const style = getComputedStyle(element)
      const anneau =
        aUnContour(element) ||
        style.boxShadow !== 'none' ||
        voisins.some((voisin) => aUnContour(voisin))
      return { sorti: false, suivi: true, rang: Number(element.dataset.audit), anneau }
    })
    if (actif.sorti) {
      // Le focus est revenu au début du document (ou sorti vers le navigateur) : un tour complet.
      if (++retoursAuDebut >= 2) break
      continue
    }
    if (!actif.suivi || actif.rang === undefined) continue
    if (vus.has(actif.rang)) {
      // Piège du focus d'une fenêtre : Tab tourne dans les mêmes éléments.
      if (++repetitions > 3) break
      continue
    }
    repetitions = 0
    vus.add(actif.rang)
    const marque = marques[actif.rang]
    if (marque?.groupe) groupesVus.add(marque.groupe)
    if (!actif.anneau) sansAnneau.push(marque?.nom ?? `élément ${actif.rang}`)
  }

  const principal = marques.find((marque) => marque.envoi)
  return {
    attendus: marques.length,
    atteints: marques.filter(estVu).length,
    inatteignables: marques.filter((marque) => !estVu(marque)).map((marque) => marque.nom),
    sansAnneau,
    actionPrincipale: principal ? { nom: principal.nom, atteinte: estVu(principal) } : null,
  }
}

/** Les lignes d'un rapport clavier, vides si tout va bien. */
export function decrireRapportClavier(rapport: RapportClavier): string[] {
  const lignes: string[] = []
  for (const nom of rapport.inatteignables) lignes.push(`Tab n'atteint pas : ${nom}`)
  for (const nom of rapport.sansAnneau) lignes.push(`focus invisible : ${nom}`)
  if (rapport.actionPrincipale && !rapport.actionPrincipale.atteinte) {
    lignes.push(`l'action principale n'est pas atteinte : ${rapport.actionPrincipale.nom}`)
  }
  return lignes
}

/**
 * Fenêtre modale (panneau de saisie à partir de 600 px) : le focus y entre à l'ouverture, puis
 * Tab et Maj+Tab n'en sortent jamais. Sans fenêtre modale, rien à contrôler.
 */
export async function problemesPiegeDuFocus(page: Page): Promise<string[]> {
  const dansLaFenetre = () =>
    page.evaluate(() => {
      const fenetre = document.querySelector('[role="dialog"][aria-modal="true"]')
      return fenetre !== null && fenetre.contains(document.activeElement)
    })
  const nombre = await page.locator('[role="dialog"][aria-modal="true"]').count()
  if (nombre === 0) return []
  const problemes: string[] = []
  if (!(await dansLaFenetre())) problemes.push("le focus n'entre pas dans la fenêtre à l'ouverture")
  const tours = Math.min(
    40,
    3 +
      (await page
        .locator(
          '[role="dialog"][aria-modal="true"] :is(a[href], button, input, select, textarea, summary)',
        )
        .count()),
  )
  for (const touche of ['Tab', 'Shift+Tab']) {
    for (let tour = 0; tour < tours; tour++) {
      await page.keyboard.press(touche)
      if (!(await dansLaFenetre())) {
        problemes.push(`${touche} fait sortir le focus de la fenêtre (appui ${tour + 1})`)
        break
      }
    }
  }
  return problemes
}

/**
 * Chaque bulle d'aide « Aide : ... » s'ouvre au clavier, Échap la ferme et le focus revient sur
 * son bouton. `exclure` ne sert pas ici : seules les aides de l'écran sont touchées.
 */
export async function problemesEchapDesAides(page: Page): Promise<string[]> {
  const boutons = page.getByRole('button', { name: /^Aide : / })
  const problemes: string[] = []
  const nombre = await boutons.count()
  for (let rang = 0; rang < nombre; rang++) {
    const bouton = boutons.nth(rang)
    const nom = (await bouton.getAttribute('aria-label')) ?? `aide ${rang + 1}`
    await bouton.scrollIntoViewIfNeeded()
    await bouton.focus()
    await page.keyboard.press('Enter')
    if ((await bouton.getAttribute('aria-expanded')) !== 'true') {
      problemes.push(`${nom} : ne s'ouvre pas au clavier`)
      continue
    }
    await page.keyboard.press('Escape')
    if ((await bouton.getAttribute('aria-expanded')) !== 'false') {
      problemes.push(`${nom} : Échap ne la ferme pas`)
    }
    const focusRevenu = await bouton.evaluate((element) => element === document.activeElement)
    if (!focusRevenu) problemes.push(`${nom} : le focus ne revient pas sur le bouton`)
  }
  return problemes
}

/**
 * Menu des écrans étroits (sous 1024 px) : le bouton l'ouvre, Échap le ferme et rend le focus au
 * bouton. Sans bouton visible (grand écran, ou écran sans en-tête), rien à contrôler.
 */
export async function problemesEchapDuMenu(page: Page): Promise<string[]> {
  const bouton = page.getByRole('button', { name: 'Ouvrir le menu' })
  if (!(await bouton.isVisible())) return []
  // Derrière une fenêtre modale, le menu n'est pas à portée : le fond de la fenêtre reçoit le clic.
  if ((await page.locator('[role="dialog"][aria-modal="true"]').count()) > 0) return []
  const problemes: string[] = []
  await bouton.click({ timeout: 5_000 })
  const ferme = page.getByRole('button', { name: 'Fermer le menu' })
  if (!(await ferme.isVisible())) return ["le menu ne s'ouvre pas"]
  await page.keyboard.press('Escape')
  if (!(await bouton.isVisible())) problemes.push('Échap ne ferme pas le menu')
  else if (!(await bouton.evaluate((element) => element === document.activeElement))) {
    problemes.push('le focus ne revient pas sur le bouton du menu')
  }
  return problemes
}

/**
 * Repères de structure que axe (étiquettes WCAG) ne tranche pas : un seul titre de niveau 1 par
 * écran (2.4.6), un titre d'onglet (2.4.2), la langue de la page (3.1.1) et une zone `main` pour
 * le lien « Aller au contenu » (2.4.1). `exclure` retire les zones qui ne sont pas l'écran audité.
 */
export async function problemesDeStructure(page: Page, exclure: string[] = []): Promise<string[]> {
  return page.evaluate((zones) => {
    const problemes: string[] = []
    const titres = Array.from(document.querySelectorAll('h1')).filter(
      (titre) => titre.checkVisibility() && !zones.some((zone) => titre.closest(zone)),
    )
    if (titres.length !== 1) problemes.push(`${titres.length} titre(s) de niveau 1 (un attendu)`)
    if (document.title.trim() === '') problemes.push("le titre de l'onglet est vide")
    if (document.documentElement.lang !== 'fr') {
      problemes.push(`langue de la page : « ${document.documentElement.lang} » (fr attendu)`)
    }
    const zonesMain = Array.from(document.querySelectorAll('main, [role="main"]')).filter(
      (zone) => !zones.some((exclue) => zone.closest(exclue)),
    )
    if (zonesMain.length !== 1) problemes.push(`${zonesMain.length} zone(s) main (une attendue)`)
    return problemes
  }, exclure)
}
