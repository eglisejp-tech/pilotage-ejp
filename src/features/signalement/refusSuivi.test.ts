import { describe, expect, it } from 'vitest'
import { lireRefusGeste } from '@/features/signalement/refusSuivi'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

/** Référence d'un échec technique (T76). */
const REFERENCE = expect.stringMatching(/^[2-9A-HJKMNP-Z]{6}$/)

const refus = (message: string, code = 'P0001') => ({ code, message, details: null, hint: null })

describe('lireRefusGeste (T77, section 3.3 de la conception)', () => {
  // Le signalement a changé entre-temps : la phrase sous le bouton, et la liste se relit.
  it.each([
    [
      MESSAGES_BASE_SIGNALEMENT.dejaPrisEnCharge,
      'Ce signalement a déjà été pris en charge. La liste est à jour.',
    ],
    [
      MESSAGES_BASE_SIGNALEMENT.attendLeMinistere,
      'EJP Tech a déjà répondu à ce signalement. La liste est à jour.',
    ],
    [
      MESSAGES_BASE_SIGNALEMENT.nAttendPas,
      'Ce signalement a changé entre-temps. La liste est à jour.',
    ],
    [
      MESSAGES_BASE_SIGNALEMENT.sansCompteActif,
      "Ce ministère n'a plus de compte actif : utilisez « Clore le signalement ».",
    ],
    [MESSAGES_BASE_SIGNALEMENT.dejaClos, 'Ce signalement est déjà clos.'],
  ])('« %s » : relire la liste', (base, message) => {
    for (const forme of ['clic', 'panneau'] as const) {
      expect(lireRefusGeste(refus(base), forme)).toEqual({
        ou: 'bouton',
        message,
        reference: null,
        relire: true,
      })
    }
  })

  it('un texte refusé par la base se dit sous le champ, traduit', () => {
    expect(lireRefusGeste(refus(MESSAGES_BASE_SIGNALEMENT.reponseCourte), 'panneau')).toEqual({
      ou: 'champ',
      message: 'Écrivez au moins 10 caractères.',
    })
    expect(lireRefusGeste(refus(MESSAGES_BASE_SIGNALEMENT.reponseLongue), 'panneau')).toEqual({
      ou: 'champ',
      message: 'Raccourcissez la réponse : 280 caractères au plus.',
    })
    // Critère 17 : « Appelez Jean au 06 12 34 56 78 » refusé avec le message existant.
    expect(lireRefusGeste(refus(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles), 'panneau')).toEqual(
      {
        ou: 'champ',
        message: 'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
      },
    )
  })

  it('un geste en un clic sans réseau : « L’envoi n’a pas abouti. Réessayez. » (critère 21)', () => {
    expect(lireRefusGeste(new TypeError('Failed to fetch'), 'clic')).toEqual({
      ou: 'bouton',
      message: "L'envoi n'a pas abouti. Réessayez.",
      reference: REFERENCE,
      relire: false,
    })
  })

  it('un panneau sans réseau : la saisie est gardée, réessayer ne double rien', () => {
    expect(lireRefusGeste(new TypeError('Failed to fetch'), 'panneau')).toEqual({
      ou: 'bouton',
      message: 'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
      reference: REFERENCE,
      relire: false,
    })
  })

  it('refus de droit (42501) : élément introuvable, sans relire', () => {
    expect(lireRefusGeste(refus('Accès refusé.', '42501'), 'clic')).toEqual({
      ou: 'bouton',
      message: 'Cet élément est introuvable. Rechargez la page.',
      reference: null,
      relire: false,
    })
  })

  it('refus inattendu : le repli de l’action ou de la saisie, avec sa référence', () => {
    expect(lireRefusGeste(refus('erreur interne', 'XX000'), 'clic')).toEqual({
      ou: 'bouton',
      message: "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
      reference: REFERENCE,
      relire: false,
    })
    expect(lireRefusGeste(refus('erreur interne', 'XX000'), 'panneau')).toMatchObject({
      ou: 'bouton',
      message:
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
      relire: false,
    })
  })
})
