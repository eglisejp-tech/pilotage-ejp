import { describe, expect, it } from 'vitest'
import { estDejaClos, lireRefusSignalement } from '@/features/signalement/refus'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

const refus = (message: string, code = 'P0001') => ({ code, message, details: null, hint: null })

describe('lireRefusSignalement', () => {
  it.each([
    MESSAGES_BASE_SIGNALEMENT.texteCourt,
    MESSAGES_BASE_SIGNALEMENT.texteLong,
    MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles,
    MESSAGES_BASE_SIGNALEMENT.crochets,
    MESSAGES_BASE_SIGNALEMENT.commentaireCourt,
    MESSAGES_BASE_SIGNALEMENT.commentaireLong,
  ])('« %s » : sous le champ, tel quel', (message) => {
    expect(lireRefusSignalement(refus(message))).toEqual({ ou: 'champ', message })
  })

  it('écran hors liste et signalement déjà clos : sous le bouton', () => {
    expect(lireRefusSignalement(refus(MESSAGES_BASE_SIGNALEMENT.ecran))).toEqual({
      ou: 'bouton',
      message: "Choisissez l'écran concerné dans la liste.",
    })
    const dejaClos = lireRefusSignalement(refus(MESSAGES_BASE_SIGNALEMENT.dejaClos))
    expect(dejaClos).toEqual({ ou: 'bouton', message: 'Ce signalement est déjà clos.' })
    expect(estDejaClos(dejaClos)).toBe(true)
  })

  it('refus de droit (42501) : le message commun, sous le bouton', () => {
    expect(lireRefusSignalement(refus('peu importe', '42501'))).toEqual({
      ou: 'bouton',
      message: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    })
  })

  it('toute autre erreur est un problème de connexion', () => {
    expect(lireRefusSignalement(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
    expect(lireRefusSignalement(refus('Erreur', 'PGRST301'))).toEqual({ ou: 'connexion' })
    expect(lireRefusSignalement(null)).toEqual({ ou: 'connexion' })
    expect(estDejaClos({ ou: 'connexion' })).toBe(false)
  })
})
