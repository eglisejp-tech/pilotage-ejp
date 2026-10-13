import { describe, expect, it } from 'vitest'
import {
  ajusterNombre,
  formatAReprendre,
  lireChamp,
  normaliserChamp,
  peutAjuster,
  valeurDuChamp,
} from './chiffres'

describe('lireChamp (m100 : jamais un nombre deviné)', () => {
  it('lit un nombre entier écrit en chiffres, zéros de tête et espaces autour compris', () => {
    expect(lireChamp('12')).toEqual({ etat: 'nombre', valeur: 12 })
    expect(lireChamp('0')).toEqual({ etat: 'nombre', valeur: 0 })
    expect(lireChamp('007')).toEqual({ etat: 'nombre', valeur: 7 })
    expect(lireChamp(' 14 ')).toEqual({ etat: 'nombre', valeur: 14 })
  })

  it('lit « 1 000 » : des groupes de trois chiffres, espace ordinaire, insécable ou fine', () => {
    expect(lireChamp('1 000')).toEqual({ etat: 'nombre', valeur: 1000 })
    expect(lireChamp('1 000')).toEqual({ etat: 'nombre', valeur: 1000 })
    expect(lireChamp('12 345 678')).toEqual({ etat: 'nombre', valeur: 12345678 })
  })

  it('refuse une virgule, un point, une lettre, un signe ou une espace mal placée', () => {
    for (const texte of ['12,5', '12.5', '1 2', '12a', 'a1b2', '+3', '1e3', '0x10', '1 00', '-']) {
      expect(lireChamp(texte), texte).toEqual({ etat: 'format' })
      expect(formatAReprendre(texte), texte).toBe(true)
      expect(valeurDuChamp(texte), texte).toBeNull()
    }
  })

  it('laisse un champ vide vide : jamais un 0 que la personne n’a pas écrit', () => {
    expect(lireChamp('')).toEqual({ etat: 'vide' })
    expect(lireChamp('   ')).toEqual({ etat: 'vide' })
    expect(formatAReprendre('')).toBe(false)
    expect(valeurDuChamp('')).toBeNull()
  })

  it('lit « -3 » comme un nombre : la borne du formulaire le refuse en donnant les limites', () => {
    expect(lireChamp('-3')).toEqual({ etat: 'nombre', valeur: -3 })
    expect(peutAjuster('-3', -1, 9999)).toBe(false)
    expect(ajusterNombre('-3', 1, 9999)).toBe('0')
  })

  it('garde un long nombre collé comme un nombre (le plafond le refusera), jamais réécrit', () => {
    expect(lireChamp('1234567890123456789012').etat).toBe('nombre')
    expect(valeurDuChamp('99999')).toBe(99999)
  })
})

describe('normaliserChamp', () => {
  it('rend la même forme pour « 05 », « 5 » et « 5 » entouré d’espaces ; un texte à corriger reste', () => {
    expect(normaliserChamp('05')).toBe('5')
    expect(normaliserChamp(' 5 ')).toBe('5')
    expect(normaliserChamp('1 000')).toBe('1000')
    expect(normaliserChamp('')).toBe('')
    expect(normaliserChamp('12,5')).toBe('12,5')
  })
})

describe('ajusterNombre et peutAjuster', () => {
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

  it('ne touche jamais un texte à corriger', () => {
    expect(ajusterNombre('12,5', 1, 9999)).toBe('12,5')
    expect(ajusterNombre('12a', -1, 9999)).toBe('12a')
  })

  it('dit quand un bouton n’a pas d’effet : au plafond, à 0, sur un texte à corriger', () => {
    expect(peutAjuster('9999', 1, 9999)).toBe(false)
    expect(peutAjuster('9998', 1, 9999)).toBe(true)
    expect(peutAjuster('12000', 1, 9999)).toBe(false)
    expect(peutAjuster('0', -1, 9999)).toBe(false)
    expect(peutAjuster('1', -1, 9999)).toBe(true)
    expect(peutAjuster('', 1, 9999)).toBe(true)
    // « Retirer un » sur un champ vide écrit 0 : il a un effet visible.
    expect(peutAjuster('', -1, 9999)).toBe(true)
    expect(peutAjuster('12,5', 1, 9999)).toBe(false)
    expect(peutAjuster('12,5', -1, 9999)).toBe(false)
  })
})
