import { describe, expect, it } from 'vitest'
import { detailFij, formaterPourcentage, NON_CALCULE, pourcentageFij } from './pourcentage'

describe('pourcentageFij', () => {
  it("divise les sommes et arrondit à l'entier le plus proche", () => {
    expect(pourcentageFij(64, 83)).toBe(77)
    expect(pourcentageFij(11, 14)).toBe(79)
    expect(pourcentageFij(0, 83)).toBe(0)
    expect(pourcentageFij(83, 83)).toBe(100)
  })

  it('arrondit 0,5 vers le haut, comme round() de la base', () => {
    expect(pourcentageFij(1, 8)).toBe(13)
    expect(pourcentageFij(3, 8)).toBe(38)
    expect(pourcentageFij(5, 8)).toBe(63)
    expect(pourcentageFij(1, 200)).toBe(1)
    expect(pourcentageFij(1, 3)).toBe(33)
    expect(pourcentageFij(2, 3)).toBe(67)
  })

  it('ne se calcule pas quand la somme des actifs est nulle', () => {
    expect(pourcentageFij(0, 0)).toBeNull()
  })

  it('ne se calcule pas quand une somme manque', () => {
    expect(pourcentageFij(null, 83)).toBeNull()
    expect(pourcentageFij(64, null)).toBeNull()
    expect(pourcentageFij(null, null)).toBeNull()
  })

  it('refuse une somme négative ou décimale', () => {
    expect(() => pourcentageFij(-1, 10)).toThrow(RangeError)
    expect(() => pourcentageFij(1, 2.5)).toThrow(RangeError)
  })
})

describe('formaterPourcentage', () => {
  it('écrit « 77 % » avec une espace fine insécable', () => {
    expect(formaterPourcentage(77)).toBe('77\u202f%')
    expect(formaterPourcentage(0)).toBe('0\u202f%')
  })

  it('écrit « Non calculé » sans pourcentage', () => {
    expect(formaterPourcentage(null)).toBe('Non calculé')
    expect(NON_CALCULE).toBe('Non calculé')
    expect(formaterPourcentage(pourcentageFij(0, 0))).toBe('Non calculé')
  })
})

describe('detailFij', () => {
  it('écrit « 64 sur 83 STARs actifs »', () => {
    expect(detailFij(64, 83)).toBe('64 sur 83 STARs actifs')
    expect(detailFij(0, 0)).toBe('0 sur 0 STAR actif')
    expect(detailFij(1, 1)).toBe('1 sur 1 STAR actif')
  })

  it('rend null quand une somme manque', () => {
    expect(detailFij(null, 83)).toBeNull()
    expect(detailFij(64, null)).toBeNull()
  })
})
