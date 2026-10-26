import { describe, expect, it } from 'vitest'
import { estDejaClos, lireRefusSignalement } from '@/features/signalement/refus'

/** Référence d'un échec technique (T76). */
const REFERENCE = expect.stringMatching(/^[2-9A-HJKMNP-Z]{6}$/)
const PEUT_ETRE_FAIT = 'La connexion a échoué. Vérifiez la liste avant de réessayer.'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

const refus = (message: string, code = 'P0001') => ({ code, message, details: null, hint: null })

describe('lireRefusSignalement', () => {
  // Le texte de la base est la clé : l'écran dit le texte revu par T66 (m167 à m173, m268, m269).
  it.each([
    [MESSAGES_BASE_SIGNALEMENT.texteCourt, 'Décrivez la difficulté (10 caractères au moins).'],
    [MESSAGES_BASE_SIGNALEMENT.texteLong, 'Raccourcissez le signalement : 280 caractères au plus.'],
    [
      MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles,
      'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
    ],
    [
      MESSAGES_BASE_SIGNALEMENT.crochets,
      'Retirez de votre texte les crochets [ ] et les mots « texte masqué ».',
    ],
    // La réponse de « Clore le signalement » est obligatoire à l'écran (T77).
    [MESSAGES_BASE_SIGNALEMENT.commentaireCourt, 'Écrivez au moins 10 caractères.'],
    [MESSAGES_BASE_SIGNALEMENT.commentaireLong, 'Raccourcissez ce texte : 280 caractères au plus.'],
  ])('« %s » : sous le champ, traduit', (base, message) => {
    expect(lireRefusSignalement(refus(base))).toEqual({ ou: 'champ', message })
  })

  it('écran hors liste et signalement déjà clos : sous le bouton', () => {
    expect(lireRefusSignalement(refus(MESSAGES_BASE_SIGNALEMENT.ecran))).toEqual({
      ou: 'bouton',
      message: "Ouvrez « Signaler une difficulté » depuis l'écran concerné.",
      reference: null,
    })
    const dejaClos = lireRefusSignalement(refus(MESSAGES_BASE_SIGNALEMENT.dejaClos))
    expect(dejaClos).toEqual({
      ou: 'bouton',
      message: 'Ce signalement est déjà clos.',
      reference: null,
    })
    expect(estDejaClos(dejaClos)).toBe(true)
  })

  it('refus de droit (42501) : la forme commune d’un élément introuvable, sous le bouton', () => {
    expect(lireRefusSignalement(refus('peu importe', '42501'))).toEqual({
      ou: 'bouton',
      message: 'Cet élément est introuvable. Rechargez la page.',
      reference: null,
    })
  })

  it('aucune réponse : un signalement est peut-être enregistré (« Vérifiez la liste », T76)', () => {
    const attendu = { ou: 'bouton', message: PEUT_ETRE_FAIT, reference: REFERENCE }
    expect(lireRefusSignalement(new TypeError('Failed to fetch'))).toEqual(attendu)
    expect(lireRefusSignalement({ code: '', message: 'TypeError: Load failed' })).toEqual(attendu)
    expect(estDejaClos(lireRefusSignalement(new TypeError('Failed to fetch')))).toBe(false)
  })

  it('jeton expiré : se reconnecter, pas « La connexion a échoué » (m271)', () => {
    expect(lireRefusSignalement(refus('JWT expired', 'PGRST301'))).toEqual({
      ou: 'bouton',
      message: 'Votre connexion a expiré. Reconnectez-vous.',
      reference: null,
    })
  })

  it('erreur inconnue : le repli, sous le bouton (m270)', () => {
    expect(lireRefusSignalement(null)).toEqual({
      ou: 'bouton',
      message:
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
      reference: REFERENCE,
    })
  })

  it('signalement sans réponse après 10 s : vérifier la liste avant de réessayer (m259)', () => {
    const delai = { code: '', message: 'TimeoutError: signal timed out' }
    expect(lireRefusSignalement(delai)).toEqual({
      ou: 'bouton',
      message: PEUT_ETRE_FAIT,
      reference: REFERENCE,
    })
    // Une clôture se refait sans doublon : la base dit « déjà clos ».
    expect(lireRefusSignalement(delai, 'cloture')).toEqual({
      ou: 'bouton',
      message: 'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
      reference: REFERENCE,
    })
  })
})
