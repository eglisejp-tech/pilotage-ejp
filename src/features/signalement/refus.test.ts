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

  it('aucune réponse : un problème de connexion', () => {
    expect(lireRefusSignalement(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
    expect(lireRefusSignalement({ code: '', message: 'TypeError: Failed to fetch' })).toEqual({
      ou: 'connexion',
    })
    expect(estDejaClos({ ou: 'connexion' })).toBe(false)
  })

  it('jeton expiré : se reconnecter, pas « La connexion a échoué » (m271)', () => {
    expect(lireRefusSignalement(refus('JWT expired', 'PGRST301'))).toEqual({
      ou: 'bouton',
      message: 'Votre connexion a expiré. Reconnectez-vous.',
    })
  })

  it('erreur inconnue : le repli, sous le bouton (m270)', () => {
    expect(lireRefusSignalement(null)).toEqual({
      ou: 'bouton',
      message:
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
    })
  })

  it('signalement sans réponse après 10 s : vérifier la liste avant de réessayer (m259)', () => {
    const delai = { code: '', message: 'TimeoutError: signal timed out' }
    expect(lireRefusSignalement(delai)).toEqual({
      ou: 'bouton',
      message: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    })
    // Une clôture se refait sans doublon : la base dit « déjà clos ».
    expect(lireRefusSignalement(delai, 'cloture')).toEqual({ ou: 'connexion' })
  })
})
