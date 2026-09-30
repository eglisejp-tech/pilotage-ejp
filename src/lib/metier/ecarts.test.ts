import { describe, expect, it } from 'vitest'
import { ecartEglise, ecartMinistere, formaterEcart } from './ecarts'

const MOINS = '\u2212'

describe('formaterEcart', () => {
  it('écrit un écart positif avec « + »', () => {
    expect(formaterEcart(2)).toBe('+2')
    expect(formaterEcart(1)).toBe('+1')
  })

  it('écrit un écart négatif avec le signe moins U+2212, jamais un tiret', () => {
    expect(formaterEcart(-3)).toBe(`${MOINS}3`)
    expect(formaterEcart(-14)).toBe(`${MOINS}14`)
    expect(formaterEcart(-3)).not.toMatch(/[-\u2013\u2014]/)
  })

  it('écrit un écart nul « 0 », sans signe', () => {
    expect(formaterEcart(0)).toBe('0')
    expect(formaterEcart(-0)).toBe('0')
  })

  it('groupe les milliers', () => {
    expect(formaterEcart(1234)).toMatch(/^\+1[\u00a0\u202f]234$/)
  })

  it("refuse un écart qui n'est pas un nombre fini", () => {
    expect(() => formaterEcart(Number.NaN)).toThrow(RangeError)
  })
})

describe('ecartEglise', () => {
  it("écrit le texte et l'étiquette accessible à périmètre égal", () => {
    expect(ecartEglise(3, 6, 'dimanche')).toEqual({
      ecart: 3,
      texte: '+3',
      etiquette:
        '+3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois',
    })
  })

  it('compare une session à la session précédente', () => {
    expect(ecartEglise(-14, 5, 'session')?.etiquette).toBe(
      `${MOINS}14 par rapport à la session précédente, pour les 5 ministères qui ont saisi les deux fois`,
    )
  })

  it('accorde au singulier pour un seul ministère en commun', () => {
    expect(ecartEglise(2, 1, 'dimanche')?.etiquette).toBe(
      '+2 par rapport à dimanche dernier, pour le seul ministère qui a saisi les deux fois',
    )
  })

  it("dit « Stable » dans l'étiquette d'un écart nul", () => {
    expect(ecartEglise(0, 8, 'dimanche')).toEqual({
      ecart: 0,
      texte: '0',
      etiquette:
        'Stable par rapport à dimanche dernier, pour les 8 ministères qui ont saisi les deux fois',
    })
  })

  it("ne rend pas d'écart sans ministère en commun", () => {
    expect(ecartEglise(null, 0, 'dimanche')).toBeNull()
    expect(ecartEglise(null, 3, 'session')).toBeNull()
    expect(ecartEglise(4, 0, 'dimanche')).toBeNull()
  })
})

describe('ecartMinistere', () => {
  it("écrit l'écart quand le ministère a saisi les deux fois", () => {
    expect(ecartMinistere(10, 9, '2026-09-20', 'dimanche')).toEqual({
      ecart: 1,
      texte: '+1',
      etiquette: '+1 par rapport à dimanche dernier',
    })
    expect(ecartMinistere(5, 8, '2026-09-20', 'dimanche')).toMatchObject({
      ecart: -3,
      texte: `${MOINS}3`,
    })
    expect(ecartMinistere(13, 12, '2026-09-19', 'session')?.etiquette).toBe(
      '+1 par rapport à la session précédente',
    )
  })

  it('compte un écart nul entre deux saisies à zéro', () => {
    expect(ecartMinistere(0, 0, '2026-09-20', 'dimanche')).toEqual({
      ecart: 0,
      texte: '0',
      etiquette: 'Stable par rapport à dimanche dernier',
    })
  })

  it('dit « dimanche 20 sept. non saisi » quand la saisie précédente manque', () => {
    expect(ecartMinistere(10, null, '2026-09-20', 'dimanche')).toEqual({
      ecart: null,
      texte: 'dimanche 20 sept. non saisi',
      etiquette: 'dimanche 20 sept. non saisi',
    })
    expect(ecartMinistere(13, null, '2026-09-19', 'session')?.texte).toBe(
      'samedi 19 sept. non saisi',
    )
  })

  it('ne rend rien quand la valeur actuelle manque', () => {
    expect(ecartMinistere(null, 9, '2026-09-20', 'dimanche')).toBeNull()
    expect(ecartMinistere(null, null, '2026-09-20', 'dimanche')).toBeNull()
  })
})
