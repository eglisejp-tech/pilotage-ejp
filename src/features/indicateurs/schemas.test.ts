import { describe, expect, it } from 'vitest'
import type { UniteIndicateur } from '@/lib/base'
import { minutesDepuisHeure } from '@/lib/metier/unites'
import {
  messageBorne,
  schemaHeure,
  schemaMoisSaisie,
  schemaMotif,
  schemaPourquoi,
  schemaValeur,
} from './schemas'

// Espace fine insécable d'Intl (U+202F) : « 9 999 ».
const F = ' '

function message(resultat: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultat.error?.issues[0]?.message
}

describe('valeur selon l’unité', () => {
  it('accepte de 0 au plafond inclus, pour chaque unité', () => {
    const plafonds: [UniteIndicateur, number][] = [
      ['nombre', 9999],
      ['grand_nombre', 9_999_999],
      ['euros', 9_999_999],
      ['heure', 1439],
      ['jours', 99_999],
    ]
    for (const [unite, plafond] of plafonds) {
      expect(schemaValeur(unite).safeParse(0).success, `${unite} 0`).toBe(true)
      expect(schemaValeur(unite).safeParse(plafond).success, `${unite} ${plafond}`).toBe(true)
      expect(schemaValeur(unite).safeParse(plafond + 1).success, `${unite} ${plafond + 1}`).toBe(
        false,
      )
    }
  })

  it('dit « Entre 0 et 9 999. » pour un compte et « Entre 0 et 9 999 999. » pour un grand compte', () => {
    expect(message(schemaValeur('nombre').safeParse(10_000))).toBe(`Entre 0 et 9${F}999.`)
    expect(message(schemaValeur('grand_nombre').safeParse(10_000_000))).toBe(
      `Entre 0 et 9${F}999${F}999.`,
    )
    expect(message(schemaValeur('euros').safeParse(10_000_000))).toBe(`Entre 0 et 9${F}999${F}999.`)
    expect(message(schemaValeur('jours').safeParse(100_000))).toBe(`Entre 0 et 99${F}999.`)
    expect(messageBorne('nombre')).toBe(`Entre 0 et 9${F}999.`)
  })

  it('dit les bornes de l’heure en heures et minutes, jamais en minutes', () => {
    expect(message(schemaValeur('heure').safeParse(1440))).toBe('Entre 0 h et 23 h 59.')
    expect(message(schemaValeur('heure').safeParse(-1))).toBe('Entre 0 h et 23 h 59.')
  })

  it('refuse un négatif, une décimale et ce qui n’est pas un nombre', () => {
    expect(message(schemaValeur('nombre').safeParse(-1))).toBe(`Entre 0 et 9${F}999.`)
    expect(message(schemaValeur('nombre').safeParse(2.5))).toBe('Saisissez un nombre entier.')
    expect(message(schemaValeur('nombre').safeParse('12'))).toBe('Saisissez un nombre.')
    expect(message(schemaValeur('nombre').safeParse(Number.NaN))).toBe('Saisissez un nombre.')
    expect(message(schemaValeur('nombre').safeParse(null))).toBe('Saisissez un nombre.')
  })
})

describe('heure en heures et minutes', () => {
  it('rend les minutes depuis minuit : 10 h 42 donne 642', () => {
    expect(schemaHeure.parse({ heures: 10, minutes: 42 })).toBe(642)
    expect(schemaHeure.parse({ heures: 0, minutes: 0 })).toBe(0)
    expect(schemaHeure.parse({ heures: 23, minutes: 59 })).toBe(1439)
  })

  it('refuse 24 h, 60 minutes, une décimale et un champ absent', () => {
    expect(message(schemaHeure.safeParse({ heures: 24, minutes: 0 }))).toBe(
      'Les heures vont de 0 à 23.',
    )
    expect(message(schemaHeure.safeParse({ heures: 10, minutes: 60 }))).toBe(
      'Les minutes vont de 0 à 59.',
    )
    expect(message(schemaHeure.safeParse({ heures: -1, minutes: 0 }))).toBe(
      'Les heures vont de 0 à 23.',
    )
    expect(message(schemaHeure.safeParse({ heures: 10.5, minutes: 0 }))).toBe(
      'Saisissez des heures entières.',
    )
    expect(message(schemaHeure.safeParse({ heures: 10 }))).toBe('Saisissez les minutes.')
  })

  it('donne toujours une valeur que le schéma de l’unité heure accepte, et la même que le métier', () => {
    const valeurHeure = schemaValeur('heure')
    for (let heures = 0; heures <= 23; heures++) {
      for (let minutes = 0; minutes <= 59; minutes++) {
        const total = schemaHeure.parse({ heures, minutes })
        expect(total).toBe(minutesDepuisHeure(heures, minutes))
        expect(valeurHeure.safeParse(total).success).toBe(true)
      }
    }
  })
})

describe('mois d’une saisie', () => {
  const schema = schemaMoisSaisie('2026-10-06')

  it('accepte le mois en cours, un mois fini et janvier de l’année précédente', () => {
    expect(schema.safeParse('2026-10').success).toBe(true)
    expect(schema.safeParse('2026-09').success).toBe(true)
    expect(schema.safeParse('2025-01').success).toBe(true)
  })

  it('refuse un mois futur, un mois trop ancien et autre chose qu’un mois', () => {
    expect(message(schema.safeParse('2026-11'))).toBe("Ce mois n'est pas encore commencé.")
    expect(message(schema.safeParse('2024-12'))).toBe('Ce mois est trop ancien pour être saisi.')
    expect(message(schema.safeParse('octobre'))).toBe('Choisissez un mois.')
    expect(message(schema.safeParse('2026-10-01'))).toBe('Choisissez un mois.')
    expect(message(schema.safeParse(undefined))).toBe('Choisissez un mois.')
  })

  it('suit le jour de Paris donné, pas la date du navigateur', () => {
    expect(schemaMoisSaisie('2026-10-31').safeParse('2026-11').success).toBe(false)
    expect(schemaMoisSaisie('2026-11-01').safeParse('2026-11').success).toBe(true)
  })
})

describe('« Pourquoi » et motif : 10 à 280 caractères après suppression des espaces', () => {
  it('garde le texte sans les espaces autour', () => {
    expect(schemaPourquoi.parse('  Suivre les demandes du mois.  ')).toBe(
      'Suivre les demandes du mois.',
    )
    expect(schemaMotif.parse(' Un motif assez long ')).toBe('Un motif assez long')
  })

  it('refuse moins de 10 caractères, espaces autour exclus', () => {
    expect(message(schemaPourquoi.safeParse('123456789'))).toBe(
      'Expliquez pourquoi en 10 caractères au moins.',
    )
    expect(message(schemaPourquoi.safeParse('   123456789   '))).toBe(
      'Expliquez pourquoi en 10 caractères au moins.',
    )
    expect(message(schemaPourquoi.safeParse(''))).toBe(
      'Expliquez pourquoi en 10 caractères au moins.',
    )
    expect(message(schemaMotif.safeParse('court'))).toBe(
      'Écrivez le motif en 10 caractères au moins.',
    )
    expect(schemaPourquoi.safeParse('1234567890').success).toBe(true)
  })

  it('refuse plus de 280 caractères, espaces autour exclus', () => {
    expect(schemaPourquoi.safeParse('a'.repeat(280)).success).toBe(true)
    expect(schemaPourquoi.safeParse(` ${'a'.repeat(280)} `).success).toBe(true)
    expect(message(schemaPourquoi.safeParse('a'.repeat(281)))).toBe('280 caractères au plus.')
    expect(message(schemaMotif.safeParse('a'.repeat(281)))).toBe('280 caractères au plus.')
  })

  it('compte les caractères comme la base, pas les unités UTF-16', () => {
    const visage = '\u{1F600}'
    expect(visage.length).toBe(2)
    expect(schemaPourquoi.safeParse(visage.repeat(10)).success).toBe(true)
    expect(schemaPourquoi.safeParse(visage.repeat(9)).success).toBe(false)
    expect(schemaPourquoi.safeParse(visage.repeat(280)).success).toBe(true)
    expect(schemaPourquoi.safeParse(visage.repeat(281)).success).toBe(false)
  })

  it('refuse ce qui n’est pas un texte', () => {
    expect(schemaPourquoi.safeParse(undefined).success).toBe(false)
    expect(schemaMotif.safeParse(12).success).toBe(false)
  })
})
