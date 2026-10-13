import { describe, expect, it } from 'vitest'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import { lireRefusPoint } from '@/features/nouveau-point/refus'

const refusDeLaBase = (message: string) => ({ code: 'P0001', message })

const REPLI =
  "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech."

describe('refus d’une création de point', () => {
  it.each([
    [MESSAGES_POINT.refus.titre, 'titre'],
    [MESSAGES_POINT.refus.description, 'description'],
    [MESSAGES_POINT.refus.attendu, 'attendu'],
    [MESSAGES_POINT.refus.echeancePassee, 'echeance'],
    [MESSAGES_POINT.refus.mentionRefusee, 'mentions'],
  ])('« %s » : dit sous le champ « %s », par la table de traduction', (message, champ) => {
    expect(lireRefusPoint(refusDeLaBase(message))).toEqual({ ou: 'champ', champ, message })
  })

  it('un refus absent de la table : le repli sous le bouton, jamais le texte brut (m270)', () => {
    expect(lireRefusPoint(refusDeLaBase('Autre refus.'))).toEqual({ ou: 'bouton', message: REPLI })
    expect(lireRefusPoint({ code: 'PGRST000', message: 'Erreur.' })).toEqual({
      ou: 'bouton',
      message: REPLI,
    })
    expect(lireRefusPoint(null)).toEqual({ ou: 'bouton', message: REPLI })
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

  it('connexion expirée, compte désactivé : leur phrase (m271, m272)', () => {
    expect(lireRefusPoint({ code: '42501', message: 'Double authentification requise.' })).toEqual({
      ou: 'bouton',
      message: 'Votre connexion a expiré. Reconnectez-vous.',
    })
    expect(lireRefusPoint({ code: '42501', message: 'Compte inactif ou inconnu.' })).toEqual({
      ou: 'bouton',
      message: 'Ce compte est désactivé. Contactez EJP Tech.',
    })
  })

  it('connexion perdue : problème de connexion, valeurs gardées', () => {
    expect(lireRefusPoint(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
  })

  it('création sans réponse après 10 s : vérifier la liste avant de réessayer (m259)', () => {
    expect(lireRefusPoint({ code: '', message: 'TimeoutError: signal timed out' })).toEqual({
      ou: 'bouton',
      message: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    })
  })
})
