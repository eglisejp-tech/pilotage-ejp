import { describe, expect, it } from 'vitest'
import {
  formaterHeureEnMinutes,
  formaterValeur,
  formaterValeurSeuil,
  heureDepuisMinutes,
  MOINS_DE_3,
  minutesDepuisHeure,
  plafondUnite,
  suffixeUnite,
  valeurPermise,
} from './unites'

// Espace fine insécable d'Intl (U+202F) : « 12 480 », « 5 164 € ».
const F = ' '

describe('formaterValeur', () => {
  it('écrit chaque unité comme le brief : 14, 12 480, 5 164 €, 10 h 42, 3 jours', () => {
    expect(formaterValeur(14, 'nombre')).toBe('14')
    expect(formaterValeur(12_480, 'grand_nombre')).toBe(`12${F}480`)
    expect(formaterValeur(5164, 'euros')).toBe(`5${F}164${F}€`)
    expect(formaterValeur(642, 'heure')).toBe('10 h 42')
    expect(formaterValeur(3, 'jours')).toBe('3 jours')
  })

  it('accorde « jour » au singulier pour 0 et 1, et garde le 0 (une vraie valeur)', () => {
    expect(formaterValeur(0, 'nombre')).toBe('0')
    expect(formaterValeur(0, 'jours')).toBe('0 jour')
    expect(formaterValeur(1, 'jours')).toBe('1 jour')
    expect(formaterValeur(99_999, 'jours')).toBe(`99${F}999 jours`)
  })

  it("écrit l'heure de minuit à 23 h 59, et refuse une heure hors limites", () => {
    expect(formaterValeur(0, 'heure')).toBe('0 h')
    expect(formaterValeur(605, 'heure')).toBe('10 h 05')
    expect(formaterValeur(1200, 'heure')).toBe('20 h')
    expect(formaterValeur(1439, 'heure')).toBe('23 h 59')
    expect(() => formaterValeur(1440, 'heure')).toThrow(RangeError)
    expect(() => formaterHeureEnMinutes(-1)).toThrow(RangeError)
    expect(() => formaterHeureEnMinutes(10.5)).toThrow(RangeError)
  })
})

describe('moins de 3 (sensibles)', () => {
  it('remplace 1 et 2, jamais 0 ni 3', () => {
    expect(MOINS_DE_3).toBe('moins de 3')
    expect(formaterValeurSeuil(1, 'nombre')).toBe('moins de 3')
    expect(formaterValeurSeuil(2, 'nombre')).toBe('moins de 3')
    expect(formaterValeurSeuil(0, 'nombre')).toBe('0')
    expect(formaterValeurSeuil(3, 'nombre')).toBe('3')
    expect(formaterValeurSeuil(14, 'nombre')).toBe('14')
  })
})

describe('plafonds', () => {
  it('donnent les bornes de chaque unité : 9 999, 9 999 999, 1439 minutes, 99 999 jours', () => {
    expect(plafondUnite('nombre')).toBe(9999)
    expect(plafondUnite('grand_nombre')).toBe(9_999_999)
    expect(plafondUnite('euros')).toBe(9_999_999)
    expect(plafondUnite('heure')).toBe(1439)
    expect(plafondUnite('jours')).toBe(99_999)
  })

  it('valeurPermise accepte un entier de 0 au plafond inclus, et rien d’autre', () => {
    expect(valeurPermise(0, 'nombre')).toBe(true)
    expect(valeurPermise(9999, 'nombre')).toBe(true)
    expect(valeurPermise(10_000, 'nombre')).toBe(false)
    expect(valeurPermise(10_000, 'grand_nombre')).toBe(true)
    expect(valeurPermise(1440, 'heure')).toBe(false)
    expect(valeurPermise(-1, 'jours')).toBe(false)
    expect(valeurPermise(2.5, 'nombre')).toBe(false)
  })
})

describe('suffixe et heure saisie en heures et minutes', () => {
  it('donne le suffixe du champ : € et jours, rien pour les autres unités', () => {
    expect(suffixeUnite('euros')).toBe('€')
    expect(suffixeUnite('jours')).toBe('jours')
    expect(suffixeUnite('nombre')).toBeNull()
    expect(suffixeUnite('heure')).toBeNull()
  })

  it('convertit heures et minutes en minutes depuis minuit, et inversement', () => {
    expect(minutesDepuisHeure(10, 42)).toBe(642)
    expect(minutesDepuisHeure(0, 0)).toBe(0)
    expect(minutesDepuisHeure(23, 59)).toBe(1439)
    expect(minutesDepuisHeure(24, 0)).toBeNull()
    expect(minutesDepuisHeure(10, 60)).toBeNull()
    expect(minutesDepuisHeure(-1, 0)).toBeNull()
    expect(minutesDepuisHeure(10.5, 0)).toBeNull()
    expect(heureDepuisMinutes(642)).toEqual({ heures: 10, minutes: 42 })
    expect(() => heureDepuisMinutes(1440)).toThrow(RangeError)
  })
})
