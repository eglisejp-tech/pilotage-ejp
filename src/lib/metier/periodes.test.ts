import { describe, expect, it } from 'vitest'
import { nomDuMois } from './dates'
import {
  ajouterMois,
  dernierMoisPermis,
  estMois,
  libelleDepuisMois,
  libelleMois,
  libelleMoisEnCours,
  moisDe,
  moisDeRattrapage,
  moisEstPermis,
  moisParDefaut,
  moisProposes,
  premierJourDuMois,
  premierMoisPermis,
} from './periodes'

// Les « aujourd'hui » viennent de v_semaine.aujourdhui (jour de Paris), jamais du navigateur :
// chaque cas donne le jour à la fonction.

describe('mois et libellés', () => {
  it('nomme les mois en français, de janvier à décembre', () => {
    expect(nomDuMois(1)).toBe('janvier')
    expect(nomDuMois(8)).toBe('août')
    expect(nomDuMois(12)).toBe('décembre')
    expect(() => nomDuMois(0)).toThrow(RangeError)
    expect(() => nomDuMois(13)).toThrow(RangeError)
  })

  it('écrit « Septembre 2026 », « Octobre en cours » et « Depuis juillet »', () => {
    expect(libelleMois('2026-09')).toBe('Septembre 2026')
    expect(libelleMois('2025-01')).toBe('Janvier 2025')
    expect(libelleMoisEnCours('2026-10')).toBe('Octobre en cours')
    expect(libelleDepuisMois('2026-07')).toBe('Depuis juillet')
    expect(libelleDepuisMois('2026-01')).toBe('Depuis janvier')
  })

  it('lit et refuse le format AAAA-MM', () => {
    expect(estMois('2026-09')).toBe(true)
    expect(estMois('2026-13')).toBe(false)
    expect(estMois('2026-9')).toBe(false)
    expect(estMois('2026-09-01')).toBe(false)
    expect(() => libelleMois('septembre')).toThrow(RangeError)
    expect(moisDe('2026-10-06')).toBe('2026-10')
    expect(premierJourDuMois('2026-09')).toBe('2026-09-01')
  })

  it("ajoute des mois en passant d'une année à l'autre", () => {
    expect(ajouterMois('2026-10', -1)).toBe('2026-09')
    expect(ajouterMois('2026-01', -1)).toBe('2025-12')
    expect(ajouterMois('2026-12', 1)).toBe('2027-01')
    expect(ajouterMois('2026-03', -15)).toBe('2024-12')
    expect(ajouterMois('2026-03', 0)).toBe('2026-03')
  })
})

describe('mois proposés', () => {
  it('propose le mois en cours et les deux précédents, du plus récent au plus ancien', () => {
    expect(moisProposes('2026-10-06')).toEqual([
      { mois: '2026-10', libelle: 'Octobre 2026', enCours: true },
      { mois: '2026-09', libelle: 'Septembre 2026', enCours: false },
      { mois: '2026-08', libelle: 'Août 2026', enCours: false },
    ])
  })

  it("passe d'une année à l'autre : en janvier, décembre et novembre sont proposés", () => {
    expect(moisProposes('2027-01-04').map((m) => m.mois)).toEqual(['2027-01', '2026-12', '2026-11'])
  })

  it('bascule à minuit de Paris : le 31 octobre est encore octobre, le 1er novembre non', () => {
    expect(moisProposes('2026-10-31')[0]).toMatchObject({ mois: '2026-10', enCours: true })
    expect(moisProposes('2026-11-01')[0]).toMatchObject({ mois: '2026-11', enCours: true })
    expect(moisProposes('2026-11-01')[1]).toMatchObject({ mois: '2026-10', enCours: false })
  })

  it('le dernier mois permis est le mois en cours, pour un sensible comme pour un autre (P45)', () => {
    expect(dernierMoisPermis('2026-10-06')).toBe('2026-10')
    expect(moisProposes('2026-10-06').map((m) => m.mois)).toEqual(['2026-10', '2026-09', '2026-08'])
  })
})

describe('rattrapage', () => {
  it("remonte jusqu'au 1er janvier de l'année précédente", () => {
    expect(premierMoisPermis('2026-10-06')).toBe('2025-01')
    const liste = moisDeRattrapage('2026-10-06')
    expect(liste).toHaveLength(22)
    expect(liste[0]).toMatchObject({ mois: '2026-10', enCours: true })
    expect(liste.at(-1)).toMatchObject({ mois: '2025-01', libelle: 'Janvier 2025' })
  })

  it('refuse un mois futur, un mois avant janvier de l’an dernier', () => {
    expect(moisEstPermis('2026-10', '2026-10-06')).toBe(true)
    expect(moisEstPermis('2026-11', '2026-10-06')).toBe(false)
    expect(moisEstPermis('2025-01', '2026-10-06')).toBe(true)
    expect(moisEstPermis('2024-12', '2026-10-06')).toBe(false)
    expect(moisEstPermis('octobre', '2026-10-06')).toBe(false)
  })
})

describe('mois choisi d’abord', () => {
  it('prend le dernier mois révolu non saisi, sinon le mois en cours', () => {
    expect(moisParDefaut('2026-10-06', new Set())).toBe('2026-09')
    expect(moisParDefaut('2026-10-06', new Set(['2026-09']))).toBe('2026-08')
    expect(moisParDefaut('2026-10-06', new Set(['2026-09', '2026-08']))).toBe('2026-10')
  })
})
