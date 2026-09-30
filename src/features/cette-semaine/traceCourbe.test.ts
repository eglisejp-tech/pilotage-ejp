import { describe, expect, it } from 'vitest'
import { tracerCourbe } from './traceCourbe'

describe('tracerCourbe', () => {
  it('laisse un trou pour une valeur nulle, jamais un zéro', () => {
    const { chemin } = tracerCourbe(
      [{ valeur: 1 }, { valeur: null }, { valeur: 3 }, { valeur: 4 }],
      100,
      26,
    )
    expect(chemin).toBe('M4 22 M65.3 10 L96 4')
  })

  it('marque le dernier point plein, un point isolé plein et un point incomplet vide', () => {
    const { reperes } = tracerCourbe(
      [{ valeur: 1 }, { valeur: null }, { valeur: 3, incomplet: true }, { valeur: 4 }],
      100,
      26,
    )
    expect(reperes).toEqual([
      { x: 4, y: 22, plein: true, rayon: 2 },
      { x: 65.3, y: 10, plein: false, rayon: 2.5 },
      { x: 96, y: 4, plein: true, rayon: 3 },
    ])
  })

  it('dessine le dernier point vide quand il est incomplet', () => {
    const { reperes } = tracerCourbe([{ valeur: 63 }, { valeur: 58, incomplet: true }], 132, 26)
    expect(reperes).toEqual([{ x: 128, y: 22, plein: false, rayon: 3 }])
  })

  it('centre une courbe plate et ne trace rien sans valeur', () => {
    expect(tracerCourbe([{ valeur: 5 }, { valeur: 5 }], 100, 20).chemin).toBe('M4 10 L96 10')
    expect(tracerCourbe([{ valeur: null }], 100, 20)).toEqual({ chemin: '', reperes: [] })
  })
})
