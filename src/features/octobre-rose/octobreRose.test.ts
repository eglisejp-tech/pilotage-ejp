import { describe, expect, it } from 'vitest'
import { anneeDeParis, estOctobreRose } from '@/features/octobre-rose/octobreRose'

// Paris est à UTC+2 jusqu'au dimanche 25 octobre 2026 à 3 h (heure d'été), puis à UTC+1.

describe('estOctobreRose : tout octobre, à l’heure de Paris', () => {
  it.each([
    ['30 sept. 23 h 59 à Paris', '2026-09-30T23:59:00+02:00', false],
    ['1er oct. 0 h à Paris', '2026-10-01T00:00:00+02:00', true],
    ['25 oct., avant le changement d’heure', '2026-10-25T02:30:00+02:00', true],
    ['25 oct., après le changement d’heure', '2026-10-25T02:30:00+01:00', true],
    ['31 oct. 23 h 59 à Paris (heure d’hiver)', '2026-10-31T23:59:00+01:00', true],
    ['1er nov. 0 h à Paris', '2026-11-01T00:00:00+01:00', false],
    ['15 juin', '2026-06-15T12:00:00+02:00', false],
  ])('%s', (_cas, instant, attendu) => {
    expect(estOctobreRose(new Date(instant))).toBe(attendu)
  })

  it('la même nuit vue en UTC : le jour de Paris décide, pas celui du serveur ni du navigateur', () => {
    // 30 sept. 22 h UTC : déjà le 1er oct. à 0 h à Paris (heure d'été, UTC+2).
    expect(estOctobreRose(new Date('2026-09-30T22:00:00Z'))).toBe(true)
    expect(estOctobreRose(new Date('2026-09-30T21:59:00Z'))).toBe(false)
    // 31 oct. 23 h UTC : déjà le 1er nov. à 0 h à Paris (heure d'hiver, UTC+1).
    expect(estOctobreRose(new Date('2026-10-31T23:00:00Z'))).toBe(false)
    // 31 oct. 22 h 59 UTC : encore le 31 oct. à 23 h 59 à Paris. Avec le décalage d'été (UTC+2)
    // gardé à tort après le 25 octobre, ce serait déjà le 1er novembre.
    expect(estOctobreRose(new Date('2026-10-31T22:59:00Z'))).toBe(true)
  })

  it('chaque année : la fenêtre est le mois d’octobre, pas une date figée', () => {
    expect(estOctobreRose(new Date('2027-10-01T00:00:00+02:00'))).toBe(true)
    expect(estOctobreRose(new Date('2027-09-30T23:59:00+02:00'))).toBe(false)
    expect(estOctobreRose(new Date('2027-11-01T00:00:00+01:00'))).toBe(false)
    expect(estOctobreRose(new Date('2030-10-31T23:59:00+01:00'))).toBe(true)
  })
})

describe('anneeDeParis', () => {
  it('lit l’année du jour de Paris, même la nuit du 31 décembre en UTC', () => {
    expect(anneeDeParis(new Date('2026-10-15T10:00:00+02:00'))).toBe('2026')
    expect(anneeDeParis(new Date('2026-12-31T23:30:00Z'))).toBe('2027')
  })
})
