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
  ajoutesParMinisteres: 7,
  enAttente: 1,
  enAttenteLongue: 1,
}

describe('phrasesEglise (7.1)', () => {
  it("dit les indicateurs actifs, les ministères et les ajouts des ministères (l'exemple du texte de conception)", () => {
    expect(phrasesEglise({ ...EGLISE, enAttente: 0, enAttenteLongue: 0 }, 'admin_eglise')).toEqual([
      '94 indicateurs actifs pour 22 ministères, dont 7 ajoutés par les ministères.',
    ])
  })

  it("ajoute « 1 ajout attend la validation d'EJP Tech. » et, pour l'administration seulement, le rappel de plus de 7 jours", () => {
    expect(phrasesEglise(EGLISE, 'admin_eglise')).toEqual([
      '94 indicateurs actifs pour 22 ministères, dont 7 ajoutés par les ministères.',
      "1 ajout attend la validation d'EJP Tech, depuis plus de 7 jours. Prévenez EJP Tech.",
    ])
  })

  it('EJP Tech décide dans le bloc « À valider » : il ne lit pas le rappel « Prévenez EJP Tech »', () => {
    expect(phrasesEglise(EGLISE, 'admin_plateforme')).toEqual([
      '94 indicateurs actifs pour 22 ministères, dont 7 ajoutés par les ministères.',
      "1 ajout attend la validation d'EJP Tech.",
    ])
  })

  it('accorde le pluriel des ajouts qui attendent', () => {
    const phrases = phrasesEglise({ ...EGLISE, enAttente: 3, enAttenteLongue: 2 }, 'admin_eglise')
    expect(phrases).toHaveLength(2)
    expect(phrases[1]).toBe(
      "3 ajouts attendent la validation d'EJP Tech, dont 2 depuis plus de 7 jours. Prévenez EJP Tech.",
    )
    expect(phrasesEglise({ ...EGLISE, enAttente: 2, enAttenteLongue: 2 }, 'admin_eglise')[1]).toBe(
      "2 ajouts attendent la validation d'EJP Tech, depuis plus de 7 jours. Prévenez EJP Tech.",
    )
  })

  it("sans attente longue, la phrase des ajouts ne demande rien à l'administration", () => {
    expect(phrasesEglise({ ...EGLISE, enAttente: 3, enAttenteLongue: 0 }, 'admin_eglise')[1]).toBe(
      "3 ajouts attendent la validation d'EJP Tech.",
    )
  })

  it('sans ajout des ministères, la phrase ne dit pas « dont 0 »', () => {
    expect(
      phrasesEglise(
        { ...EGLISE, ajoutesParMinisteres: 0, enAttente: 0, enAttenteLongue: 0 },
        'admin_eglise',
      ),
    ).toEqual(['94 indicateurs actifs pour 22 ministères.'])
  })

  it('accorde un seul indicateur et un seul ministère', () => {
    expect(
      phrasesEglise(
        { actifs: 1, ministeres: 1, ajoutesParMinisteres: 1, enAttente: 0, enAttenteLongue: 0 },
        'admin_eglise',
      )[0],
    ).toBe('1 indicateur actif pour 1 ministère, dont 1 ajouté par les ministères.')
  })
})

describe('phraseMinistere (7.2)', () => {
  it("dit ce que suit le ministère (l'exemple du texte de conception)", () => {
    expect(
      phraseMinistere({
        nom: 'Kumi',
        suivis: 7,
        prevus: 6,
        ajoutesParLeMinistere: 1,
        ajoutesParLEglise: 0,
      }),
    ).toBe(
      'Kumi suit 7 indicateurs sur 30 au plus : 6 prévus par la coordination et 1 ajouté par Kumi.',
    )
  })

  it("dit aussi les ajouts de l'église, en liste « A, B et C »", () => {
    expect(
      phraseMinistere({
        nom: 'Jeunesse',
        suivis: 9,
        prevus: 5,
        ajoutesParLeMinistere: 3,
        ajoutesParLEglise: 1,
      }),
    ).toBe(
      "Jeunesse suit 9 indicateurs sur 30 au plus : 5 prévus par la coordination, 3 ajoutés par Jeunesse et 1 ajouté par l'administration de l'église ou EJP Tech.",
    )
  })

  it('un seul indicateur, sans ajout : pas de liste', () => {
    expect(
      phraseMinistere({
        nom: 'Protocole',
        suivis: 1,
        prevus: 1,
        ajoutesParLeMinistere: 0,
        ajoutesParLEglise: 0,
      }),
    ).toBe('Protocole suit 1 indicateur sur 30 au plus : 1 prévu par la coordination.')
  })

  it('aucun indicateur suivi : aucune phrase, l’état vide parle à la place', () => {
    expect(
      phraseMinistere({
        nom: 'Protocole',
        suivis: 0,
        prevus: 0,
        ajoutesParLeMinistere: 0,
        ajoutesParLEglise: 0,
      }),
    ).toBeNull()
  })

  it('la limite est celle de la base, 30 lignes par fiche', () => {
    expect(LIGNES_MAX).toBe(30)
  })
})

describe('textes courts', () => {
  it('colonne « Indicateurs » : « 8 sur 30, dont 1 ajouté par Kumi »', () => {
    expect(texteIndicateursMinistere('Kumi', 8, 1)).toBe('8 sur 30, dont 1 ajouté par Kumi')
    expect(texteIndicateursMinistere('Kumi', 8, 2)).toBe('8 sur 30, dont 2 ajoutés par Kumi')
    expect(texteIndicateursMinistere('Kumi', 0, 0)).toBe('0 sur 30')
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
