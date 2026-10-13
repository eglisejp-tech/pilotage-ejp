import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from '@playwright/test'

// Outil d'audit d'accessibilité de l'étape 7 (plan, section 3.3, lot F2) : un seul réglage de
// axe pour tous les parcours, les aperçus comme la base. Les quatre familles d'étiquettes
// couvrent WCAG 2.1 niveaux A et AA ; les règles de bonnes pratiques de axe restent hors du
// compte (elles ne sont pas des critères WCAG).

export const ETIQUETTES_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Une faute lisible : gravité, règle, nombre d'éléments, et les premiers éléments touchés. */
export type FauteAxe = {
  regle: string
  gravite: string
  elements: number
  exemples: string[]
}

/**
 * Passe axe sur la page telle qu'elle est (cadre principal). `exclure` retire des zones
 * (sélecteurs CSS) qui ne sont pas l'écran audité, comme la barre de choix d'un aperçu.
 */
export async function auditerAxe(page: Page, exclure: string[] = []): Promise<FauteAxe[]> {
  let constructeur = new AxeBuilder({ page }).withTags(ETIQUETTES_AXE)
  for (const zone of exclure) constructeur = constructeur.exclude(zone)
  const resultat = await constructeur.analyze()
  return resultat.violations.map((violation) => ({
    regle: violation.id,
    gravite: violation.impact ?? 'inconnue',
    elements: violation.nodes.length,
    exemples: violation.nodes.slice(0, 3).map((noeud) => noeud.target.join(' ')),
  }))
}

/** Les fautes sous forme de lignes, pour un `expect(...).toEqual([])` qui dit quoi corriger. */
export function decrireFautes(fautes: FauteAxe[]): string[] {
  return fautes.map(
    (faute) =>
      `${faute.gravite} ${faute.regle} (${faute.elements} élément(s)) : ${faute.exemples.join(' | ')}`,
  )
}
