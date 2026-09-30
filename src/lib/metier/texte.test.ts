import { describe, expect, it } from 'vitest'
import {
  accorder,
  comparerNoms,
  listeNoms,
  majusculeInitiale,
  MOINS,
  nombre,
  nombreEnDebutDePhrase,
  terminerPhrase,
  trierNoms,
} from './texte'

describe('nombre', () => {
  it('écrit les petits nombres en chiffres', () => {
    expect(nombre(0)).toBe('0')
    expect(nombre(52)).toBe('52')
  })

  it('groupe les milliers à la française, avec une espace insécable', () => {
    expect(nombre(1234)).toMatch(/^1[\u00a0\u202f]234$/)
  })

  it('écrit un nombre négatif avec le signe moins U+2212, jamais un tiret', () => {
    expect(nombre(-3)).toBe(`${MOINS}3`)
    expect(MOINS).toBe('\u2212')
    expect(nombre(-3)).not.toContain('-')
  })

  it('écrit moins zéro comme zéro', () => {
    expect(nombre(-0)).toBe('0')
  })

  it("refuse une valeur qui n'est pas un nombre fini", () => {
    expect(() => nombre(Number.NaN)).toThrow(RangeError)
    expect(() => nombre(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('nombreEnDebutDePhrase', () => {
  it('écrit en lettres de un à dix', () => {
    expect(nombreEnDebutDePhrase(1)).toBe('Un')
    expect(nombreEnDebutDePhrase(2)).toBe('Deux')
    expect(nombreEnDebutDePhrase(7)).toBe('Sept')
    expect(nombreEnDebutDePhrase(10)).toBe('Dix')
  })

  it('écrit en chiffres hors de un à dix', () => {
    expect(nombreEnDebutDePhrase(0)).toBe('0')
    expect(nombreEnDebutDePhrase(11)).toBe('11')
    expect(nombreEnDebutDePhrase(52)).toBe('52')
  })
})

describe('accorder', () => {
  it('garde le singulier pour 0 et 1, le pluriel à partir de 2', () => {
    expect(accorder(0, 'présent', 'présents')).toBe('présent')
    expect(accorder(1, 'présent', 'présents')).toBe('présent')
    expect(accorder(2, 'présent', 'présents')).toBe('présents')
  })

  it('accorde selon la valeur absolue', () => {
    expect(accorder(-1, 'présent', 'présents')).toBe('présent')
    expect(accorder(-3, 'présent', 'présents')).toBe('présents')
  })
})

describe('listeNoms', () => {
  it('rend une chaîne vide pour une liste vide', () => {
    expect(listeNoms([])).toBe('')
  })

  it('écrit « A », « A et B », « A, B et C »', () => {
    expect(listeNoms(['Social'])).toBe('Social')
    expect(listeNoms(['Coordination', 'Intégration'])).toBe('Coordination et Intégration')
    expect(listeNoms(['FIJ', 'Jeunesse', 'Social'])).toBe('FIJ, Jeunesse et Social')
    expect(listeNoms(['A', 'B', 'C', 'D'])).toBe('A, B, C et D')
  })
})

describe('trierNoms et comparerNoms', () => {
  it("suit l'ordre alphabétique français, accents compris", () => {
    const noms = ['Social', 'Intégration', 'Écoute', 'Coordination', 'EJP Formation']
    expect(trierNoms(noms)).toEqual([
      'Coordination',
      'Écoute',
      'EJP Formation',
      'Intégration',
      'Social',
    ])
  })

  it('ne modifie pas la liste reçue', () => {
    const noms = ['Social', 'Communication']
    trierNoms(noms)
    expect(noms).toEqual(['Social', 'Communication'])
  })

  it('compare deux noms', () => {
    expect(comparerNoms('Écoute', 'Social')).toBeLessThan(0)
    expect(comparerNoms('FIJ', 'FIJ')).toBe(0)
  })
})

describe('majusculeInitiale', () => {
  it('met la première lettre en majuscule, accent compris', () => {
    expect(majusculeInitiale('dimanche 27 sept.')).toBe('Dimanche 27 sept.')
    expect(majusculeInitiale('état')).toBe('État')
    expect(majusculeInitiale('')).toBe('')
  })
})

describe('terminerPhrase', () => {
  it('ajoute un point final', () => {
    expect(terminerPhrase('Il reste la date de la prochaine réunion')).toBe(
      'Il reste la date de la prochaine réunion.',
    )
  })

  it("ne double pas le point d'une abréviation finale", () => {
    expect(terminerPhrase('Il reste les chiffres du dimanche 4 oct.')).toBe(
      'Il reste les chiffres du dimanche 4 oct.',
    )
  })

  it("garde un point d'exclamation ou d'interrogation", () => {
    expect(terminerPhrase('Bravo !')).toBe('Bravo !')
    expect(terminerPhrase('Vraiment ?')).toBe('Vraiment ?')
  })
})
