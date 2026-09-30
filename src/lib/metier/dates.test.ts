import { describe, expect, it } from 'vitest'
import {
  ajouterJours,
  estDateIso,
  formaterHeure,
  formaterHorodatage,
  formaterJourAbrege,
  formaterJourCourt,
  formaterJourLong,
  formaterJourSemaine,
  formaterJourSemaineTitre,
  formaterRendezVous,
  heureDeParis,
  jourDeLaSemaine,
  jourDeParis,
  joursEntre,
  lireInstant,
  partiesDeParis,
} from './dates'

describe('estDateIso', () => {
  it('accepte un jour valide au format AAAA-MM-JJ', () => {
    expect(estDateIso('2026-09-27')).toBe(true)
    expect(estDateIso('2028-02-29')).toBe(true)
  })

  it('refuse un format ou un jour invalide', () => {
    expect(estDateIso('2026-9-27')).toBe(false)
    expect(estDateIso('27/09/2026')).toBe(false)
    expect(estDateIso('2026-02-29')).toBe(false)
    expect(estDateIso('2026-02-30')).toBe(false)
    expect(estDateIso('2026-13-01')).toBe(false)
    expect(estDateIso('2026-09-27T10:00:00Z')).toBe(false)
    expect(estDateIso('')).toBe(false)
  })
})

describe('ajouterJours et joursEntre', () => {
  it("passe les fins de mois, les fins d'année et les années bissextiles", () => {
    expect(ajouterJours('2026-09-30', 1)).toBe('2026-10-01')
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01')
    expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01')
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29')
    expect(ajouterJours('2027-01-03', -7)).toBe('2026-12-27')
  })

  it("ne dépend pas des changements d'heure", () => {
    expect(ajouterJours('2026-03-28', 2)).toBe('2026-03-30')
    expect(ajouterJours('2026-10-24', 2)).toBe('2026-10-26')
    expect(joursEntre('2026-03-28', '2026-03-30')).toBe(2)
    expect(joursEntre('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('compte les jours de calendrier, négatifs si la fin est avant le début', () => {
    expect(joursEntre('2026-09-30', '2026-09-30')).toBe(0)
    expect(joursEntre('2026-12-31', '2027-01-01')).toBe(1)
    expect(joursEntre('2026-09-30', '2026-08-30')).toBe(-31)
  })

  it('refuse un nombre de jours non entier ou un jour invalide', () => {
    expect(() => ajouterJours('2026-09-30', 1.5)).toThrow(RangeError)
    expect(() => ajouterJours('2026-02-30', 1)).toThrow(RangeError)
    expect(() => joursEntre('hier', '2026-09-30')).toThrow(RangeError)
  })
})

describe('jourDeLaSemaine', () => {
  it('rend 1 pour lundi et 7 pour dimanche', () => {
    expect(jourDeLaSemaine('2026-09-27')).toBe(7)
    expect(jourDeLaSemaine('2026-09-28')).toBe(1)
    expect(jourDeLaSemaine('2026-10-01')).toBe(4)
    expect(jourDeLaSemaine('2027-01-03')).toBe(7)
  })

  it('fonctionne avant 1970', () => {
    expect(jourDeLaSemaine('1970-01-01')).toBe(4)
    expect(jourDeLaSemaine('1969-12-28')).toBe(7)
  })
})

describe('lireInstant', () => {
  it('lit les microsecondes de Postgres', () => {
    expect(lireInstant('2026-09-27T10:41:07.123456+00:00').toISOString()).toBe(
      '2026-09-27T10:41:07.123Z',
    )
  })

  it('accepte un objet Date', () => {
    const date = new Date('2026-09-27T10:41:00Z')
    expect(lireInstant(date)).toBe(date)
  })

  it('refuse un jour seul et une chaîne illisible', () => {
    expect(() => lireInstant('2026-09-27')).toThrow(RangeError)
    expect(() => lireInstant('pas une date')).toThrow(RangeError)
    expect(() => lireInstant(new Date(Number.NaN))).toThrow(RangeError)
  })
})

describe('partiesDeParis, jourDeParis et heureDeParis', () => {
  it("donne le jour de Paris à l'heure d'été (UTC+2), pas le jour UTC", () => {
    expect(partiesDeParis('2026-09-29T22:30:00Z')).toEqual({
      jour: '2026-09-30',
      heure: 0,
      minute: 30,
    })
    expect(jourDeParis('2026-09-29T21:59:00Z')).toBe('2026-09-29')
  })

  it("donne le jour de Paris à l'heure d'hiver (UTC+1), au passage de l'année", () => {
    expect(jourDeParis('2026-12-31T23:30:00Z')).toBe('2027-01-01')
    expect(heureDeParis('2026-12-31T23:30:00Z')).toBe('00:30')
    expect(jourDeParis('2026-12-31T22:59:00Z')).toBe('2026-12-31')
  })

  it("suit le passage à l'heure d'été (29 mars 2026)", () => {
    expect(heureDeParis('2026-03-29T00:59:00Z')).toBe('01:59')
    expect(heureDeParis('2026-03-29T01:00:00Z')).toBe('03:00')
  })

  it("suit le passage à l'heure d'hiver (25 octobre 2026), heure répétée comprise", () => {
    expect(partiesDeParis('2026-10-25T00:30:00Z')).toEqual({
      jour: '2026-10-25',
      heure: 2,
      minute: 30,
    })
    expect(partiesDeParis('2026-10-25T01:30:00Z')).toEqual({
      jour: '2026-10-25',
      heure: 2,
      minute: 30,
    })
  })

  it('lit un décalage explicite et un objet Date', () => {
    expect(heureDeParis('2026-09-27T12:41:00+02:00')).toBe('12:41')
    expect(heureDeParis(new Date(Date.UTC(2026, 8, 27, 10, 41)))).toBe('12:41')
  })
})

describe('formats de dates', () => {
  it('écrit « 27 sept. », sans zéro devant le jour', () => {
    expect(formaterJourCourt('2026-09-27')).toBe('27 sept.')
    expect(formaterJourCourt('2026-10-01')).toBe('1 oct.')
  })

  it('abrège les douze mois comme le brief', () => {
    const mois = Array.from({ length: 12 }, (_, i) =>
      formaterJourCourt(`2026-${String(i + 1).padStart(2, '0')}-03`),
    )
    expect(mois).toEqual([
      '3 janv.',
      '3 févr.',
      '3 mars',
      '3 avr.',
      '3 mai',
      '3 juin',
      '3 juil.',
      '3 août',
      '3 sept.',
      '3 oct.',
      '3 nov.',
      '3 déc.',
    ])
  })

  it('écrit le jour de la semaine dans une phrase ou en titre', () => {
    expect(formaterJourSemaine('2026-09-27')).toBe('dimanche 27 sept.')
    expect(formaterJourSemaineTitre('2026-09-27')).toBe('Dimanche 27 sept.')
    expect(formaterJourSemaine('2026-09-20')).toBe('dimanche 20 sept.')
  })

  it('abrège le jour de la semaine : « Sam. 3 oct. »', () => {
    expect(formaterJourAbrege('2026-10-03')).toBe('Sam. 3 oct.')
    expect(formaterJourAbrege('2026-10-15')).toBe('Jeu. 15 oct.')
    expect(formaterJourAbrege('2026-09-27')).toBe('Dim. 27 sept.')
  })

  it('écrit le mois en entier : « samedi 17 octobre »', () => {
    expect(formaterJourLong('2026-10-17')).toBe('samedi 17 octobre')
    expect(formaterJourLong('2026-09-26')).toBe('samedi 26 septembre')
    expect(formaterJourLong('2027-01-01')).toBe('vendredi 1 janvier')
  })
})

describe('formats des heures', () => {
  it("écrit « 20 h » à l'heure pile, « 20 h 30 » sinon", () => {
    expect(formaterHeure('20:00')).toBe('20 h')
    expect(formaterHeure('20:30:00')).toBe('20 h 30')
    expect(formaterHeure('08:05:00')).toBe('8 h 05')
    expect(formaterHeure('00:00:00.000')).toBe('0 h')
  })

  it('refuse une heure invalide', () => {
    expect(() => formaterHeure('24:00')).toThrow(RangeError)
    expect(() => formaterHeure('12:60')).toThrow(RangeError)
    expect(() => formaterHeure('20 h')).toThrow(RangeError)
    expect(() => formaterHeure('')).toThrow(RangeError)
  })

  it('écrit la prochaine réunion : « lundi 5 oct., 20 h »', () => {
    expect(formaterRendezVous('2026-10-05', '20:00:00')).toBe('lundi 5 oct., 20 h')
    expect(formaterRendezVous('2026-10-05', '20:30:00')).toBe('lundi 5 oct., 20 h 30')
    expect(formaterRendezVous('2026-10-05', null)).toBe('lundi 5 oct.')
  })

  it("écrit une ligne de journal à l'heure de Paris : « 27 sept., 12 h 41 »", () => {
    expect(formaterHorodatage('2026-09-27T10:41:00Z')).toBe('27 sept., 12 h 41')
    expect(formaterHorodatage('2026-09-26T20:05:00.654321+00:00')).toBe('26 sept., 22 h 05')
    expect(formaterHorodatage('2026-12-31T23:00:00Z')).toBe('1 janv., 0 h')
  })
})
