import { describe, expect, it } from 'vitest'
import { appelleUnSignalement, lireRefus } from '@/features/evenements/refus'
import { MESSAGES_BASE } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

/** Référence d'un échec technique (T76) : six caractères de l'alphabet sans 0, 1, I, L ni O. */
const REFERENCE = expect.stringMatching(/^[2-9A-HJKMNP-Z]{6}$/)
const CONNEXION = 'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.'

const erreurBase = (message: string, code = 'P0001') => ({
  code,
  message,
  details: null,
  hint: null,
})

describe('refus de la base (contrat de l’étape 4, section 7 ; T37 ; table de traduction)', () => {
  it('une date passée à l’ajout va sous le champ date, avec le texte de la section 7', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.datePasseeAjout))).toEqual({
      ou: 'date',
      message: TEXTES_SIGNALEMENT.dateRefuseeAjout,
    })
  })

  it('une nouvelle date passée à la mise à jour va sous le champ date', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.datePasseeMiseAJour))).toEqual({
      ou: 'date',
      message: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
    })
  })

  it('une ligne identique va sous le bouton, avec la formule « déjà enregistré » (m134)', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.ligneIdentique))).toEqual({
      ou: 'bouton',
      message: "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
      reference: null,
    })
    expect(TEXTES_SIGNALEMENT.ligneIdentique).toBe(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
  })

  it('un autre refus de la table : sa phrase, sous le bouton (T66, m124)', () => {
    expect(lireRefus(erreurBase('Ce ministère ne peut pas être mentionné.'))).toEqual({
      ou: 'bouton',
      message: 'Un ministère coché a été désactivé. Décochez-le, puis réessayez.',
      reference: null,
    })
  })

  it('heures (T68) : sous le champ de l’heure, la phrase traduite ou celle de la base', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.heureDebutAVenir))).toEqual({
      ou: 'heure_debut',
      message: "L'heure de début se saisit le jour de l'événement ou après.",
    })
    expect(lireRefus(erreurBase(MESSAGES_BASE.heureDebutSansTermine))).toEqual({
      ou: 'heure_debut',
      message: "Choisissez « Terminé » pour indiquer l'heure de début.",
    })
    expect(lireRefus(erreurBase(MESSAGES_BASE.heurePrevueInvalide), 'ajout')).toEqual({
      ou: 'heure_prevue',
      message: 'Choisissez une heure valide.',
    })
  })

  it('réunion : un refus sur une heure d’événement reste sous le bouton', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.heurePrevueInvalide), 'reunion')).toEqual({
      ou: 'bouton',
      message: 'Choisissez une heure valide.',
      reference: null,
    })
  })

  it('un refus absent de la table : le repli, jamais le texte de la base (m270)', () => {
    expect(lireRefus(erreurBase('Un refus que la table ne connaît pas.'))).toEqual({
      ou: 'bouton',
      message:
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
      reference: REFERENCE,
    })
  })

  it('un refus de droit dit que l’élément est introuvable (T66, t137)', () => {
    expect(lireRefus(erreurBase('new row violates row-level security policy', '42501'))).toEqual({
      ou: 'bouton',
      message: 'Cet élément est introuvable. Rechargez la page.',
      reference: null,
    })
  })

  it('réunion : un refus de droit est une date devenue passée, dite sous le champ date', () => {
    expect(
      lireRefus(erreurBase('new row violates row-level security policy', '42501'), 'reunion'),
    ).toEqual({
      ou: 'date',
      message: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    })
  })

  it('connexion expirée ou compte désactivé : leur phrase, même pour la réunion (m271, m272)', () => {
    expect(lireRefus(erreurBase('Double authentification requise.', '42501'), 'reunion')).toEqual({
      ou: 'bouton',
      message: 'Votre connexion a expiré. Reconnectez-vous.',
      reference: null,
    })
    expect(lireRefus(erreurBase('Compte inactif ou inconnu.', '42501'))).toEqual({
      ou: 'bouton',
      message: 'Ce compte est désactivé. Contactez EJP Tech.',
      reference: null,
    })
    expect(lireRefus(erreurBase('JWT expired', 'PGRST303'))).toEqual({
      ou: 'bouton',
      message: 'Votre connexion a expiré. Reconnectez-vous.',
      reference: null,
    })
  })

  it('aucune réponse : la phrase de connexion pour une mise à jour, « Vérifiez la liste » pour un ajout (T76)', () => {
    const attendu = { ou: 'bouton', message: CONNEXION, reference: REFERENCE }
    expect(lireRefus(new TypeError('Failed to fetch'))).toEqual(attendu)
    expect(lireRefus({ code: '', message: 'TypeError: Failed to fetch' })).toEqual(attendu)
    expect(lireRefus({ code: '', message: 'TypeError: Load failed' }, 'reunion')).toEqual(attendu)
    expect(lireRefus({ code: '', message: 'TypeError: Load failed' }, 'ajout')).toEqual({
      ou: 'bouton',
      message: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
      reference: REFERENCE,
    })
  })

  it('ajout resté sans réponse après 10 s : vérifier la liste avant de réessayer (m259)', () => {
    const delai = { code: '', message: 'TimeoutError: signal timed out' }
    expect(lireRefus(delai, 'ajout')).toEqual({
      ou: 'bouton',
      message: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
      reference: REFERENCE,
    })
    // La mise à jour se refait sans doublon : la base refuse la ligne identique.
    expect(lireRefus(delai, 'evenement')).toEqual({
      ou: 'bouton',
      message: CONNEXION,
      reference: REFERENCE,
    })
  })

  it('seuls les deux messages de date refusée appellent le lien « Signaler une difficulté »', () => {
    expect(appelleUnSignalement(TEXTES_SIGNALEMENT.dateRefuseeAjout)).toBe(true)
    expect(appelleUnSignalement(TEXTES_SIGNALEMENT.dateRefuseeMiseAJour)).toBe(true)
    expect(appelleUnSignalement(TEXTES_SIGNALEMENT.ligneIdentique)).toBe(false)
    expect(appelleUnSignalement('Choisissez une date.')).toBe(false)
    expect(appelleUnSignalement(undefined)).toBe(false)
  })
})
