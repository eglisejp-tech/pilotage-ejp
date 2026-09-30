import { describe, expect, it } from 'vitest'
import {
  completude,
  libelleAceJour,
  libelleCompletude,
  libelleCompletudeMinisteres,
  libelleDepartements,
  libelleManquants,
} from './completude'

describe('libelleCompletude', () => {
  it('écrit « 6 sur 8 »', () => {
    expect(libelleCompletude(6, 8)).toBe('6 sur 8')
    expect(libelleCompletude(8, 8)).toBe('8 sur 8')
    expect(libelleCompletude(0, 8)).toBe('0 sur 8')
  })

  it("écrit « 0 sur 0 » quand aucun ministère n'est attendu", () => {
    expect(libelleCompletude(0, 0)).toBe('0 sur 0')
  })
})

describe('libelleCompletudeMinisteres', () => {
  it('écrit « 6/8 ministères »', () => {
    expect(libelleCompletudeMinisteres(6, 8)).toBe('6/8 ministères')
    expect(libelleCompletudeMinisteres(0, 2)).toBe('0/2 ministères')
  })

  it('accorde au singulier pour 0 ou 1 ministère attendu', () => {
    expect(libelleCompletudeMinisteres(1, 1)).toBe('1/1 ministère')
    expect(libelleCompletudeMinisteres(0, 0)).toBe('0/0 ministère')
  })
})

describe('completude', () => {
  it('compte les manquants', () => {
    expect(completude(6, 8)).toEqual({
      saisis: 6,
      attendus: 8,
      manquants: 2,
      complet: false,
      libelle: '6 sur 8',
      libelleMinisteres: '6/8 ministères',
    })
  })

  it('est complète quand tous les attendus ont saisi', () => {
    expect(completude(8, 8)).toMatchObject({ manquants: 0, complet: true })
  })

  it("n'est pas complète quand aucun ministère n'est attendu", () => {
    expect(completude(0, 0)).toMatchObject({ manquants: 0, complet: false, libelle: '0 sur 0' })
  })

  it('ne rend jamais un nombre de manquants négatif', () => {
    expect(completude(9, 8)).toMatchObject({ manquants: 0, complet: true, libelle: '9 sur 8' })
  })

  it('refuse un nombre négatif, décimal ou invalide', () => {
    expect(() => completude(-1, 8)).toThrow(RangeError)
    expect(() => completude(1.5, 8)).toThrow(RangeError)
    expect(() => completude(6, Number.NaN)).toThrow(RangeError)
  })
})

describe('libelleManquants', () => {
  it('rend null quand personne ne manque', () => {
    expect(libelleManquants([])).toBeNull()
  })

  it('écrit « Manque : » au singulier et « Manquent : » au pluriel', () => {
    expect(libelleManquants(['Intégration'])).toBe('Manque : Intégration')
    expect(libelleManquants(['Intégration', 'Coordination'])).toBe(
      'Manquent : Coordination, Intégration',
    )
  })

  it("trie les noms dans l'ordre alphabétique français", () => {
    expect(libelleManquants(['Social', 'Écoute', 'FIJ'])).toBe('Manquent : Écoute, FIJ, Social')
  })
})

describe('libelleAceJour', () => {
  it('écrit « À ce jour » sans valeur de plus de 30 jours', () => {
    expect(libelleAceJour(0)).toEqual({ libelle: 'À ce jour', attention: false })
  })

  it('signale les valeurs de plus de 30 jours, avec le texte', () => {
    expect(libelleAceJour(1)).toEqual({
      libelle: 'À ce jour, 1 valeur de plus de 30 jours',
      attention: true,
    })
    expect(libelleAceJour(3)).toEqual({
      libelle: 'À ce jour, 3 valeurs de plus de 30 jours',
      attention: true,
    })
  })

  it('refuse un nombre négatif', () => {
    expect(() => libelleAceJour(-1)).toThrow(RangeError)
  })
})

describe('libelleDepartements', () => {
  it('écrit « 8 dép. »', () => {
    expect(libelleDepartements(8)).toBe('8 dép.')
    expect(libelleDepartements(0)).toBe('0 dép.')
  })
})
