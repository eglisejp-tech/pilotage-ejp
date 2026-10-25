import type { PointCourbe } from './types'

/** Repère d'une courbe : dernier point, point incomplet (cercle vide) ou bout d'un morceau. */
export interface Repere {
  x: number
  y: number
  plein: boolean
  rayon: number
}

export interface TraceCourbe {
  /** Chemin SVG : un sous-chemin par suite de valeurs, un trou pour une valeur nulle. */
  chemin: string
  reperes: Repere[]
}

const arrondi = (nombre: number) => Number(nombre.toFixed(1))

/**
 * Trace une petite courbe dans un cadre `largeur` x `hauteur`, à `marge` pixels du bord.
 * Les courbes gardent le total brut (règle 12) : une valeur nulle laisse un trou (jamais zéro),
 * un point incomplet porte un cercle vide, le dernier point un cercle plein s'il est complet.
 * Le bout de chaque morceau (le point qui précède un trou, ou un point isolé) porte un petit point
 * plein, ou son cercle vide s'il est incomplet : un morceau se lit comme une courbe qui s'arrête,
 * pas comme un trait cassé (proposition 11, T69). Aucun pointillé entre deux morceaux : un trou
 * veut dire qu'aucune saisie n'existe.
 */
export function tracerCourbe(
  points: PointCourbe[],
  largeur: number,
  hauteur: number,
  marge = 4,
): TraceCourbe {
  const valeurs = points.flatMap((point) => (point.valeur === null ? [] : [point.valeur]))
  if (valeurs.length === 0) return { chemin: '', reperes: [] }

  const minimum = Math.min(...valeurs)
  const maximum = Math.max(...valeurs)
  const pas = points.length > 1 ? (largeur - 2 * marge) / (points.length - 1) : 0
  const abscisse = (index: number) => (points.length > 1 ? marge + index * pas : largeur - marge)
  const ordonnee = (valeur: number) =>
    maximum === minimum
      ? hauteur / 2
      : marge + ((maximum - valeur) / (maximum - minimum)) * (hauteur - 2 * marge)

  const morceaux: string[] = []
  const reperes: Repere[] = []
  const dernierIndex = points.findLastIndex((point) => point.valeur !== null)

  points.forEach((point, index) => {
    if (point.valeur === null) return
    const x = arrondi(abscisse(index))
    const y = arrondi(ordonnee(point.valeur))
    const precedentVide = index === 0 || points[index - 1]?.valeur === null
    const suivantVide = index === points.length - 1 || points[index + 1]?.valeur === null
    morceaux.push(`${precedentVide ? 'M' : 'L'}${x} ${y}`)

    if (index === dernierIndex) {
      reperes.push({ x, y, plein: !point.incomplet, rayon: 3 })
    } else if (point.incomplet) {
      reperes.push({ x, y, plein: false, rayon: 2.5 })
    } else if (suivantVide) {
      reperes.push({ x, y, plein: true, rayon: 2 })
    }
  })

  return { chemin: morceaux.join(' '), reperes }
}
