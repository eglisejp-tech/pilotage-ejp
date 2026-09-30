import { describe, expect, it } from 'vitest'
import {
  dimancheDeReference,
  libellePeriode,
  libelleSemaine,
  libelleSemaineSansNumero,
  numeroSemaineIso,
  semaineDeReference,
  semaineIso,
} from './semaine'

describe('dimancheDeReference', () => {
  it('rend le dimanche précédent en semaine', () => {
    // Mercredi 30 septembre 2026, 12 h à Paris.
    expect(dimancheDeReference('2026-09-30T10:00:00Z')).toBe('2026-09-27')
    // Samedi 26 septembre, 23 h 59 à Paris.
    expect(dimancheDeReference('2026-09-26T21:59:00Z')).toBe('2026-09-20')
  })

  it("bascule le dimanche à 12 h, heure de Paris (heure d'été, UTC+2)", () => {
    expect(dimancheDeReference('2026-09-27T09:59:59Z')).toBe('2026-09-20')
    expect(dimancheDeReference('2026-09-27T10:00:00Z')).toBe('2026-09-27')
  })

  it('garde ce dimanche le lundi à 0 h 30, heure de Paris', () => {
    expect(dimancheDeReference('2026-09-27T22:30:00Z')).toBe('2026-09-27')
    expect(dimancheDeReference('2026-10-04T09:59:00Z')).toBe('2026-09-27')
  })

  it("bascule à 12 h le dimanche du passage à l'heure d'été (29 mars 2026)", () => {
    // 3 h 30 à Paris, juste après le changement d'heure.
    expect(dimancheDeReference('2026-03-29T01:30:00Z')).toBe('2026-03-22')
    expect(dimancheDeReference('2026-03-29T09:59:00Z')).toBe('2026-03-22')
    expect(dimancheDeReference('2026-03-29T10:00:00Z')).toBe('2026-03-29')
  })

  it("bascule à 12 h le dimanche du passage à l'heure d'hiver (25 octobre 2026)", () => {
    // 11 h à Paris (UTC+1) : un calcul à UTC+2 fixe dirait 12 h.
    expect(dimancheDeReference('2026-10-25T10:00:00Z')).toBe('2026-10-18')
    expect(dimancheDeReference('2026-10-25T10:59:00Z')).toBe('2026-10-18')
    expect(dimancheDeReference('2026-10-25T11:00:00Z')).toBe('2026-10-25')
  })

  it("passe d'une année à l'autre", () => {
    expect(dimancheDeReference('2027-01-01T12:00:00Z')).toBe('2026-12-27')
    expect(dimancheDeReference('2027-01-03T10:59:00Z')).toBe('2026-12-27')
    expect(dimancheDeReference('2027-01-03T11:00:00Z')).toBe('2027-01-03')
  })

  it('accepte un objet Date', () => {
    expect(dimancheDeReference(new Date(Date.UTC(2026, 8, 30, 10)))).toBe('2026-09-27')
  })
})

describe('numeroSemaineIso', () => {
  it('rend le numéro ISO 8601 de la semaine (du lundi au dimanche)', () => {
    expect(numeroSemaineIso('2026-09-21')).toBe(39)
    expect(numeroSemaineIso('2026-09-27')).toBe(39)
    expect(numeroSemaineIso('2026-09-28')).toBe(40)
  })

  it('donne la semaine 53 aux années qui en ont une', () => {
    expect(numeroSemaineIso('2026-12-28')).toBe(53)
    expect(numeroSemaineIso('2027-01-03')).toBe(53)
    expect(numeroSemaineIso('2021-01-03')).toBe(53)
  })

  it("rattache les premiers et derniers jours de l'année à la bonne semaine", () => {
    expect(numeroSemaineIso('2027-01-04')).toBe(1)
    expect(numeroSemaineIso('2025-12-29')).toBe(1)
    expect(numeroSemaineIso('2026-01-01')).toBe(1)
    expect(numeroSemaineIso('2026-01-04')).toBe(1)
    expect(numeroSemaineIso('2024-12-30')).toBe(1)
    expect(numeroSemaineIso('2027-12-31')).toBe(52)
  })
})

describe('semaineIso et semaineDeReference', () => {
  it('rend le lundi et le dimanche de la semaine', () => {
    expect(semaineIso('2026-09-23')).toEqual({
      numero: 39,
      lundi: '2026-09-21',
      dimanche: '2026-09-27',
    })
    expect(semaineIso('2027-01-01')).toEqual({
      numero: 53,
      lundi: '2026-12-28',
      dimanche: '2027-01-03',
    })
  })

  it('donne les mêmes colonnes que la vue v_semaine', () => {
    expect(semaineDeReference('2026-09-30T10:00:00Z')).toEqual({
      aujourdhui: '2026-09-30',
      dimanche: '2026-09-27',
      lundi: '2026-09-21',
      numero: 39,
    })
  })

  it('garde la semaine précédente le dimanche matin', () => {
    expect(semaineDeReference('2026-09-27T08:00:00Z')).toEqual({
      aujourdhui: '2026-09-27',
      dimanche: '2026-09-20',
      lundi: '2026-09-14',
      numero: 38,
    })
  })
})

describe('libellés de la semaine', () => {
  it('écrit le mois une fois quand la semaine tient dans un mois', () => {
    expect(libellePeriode('2026-09-21', '2026-09-27')).toBe('du 21 au 27 sept.')
    expect(libellePeriode('2026-06-01', '2026-06-07')).toBe('du 1 au 7 juin')
  })

  it("écrit les deux mois quand la semaine change de mois ou d'année", () => {
    expect(libellePeriode('2026-09-28', '2026-10-04')).toBe('du 28 sept. au 4 oct.')
    expect(libellePeriode('2026-12-28', '2027-01-03')).toBe('du 28 déc. au 3 janv.')
  })

  it('écrit « Semaine 39, du 21 au 27 sept. »', () => {
    expect(libelleSemaine({ numero: 39, lundi: '2026-09-21', dimanche: '2026-09-27' })).toBe(
      'Semaine 39, du 21 au 27 sept.',
    )
    expect(libelleSemaine(semaineIso('2026-10-04'))).toBe('Semaine 40, du 28 sept. au 4 oct.')
    expect(libelleSemaine(semaineIso('2027-01-03'))).toBe('Semaine 53, du 28 déc. au 3 janv.')
  })

  it('écrit « Semaine du 21 au 27 sept. » quand le numéro est à part', () => {
    expect(libelleSemaineSansNumero({ lundi: '2026-09-21', dimanche: '2026-09-27' })).toBe(
      'Semaine du 21 au 27 sept.',
    )
  })

  it('refuse un jour invalide', () => {
    expect(() => libellePeriode('2026-09-31', '2026-10-04')).toThrow(RangeError)
  })
})
