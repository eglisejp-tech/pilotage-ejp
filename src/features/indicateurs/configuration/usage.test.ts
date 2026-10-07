import { describe, expect, it } from 'vitest'
import type { LigneUsage } from '@/data/indicateursConfiguration'
import {
  estJamaisSaisi,
  estPeuSaisi,
  texteUsage,
  textePeuSaisis,
} from '@/features/indicateurs/configuration/usage'

function usage(
  saisies: number,
  attendues: number,
  derniere: string | null = '2026-10-02T10:00:00+00:00',
): LigneUsage {
  return {
    indicateur_id: 'i',
    ministere_id: 'm',
    nb_periodes_saisies: saisies,
    nb_periodes_attendues: attendues,
    derniere_saisie_le: derniere,
    jamais_saisi: derniere === null,
    attente_jours: null,
  }
}

describe('usage d’un indicateur (7.2)', () => {
  it('« Saisi 4 mois sur 5, dernier le 2 oct. »', () => {
    expect(texteUsage(usage(4, 5), 'mois')).toBe('Saisi 4 mois sur 5, dernier le 2 oct.')
  })

  it('« Peu saisi : 1 mois sur 4 », sans la date', () => {
    expect(texteUsage(usage(1, 4), 'mois')).toBe('Peu saisi : 1 mois sur 4')
  })

  it('« Jamais saisi »', () => {
    expect(texteUsage(usage(0, 3, null), 'mois')).toBe('Jamais saisi')
  })

  it('« Jamais saisi » se reconnaît pour tous les rythmes, même sans période attendue', () => {
    expect(estJamaisSaisi(usage(0, 3, null))).toBe(true)
    expect(estJamaisSaisi(usage(0, 0, null))).toBe(true)
    expect(estJamaisSaisi(usage(0, 1, null))).toBe(true)
    expect(estJamaisSaisi(usage(1, 3))).toBe(false)
    expect(estJamaisSaisi(undefined)).toBe(false)
    // Un seul « à ce jour » attendu n'est pas « peu saisi », mais il est bien « jamais saisi ».
    expect(estPeuSaisi(usage(0, 1, null))).toBe(false)
  })

  it('un dimanche se compte en dimanches, un « à ce jour » en mois', () => {
    expect(texteUsage(usage(3, 4), 'dimanche')).toBe('Saisi 3 dimanches sur 4, dernier le 2 oct.')
    expect(texteUsage(usage(1, 1), 'dimanche')).toBe('Saisi 1 dimanche sur 1, dernier le 2 oct.')
    expect(texteUsage(usage(2, 2), 'a_ce_jour')).toBe('Saisi 2 mois sur 2, dernier le 2 oct.')
  })

  it('la date de la dernière saisie est celle de Paris : minuit passé à Paris, c’est le lendemain', () => {
    expect(texteUsage(usage(4, 5, '2026-10-02T22:30:00+00:00'), 'mois')).toBe(
      'Saisi 4 mois sur 5, dernier le 3 oct.',
    )
  })

  it('aucune ligne d’usage (calcul, retiré pour confidentialité) : rien à dire', () => {
    expect(texteUsage(undefined, 'mois')).toBeNull()
  })
})

describe('« peu saisi » (seuil proposé : moins de la moitié, sur 2 périodes attendues au moins)', () => {
  it.each([
    [1, 4, true],
    [0, 2, true],
    [1, 3, true],
    [1, 2, false],
    [4, 5, false],
    [2, 4, false],
    [0, 1, false],
    [0, 0, false],
  ])('%i saisies sur %i attendues : peu saisi = %s', (saisies, attendues, attendu) => {
    expect(estPeuSaisi(usage(saisies, attendues))).toBe(attendu)
  })

  it('sans usage, jamais peu saisi', () => {
    expect(estPeuSaisi(undefined)).toBe(false)
  })

  it('« 2 peu saisis », « 1 peu saisi »', () => {
    expect(textePeuSaisis(2)).toBe('2 peu saisis')
    expect(textePeuSaisis(1)).toBe('1 peu saisi')
  })
})
