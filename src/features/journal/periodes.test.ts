import { describe, expect, it } from 'vitest'
import {
  debutDeJourParis,
  debutDePeriode,
  lirePeriode,
  PERIODE_PAR_DEFAUT,
  premierJourDePeriode,
} from '@/features/journal/periodes'

describe('périodes du journal, à l’heure de Paris', () => {
  it('30 derniers jours par défaut ; une valeur inconnue donne la valeur par défaut', () => {
    expect(PERIODE_PAR_DEFAUT).toBe('30j')
    expect(lirePeriode(null)).toBe('30j')
    expect(lirePeriode('hier')).toBe('30j')
    expect(lirePeriode('7j')).toBe('7j')
    expect(lirePeriode('3m')).toBe('3m')
    expect(lirePeriode('tout')).toBe('tout')
  })

  it('le premier jour se calcule sur le jour de Paris donné, jamais sur la date du navigateur', () => {
    expect(premierJourDePeriode('7j', '2026-10-01')).toBe('2026-09-24')
    expect(premierJourDePeriode('30j', '2026-10-01')).toBe('2026-09-01')
    expect(premierJourDePeriode('3m', '2026-10-01')).toBe('2026-07-01')
    expect(premierJourDePeriode('tout', '2026-10-01')).toBeNull()
  })

  it('3 mois : le quantième est ramené au dernier jour d’un mois plus court', () => {
    expect(premierJourDePeriode('3m', '2026-05-31')).toBe('2026-02-28')
    expect(premierJourDePeriode('3m', '2028-05-31')).toBe('2028-02-29')
    expect(premierJourDePeriode('3m', '2026-01-15')).toBe('2025-10-15')
  })

  it('une période franchit les fins de mois et d’année', () => {
    expect(premierJourDePeriode('7j', '2026-01-03')).toBe('2025-12-27')
    expect(premierJourDePeriode('30j', '2026-03-02')).toBe('2026-01-31')
  })

  it('minuit de Paris : 22 h la veille en UTC en été, 23 h en hiver', () => {
    expect(debutDeJourParis('2026-09-24')).toBe('2026-09-23T22:00:00.000Z')
    expect(debutDeJourParis('2026-12-15')).toBe('2026-12-14T23:00:00.000Z')
  })

  it('minuit de Paris les jours de changement d’heure', () => {
    // Passage à l'heure d'été : dimanche 29 mars 2026, à 2 h. Minuit est encore en heure d'hiver.
    expect(debutDeJourParis('2026-03-29')).toBe('2026-03-28T23:00:00.000Z')
    expect(debutDeJourParis('2026-03-30')).toBe('2026-03-29T22:00:00.000Z')
    // Retour à l'heure d'hiver : dimanche 25 octobre 2026, à 3 h. Minuit est encore en heure d'été.
    expect(debutDeJourParis('2026-10-25')).toBe('2026-10-24T22:00:00.000Z')
    expect(debutDeJourParis('2026-10-26')).toBe('2026-10-25T23:00:00.000Z')
  })

  it('le début d’une période est un instant ISO de Paris, null depuis le début', () => {
    expect(debutDePeriode('30j', '2026-10-01')).toBe('2026-08-31T22:00:00.000Z')
    expect(debutDePeriode('7j', '2026-10-01')).toBe('2026-09-23T22:00:00.000Z')
    expect(debutDePeriode('tout', '2026-10-01')).toBeNull()
  })

  it('une ligne de 1 h 30 à Paris le 1er octobre est dans la période qui commence ce jour-là', () => {
    const debut = Date.parse(debutDePeriode('7j', '2026-10-08') ?? '')
    // 1er octobre 2026, 1 h 30 à Paris = 30 septembre, 23 h 30 en UTC.
    expect(Date.parse('2026-09-30T23:30:00Z')).toBeGreaterThanOrEqual(debut)
    // 30 septembre, 23 h 59 à Paris : veille du premier jour, hors période.
    expect(Date.parse('2026-09-30T21:59:00Z')).toBeLessThan(debut)
  })
})
