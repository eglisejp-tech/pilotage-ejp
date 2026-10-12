import { describe, expect, it } from 'vitest'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import { lireRefusPoint } from '@/features/nouveau-point/refus'

const refusDeLaBase = (message: string) => ({ code: 'P0001', message })

describe('refus d’une création de point', () => {
  it.each([
    [MESSAGES_POINT.refus.titre, 'titre'],
    [MESSAGES_POINT.refus.description, 'description'],
    [MESSAGES_POINT.refus.attendu, 'attendu'],
    [MESSAGES_POINT.refus.echeancePassee, 'echeance'],
    [MESSAGES_POINT.refus.mentionRefusee, 'mentions'],
  ])('« %s » : dit sous le champ « %s », tel quel', (message, champ) => {
    expect(lireRefusPoint(refusDeLaBase(message))).toEqual({ ou: 'champ', champ, message })
  })

  it('un autre refus de saisie de la base : sous le bouton, tel quel', () => {
    expect(lireRefusPoint(refusDeLaBase('Autre refus.'))).toEqual({
      ou: 'bouton',
      message: 'Autre refus.',
    })
  })

  it('refus de droit : sous le bouton, sans dire pourquoi', () => {
    expect(lireRefusPoint({ code: '42501', message: 'row-level security' })).toEqual({
      ou: 'bouton',
      message: MESSAGES_POINT.refus.creationAcces,
    })
    expect(
      lireRefusPoint({ code: '42501', message: MESSAGES_POINT.refus.creationReservee }),
    ).toEqual({ ou: 'bouton', message: MESSAGES_POINT.refus.creationReservee })
  })

  it('connexion perdue ou erreur inconnue : problème de connexion, valeurs gardées', () => {
    expect(lireRefusPoint(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
    expect(lireRefusPoint({ code: 'PGRST000', message: 'Erreur.' })).toEqual({ ou: 'connexion' })
    expect(lireRefusPoint(null)).toEqual({ ou: 'connexion' })
  })
})
