import { describe, expect, it } from 'vitest'
import { schemaVersionConditions, VERSION_CONDITIONS } from '@/lib/metier/conditions'
import { dateDeVersionConditions } from '@/lib/metier/dateConditions'

describe('conditions', () => {
  it('la version courante est une date AAAA-MM-JJ valide', () => {
    expect(schemaVersionConditions.safeParse(VERSION_CONDITIONS).success).toBe(true)
  })

  it('écrit la date de la version en toutes lettres', () => {
    expect(dateDeVersionConditions('2026-10-08')).toBe('8 octobre 2026')
    expect(dateDeVersionConditions('2027-01-01')).toBe('1er janvier 2027')
    expect(dateDeVersionConditions()).toBe(dateDeVersionConditions(VERSION_CONDITIONS))
  })

  it('refuse une version mal formée', () => {
    for (const version of ['', '8 octobre 2026', '2026-10-8', 'v1']) {
      expect(schemaVersionConditions.safeParse(version).success).toBe(false)
    }
  })
})
