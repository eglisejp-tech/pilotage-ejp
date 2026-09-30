import type { CodeDepartement } from './types'

/**
 * Place de chaque département dans la grille de 5 colonnes sur 3 lignes, comme sur la carte
 * réelle de l'Île-de-France (BRIEF_DESIGN, section 6).
 */
export const placesDepartements: Record<CodeDepartement, string> = {
  '95': 'col-start-3 row-start-1',
  '78': 'col-start-1 row-start-2',
  '92': 'col-start-2 row-start-2',
  '75': 'col-start-3 row-start-2',
  '93': 'col-start-4 row-start-2',
  '77': 'col-start-5 row-start-2',
  '91': 'col-start-2 row-start-3',
  '94': 'col-start-3 row-start-3',
}

/** Cinq teintes pleines du bleu nuit, chacune avec son texte qui passe AA. */
export const teintesCarte = [
  'bg-fij-1 text-encre',
  'bg-fij-2 text-encre',
  'bg-fij-3 text-papier',
  'bg-fij-4 text-papier',
  'bg-fij-5 text-papier',
] as const

/**
 * Teinte d'un département, de 0 (le plus clair) à 4 (le plus foncé) : plus il est foncé, plus
 * il compte de FIJ. L'échelle va de la plus petite à la plus grande valeur de la carte ; si
 * elles sont toutes égales, la teinte du milieu (ou la plus claire pour zéro).
 */
export function niveauTeinte(valeur: number, minimum: number, maximum: number): number {
  if (maximum <= minimum) return maximum > 0 ? Math.floor(teintesCarte.length / 2) : 0
  const part = (valeur - minimum) / (maximum - minimum)
  return Math.round(part * (teintesCarte.length - 1))
}
