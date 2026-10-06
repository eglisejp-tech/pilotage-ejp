import { describe, expect, it } from 'vitest'
import { ajusterNombre, garderChiffres, lireNombre } from './chiffres'

describe('garderChiffres', () => {
  it('ne garde que les chiffres, sans zéro de tête', () => {
    expect(garderChiffres('12')).toBe('12')
    expect(garderChiffres('1 2a3')).toBe('123')
    expect(garderChiffres('007')).toBe('7')
    expect(garderChiffres('0')).toBe('0')
    expect(garderChiffres('-5')).toBe('5')
    expect(garderChiffres('2,5')).toBe('25')
    expect(garderChiffres('000')).toBe('0')
  })

  it('garde un long nombre collé tel quel, sans notation scientifique ni arrondi', () => {
    expect(garderChiffres('1234567890123456789012')).toBe('1234567890123456789012')
    expect(garderChiffres('0099999999999999999')).toBe('99999999999999999')
  })

  it('laisse un champ vide vide : jamais un 0 que la personne n’a pas écrit', () => {
    expect(garderChiffres('')).toBe('')
    expect(garderChiffres('abc')).toBe('')
    expect(lireNombre('')).toBeNull()
    expect(lireNombre('0')).toBe(0)
    expect(lireNombre('14')).toBe(14)
  })
})

describe('ajusterNombre', () => {
  it('ajoute et retire un, entre 0 et le plafond', () => {
    expect(ajusterNombre('10', 1, 9999)).toBe('11')
    expect(ajusterNombre('10', -1, 9999)).toBe('9')
    expect(ajusterNombre('0', -1, 9999)).toBe('0')
    expect(ajusterNombre('9999', 1, 9999)).toBe('9999')
  })

  it('compte un champ vide pour 0', () => {
    expect(ajusterNombre('', 1, 9999)).toBe('1')
    expect(ajusterNombre('', -1, 9999)).toBe('0')
  })
})
