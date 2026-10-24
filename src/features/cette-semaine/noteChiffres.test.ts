import { describe, expect, it } from 'vitest'
import { noteDesChiffres } from './noteChiffres'
import { TEXTES_VIDES } from './textesVides'
import type { PointCourbe } from './types'

const ligne = (valeurs: (number | null)[]) => ({
  courbe: {
    points: valeurs.map((valeur): PointCourbe => ({ valeur })),
    description: '',
  },
})

describe('noteDesChiffres (proposition 11, T69)', () => {
  it('garde la phrase du premier usage tant qu’aucune courbe n’a deux points', () => {
    expect(noteDesChiffres([])).toBe(TEXTES_VIDES.chiffres.notePremierUsage)
    expect(noteDesChiffres([{ courbe: null }, ligne([null, 12]), ligne([8, null, null])])).toBe(
      'Les courbes apparaîtront avec les premières saisies.',
    )
  })

  it('dit la période, puis ce que disent un trou et un rond vide, dès qu’une courbe a deux points', () => {
    expect(noteDesChiffres([ligne([null, 12]), ligne([8, null, 9])])).toBe(
      "Courbes : 10 derniers dimanches ou 4 dernières sessions. Un trou : aucune saisie ; un rond vide : des ministères n'ont pas saisi.",
    )
  })
})
