import { describe, expect, it } from 'vitest'
import {
  deMinistere,
  LIGNES_MAX,
  phraseMinistere,
  phrasesEglise,
  texteDepuisJours,
  texteIndicateursMinistere,
} from '@/features/indicateurs/configuration/phrases'

const EGLISE = {
  actifs: 94,
  ministeres: 22,
  enAttente: 1,
  enAttenteLongue: 1,
}

// Textes revus par T66 (t319 à t322, t325, t329 ; m222 et m223) : aucun rôle nommé sauf pour agir,
// le détail par ministère reste dans le tableau.
describe('phrasesEglise (7.1)', () => {
  it('dit les indicateurs actifs et les ministères, sans le détail des ajouts', () => {
    expect(phrasesEglise({ ...EGLISE, enAttente: 0, enAttenteLongue: 0 }, 'admin_eglise')).toEqual([
      '94 indicateurs actifs pour 22 ministères.',
    ])
  })

  it('ajoute l’attente sans dire qui valide et, pour l’administration seulement, le rappel de plus de 7 jours', () => {
    expect(phrasesEglise(EGLISE, 'admin_eglise')).toEqual([
      '94 indicateurs actifs pour 22 ministères.',
      '1 indicateur attend sa validation depuis plus de 7 jours. Prévenez EJP Tech.',
    ])
  })

  it('EJP Tech, qui valide, lit « 1 indicateur à valider. », sans rappel', () => {
    expect(phrasesEglise(EGLISE, 'admin_plateforme')).toEqual([
      '94 indicateurs actifs pour 22 ministères.',
      '1 indicateur à valider.',
    ])
    expect(phrasesEglise({ ...EGLISE, enAttente: 3 }, 'admin_plateforme')[1]).toBe(
      '3 indicateurs à valider.',
    )
  })

  it('accorde le pluriel des indicateurs qui attendent', () => {
    const phrases = phrasesEglise({ ...EGLISE, enAttente: 3, enAttenteLongue: 2 }, 'admin_eglise')
    expect(phrases).toHaveLength(2)
    expect(phrases[1]).toBe(
      '3 indicateurs attendent leur validation, dont 2 depuis plus de 7 jours. Prévenez EJP Tech.',
    )
    expect(phrasesEglise({ ...EGLISE, enAttente: 2, enAttenteLongue: 2 }, 'admin_eglise')[1]).toBe(
      '2 indicateurs attendent leur validation depuis plus de 7 jours. Prévenez EJP Tech.',
    )
  })

  it("sans attente longue, la phrase de l'attente ne demande rien à l'administration", () => {
    expect(phrasesEglise({ ...EGLISE, enAttente: 3, enAttenteLongue: 0 }, 'admin_eglise')[1]).toBe(
      '3 indicateurs attendent leur validation.',
    )
  })

  it('accorde un seul indicateur et un seul ministère', () => {
    expect(
      phrasesEglise(
        { actifs: 1, ministeres: 1, enAttente: 0, enAttenteLongue: 0 },
        'admin_eglise',
      )[0],
    ).toBe('1 indicateur actif pour 1 ministère.')
  })
})

describe('phraseMinistere (7.2)', () => {
  it('dit le nombre d’indicateurs suivis (guide, exemple 16)', () => {
    expect(phraseMinistere(7)).toBe('7 indicateurs suivis.')
    expect(phraseMinistere(1)).toBe('1 indicateur suivi.')
  })

  it('aucun indicateur suivi : aucune phrase, l’état vide parle à la place', () => {
    expect(phraseMinistere(0)).toBeNull()
  })

  it('la limite est celle de la base, 30 lignes par fiche', () => {
    expect(LIGNES_MAX).toBe(30)
  })
})

describe('textes courts', () => {
  it('colonne « Indicateurs » : « 8 sur 30 »', () => {
    expect(texteIndicateursMinistere(8)).toBe('8 sur 30')
    expect(texteIndicateursMinistere(0)).toBe('0 sur 30')
  })

  it("élision du nom d'un ministère dans un titre", () => {
    expect(deMinistere('Kumi')).toBe('de Kumi')
    expect(deMinistere('Intégration')).toBe("d'Intégration")
    expect(deMinistere('Eagles')).toBe("d'Eagles")
    expect(deMinistere('Santé')).toBe('de Santé')
  })

  it("attente d'un ajout à valider", () => {
    expect(texteDepuisJours(0)).toBe("depuis aujourd'hui")
    expect(texteDepuisJours(1)).toBe('depuis 1 jour')
    expect(texteDepuisJours(2)).toBe('depuis 2 jours')
  })
})
