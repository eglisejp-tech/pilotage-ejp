import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  aDesLignesCachees,
  evenementsAConfirmer,
  lignesVisibles,
  LIGNES_VISIBLES_ALERTE,
} from './alerteEvenements'
import {
  dansLeCalendrier,
  FENETRE_PASSE_JOURS,
  texteDesJours,
  tonDesJours,
  trierEvenements,
} from './evenements'

afterEach(() => {
  vi.useRealTimers()
})

describe('texteDesJours', () => {
  it.each([
    [0, "aujourd'hui"],
    [1, 'demain'],
    [2, 'dans 2 jours'],
    [3, 'dans 3 jours'],
    [-1, 'date passée (hier)'],
    [-2, 'date passée depuis 2 jours'],
    [-10, 'date passée depuis 10 jours'],
  ])('%i jour(s) : « %s »', (jours, texte) => {
    expect(texteDesJours(jours)).toBe(texte)
  })

  it('refuse un nombre qui n’est pas entier', () => {
    expect(() => texteDesJours(1.5)).toThrow(RangeError)
  })

  it('ne lit jamais l’horloge : le même nombre donne le même texte à toute heure', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T22:30:00Z'))
    const avant = texteDesJours(-1)
    vi.setSystemTime(new Date('2026-10-07T00:30:00Z'))
    expect(texteDesJours(-1)).toBe(avant)
  })
})

describe('tonDesJours', () => {
  it('une date passée est en alerte, les autres en attention', () => {
    expect(tonDesJours(-1)).toBe('alerte')
    expect(tonDesJours(0)).toBe('attention')
    expect(tonDesJours(3)).toBe('attention')
  })
})

describe('dansLeCalendrier', () => {
  it('garde au plus 7 jours dans le passé, et tout événement à confirmer', () => {
    expect(FENETRE_PASSE_JOURS).toBe(7)
    expect(dansLeCalendrier({ jours: -7, a_confirmer: false })).toBe(true)
    expect(dansLeCalendrier({ jours: -8, a_confirmer: false })).toBe(false)
    expect(dansLeCalendrier({ jours: -30, a_confirmer: true })).toBe(true)
    expect(dansLeCalendrier({ jours: 20, a_confirmer: false })).toBe(true)
  })
})

const evenement = (titre: string, date: string, a_confirmer = true) => ({
  titre,
  date,
  jours: 0,
  a_confirmer,
})

describe('trierEvenements', () => {
  it('trie par date, puis par nom, sans toucher la liste reçue', () => {
    const liste = [
      evenement('Soirée', '2026-10-10'),
      evenement('Éveil', '2026-10-03'),
      evenement('Accueil', '2026-10-10'),
    ]
    expect(trierEvenements(liste).map((e) => e.titre)).toEqual(['Éveil', 'Accueil', 'Soirée'])
    expect(liste[0]?.titre).toBe('Soirée')
  })
})

describe('alerte des événements à confirmer', () => {
  it('ne garde que les événements à confirmer, la date la plus ancienne d’abord', () => {
    const liste = [
      evenement('B', '2026-10-09'),
      evenement('Valide', '2026-10-01', false),
      evenement('A', '2026-09-26'),
    ]
    expect(evenementsAConfirmer(liste).map((e) => e.titre)).toEqual(['A', 'B'])
  })

  it('montre 5 lignes, puis tout une fois la liste dépliée', () => {
    const lignes = Array.from({ length: 8 }, (_, i) => i)
    expect(LIGNES_VISIBLES_ALERTE).toBe(5)
    expect(lignesVisibles(lignes, false)).toEqual([0, 1, 2, 3, 4])
    expect(lignesVisibles(lignes, true)).toHaveLength(8)
    expect(aDesLignesCachees(5)).toBe(false)
    expect(aDesLignesCachees(6)).toBe(true)
  })
})
