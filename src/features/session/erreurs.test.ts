import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { messagesConnexion } from '@/features/connexion/messages'
import { erreurDeRetourGoogle, traduireErreur } from '@/features/session/erreurs'

const api = (code: string, statut = 400) => new AuthApiError('message anglais', statut, code)

describe('traduireErreur', () => {
  it('traduit chaque erreur de Supabase vers un message français, jamais le message anglais', () => {
    expect(traduireErreur(api('invalid_credentials'), 'connexion')).toBe(
      messagesConnexion.identifiantsIncorrects,
    )
    expect(traduireErreur(api('mfa_verification_failed', 422), 'code')).toBe(
      messagesConnexion.codeFaux,
    )
    expect(traduireErreur(api('user_banned', 403), 'connexion')).toBe(
      messagesConnexion.compteDesactive,
    )
    expect(traduireErreur(api('over_request_rate_limit', 429), 'code')).toBe(
      messagesConnexion.tropDeTentatives,
    )
    expect(traduireErreur(api('signup_disabled', 422), 'connexion')).toBe(
      messagesConnexion.googleSansCompte,
    )
    expect(traduireErreur(api('weak_password', 422), 'mot-de-passe')).toBe(
      messagesConnexion.motDePasseFaible,
    )
    expect(traduireErreur(api('same_password', 422), 'mot-de-passe')).toBe(
      messagesConnexion.memeMotDePasse,
    )
  })

  it('une session aal1 perdue pendant le code : « Votre connexion a expiré »', () => {
    expect(traduireErreur(api('session_not_found', 403), 'code')).toBe(
      messagesConnexion.connexionExpiree,
    )
    expect(traduireErreur(api('session_not_found', 403), 'connexion')).toBe(
      'Votre connexion a expiré. Reconnectez-vous.',
    )
    // Pendant le choix du mot de passe, la personne n'en a pas encore : un nouveau lien (m038).
    expect(traduireErreur(api('session_not_found', 403), 'mot-de-passe')).toBe(
      "Votre connexion a expiré. Demandez un nouveau lien depuis l'écran de connexion.",
    )
  })

  it("limite d'envoi d'emails : un lien est peut-être déjà parti (T66, m023)", () => {
    expect(traduireErreur(api('over_email_send_rate_limit', 429), 'lien-email')).toBe(
      'Un lien vient peut-être déjà de partir. Regardez votre messagerie, ou réessayez dans quelques minutes.',
    )
  })

  it('réseau sans réponse : « La connexion a échoué »', () => {
    expect(traduireErreur(new AuthRetryableFetchError('Failed to fetch', 0), 'connexion')).toBe(
      messagesConnexion.echecReseau,
    )
    expect(traduireErreur(new TypeError('Failed to fetch'), 'code')).toBe(
      messagesConnexion.echecReseau,
    )
  })

  it('panne du serveur Auth (5xx, code inconnu) : réessayer plus tard, puis EJP Tech (m019)', () => {
    const panne =
      "La connexion n'a pas abouti. Réessayez dans quelques minutes, et si le problème revient, prévenez EJP Tech."
    expect(traduireErreur(new AuthRetryableFetchError('Bad Gateway', 502), 'connexion')).toBe(panne)
    expect(traduireErreur(api('unexpected_failure', 500), 'connexion')).toBe(panne)
    expect(traduireErreur(api('request_timeout', 504), 'code')).toBe(panne)
    expect(traduireErreur(api('provider_disabled', 400), 'connexion')).toBe(panne)
    expect(traduireErreur(api('un_code_nouveau', 422), 'mot-de-passe')).toBe(panne)
  })

  it('compte désactivé testé avant tout autre refus, contact EJP Tech (m015, T59)', () => {
    expect(traduireErreur(api('user_banned', 403), 'lien-email')).toBe(
      'Ce compte est désactivé. Contactez EJP Tech.',
    )
  })
})

describe('erreurDeRetourGoogle', () => {
  it("lit l'erreur dans la requête ou dans l'ancre", () => {
    expect(
      erreurDeRetourGoogle(
        '?error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed',
        '',
      ),
    ).toBe(messagesConnexion.googleSansCompte)
    expect(erreurDeRetourGoogle('', '#error=server_error&error_description=User+is+banned')).toBe(
      messagesConnexion.compteDesactive,
    )
  })

  it('fenêtre de Google fermée ou refusée, retour non reconnu : proposer l’email (m014)', () => {
    const interrompu =
      "La connexion avec Google n'a pas abouti. Réessayez, ou connectez-vous avec votre email."
    expect(erreurDeRetourGoogle('?error=access_denied', '')).toBe(interrompu)
    expect(erreurDeRetourGoogle('?error=server_error', '')).toBe(interrompu)
    expect(erreurDeRetourGoogle('', '#error=temporarily_unavailable')).toBe(interrompu)
  })

  it('adresse sans compte actif : contact EJP Tech (m013, T59)', () => {
    expect(erreurDeRetourGoogle('?error_code=signup_disabled', '')).toBe(
      'Aucun compte actif pour cette adresse. Ouvrez votre invitation ou demandez un compte à EJP Tech.',
    )
  })

  it("rien sans paramètre d'erreur", () => {
    expect(erreurDeRetourGoogle('?retour=%2Fpoints', '')).toBeNull()
  })
})
